/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale Workflow Dispatch à 3 Étapes (Expédition, Scan Réception & Traitement des Écarts + Bordereau Imprimable)
 * @created 2026-08-05
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { Truck, X, Camera, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';
import type { DispatchOrderDto, ProductDto } from '@wilinwi/types';
import { formatQty } from '@wilinwi/ui';
import { BarcodeScannerModal } from '@/components/stock/barcode-scanner-modal';

interface DispatchReceiveModalProps {
  dispatch: DispatchOrderDto;
  products?: ProductDto[];
  onClose: () => void;
  onConfirmReceive: (data: { receivedQty: Record<string, number>; motifEcart?: string }) => Promise<void>;
}

const REASON_OPTIONS = [
  'Avarie en cours de transport',
  'Carton abîmé à la réception',
  'Erreur de comptage au chargement',
  'Perte / Vol présumé',
  'Autre anomalie',
];

export function DispatchReceiveModal({ dispatch, products = [], onClose, onConfirmReceive }: DispatchReceiveModalProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [receivedQty, setReceivedQty] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    dispatch.items.forEach((item) => {
      map[item.productId] = item.quantite ?? 0;
    });
    return map;
  });

  const [motifEcart, setMotifEcart] = useState('');
  const [busy, setBusy] = useState(false);

  // Helper pour trouver un produit par ID
  const getProduct = (productId: string) => products.find((p) => p.id === productId);

  // Vérification de présence d'écart
  const hasDiscrepancy = dispatch.items.some((item) => {
    const exp = item.quantite ?? 0;
    const rec = receivedQty[item.productId] ?? 0;
    return rec !== exp;
  });

  const handleScanCode = (barcode: string) => {
    // Trouver le produit correspondant par SKU ou ID
    const prod = products.find((p) => p.sku === barcode || p.id === barcode);
    const match = dispatch.items.find(
      (item) => item.productId === barcode || (prod && item.productId === prod.id)
    );
    if (match) {
      setReceivedQty((prev) => ({
        ...prev,
        [match.productId]: (prev[match.productId] || 0) + 1,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasDiscrepancy && !motifEcart.trim()) {
      alert('Veuillez saisir le motif obligatoire pour expliquer l\'écart constaté.');
      return;
    }
    setBusy(true);
    try {
      await onConfirmReceive({ receivedQty, motifEcart: hasDiscrepancy ? motifEcart : undefined });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réception');
    } finally {
      setBusy(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* En-tête Modale */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Réception & Pointage Dispatch <span className="font-mono text-xs text-teal-700">#{dispatch.reference}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Contrôle des marchandises reçues en réserve</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Scan Caméra Mobile */}
        <div className="flex items-center justify-between rounded-2xl bg-teal-50/70 border border-teal-200/80 p-3.5">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-teal-700" />
            <span className="text-xs font-bold text-teal-900">Scan Réception Caméra Mobile</span>
          </div>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-2xs hover:bg-teal-700 active:scale-95 transition-all"
          >
            <Camera className="h-3.5 w-3.5" /> <span>Scanner</span>
          </button>
        </div>

        {/* Formulaire de Pointage */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Quantités Expédiées vs Reçues
            </label>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
              {dispatch.items.map((item) => {
                const exp = item.quantite ?? 0;
                const rec = receivedQty[item.productId] ?? 0;
                const isDiff = rec !== exp;
                const prod = getProduct(item.productId);

                return (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {prod?.nom || `Produit #${item.productId.substring(0, 8)}`}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Expédié : <strong>{formatQty(exp)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        value={rec}
                        onChange={(e) =>
                          setReceivedQty({
                            ...receivedQty,
                            [item.productId]: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className={`w-20 rounded-xl border px-3 py-1.5 font-mono text-sm font-bold text-center outline-none ${
                          isDiff
                            ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-200 bg-white text-slate-900 focus:border-teal-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* En cas d'Écart Constaté */}
          {hasDiscrepancy && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 space-y-2.5 animate-shake">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-extrabold">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Écart Détecté 🔴 — Motif obligatoire requis</span>
              </div>

              <select
                value={motifEcart}
                onChange={(e) => setMotifEcart(e.target.value)}
                className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              >
                <option value="">-- Sélectionner le motif de l'anomalie --</option>
                {REASON_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Boutons d'Action */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-4 w-4 text-slate-500" /> Imprimer Bordereau
            </button>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:bg-teal-700 active:scale-95 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" /> Valider Réception
            </button>
          </div>
        </form>
      </div>

      {/* Scanner Caméra Modal */}
      {showScanner && (
        <BarcodeScannerModal
          onScan={handleScanCode}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
