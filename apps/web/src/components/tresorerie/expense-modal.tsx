/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale de Saisie des Dépenses (ExpenseModal) & Apports de Capital
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { X, TrendingDown, TrendingUp, Camera, AlertCircle } from 'lucide-react';
import type { CashAccount, ExpenseCategory } from '@wilinwi/types';
import { Button } from '@wilinwi/ui';

interface ExpenseModalProps {
  onClose: () => void;
  onSubmitExpense: (dto: {
    compte: CashAccount;
    montant: number;
    categorie: ExpenseCategory;
    note?: string;
  }) => Promise<void>;
  onSubmitCapitalInjection: (dto: {
    compte: CashAccount;
    montant: number;
    note?: string;
  }) => Promise<void>;
}

export function ExpenseModal({
  onClose,
  onSubmitExpense,
  onSubmitCapitalInjection,
}: ExpenseModalProps) {
  const [mode, setMode] = useState<'EXPENSE' | 'CAPITAL'>('EXPENSE');

  const [compte, setCompte] = useState<CashAccount>('CAISSE');
  const [montant, setMontant] = useState<string>('');
  const [categorie, setCategorie] = useState<ExpenseCategory>('LOYER');
  const [note, setNote] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(montant) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setError('Le montant doit être supérieur à 0 FCFA');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === 'EXPENSE') {
        await onSubmitExpense({
          compte,
          montant: parsedAmount,
          categorie,
          note: note ? (proofFile ? `${note} (Justificatif joint)` : note) : (proofFile ? 'Justificatif joint' : undefined),
        });
      } else {
        await onSubmitCapitalInjection({
          compte,
          montant: parsedAmount,
          note: note || 'Apport de capital / Injection de trésorerie',
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’enregistrement');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête avec Switch Dépense (Sortie) / Apport (Entrée) */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white ${
                mode === 'EXPENSE' ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {mode === 'EXPENSE' ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {mode === 'EXPENSE' ? 'Saisie d’une Dépense OPEX' : 'Apport de Capital (Hors Vente)'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Imputation directe en trésorerie</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Mode : Dépense / Apport */}
        <div className="bg-slate-100 p-1.5 flex gap-1 text-xs font-extrabold">
          <button
            type="button"
            onClick={() => setMode('EXPENSE')}
            className={`flex-1 py-1.5 rounded-xl text-center transition-all ${
              mode === 'EXPENSE' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            🟥 Sortie / Dépense
          </button>
          <button
            type="button"
            onClick={() => setMode('CAPITAL')}
            className={`flex-1 py-1.5 rounded-xl text-center transition-all ${
              mode === 'CAPITAL' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            🟩 Injection Capital / Prêt
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Saisie Montant */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Montant (FCFA) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="Ex: 25000"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-base font-bold text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Compte Source / Impacté */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Compte {mode === 'EXPENSE' ? 'Débité (Source)' : 'Crédité (Destination)'} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CAISSE', label: '🟢 Caisse Espèces' },
                { id: 'MOBILE_MONEY', label: '🟡 Mobile Money' },
                { id: 'BANQUE', label: '🏦 Banque' },
              ].map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setCompte(acc.id as CashAccount)}
                  className={`px-2.5 py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                    compte === acc.id
                      ? mode === 'EXPENSE'
                        ? 'border-rose-600 bg-rose-50 text-rose-800 shadow-2xs'
                        : 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catégorie de Dépense Local (Seulement en Mode Dépense) */}
          {mode === 'EXPENSE' && (
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Catégorie de Dépense OPEX <span className="text-rose-500">*</span>
              </label>
              <select
                value={categorie}
                onChange={(e) => setCategorie(e.target.value as ExpenseCategory)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="LOYER">🏢 Loyer / Bail Commercial</option>
                <option value="ELECTRICITE">⚡ Électricité (SBEE / CIE)</option>
                <option value="EAU">💧 Eau (SONEB / SODECI)</option>
                <option value="SALAIRE">👥 Salaires & Avances sur Salaire</option>
                <option value="TRANSPORT">🚚 Transport / Carburant / Livraison</option>
                <option value="REAPPRO">📦 Réapprovisionnement Stock / Fournisseur</option>
                <option value="AUTRE">🛠️ Frais de Fonctionnement / Divers</option>
              </select>
            </div>
          )}

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Motif / Observation (facultatif)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === 'EXPENSE' ? 'Ex: Facture SBEE mois de Juillet' : 'Ex: Injection du gérant'}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Upload Facturette / Photo Justificatif */}
          {mode === 'EXPENSE' && (
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Justificatif / Reçu (Photo)
              </label>
              <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors">
                <Camera className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-600 font-bold">
                  {proofFile ? proofFile.name : 'Prendre une photo / Joindre une facturette'}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setProofFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>
          )}

          {/* Boutons Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button
              type="submit"
              className={`flex-1 text-white font-extrabold ${
                mode === 'EXPENSE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
              disabled={busy}
            >
              {busy ? 'Enregistrement...' : mode === 'EXPENSE' ? 'Valider la dépense' : 'Valider l’apport'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
