/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Modal d'Importation de Catalogue Produits (Excel / CSV) avec Mapping Dynamique
 * @created 2026-08-01
 * @updated 2026-08-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useState, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  ArrowRight,
  RefreshCcw,
  Check,
  FileText,
} from 'lucide-react';
import { Button, Badge } from '@wilinwi/ui';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { apiPost } from '@/lib/api';

interface StockImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type MappableField =
  | 'nom'
  | 'sku'
  | 'categorie'
  | 'prixAchat'
  | 'prixPlancher'
  | 'prixCatalogue'
  | 'stockInitial'
  | 'seuilAlerte'
  | 'ignore';

interface FieldOption {
  key: MappableField;
  label: string;
  required?: boolean;
}

type ImportRow = {
  nom: string;
  sku: string;
  categorie?: string;
  prixAchat?: number;
  prixPlancher?: number;
  prixCatalogue?: number;
  stockInitial?: number;
  seuilAlerte?: number;
};

type RawImportRow = Record<string, unknown>;

const optionalImportNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().min(0).optional(),
);

const MAPPABLE_FIELDS: FieldOption[] = [
  { key: 'ignore', label: '--- Ignorer cette colonne ---' },
  { key: 'nom', label: 'Nom du produit *', required: true },
  { key: 'sku', label: 'Code SKU *', required: true },
  { key: 'categorie', label: 'Catégorie' },
  { key: 'prixAchat', label: 'Prix d\'achat (FCFA)' },
  { key: 'prixPlancher', label: 'Prix plancher / min (FCFA)' },
  { key: 'prixCatalogue', label: 'Prix catalogue / public (FCFA)' },
  { key: 'stockInitial', label: 'Stock initial' },
  { key: 'seuilAlerte', label: 'Seuil d\'alerte réappro' },
];

const rowValidationSchema = z
  .object({
    nom: z.string().min(1, 'Le nom du produit est obligatoire'),
    sku: z.string().min(1, 'Le code SKU est obligatoire'),
    categorie: z.string().optional(),
    prixAchat: optionalImportNumber,
    prixPlancher: optionalImportNumber,
    prixCatalogue: optionalImportNumber,
    stockInitial: optionalImportNumber,
    seuilAlerte: optionalImportNumber,
  })
  .refine(
    (data) => {
      if (
        data.prixAchat !== undefined &&
        data.prixPlancher !== undefined &&
        data.prixCatalogue !== undefined
      ) {
        return data.prixAchat <= data.prixPlancher && data.prixPlancher <= data.prixCatalogue;
      }
      return true;
    },
    { message: 'Invariant requis : Prix achat ≤ Prix plancher ≤ Prix catalogue' },
  );

