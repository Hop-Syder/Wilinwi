/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale d'Ajustement Manuel de Stock (Axe 3 : Code couleur strict & sélection obligatoire du motif)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useEffect, useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, RefreshCw, AlertCircle } from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { formatQty } from '@wilinwi/ui';
import { apiPost } from '@/lib/api';

interface StockAdjustModalProps {
  product: ProductDto;
  initialType?: MovementType;
  initialQuantity?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export type MovementType = 'IN' | 'OUT' | 'ADJUST';

export const MOTIFS_BY_TYPE: Record<MovementType, string[]> = {
  IN: [
    'Réapprovisionnement fournisseur',
    'Retour client',
    'Transfert reçu',
    'Correction stock positif',
  ],
  OUT: [
    'Casse / Avarié',
    'Produit périmé',
    'Vol / Perte',
    'Usage interne / Consommation',
    'Don / Échantillon',
  ],
  ADJUST: [
    'Régularisation inventaire physique',
    'Erreur de comptage',
    'Ajustement de démarrage',
  ],
};

export function StockAdjustModal({
  product,
  initialType = 'IN',
  initialQuantity = 1,
  onClose,
  onSuccess,
}: StockAdjustModalProps) {
  const [type, setType] = useState<MovementType>(initialType);
  const [quantite, setQuantite] = useState<string>(String(initialQuantity));
  const [motif, setMotif] = useState<string>('');
  const [customMotif, setCustomMotif] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setType(initialType);
    setQuantite(String(initialQuantity));
    setMotif('');
    setCustomMotif('');
    setError(null);
  }, [product.id, initialQuantity, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantite, 10);
    const finalMotif = motif === 'Autre' ? customMotif.trim() : motif.trim();

    if (isNaN(qty) || (type === 'ADJUST' ? qty === 0 : qty <= 0)) {
      setError(type === 'ADJUST'
        ? 'La régularisation doit être différente de zéro (positive ou négative).'
        : 'Veuillez saisir une quantité valide supérieure à 0.');
      return;
    }
    if (!finalMotif) {
      setError('La sélection d\'un motif est obligatoire.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiPost('/api/stock/movements', {
        productId: product.id,
        type,
        quantite: qty,
        motif: finalMotif,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement du mouvement.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeColorHeader = type === 'IN'
    ? 'bg-emerald-600 text-white'
    : type === 'OUT'
      ? 'bg-rose-600 text-white'
      : 'bg-blue-600 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl space-y-4">
        {/* Header Dynamique par Couleur (Vert, Rouge, Bleu) */}
        <div className={`flex items-center justify-between px-6 py-4 transition-colors ${activeColorHeader}`}>
          <div className="flex items-center gap-2">
            {type === 'IN' && <ArrowUpRight className="h-5 w-5" />}
            {type === 'OUT' && <ArrowDownRight className="h-5 w-5" />}
            {type === 'ADJUST' && <RefreshCw className="h-5 w-5" />}
            <h3 className="font-bold text-base">Ajustement de Stock — {product.nom}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Sélection du Type de Mouvement */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Type de Mouvement
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setType('IN'); setMotif(''); }}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                  type === 'IN'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                <span>Entrée (Vert)</span>
              </button>

              <button
                type="button"
                onClick={() => { setType('OUT'); setMotif(''); }}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                  type === 'OUT'
                    ? 'bg-rose-50 text-rose-800 border-rose-500 ring-2 ring-rose-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
                <span>Sortie (Rouge)</span>
              </button>

              <button
                type="button"
                onClick={() => { setType('ADJUST'); setMotif(''); }}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                  type === 'ADJUST'
                    ? 'bg-blue-50 text-blue-800 border-blue-500 ring-2 ring-blue-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <span>Régulariser (Bleu)</span>
              </button>
            </div>
          </div>

          {/* Quantité & Stock Actuel */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantité d'unités
              </label>
              <input
                type="number"
                min={type === 'ADJUST' ? undefined : '1'}
                required
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {type === 'ADJUST' && (
                <p className="mt-1 text-[11px] text-blue-700">Saisissez un nombre positif pour ajouter, négatif pour retirer.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <span className="text-slate-500 block font-medium">Stock actuel en rayon :</span>
              <strong className="font-mono text-sm font-extrabold text-slate-900">{formatQty(product.stock)}</strong>
            </div>
          </div>

          {/* Sélection Obligatoire du Motif */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Motif du mouvement <span className="text-rose-600">*</span>
            </label>
            <select
              required
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Sélectionner le motif obligatoire --</option>
              {MOTIFS_BY_TYPE[type].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="Autre">Autre motif personnalisé...</option>
            </select>
          </div>

          {motif === 'Autre' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Préciser le motif personnalisé
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Erreur de livraison fournisseur..."
                value={customMotif}
                onChange={(e) => setCustomMotif(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions Modale */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 ${
                type === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : type === 'OUT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Enregistrement...' : 'Valider l\'ajustement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
