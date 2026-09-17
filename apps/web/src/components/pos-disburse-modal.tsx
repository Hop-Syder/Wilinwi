'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale de décaissement rapide d'espèces au POS (Petty Cash / Sortie de caisse).
 *   Permet au caissier d'enregistrer une dépense immédiate sans quitter l'écran de vente,
 *   avec déduction en direct du solde théorique de la session.
 * @created 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
import { ArrowUpRight, X, Wallet, AlertTriangle, CheckCircle2, Tag, FileText } from 'lucide-react';
import { Button, Card, formatFCFA, Input } from '@wilinwi/ui';
import { apiPost, ApiError } from '@/lib/api';
import type { PosSessionDto } from '@wilinwi/types';

interface PosDisburseModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: PosSessionDto | null;
  onSuccess: (updatedSession: PosSessionDto) => void;
}

const CATEGORIES = [
  { value: 'FOURNITURE', label: 'Fournitures / Papier' },
  { value: 'TRANSPORT', label: 'Transport / Livraison' },
  { value: 'APPROVISIONNEMENT', label: 'Achat urgent' },
  { value: 'ENTRETIEN', label: 'Entretien / Nettoyage' },
  { value: 'ALIMENTATION', label: 'Pause / Eau' },
  { value: 'AUTRE', label: 'Autre dépense' },
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export function PosDisburseModal({
  isOpen,
  onClose,
  activeSession,
  onSuccess,
}: PosDisburseModalProps) {
  const [montantStr, setMontantStr] = useState('');
  const [categorie, setCategorie] = useState('FOURNITURE');
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const montant = Number(montantStr) || 0;
  const soldeActuel = activeSession?.soldeTheorique ?? 0;

  const handleQuickAdd = (val: number) => {
    setMontantStr((prev) => String((Number(prev) || 0) + val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montant <= 0) {
      setError('Le montant décaissé doit être supérieur à zéro.');
      return;
    }
    if (!motif.trim()) {
      setError('Veuillez préciser le motif obligatoire de cette sortie d’argent.');
      return;
    }
    if (montant > soldeActuel) {
      setError(`Le montant (${formatFCFA(montant)}) dépasse le solde théorique disponible en caisse (${formatFCFA(soldeActuel)}).`);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await apiPost<{ movement: any; session: PosSessionDto }>(
        '/api/pos/sessions/disburse',
        {
          montant,
          motif: motif.trim(),
          categorie,
          posSessionId: activeSession?.id,
        },
      );

      onSuccess(res.session);
      onClose();
    } catch (err) {
      setError((err as ApiError).message || 'Erreur lors du décaissement');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md shadow-2xl border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Sortie d'espèces (Décaissement)</h2>
              <p className="text-xs text-slate-400">Petty Cash & Dépense immédiate de caisse</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rappel du solde en caisse */}
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/60 flex items-center justify-between text-xs">
          <span className="text-amber-900 flex items-center gap-1.5 font-medium">
            <Wallet className="w-3.5 h-3.5 text-amber-600" /> Solde actuel en caisse :
          </span>
          <span className="font-bold text-amber-950 text-sm">{formatFCFA(soldeActuel)}</span>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Saisie Montant */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Montant à décaisser (FCFA) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="50"
                step="50"
                placeholder="Ex. 1500"
                value={montantStr}
                onChange={(e) => setMontantStr(e.target.value)}
                autoFocus
                className="w-full text-xl font-extrabold p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <span className="absolute right-3 top-3.5 text-xs font-bold text-slate-400">
                FCFA
              </span>
            </div>

            {/* Boutons rapides */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd(amt)}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg transition-transform"
                >
                  +{formatFCFA(amt)}
                </button>
              ))}
              {montant > 0 && (
                <button
                  type="button"
                  onClick={() => setMontantStr('')}
                  className="px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" /> Catégorie de dépense
            </label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full text-xs font-medium p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Motif obligatoire */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Motif / Justificatif obligatoire *
            </label>
            <input
              type="text"
              placeholder="Ex. 2 rouleaux papier caisse 80mm, taxi Moussa livraison..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Boutons d'action */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={busy || montant <= 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-sm"
            >
              {busy ? 'Enregistrement…' : 'Valider le décaissement'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
