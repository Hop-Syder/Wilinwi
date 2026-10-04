/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Assistant d'Importation Catalogue en 3 étapes (Axe 3 : Modèle CSV, Mapping, Prévisualisation & Anomalies)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, ArrowRight, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { formatFCFA } from '@wilinwi/ui';
import { apiPost } from '@/lib/api';

interface CatalogImportWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export interface ParsedRow {
  nom: string;
  sku?: string;
  isAutoSku?: boolean;
  categorie?: string;
  prixCatalogue: number;
  prixAchat?: number;
  stock: number;
  errors?: string[];
}

/**
 * Génère un code SKU court, propre et garanti unique à partir du nom du produit.
 * Exemple: "Riz Parfumé 5kg" -> "RIZ-PAR-001"
 */
function generateSmartSku(nom: string, index: number, seenSkus: Set<string>): string {
  const clean = (nom || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  const prefix =
    words.length >= 2
      ? `${words[0].slice(0, 3)}-${words[1].slice(0, 3)}`
      : words.length === 1
        ? words[0].slice(0, 6)
        : 'ART';

  const paddedIndex = String(index + 1).padStart(3, '0');
  let candidate = `${prefix}-${paddedIndex}`;

  let counter = 1;
  while (seenSkus.has(candidate)) {
    candidate = `${prefix}-${String(index + 1 + counter).padStart(3, '0')}`;
    counter++;
  }

  seenSkus.add(candidate);
  return candidate;
}

export type WilinwiTargetField =
  | 'ignore'
  | 'nom'
  | 'prixCatalogue'
  | 'sku'
  | 'stock'
  | 'prixAchat'
  | 'categorie';

interface TargetFieldDef {
  key: WilinwiTargetField;
  label: string;
  shortLabel: string;
  required?: boolean;
  badge?: string;
  description: string;
}

const TARGET_FIELDS: TargetFieldDef[] = [
  {
    key: 'ignore',
    label: '— Ignorer cette colonne —',
    shortLabel: 'Ignorer',
    description: 'Ne sera pas importée',
  },
  {
    key: 'nom',
    label: '⭐ Nom du Produit (Obligatoire)',
    shortLabel: 'Nom du Produit',
    required: true,
    description: 'Désignation principale de l’article',
  },
  {
    key: 'prixCatalogue',
    label: '⭐ Prix de Vente (Obligatoire)',
    shortLabel: 'Prix de Vente',
    required: true,
    description: 'Tarif appliqué aux clients (FCFA)',
  },
  {
    key: 'sku',
    label: 'Code SKU / Référence',
    shortLabel: 'SKU / Réf',
    description: 'Si ignoré : généré automatiquement (Auto-SKU)',
  },
  {
    key: 'stock',
    label: 'Quantité Stock',
    shortLabel: 'Stock Initial',
    description: 'Si ignoré : initialisé à 0',
  },
  {
    key: 'prixAchat',
    label: 'Prix d’Achat (FCFA)',
    shortLabel: 'Prix d’Achat',
    description: 'Optionnel — Coût de revient',
  },
  {
    key: 'categorie',
    label: 'Catégorie',
    shortLabel: 'Catégorie',
    description: 'Optionnel — Famille ou rayon',
  },
];

export function CatalogImportWizard({ onClose, onSuccess }: CatalogImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);

  // Mapping inversé : pour chaque colonne du fichier client (index), quel champ Wilinwi lui est assigné ?
  const [columnMappings, setColumnMappings] = useState<WilinwiTargetField[]>([]);

  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Téléchargement du fichier Modèle CSV Exemple
  const downloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Nom,SKU,Categorie,PrixCatalogue,PrixAchat,Stock\n' +
      'Riz Parfumé 5kg,RIZ-5K,Alimentation,6500,5500,20\n' +
      'Huile de Palme 1L,HUI-1L,Alimentation,1200,950,50\n' +
      'Savon de Marseille,SAV-MAR,Hygiène,350,250,100\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'modele_import_catalogue_wilinwi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Traitement des données brutes en-tête + lignes avec auto-détection par colonne
  const processParsedSheet = (parsedHeaders: string[], parsedRows: string[][]) => {
    if (parsedHeaders.length === 0 || parsedRows.length === 0) {
      setImportError('Le fichier ne contient aucune donnée utilisable.');
      return;
    }

    setHeaders(parsedHeaders);
    setRawRows(parsedRows);

    // Auto-détection intelligente pour chaque colonne du fichier client
    const assigned = new Set<WilinwiTargetField>();
    const initialMappings: WilinwiTargetField[] = parsedHeaders.map((header) => {
      const h = header.toLowerCase();

      // 1. Nom de produit
      if (!assigned.has('nom') && /nom|designation|product|article|libelle|boisson/i.test(h)) {
        assigned.add('nom');
        return 'nom';
      }

      // 2. Prix de vente / catalogue
      if (!assigned.has('prixCatalogue') && /prix.*cat|tarif.*vente|prix.*vente|prix.*client|pv|catalogue/i.test(h)) {
        assigned.add('prixCatalogue');
        return 'prixCatalogue';
      }

      // 3. Prix d'achat
      if (!assigned.has('prixAchat') && /achat|cost|cout|pa\b/i.test(h)) {
        assigned.add('prixAchat');
        return 'prixAchat';
      }

      // 4. Stock / Quantité
      if (!assigned.has('stock') && /stock|qte|quantite|depart|dispo/i.test(h)) {
        assigned.add('stock');
        return 'stock';
      }

      // 5. SKU / Référence
      if (!assigned.has('sku') && /sku|ref|code/i.test(h)) {
        assigned.add('sku');
        return 'sku';
      }

      // 6. Catégorie
      if (!assigned.has('categorie') && /cat|famille|rayon|groupe/i.test(h)) {
        assigned.add('categorie');
        return 'categorie';
      }

      // 7. Fallback Prix si non encore assigné
      if (!assigned.has('prixCatalogue') && /prix|price|tarif/i.test(h)) {
        assigned.add('prixCatalogue');
        return 'prixCatalogue';
      }

      return 'ignore';
    });

    // Si 'nom' n'a pas été détecté automatiquement et qu'il y a des colonnes, proposer la première si libre
    if (!assigned.has('nom') && initialMappings.length > 0 && initialMappings[0] === 'ignore') {
      initialMappings[0] = 'nom';
      assigned.add('nom');
    }

    setColumnMappings(initialMappings);
    setStep(2);
  };

  // Modification d'un mapping avec garantie d'unicité (sauf pour 'ignore')
  const handleColumnMappingChange = (colIdx: number, newTarget: WilinwiTargetField) => {
    setColumnMappings((prev) =>
      prev.map((currentTarget, idx) => {
        if (idx === colIdx) return newTarget;
        // Si une autre colonne avait déjà cette cible (autre que 'ignore'), elle est réinitialisée à 'ignore'
        if (newTarget !== 'ignore' && currentTarget === newTarget) {
          return 'ignore';
        }
        return currentTarget;
      })
    );
  };

  // Chargement et analyse du fichier (.csv ou .xlsx / .xls avec parseurs officiels)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      // Lecture avec le parseur officiel XLSX
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const sheetData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

          if (!sheetData || sheetData.length < 2) {
            setImportError('Le fichier Excel doit contenir au moins un en-tête et des données.');
            return;
          }

          const parsedHeaders = (sheetData[0] || []).map((h) => String(h || '').trim());
          const parsedRows = sheetData.slice(1).map((row) => (row || []).map((c) => String(c || '').trim()));

          processParsedSheet(parsedHeaders, parsedRows);
        } catch (err) {
          console.error('Erreur lecture Excel:', err);
          setImportError('Impossible de lire ce fichier Excel (.xlsx). Vérifiez son format.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Lecture CSV robuste avec PapaParse
      Papa.parse<string[]>(file, {
        complete: (results) => {
          if (!results.data || results.data.length < 2) {
            setImportError('Le fichier CSV doit contenir au moins un en-tête et des données.');
            return;
          }

          const parsedHeaders = (results.data[0] || []).map((h) => String(h || '').trim());
          const parsedRows = results.data
            .slice(1)
            .filter((row) => row.some((cell) => cell.trim().length > 0))
            .map((row) => row.map((c) => String(c || '').trim()));

          processParsedSheet(parsedHeaders, parsedRows);
        },
        error: (error) => {
          console.error('Erreur parsing CSV:', error);
          setImportError('Erreur lors de l’analyse du fichier CSV.');
        },
      });
    }
  };

  // Passage à l'étape 3 : Validation et détection d'anomalies
  const validateAndPreview = () => {
    const colNom = columnMappings.indexOf('nom');
    const colPrixCat = columnMappings.indexOf('prixCatalogue');
    const colSku = columnMappings.indexOf('sku');
    const colStock = columnMappings.indexOf('stock');
    const colPrixAchat = columnMappings.indexOf('prixAchat');
    const colCategorie = columnMappings.indexOf('categorie');

    if (colNom === -1 || colPrixCat === -1) {
      setImportError('Veuillez assigner au moins le Nom du Produit et le Prix de Vente avant de continuer.');
      return;
    }

    setImportError(null);
    const seenSkus = new Set<string>();
    const fileSkuCounts = new Map<string, number>();

    // Pré-calcul des doublons dans le fichier si colonne SKU sélectionnée
    if (colSku >= 0) {
      rawRows.forEach((r) => {
        const val = r[colSku]?.trim();
        if (val) {
          fileSkuCounts.set(val, (fileSkuCounts.get(val) || 0) + 1);
        }
      });
    }

    const rows: ParsedRow[] = [];

    rawRows.forEach((r, idx) => {
      const nom = colNom >= 0 ? (r[colNom]?.trim() || '') : '';

      let sku = colSku >= 0 ? (r[colSku]?.trim() || '') : '';
      let isAutoSku = false;

      // Si SKU non mappé ou case vide dans le fichier Excel
      if (!sku) {
        sku = generateSmartSku(nom || 'PROD', idx, seenSkus);
        isAutoSku = true;
      } else {
        seenSkus.add(sku);
      }

      const categorie = colCategorie >= 0 ? (r[colCategorie]?.trim() || undefined) : undefined;

      const rawPrixCat = colPrixCat >= 0 ? (r[colPrixCat]?.trim() || '0') : '0';
      const prixCatalogue = parseInt(rawPrixCat.replace(/[^0-9]/g, '') || '0', 10);

      const rawPrixAchat = colPrixAchat >= 0 ? (r[colPrixAchat]?.trim() || '') : '';
      const parsedAchat = rawPrixAchat ? parseInt(rawPrixAchat.replace(/[^0-9]/g, ''), 10) : undefined;
      const prixAchat = parsedAchat !== undefined && !isNaN(parsedAchat) ? parsedAchat : undefined;

      const rawStock = colStock >= 0 ? (r[colStock]?.trim() || '') : '';
      const parsedStock = rawStock ? parseFloat(rawStock.replace(/,/g, '.').replace(/[^0-9.]/g, '')) : 0;
      const stock = isNaN(parsedStock) ? 0 : Math.max(0, Math.floor(parsedStock));

      const rowErrors: string[] = [];

      if (!nom) rowErrors.push('Nom de produit manquant');
      if (isNaN(prixCatalogue) || prixCatalogue <= 0) rowErrors.push('Prix de vente invalide');
      if (prixAchat !== undefined && (isNaN(prixAchat) || prixAchat < 0)) rowErrors.push('Prix d\'achat invalide');
      if (colStock >= 0 && rawStock !== '' && (isNaN(parsedStock) || parsedStock < 0)) {
        rowErrors.push('Quantité de stock invalide');
      }

      // Doublon dans le fichier source si renseigné manuellement
      if (!isAutoSku && sku && (fileSkuCounts.get(sku) || 0) > 1) {
        rowErrors.push(`Doublon de SKU dans le fichier : ${sku}`);
      }

      rows.push({
        nom,
        sku,
        isAutoSku,
        categorie,
        prixCatalogue: isNaN(prixCatalogue) ? 0 : prixCatalogue,
        prixAchat,
        stock,
        errors: rowErrors.length > 0 ? rowErrors : undefined,
      });
    });

    setParsedData(rows);
    setStep(3);
  };

  // Lancement de l'importation backend
  const handleFinalImport = async () => {
    const validRows = parsedData.filter((r) => !r.errors || r.errors.length === 0);
    if (validRows.length === 0) {
      setImportError('Aucune ligne valide à importer.');
      return;
    }

    setSubmitting(true);
    setImportError(null);

    try {
      await apiPost('/api/stock/import', {
        items: validRows.map((row) => ({
          nom: row.nom,
          sku: row.sku!,
          categorie: row.categorie || undefined,
          prixAchat: row.prixAchat,
          prixCatalogue: row.prixCatalogue,
          stockInitial: row.stock,
        })),
      });
      onSuccess();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Erreur lors de l\'importation.');
    } finally {
      setSubmitting(false);
    }
  };

  const colNom = columnMappings.indexOf('nom');
  const colPrixCat = columnMappings.indexOf('prixCatalogue');
  const colSku = columnMappings.indexOf('sku');
  const colStock = columnMappings.indexOf('stock');
  const canProceedToPreview = colNom !== -1 && colPrixCat !== -1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl space-y-4">
        {/* Header Assistant */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <span>Assistant d'Importation Catalogue</span>
            </h3>
            <p className="text-xs text-slate-500">
              Étape {step} sur 3 — {step === 1 ? 'Chargement du fichier' : step === 2 ? 'Correspondance des colonnes' : 'Aperçu & Détection'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ÉTAPE 1 : Téléchargement Modèle & Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex items-start gap-3 text-xs text-blue-900">
                <Download className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Téléchargez le modèle CSV recommandé</p>
                  <p className="text-blue-700">Pour garantir une importation sans erreur, utilisez le format modèle pré-structuré.</p>
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="inline-flex items-center gap-1 text-blue-800 font-bold underline hover:text-blue-950 pt-1"
                  >
                    <span>Télécharger modèle exemple CSV</span>
                  </button>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 transition-colors">
                <Upload className="mx-auto h-10 w-10 text-slate-400" />
                <div>
                  <label className="cursor-pointer text-sm font-bold text-emerald-600 hover:underline">
                    Sélectionner un fichier Excel ou CSV (.xlsx, .xls, .csv)
                    <input type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <p className="text-xs text-slate-400 mt-1">Formats supportés : Fichiers Excel (.xlsx, .xls) ou CSV UTF-8</p>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : Mapping Inversé (Chaque colonne du client -> Champ Wilinwi) */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Colonnes détectées dans votre fichier ({fileName})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Associez chaque colonne de votre fichier au champ Wilinwi correspondant.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {headers.length} colonnes
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                    {rawRows.length} lignes
                  </span>
                </div>
              </div>

              {/* État récapitulatif des champs clés */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* 1. Nom */}
                <div className={`p-2 rounded-xl border ${colNom !== -1 ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-rose-50/50 border-rose-200 text-rose-900'}`}>
                  <span className="font-semibold block">Produit *</span>
                  <span className="text-[11px] truncate block">
                    {colNom !== -1 ? `Col. ${colNom + 1}: ${headers[colNom]}` : '⚠️ Requis non assigné'}
                  </span>
                </div>

                {/* 2. Prix de Vente */}
                <div className={`p-2 rounded-xl border ${colPrixCat !== -1 ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-rose-50/50 border-rose-200 text-rose-900'}`}>
                  <span className="font-semibold block">Prix de Vente *</span>
                  <span className="text-[11px] truncate block">
                    {colPrixCat !== -1 ? `Col. ${colPrixCat + 1}: ${headers[colPrixCat]}` : '⚠️ Requis non assigné'}
                  </span>
                </div>

                {/* 3. SKU */}
                <div className={`p-2 rounded-xl border ${colSku !== -1 ? 'bg-blue-50/50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span className="font-semibold block">Code SKU</span>
                  <span className="text-[11px] truncate block">
                    {colSku !== -1 ? `Col. ${colSku + 1}: ${headers[colSku]}` : '🪄 Auto-SKU actif'}
                  </span>
                </div>

                {/* 4. Stock */}
                <div className={`p-2 rounded-xl border ${colStock !== -1 ? 'bg-amber-50/50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span className="font-semibold block">Stock initial</span>
                  <span className="text-[11px] truncate block">
                    {colStock !== -1 ? `Col. ${colStock + 1}: ${headers[colStock]}` : '📦 Défaut à 0'}
                  </span>
                </div>
              </div>

              {/* Liste défilante des colonnes du fichier */}
              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/40">
                {headers.map((headerName, colIdx) => {
                  const currentTarget = columnMappings[colIdx] || 'ignore';
                  const isRequiredMapped = currentTarget === 'nom' || currentTarget === 'prixCatalogue';
                  const isOptionalMapped = currentTarget !== 'ignore' && !isRequiredMapped;

                  // Récupérer 2-3 exemples réels du fichier
                  const samples = rawRows
                    .slice(0, 5)
                    .map((r) => r[colIdx]?.trim())
                    .filter((val): val is string => Boolean(val && val.length > 0))
                    .slice(0, 3);

                  return (
                    <div
                      key={colIdx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                        isRequiredMapped
                          ? 'border-emerald-300 bg-white shadow-xs'
                          : isOptionalMapped
                            ? 'border-blue-300 bg-white shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Détail colonne client */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                            Col. {colIdx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {headerName || `(Colonne sans titre)`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {samples.length > 0 ? (
                            <span>
                              <span className="text-slate-400 font-medium">Exemples : </span>
                              <span className="italic text-slate-600 font-mono text-[10px]">
                                {samples.map((s) => `"${s.length > 25 ? s.slice(0, 25) + '…' : s}"`).join(', ')}
                              </span>
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Aucune valeur dans les 5 premières lignes</span>
                          )}
                        </p>
                      </div>

                      {/* Dropdown de destination Wilinwi */}
                      <div className="sm:w-64 shrink-0">
                        <select
                          value={currentTarget}
                          onChange={(e) => handleColumnMappingChange(colIdx, e.target.value as WilinwiTargetField)}
                          className={`w-full rounded-xl border p-2 text-xs font-medium transition-colors ${
                            isRequiredMapped
                              ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900 font-semibold'
                              : isOptionalMapped
                                ? 'border-blue-300 bg-blue-50/40 text-blue-900 font-semibold'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {TARGET_FIELDS.map((tf) => (
                            <option key={tf.key} value={tf.key}>
                              {tf.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!canProceedToPreview && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Veuillez attribuer au moins le <strong>Nom du Produit</strong> et le <strong>Prix de Vente</strong> à vos colonnes pour continuer.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 3 : Prévisualisation & Détection d'anomalies */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">
                  {parsedData.filter((r) => !r.errors).length} lignes valides sur {parsedData.length} au total
                </span>
                {parsedData.some((r) => r.errors) && (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {parsedData.filter((r) => r.errors).length} anomalie(s) détectée(s)
                  </span>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0">
                    <tr>
                      <th className="p-2">Produit</th>
                      <th className="p-2">Prix Vente</th>
                      <th className="p-2">Stock</th>
                      <th className="p-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((r, idx) => (
                      <tr key={idx} className={r.errors ? 'bg-rose-50/60 text-rose-900' : 'hover:bg-slate-50'}>
                        <td className="p-2 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{r.nom || '—'}</span>
                            {r.sku && (
                              <span className="font-mono text-[11px] text-slate-500">({r.sku})</span>
                            )}
                            {r.isAutoSku && (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                                🪄 Auto
                              </span>
                            )}
                            {r.categorie && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                {r.categorie}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 font-mono">{formatFCFA(r.prixCatalogue)}</td>
                        <td className="p-2 font-mono">{r.stock}</td>
                        <td className="p-2">
                          {r.errors ? (
                            <span className="text-rose-600 font-bold">{r.errors.join(', ')}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Valide
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {importError}
            </div>
          )}

          {/* Navigation Assistant */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Précédent
              </button>
            ) : (
              <div />
            )}

            {step === 1 && <div />}
            {step === 2 && (
              <button
                type="button"
                onClick={validateAndPreview}
                disabled={!canProceedToPreview}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Aperçu & Vérification</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleFinalImport}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Importation...' : 'Lancer l\'Importation'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
