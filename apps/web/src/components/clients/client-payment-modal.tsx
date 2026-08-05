/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale d'encaissement de remboursement de dette client + Reçu thermique imprimable
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { X, DollarSign, Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ClientDto, PaymentMethod } from '@wilinwi/types';
import { Button, formatFCFA } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

interface ClientPaymentModalProps {
  client: ClientDto;
  onClose: () => void;
  onSubmitPayment: (amount: number, method: PaymentMethod, note?: string) => Promise<void>;
}

export function ClientPaymentModal({
  client,
  onClose,
  onSubmitPayment,
}: ClientPaymentModalProps) {
  const { formatAmount } = useCurrency();
  const currentDebt = client.soldeCredit ?? 0;

  const [amount, setAmount] = useState<string>(currentDebt > 0 ? String(currentDebt) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État post-paiement pour afficher le reçu thermique de remboursement
  const [paidReceipt, setPaidReceipt] = useState<{
    detteAnterieure: number;
    versement: number;
    resteAPayer: number;
    methode: PaymentMethod;
    date: string;
  } | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const resteAPayer = Math.max(0, currentDebt - parsedAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setError('Le montant doit être supérieur à 0 FCFA');
      return;
    }
    if (parsedAmount > currentDebt && currentDebt > 0) {
      if (!confirm(`Le montant (${formatAmount(parsedAmount)}) est supérieur à la dette actuelle (${formatAmount(currentDebt)}). Voulez-vous continuer ?`)) {
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmitPayment(parsedAmount, method, note);
      setPaidReceipt({
        detteAnterieure: currentDebt,
        versement: parsedAmount,
        resteAPayer,
        methode: method,
        date: new Date().toLocaleString('fr-FR'),
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’enregistrement du remboursement');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={onClose}>
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #reimbursement-print, #reimbursement-print * { visibility: visible !important; }
        #reimbursement-print { position: absolute; left: 0; top: 0; width: 80mm; padding: 4mm; box-shadow: none !important; margin: 0; page-break-inside: avoid; }
        .no-print { display: none !important; }
        @page { size: auto; margin: 0mm; }
      }`}</style>

      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="no-print flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Encaissement de Remboursement</h3>
              <p className="text-[11px] text-slate-500 font-medium">Client : {client.nom}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps : Formulaire ou Reçu Thermique généré */}
        {!paidReceipt ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Synthèse Dette Actuelle */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Dette Actuelle</p>
                <p className="text-lg font-extrabold text-rose-600 font-mono">{formatAmount(currentDebt)}</p>
              </div>
              {client.plafondCredit && (
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Plafond Crédit</p>
                  <p className="text-xs font-bold text-slate-700 font-mono">{formatAmount(client.plafondCredit)}</p>
                </div>
              )}
            </div>

            {/* Saisie Montant Versé */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Montant du Versement (FCFA) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 10000"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-base font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setAmount(String(currentDebt))}
                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  Payer la totalité ({formatAmount(currentDebt)})
                </button>
                {currentDebt > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.round(currentDebt / 2)))}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Moitié (50%)
                  </button>
                )}
              </div>
            </div>

            {/* Restant Estimé */}
            {parsedAmount > 0 && (
              <div className="flex items-center justify-between text-xs font-semibold px-1 text-slate-600">
                <span>Nouveau Reste à Payer :</span>
                <span className="font-mono font-bold text-emerald-700">{formatAmount(resteAPayer)}</span>
              </div>
            )}

            {/* Mode de Règlement */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                Mode de Règlement <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'CASH', label: '🟢 Espèces' },
                  { id: 'MOBILE_MONEY', label: '🟡 Mobile Money' },
                  { id: 'BANK_CARD', label: '🔵 Carte / Virement' },
                  { id: 'CREDIT', label: '🔴 Avoir' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id as PaymentMethod)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                      method === m.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note / Libellé */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Note / Observation (facultatif)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Acompte sur facture REC-1042"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy}>
                {busy ? 'Enregistrement...' : 'Valider l’encaissement'}
              </Button>
            </div>
          </form>
        ) : (
          /* Écran Succès & Reçu Thermique Imprimable */
          <div className="p-5 space-y-4 text-center">
            <div className="no-print mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="no-print">
              <h4 className="text-base font-extrabold text-slate-900">Remboursement Enregistré !</h4>
              <p className="text-xs text-slate-500">Le solde du client a été mis à jour dans la trésorerie.</p>
            </div>

            {/* Zone imprimable 80mm */}
            <div id="reimbursement-print" className="my-2 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-left font-mono text-xs text-slate-900 space-y-2">
              <div className="text-center border-b border-slate-200 pb-2">
                <p className="font-bold text-sm">REÇU DE REMBOURSEMENT</p>
                <p className="text-[11px] text-slate-500">{paidReceipt.date}</p>
                <p className="text-xs font-bold text-slate-800 mt-1">Client : {client.nom}</p>
              </div>

              <div className="flex justify-between">
                <span>Dette Antérieure :</span>
                <span className="font-bold">{formatFCFA(paidReceipt.detteAnterieure)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Versement Effectué :</span>
                <span>-{formatFCFA(paidReceipt.versement)}</span>
              </div>
              <div className="my-1 border-t border-slate-200" />
              <div className="flex justify-between font-extrabold text-slate-900 text-sm">
                <span>Reste à Payer :</span>
                <span>{formatFCFA(paidReceipt.resteAPayer)}</span>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                Mode de règlement : {paidReceipt.methode}
                <br />
                Merci de votre confiance ! — Wilinwi
              </div>
            </div>

            {/* Actions post-encaissement */}
            <div className="no-print flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Fermer
              </Button>
              <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1.5" /> Imprimer le reçu
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
