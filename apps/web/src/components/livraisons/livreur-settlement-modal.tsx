/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale de Pointage & Réception des Fonds Livreur (COD Settlement)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';
import type { CashAccount } from '@wilinwi/types';
import { Button } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

export interface SettlementDeliveryItem {
  id: string;
  total: number;
  fraisLivraison?: number;
  clientNom?: string | null;
  clientTel?: string | null;
  adresseLivraison?: string | null;
  createdAt: string;
  livreurId?: string | null;
  livreurNom?: string | null;
  settled?: boolean;
}

interface LivreurSettlementModalProps {
  livreurs: { id: string; nom: string }[];
  deliveries: SettlementDeliveryItem[];
  onClose: () => void;
  onSettle: (selectedIds: string[], targetAccount: CashAccount, totalAmount: number) => Promise<void>;
}

export function LivreurSettlementModal({
  livreurs,
  deliveries,
  onClose,
  onSettle,
}: LivreurSettlementModalProps) {
  const { formatAmount } = useCurrency();

  const [selectedLivreurId, setSelectedLivreurId] = useState<string>(livreurs[0]?.id || '');
  const [targetAccount, setTargetAccount] = useState<CashAccount>('CAISSE');

  // Livraisons livrées appartenant au livreur sélectionné
  const livreurDeliveries = deliveries.filter(
    (d) => d.livreurId === selectedLivreurId && !d.settled
  );

  // IDs sélectionnés pour encaissement
  const [selectedIds, setSelectedIds] = useState<string[]>(
    livreurDeliveries.map((d) => d.id)
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle selection
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Calcul du montant total à encaisser auprès du livreur
  const totalToCollect = livreurDeliveries
    .filter((d) => selectedIds.includes(d.id))
    .reduce((sum, d) => sum + d.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError('Veuillez sélectionner au moins une livraison réglée par le livreur');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSettle(selectedIds, targetAccount, totalToCollect);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du règlement des fonds');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Pointage & Enregistrement des Fonds Livreur</h3>
              <p className="text-[11px] text-slate-500 font-medium">Réception des encaissements COD de fin de tournée</p>
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

          {/* Choix du Livreur */}
          <div>
            <label className="block font-extrabold text-slate-700 mb-1">Sélection du Livreur</label>
            <select
              value={selectedLivreurId}
              onChange={(e) => {
                setSelectedLivreurId(e.target.value);
                const items = deliveries.filter((d) => d.livreurId === e.target.value && !d.settled);
                setSelectedIds(items.map((i) => i.id));
              }}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              {livreurs.map((l) => (
                <option key={l.id} value={l.id}>
                  🛵 {l.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Compte de Destination des Fonds */}
          <div>
            <label className="block font-extrabold text-slate-700 mb-1">Compte Boutique Crédité</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'CAISSE', label: '🟢 Caisse Espèces' },
                { id: 'MOBILE_MONEY', label: '🟡 Mobile Money Boutique' },
              ].map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setTargetAccount(acc.id as CashAccount)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                    targetAccount === acc.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste des Livraisons Effectuées non Réglées */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-extrabold text-slate-700">
                Livraisons Réglées par le Livreur ({livreurDeliveries.length})
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">Cocher les courses reçues</span>
            </div>

            {livreurDeliveries.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Aucune livraison en attente de versement pour ce livreur.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200/80 rounded-xl p-2 bg-slate-50">
                {livreurDeliveries.map((d) => {
                  const isSelected = selectedIds.includes(d.id);
                  return (
                    <div
                      key={d.id}
                      onClick={() => toggleSelect(d.id)}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-white shadow-2xs'
                          : 'border-slate-200/60 bg-slate-100/60 opacity-65'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded-md text-emerald-600 accent-emerald-600"
                        />
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">
                            #{d.id.slice(0, 8).toUpperCase()} · {d.clientNom || 'Client'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {d.adresseLivraison || 'Adresse non spécifiée'}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-extrabold text-emerald-700 text-xs">
                        {formatAmount(d.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Synthèse Total Encaissé */}
          <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-800 uppercase">Montant Total Réceptionné</p>
              <p className="text-xl font-extrabold font-mono text-emerald-700">{formatAmount(totalToCollect)}</p>
            </div>
            <div className="text-right text-[11px] font-semibold text-emerald-800">
              {selectedIds.length} course{selectedIds.length > 1 ? 's' : ''} lettrée{selectedIds.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold"
              disabled={busy || selectedIds.length === 0}
            >
              {busy ? 'Validation...' : 'Valider la réception des fonds'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
