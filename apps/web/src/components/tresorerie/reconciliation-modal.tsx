/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale de Pointage & Vérification du Solde Réel MoMo / Caisse (ReconciliationModal / CashClose)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { X, Scale, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { type CashAccount } from '@wilinwi/types';
import { Button } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

interface ReconciliationModalProps {
  balances: Record<CashAccount, number>;
  onClose: () => void;
  onSubmitClose: (dto: { compte: CashAccount; soldeReel: number; note?: string }) => Promise<void>;
}

export function ReconciliationModal({
  balances,
  onClose,
  onSubmitClose,
}: ReconciliationModalProps) {
  const { formatAmount } = useCurrency();
  const [compte, setCompte] = useState<CashAccount>('MOBILE_MONEY');

  const soldeTheorique = balances[compte] ?? 0;
  const [soldeReelInput, setSoldeReelInput] = useState<string>(String(soldeTheorique));
  const [note, setNote] = useState<string>('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedSoldeReel = parseFloat(soldeReelInput) || 0;
  const ecart = parsedSoldeReel - soldeTheorique;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ecart !== 0 && !note.trim()) {
      setError('Un motif est obligatoire lorsqu’un écart de caisse est constaté');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmitClose({
        compte,
        soldeReel: parsedSoldeReel,
        note: note || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du pointage du solde');
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
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Pointage & Vérification du Solde Réel</h3>
              <p className="text-[11px] text-slate-500 font-medium">Réconciliation du téléphone MoMo ou du tiroir</p>
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

          {/* Choix du compte */}
          <div>
            <label className="block font-extrabold text-slate-700 mb-1">Compte à Pointer</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'MOBILE_MONEY', label: '🟡 Mobile Money' },
                { id: 'CAISSE', label: '🟢 Caisse Espèces' },
                { id: 'BANQUE', label: '🏦 Banque' },
              ].map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    setCompte(acc.id as CashAccount);
                    setSoldeReelInput(String(balances[acc.id as CashAccount] ?? 0));
                  }}
                  className={`px-2.5 py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                    compte === acc.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Solde Théorique Wilinwi vs Solde Réel Saisi */}
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Solde Théorique (Wilinwi) :</span>
              <span className="font-mono font-extrabold text-slate-900">{formatAmount(soldeTheorique)}</span>
            </div>

            <div>
              <label className="block font-extrabold text-slate-800 mb-1">
                Solde Réel Constaté ({compte === 'MOBILE_MONEY' ? 'Sur l’écran du téléphone' : 'Dans le tiroir-caisse'}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={soldeReelInput}
                onChange={(e) => setSoldeReelInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-base font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Analyse de l'Écart */}
          <div className="rounded-xl p-3 border space-y-1">
            <div className="flex justify-between items-center text-xs font-extrabold">
              <span>Écart de Réconciliation :</span>
              <span
                className={`font-mono text-sm ${
                  ecart === 0 ? 'text-emerald-600' : ecart > 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {ecart > 0 ? `+${formatAmount(ecart)}` : formatAmount(ecart)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {ecart === 0 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Solde parfaitement conforme !
                </span>
              ) : ecart > 0 ? (
                <span className="text-emerald-700 font-bold">Surplus de caisse constaté.</span>
              ) : (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Déficit constaté — Motif obligatoire ci-dessous.
                </span>
              )}
            </p>
          </div>

          {/* Remarque / Motif */}
          <div>
            <label className="block font-extrabold text-slate-700 mb-1">
              Motif / Observation {ecart !== 0 && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              required={ecart !== 0}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={ecart < 0 ? 'Ex: Erreur de rendu de monnaie' : 'Observation sur le solde MoMo'}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold" disabled={busy}>
              {busy ? 'Enregistrement...' : 'Valider le pointage'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