export function StockImportModal({ isOpen, onClose, onSuccess }: StockImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawImportRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, MappableField>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep(1);
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setFileError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const autoDetectField = (headerName: string): MappableField => {
    const h = headerName.toLowerCase().trim();
    if (h.includes('sku') || h.includes('code') || h.includes('ref')) return 'sku';
    if (h.includes('nom') || h.includes('produit') || h.includes('article') || h.includes('libelle') || h.includes('designation'))
      return 'nom';
    if (h.includes('cat')) return 'categorie';
    if (h.includes('achat') || h.includes('cout')) return 'prixAchat';
    if (h.includes('plancher') || h.includes('min')) return 'prixPlancher';
    if (h.includes('prix') || h.includes('vente') || h.includes('catalogue') || h.includes('tarif'))
      return 'prixCatalogue';
    if (h.includes('stock') || h.includes('qty') || h.includes('quantite')) return 'stockInitial';
    if (h.includes('seuil') || h.includes('alerte')) return 'seuilAlerte';
    return 'ignore';
  };

  const processParsedData = (extractedHeaders: string[], rows: RawImportRow[], name: string) => {
    if (rows.length === 0) {
      setFileError('Le fichier sélectionné est vide.');
      return;
    }
    if (rows.length > 1000) {
      setFileError('Fichier trop volumineux. Limite : 1 000 produits par import.');
      return;
    }

    setFileName(name);
    setHeaders(extractedHeaders);
    setRawRows(rows);

    const initialMapping: Record<string, MappableField> = {};
    const selectedFields = new Set<MappableField>();

    for (const head of extractedHeaders) {
      const detected = autoDetectField(head);
      if (detected !== 'ignore' && !selectedFields.has(detected)) {
        initialMapping[head] = detected;
        selectedFields.add(detected);
      } else {
        initialMapping[head] = 'ignore';
      }
    }

    setMapping(initialMapping);
    setFileError(null);
    setStep(2);
  };

  const handleFileSelect = (file: File) => {
    setFileError(null);
    if (file.size > 2 * 1024 * 1024) {
      setFileError('Le fichier dépasse la taille maximale autorisée (2 Mo).');
      return;
    }

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      setFileError('Format de fichier non pris en charge. Veuillez sélectionner un fichier .xlsx ou .csv.');
      return;
    }

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedHeaders = results.meta.fields ?? [];
          processParsedData(parsedHeaders, results.data as RawImportRow[], file.name);
        },
        error: (err) => {
          setFileError(`Erreur de lecture du fichier CSV : ${err.message}`);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows = XLSX.utils.sheet_to_json<RawImportRow>(worksheet, { defval: '' });

          if (jsonRows.length === 0) {
            setFileError('La feuille Excel est vide.');
            return;
          }

          const extractedHeaders = Object.keys(jsonRows[0]);
          processParsedData(extractedHeaders, jsonRows, file.name);
        } catch (err: unknown) {
          setFileError(`Erreur lors de la lecture du fichier Excel : ${err instanceof Error ? err.message : 'inconnue'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const mappedValues = Object.values(mapping);
  const isNomMapped = mappedValues.includes('nom');
  const isSkuMapped = mappedValues.includes('sku');
  const canProceedToValidation = isNomMapped && isSkuMapped;

  const handleMappingChange = (header: string, field: MappableField) => {
    setMapping((prev) => ({ ...prev, [header]: field }));
  };

  // Validation ligne par ligne
  const validatedData = useMemo(() => {
    if (step !== 3) return { valid: [], errors: [] };

    const valid: ImportRow[] = [];
    const errors: { rowIndex: number; rowData: Record<string, unknown>; errorMsg: string }[] = [];

    rawRows.forEach((row, idx) => {
      const item: Record<string, unknown> = {};
      for (const [head, field] of Object.entries(mapping)) {
        if (field !== 'ignore' && row[head] !== undefined && row[head] !== '') {
          item[field] = row[head];
        }
      }

      const parsed = rowValidationSchema.safeParse(item);
      if (parsed.success) {
        valid.push(parsed.data);
      } else {
        const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
        errors.push({ rowIndex: idx + 2, rowData: item, errorMsg });
      }
    });

    return { valid, errors };
  }, [rawRows, mapping, step]);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Nom du Produit': 'Coca Cola 33cl',
        'SKU / Code': 'COCA-33',
        'Categorie': 'Boissons',
        'Prix Achat': '350',
        'Prix Plancher': '450',
        'Prix Catalogue': '500',
        'Stock Initial': '100',
        'Seuil Alerte': '10',
      },
      {
        'Nom du Produit': 'Eau Minérale 1.5L',
        'SKU / Code': 'EAU-150',
        'Categorie': 'Boissons',
        'Prix Achat': '200',
        'Prix Plancher': '250',
        'Prix Catalogue': '300',
        'Stock Initial': '200',
        'Seuil Alerte': '20',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogue');
    XLSX.writeFile(workbook, 'wilinwi_modele_import_catalogue.xlsx');
  };

  const handleSubmitImport = async () => {
    if (validatedData.valid.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; created: number; updated: number; total: number }>(
        '/api/stock/import',
        { items: validatedData.valid },
      );
      alert(`✅ Importation réussie !\n\n• Produits créés : ${res.created}\n• Produits mis à jour : ${res.updated}\n• Total traité : ${res.total}`);
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : 'Erreur lors de l\'importation en base de données.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border">
        {/* Header */}
        <div className="p-5 border-b bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-base">Importation de Catalogue Produits</h2>
              <p className="text-xs text-slate-300">
                {step === 1 && 'Étape 1 : Sélectionner le fichier (.xlsx ou .csv)'}
                {step === 2 && 'Étape 2 : Mapping dynamique des colonnes'}
                {step === 3 && 'Étape 3 : Validation et confirmation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de la modale */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {fileError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Étape 1 : Drag & Drop File */}
          {step === 1 && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center gap-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="p-4 bg-white shadow-sm rounded-full text-emerald-600 border">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    Cliquez ou glissez-déposez votre fichier ici
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Formats acceptés : <strong>.XLSX</strong>, <strong>.CSV</strong> (Max 2 Mo, 1 000 produits)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-100 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Besoin d'un modèle prédéfini pour remplir vos données ?</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleDownloadSample} className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Télécharger le modèle Excel
                </Button>
              </div>
            </div>
          )}

          {/* Étape 2 : Mapping des colonnes */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">
                    Mapper les colonnes de votre fichier ({fileName})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Associez chaque colonne de votre fichier au champ correspondant dans Wilinwi.
                  </p>
                </div>
                <Badge variant={canProceedToValidation ? 'success' : 'warning'} className="text-xs">
                  {canProceedToValidation ? 'Champs requis configurés' : 'Nom et SKU obligatoires'}
                </Badge>
              </div>

              {/* Table de prévisualisation & sélecteurs */}
              <div className="border rounded-xl overflow-x-auto bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="p-3 font-semibold text-slate-700 min-w-[180px]">
                          <div className="space-y-1.5">
                            <span className="truncate block font-mono text-[11px] text-slate-900 bg-white px-2 py-1 rounded border">
                              {h}
                            </span>
                            <select
                              value={mapping[h] ?? 'ignore'}
                              onChange={(e) => handleMappingChange(h, e.target.value as MappableField)}
                              className={`w-full p-1.5 text-xs rounded border bg-white shadow-sm font-medium ${
                                mapping[h] === 'nom' || mapping[h] === 'sku'
                                  ? 'border-emerald-500 text-emerald-700 font-bold'
                                  : 'text-slate-800'
                              }`}
                            >
                              {MAPPABLE_FIELDS.map((f) => (
                                <option
                                  key={f.key}
                                  value={f.key}
                                  disabled={
                                    f.key !== 'ignore' &&
                                    Object.entries(mapping).some(([k, v]) => v === f.key && k !== h)
                                  }
                                >
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="border-b hover:bg-slate-50/80">
                        {headers.map((h) => (
                          <td key={h} className="p-3 text-slate-600 font-mono text-[11px] truncate max-w-[200px]">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  Changer de fichier
                </Button>
                <Button
                  size="sm"
                  disabled={!canProceedToValidation}
                  onClick={() => setStep(3)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Continuer vers la validation <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Étape 3 : Validation et Confirmation */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xl font-extrabold text-emerald-900">{validatedData.valid.length}</p>
                    <p className="text-xs text-emerald-700 font-medium">Lignes valides prêtes à être importées</p>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    validatedData.errors.length > 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <AlertTriangle
                    className={`w-8 h-8 shrink-0 ${
                      validatedData.errors.length > 0 ? 'text-red-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <p
                      className={`text-xl font-extrabold ${
                        validatedData.errors.length > 0 ? 'text-red-900' : 'text-slate-600'
                      }`}
                    >
                      {validatedData.errors.length}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        validatedData.errors.length > 0 ? 'text-red-700' : 'text-slate-500'
                      }`}
                    >
                      Lignes contenant des erreurs Zod
                    </p>
                  </div>
                </div>
              </div>

              {/* Affichage des erreurs éventuelles */}
              {validatedData.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-red-800">
                    Détail des lignes ignorées ({validatedData.errors.length}) :
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-red-200 rounded-xl bg-red-50/30 p-2 space-y-1 text-xs">
                    {validatedData.errors.map((err, i) => (
                      <div key={i} className="p-2 bg-white rounded border border-red-100 flex items-start gap-2">
                        <Badge variant="danger" className="text-[10px] shrink-0">
                          Ligne {err.rowIndex}
                        </Badge>
                        <div>
                          <span className="font-semibold text-slate-800">
                            SKU: {String(err.rowData.sku || 'N/A')}
                          </span>
                          <p className="text-red-600 text-[11px]">{err.errorMsg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  Retour au mapping
                </Button>
                <Button
                  size="sm"
                  disabled={validatedData.valid.length === 0 || isSubmitting}
                  onClick={handleSubmitImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Importation en cours...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1.5" /> Lancer l'import ({validatedData.valid.length} produits)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
