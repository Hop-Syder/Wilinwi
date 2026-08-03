/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale d'enregistrement rapide des dépenses courantes pour le Dashboard
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@wilinwi/ui';

interface DashboardExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  montant: string;
  motif: string;
  submitting: boolean;
  onMontantChange: (val: string) => void;
  onMotifChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function DashboardExpenseModal({
  isOpen,
  onClose,
  montant,
  motif,
  submitting,
  onMontantChange,
  onMotifChange,
  onSubmit,
}: DashboardExpenseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-bold text-slate-900 text-base">Enregistrer une Dépense Caisse</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Montant (FCFA) *
            </label>
            <input
              type="number"
              min={1}
              required
              placeholder="Ex: 5000"
              value={montant}
              onChange={(e) => onMontantChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Motif / Justification *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Achat carburant livraison, Fournitures..."
              value={motif}
              onChange={(e) => onMotifChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Annuler
            </Button>
            <Button type="submit" variant="emerald" disabled={submitting} className="rounded-xl">
              {submitting ? 'Enregistrement…' : 'Valider la dépense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
