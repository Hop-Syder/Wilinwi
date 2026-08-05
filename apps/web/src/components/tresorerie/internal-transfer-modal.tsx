/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale de Virement / Transfert Inter-Comptes Neutre & Prise en Charge des Frais de Transaction
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle, Info } from 'lucide-react';
import { CASH_ACCOUNT_LABELS, type CashAccount } from '@wilinwi/types';
import { Button } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

interface InternalTransferModalProps {
  onClose: () => void;
  onTransfer: (dto: { from: CashAccount; to: CashAccount; montant: number; note?: string }) => Promise<void>;
  onRecordExpense?: (dto: { compte: CashAccount; montant: number; categorie: 'AUTRE'; note?: string }) => Promise<void>;
}

export function InternalTransferModal({
  onClose,
  onTransfer,
  onRecordExpense,
}: InternalTransferModalProps) {
  const { formatAmount } = useCurrency();

  const [from, setFrom] = useState<CashAccount>('MOBILE_MONEY');
  const [to, setTo] = useState<CashAccount>('CAISSE');
  const [montant, setMontant] = useState<string>('');
  const [frais, setFrais] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(montant) || 0;
  const parsedFrais = parseFloat(frais) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (from === to) {
      setError('Le compte source et le compte destination doivent être différents');
      return;
    }
    if (parsedAmount <= 0) {
      setError('Le montant du virement doit être supérieur à 0 FCFA');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      // 1. Virement principal
      const noteTxt = note ? `${note} (Virement interne)` : `Virement de ${CASH_ACCOUNT_LABELS[from]} vers ${CASH_ACCOUNT_LABELS[to]}`;
      await onTransfer({
        from,
        to,
        montant: parsedAmount,
        note: noteTxt,
      });

      // 2. Frais financiers optionnels imputer automatiquement
      if (parsedFrais > 0 && onRecordExpense) {
        await onRecordExpense({
          compte: from,
          montant: parsedFrais,
          categorie: 'AUTRE',
          note: `Frais de virement / retrait (${CASH_ACCOUNT_LABELS[from]} -> ${CASH_ACCOUNT_LABELS[to]})`,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du virement inter-comptes');
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
        {/* En-tête */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Transfert Inter-Comptes Neutre</h3>
              <p className="text-[11px] text-slate-500 font-medium">Déplacement de liquidité sans impact CA</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-medium">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sélection Comptes Source -> Destination */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-extrabold text-slate-700 mb-1">
                Compte Source (Débit) <span className="text-rose-500">*</span>
              </label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value as CashAccount)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="MOBILE_MONEY">🟡 Mobile Money (MTN/Wave/Moov)</option>
                <option value="CAISSE">🟢 Caisse Espèces</option>
                <option value="BANQUE">🏦 Banque</option>
              </select>
            </div>

            <div>
              <label className="block font-extrabold text-slate-700 mb-1">
                Compte Destination (Crédit) <span className="text-rose-500">*</span>
              </label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value as CashAccount)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="CAISSE">🟢 Caisse Espèces</option>
                <option value="BANQUE">🏦 Banque</option>
                <option value="MOBILE_MONEY">🟡 Mobile Money</option>
              </select>
            </div>
          </div>

          {/* Saisie Montant Principal */}
          <div>
            <label className="block font-extrabold text-slate-700 mb-1">
              Montant Transféré (FCFA) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="Ex: 50000"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-base font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Frais de transaction optionnels */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-extrabold text-slate-700">Frais de Retrait / Transaction (FCFA)</label>
              <span className="text-[10px] text-slate-400">Imputés en charges</span>
            </div>
            <input
              type="number"
              min="0"
              step="1"
              value={frais}
              onChange={(e) => setFrais(e.target.value)}
              placeholder="Ex: 150 (Optionnel)"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Observation */}
          <div>
            <label className="block font-extrabold text-slate-700 mb-1">Motif / Référence</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Retrait MoMo agent boutique"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="rounded-xl bg-indigo-50/80 p-3 border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-900">
            <Info className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
            <span>
              Ce virement transfert <strong>{formatAmount(parsedAmount)}</strong> de {CASH_ACCOUNT_LABELS[from]} vers{' '}
              {CASH_ACCOUNT_LABELS[to]} sans altérer le chiffre d’affaires comptable.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold" disabled={busy}>
              {busy ? 'Transfert...' : 'Valider le transfert'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
