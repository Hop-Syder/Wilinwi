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

export function CatalogImportWizard({ onClose, onSuccess }: CatalogImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);

  // Mapping des colonnes (-1 signifie auto-généré / optionnel / valeur par défaut)
  const [mapping, setMapping] = useState<{
    nom: number;
    sku: number;
    categorie: number;
    prixCatalogue: number;
    prixAchat: number;
    stock: number;
  }>({
    nom: 0,
    sku: -1,
    categorie: -1,
    prixCatalogue: 1,
    prixAchat: -1,
    stock: -1,
  });

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

  // Traitement des données brutes en-tête + lignes
  const processParsedSheet = (parsedHeaders: string[], parsedRows: string[][]) => {
    if (parsedHeaders.length === 0 || parsedRows.length === 0) {
      setImportError('Le fichier ne contient aucune donnée utilisable.');
      return;
    }

    setHeaders(parsedHeaders);
    setRawRows(parsedRows);

    // Mapping automatique selon les mots-clés d'en-tête
    const autoMap = {
      nom: parsedHeaders.findIndex((h) => /nom|designation|product|article|libelle/i.test(h)),
      sku: parsedHeaders.findIndex((h) => /sku|ref|code/i.test(h)),
      categorie: parsedHeaders.findIndex((h) => /cat|famille|rayon/i.test(h)),
      prixCatalogue: parsedHeaders.findIndex((h) => /prix.*cat|vente|price|pv|prix/i.test(h)),
      prixAchat: parsedHeaders.findIndex((h) => /achat|cost|cout|pa/i.test(h)),
      stock: parsedHeaders.findIndex((h) => /stock|qte|quantite/i.test(h)),
    };

    setMapping({
      nom: autoMap.nom !== -1 ? autoMap.nom : 0,
      sku: autoMap.sku !== -1 ? autoMap.sku : -1, // Par défaut : -1 (Auto-génération intelligente)
      categorie: autoMap.categorie !== -1 ? autoMap.categorie : -1, // Par défaut : -1 (Optionnel / vide)
      prixCatalogue: autoMap.prixCatalogue !== -1 ? autoMap.prixCatalogue : (autoMap.nom === 0 ? 1 : 0),
      prixAchat: autoMap.prixAchat !== -1 ? autoMap.prixAchat : -1, // Par défaut : -1 (Optionnel / vide)
      stock: autoMap.stock !== -1 ? autoMap.stock : -1, // Par défaut : -1 (Stock initial à 0)
    });

    setStep(2);
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
    const seenSkus = new Set<string>();
    const fileSkuCounts = new Map<string, number>();

    // Pré-calcul des doublons dans le fichier si colonne SKU sélectionnée
    if (mapping.sku >= 0) {
      rawRows.forEach((r) => {
        const val = r[mapping.sku]?.trim();
        if (val) {
          fileSkuCounts.set(val, (fileSkuCounts.get(val) || 0) + 1);
        }
      });
    }

    const rows: ParsedRow[] = [];

    rawRows.forEach((r, idx) => {
      const nom = mapping.nom >= 0 ? (r[mapping.nom]?.trim() || '') : '';

      let sku = mapping.sku >= 0 ? (r[mapping.sku]?.trim() || '') : '';
      let isAutoSku = false;

      // Si mapping sur Auto (-1) ou case vide dans le fichier Excel
      if (!sku) {
        sku = generateSmartSku(nom || 'PROD', idx, seenSkus);
        isAutoSku = true;
      } else {
        seenSkus.add(sku);
      }

      const categorie = mapping.categorie >= 0 ? (r[mapping.categorie]?.trim() || undefined) : undefined;

      const rawPrixCat = mapping.prixCatalogue >= 0 ? (r[mapping.prixCatalogue]?.trim() || '0') : '0';
      const prixCatalogue = parseInt(rawPrixCat.replace(/[^0-9]/g, '') || '0', 10);

      const rawPrixAchat = mapping.prixAchat >= 0 ? (r[mapping.prixAchat]?.trim() || '') : '';
      const parsedAchat = rawPrixAchat ? parseInt(rawPrixAchat.replace(/[^0-9]/g, ''), 10) : undefined;
      const prixAchat = parsedAchat !== undefined && !isNaN(parsedAchat) ? parsedAchat : undefined;

      const rawStock = mapping.stock >= 0 ? (r[mapping.stock]?.trim() || '') : '';
      const parsedStock = rawStock ? parseFloat(rawStock.replace(/,/g, '.').replace(/[^0-9.]/g, '')) : 0;
      const stock = isNaN(parsedStock) ? 0 : Math.max(0, Math.floor(parsedStock));

      const rowErrors: string[] = [];

      if (!nom) rowErrors.push('Nom de produit manquant');
      if (isNaN(prixCatalogue) || prixCatalogue <= 0) rowErrors.push('Prix catalogue invalide');
      if (prixAchat !== undefined && (isNaN(prixAchat) || prixAchat < 0)) rowErrors.push('Prix d\'achat invalide');
      if (mapping.stock >= 0 && rawStock !== '' && (isNaN(parsedStock) || parsedStock < 0)) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl space-y-4">
        {/* Header Assistant */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <span>Assistant d'Importation Catalogue (3 Étapes)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Étape {step} sur 3 — {step === 1 ? 'Chargement fichier' : step === 2 ? 'Mapping colonnes' : 'Aperçu & Détection'}
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

          {/* ÉTAPE 2 : Mapping Dynamique des Colonnes */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Vérifiez la correspondance entre les colonnes de votre fichier ({fileName}) et les champs de Wilinwi :
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* 1. Nom */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom du Produit *</label>
                  <select
                    value={mapping.nom}
                    onChange={(e) => setMapping({ ...mapping, nom: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium"
                  >
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Colonne {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. SKU */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Code SKU / Référence</label>
                    <span className="text-[10px] font-semibold text-emerald-600">Auto ou Colonne</span>
                  </div>
                  <select
                    value={mapping.sku}
                    onChange={(e) => setMapping({ ...mapping, sku: parseInt(e.target.value, 10) })}
                    className={`w-full rounded-xl border p-2 font-medium transition-colors ${
                      mapping.sku === -1
                        ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                  >
                    <option value={-1}>🪄 Générer automatiquement (Auto-SKU)</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Colonne {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                  {mapping.sku === -1 && (
                    <p className="mt-1 text-[10px] text-emerald-600 font-medium">
                      Un code unique sera généré automatiquement à partir du nom.
                    </p>
                  )}
                </div>

                {/* 3. Prix de vente */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix de Vente (FCFA) *</label>
                  <select
                    value={mapping.prixCatalogue}
                    onChange={(e) => setMapping({ ...mapping, prixCatalogue: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium"
                  >
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Colonne {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Prix d'achat */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Prix d'Achat (FCFA)</label>
                    <span className="text-[10px] text-slate-400">Optionnel</span>
                  </div>
                  <select
                    value={mapping.prixAchat}
                    onChange={(e) => setMapping({ ...mapping, prixAchat: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium"
                  >
                    <option value={-1}>— Laisser vide (non renseigné) —</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Colonne {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Quantité Stock */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Quantité Stock</label>
                    <span className="text-[10px] text-slate-400">Optionnel</span>
                  </div>
                  <select
                    value={mapping.stock}
                    onChange={(e) => setMapping({ ...mapping, stock: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium"
                  >
                    <option value={-1}>— Laisser vide (Stock initial à 0) —</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Colonne {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                  {mapping.stock === -1 && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Les articles seront créés avec un stock à 0.
                    </p>
                  )}
                </div>

                {/* 6. Catégorie */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Catégorie</label>
                    <span className="text-[10px] text-slate-400">Optionnel</span>
                  </div>
                  <select
                    value={mapping.categorie}
                    onChange={(e) => setMapping({ ...mapping, categorie: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium"
                  >
                    <option value={-1}>— Laisser vide (sans catégorie) —</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Colonne {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
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
