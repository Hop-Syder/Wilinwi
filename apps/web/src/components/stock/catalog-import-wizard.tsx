/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Assistant d'Importation Catalogue en 3 étapes (Axe 3 : Modèle CSV, Mapping, Prévisualisation & Anomalies)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatFCFA } from '@wilinwi/ui';
import { apiPost } from '@/lib/api';

interface CatalogImportWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export interface ParsedRow {
  nom: string;
  sku?: string;
  categorie?: string;
  prixCatalogue: number;
  prixAchat?: number;
  stock: number;
  errors?: string[];
}

export function CatalogImportWizard({ onClose, onSuccess }: CatalogImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);

  // Mapping des colonnes (index du header CSV pour chaque champ requis)
  const [mapping, setMapping] = useState<{
    nom: number;
    sku: number;
    categorie: number;
    prixCatalogue: number;
    prixAchat: number;
    stock: number;
  }>({
    nom: 0,
    sku: 1,
    categorie: 2,
    prixCatalogue: 3,
    prixAchat: 4,
    stock: 5,
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

  // Chargement et analyse du fichier CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setFileContent(text);

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        setImportError('Le fichier doit contenir au moins un en-tête et une ligne de données.');
        return;
      }

      const delimiter = lines[0]?.includes(';') ? ';' : ',';
      const parsedHeaders = lines[0]!.split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());
      const parsedRows = lines.slice(1).map((l) => l.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim()));

      setHeaders(parsedHeaders);
      setRawRows(parsedRows);

      // Mapping automatique des colonnes selon les noms d'en-têtes
      const autoMap = {
        nom: parsedHeaders.findIndex((h) => /nom|designation|product|article/i.test(h)),
        sku: parsedHeaders.findIndex((h) => /sku|ref|code/i.test(h)),
        categorie: parsedHeaders.findIndex((h) => /cat/i.test(h)),
        prixCatalogue: parsedHeaders.findIndex((h) => /prix.*cat|vente|price|prix/i.test(h)),
        prixAchat: parsedHeaders.findIndex((h) => /achat|cost|cout/i.test(h)),
        stock: parsedHeaders.findIndex((h) => /stock|qte|quantite/i.test(h)),
      };

      setMapping({
        nom: autoMap.nom !== -1 ? autoMap.nom : 0,
        sku: autoMap.sku !== -1 ? autoMap.sku : 1,
        categorie: autoMap.categorie !== -1 ? autoMap.categorie : 2,
        prixCatalogue: autoMap.prixCatalogue !== -1 ? autoMap.prixCatalogue : 3,
        prixAchat: autoMap.prixAchat !== -1 ? autoMap.prixAchat : 4,
        stock: autoMap.stock !== -1 ? autoMap.stock : 5,
      });

      setStep(2);
    };

    reader.readAsText(file);
  };

  // Passage à l'étape 3 : Validation et détection d'anomalies
  const validateAndPreview = () => {
    const seenSkus = new Set<string>();
    const rows: ParsedRow[] = [];

    rawRows.forEach((r, idx) => {
      const nom = r[mapping.nom]?.trim() || '';
      const sku = r[mapping.sku]?.trim() || '';
      const categorie = r[mapping.categorie]?.trim() || 'Général';
      const prixCatalogue = parseInt(r[mapping.prixCatalogue] || '0', 10);
      const prixAchat = parseInt(r[mapping.prixAchat] || '0', 10);
      const stock = parseInt(r[mapping.stock] || '0', 10);

      const rowErrors: string[] = [];

      if (!nom) rowErrors.push('Nom de produit manquant');
      if (!sku) rowErrors.push('SKU manquant');
      if (isNaN(prixCatalogue) || prixCatalogue <= 0) rowErrors.push('Prix catalogue invalide');
      if (canSeeCostCheck() && (isNaN(prixAchat) || prixAchat < 0)) rowErrors.push('Prix d\'achat invalide');
      if (isNaN(stock) || stock < 0) rowErrors.push('Quantité de stock invalide');

      if (sku) {
        if (seenSkus.has(sku)) {
          rowErrors.push(`Doublon de SKU détecté: ${sku}`);
        } else {
          seenSkus.add(sku);
        }
      }

      rows.push({
        nom,
        sku: sku || undefined,
        categorie,
        prixCatalogue: isNaN(prixCatalogue) ? 0 : prixCatalogue,
        prixAchat: isNaN(prixAchat) ? 0 : prixAchat,
        stock: isNaN(stock) ? 0 : stock,
        errors: rowErrors.length > 0 ? rowErrors : undefined,
      });
    });

    setParsedData(rows);
    setStep(3);
  };

  const canSeeCostCheck = () => true;

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
          categorie: row.categorie,
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
                    Sélectionner un fichier CSV (.csv)
                    <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <p className="text-xs text-slate-400 mt-1">Fichiers CSV encodés en UTF-8 recommandés</p>
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

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code SKU / Référence</label>
                  <select
                    value={mapping.sku}
                    onChange={(e) => setMapping({ ...mapping, sku: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium"
                  >
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Colonne {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

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

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix d'Achat (FCFA)</label>
                  <select
                    value={mapping.prixAchat}
                    onChange={(e) => setMapping({ ...mapping, prixAchat: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium"
                  >
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Colonne {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantité Stock *</label>
                  <select
                    value={mapping.stock}
                    onChange={(e) => setMapping({ ...mapping, stock: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium"
                  >
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Colonne {idx + 1}: {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={mapping.categorie}
                    onChange={(e) => setMapping({ ...mapping, categorie: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium"
                  >
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
                        <td className="p-2 font-medium">{r.nom || '—'} {r.sku ? `(${r.sku})` : ''}</td>
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
