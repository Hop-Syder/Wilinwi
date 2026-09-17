'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Centre de Résolution des Conflits Offline (SyncConflictsModal)
 *   Permet au commerçant d'inspecter les ventes créées hors-ligne qui ont été
 *   rejetées par le serveur (ex: oversell de stock entre deux postes), de comprendre
 *   le motif de refus et de décider de la marche à suivre (écarter ou réessayer).
 * @created 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Package,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Card, Button, Badge } from '@wilinwi/ui';
import type { PendingSale } from '@wilinwi/offline';

interface SyncConflictsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rejectedSales: PendingSale[];
  onDiscard: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
}

export function SyncConflictsModal({
  isOpen,
  onClose,
  rejectedSales,
  onDiscard,
  onRetry,
}: SyncConflictsModalProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDiscard = async (sale: PendingSale) => {
    if (!window.confirm("Écarter définitivement cette vente ?\n\nLe stock local sera automatiquement recrédité sur cet appareil.")) {
      return;
    }
    setBusyId(sale.id);
    try {
      await onDiscard(sale.id);
    } finally {
      setBusyId(null);
    }
  };

  const handleRetry = async (sale: PendingSale) => {
    setBusyId(sale.id);
    try {
      await onRetry(sale.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <Card
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border-slate-200/90 shadow-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Modal */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Centre de Résolution des Conflits Hors-Ligne
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {rejectedSales.length} vente{rejectedSales.length > 1 ? 's ont' : ' a'} été refusée{rejectedSales.length > 1 ? 's' : ''} par le serveur lors de la synchronisation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Note explicative pédagogique */}
        <div className="px-5 py-3 bg-amber-50/30 border-b border-amber-100/60 flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900 leading-relaxed">
            <strong>Pourquoi ce conflit ?</strong> En mode hors-ligne, si deux appareils vendent le même dernier article ou si une règle stricte (ex: stock épuisé sur le serveur) est violée, le serveur rejette la transaction finale pour protéger l'intégrité de vos stocks. Vous pouvez annuler la vente pour libérer le stock local ou réapprovisionner puis réessayer.
          </p>
        </div>

        {/* Liste des ventes en conflit */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {rejectedSales.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Aucun conflit en attente</p>
              <p className="text-xs text-slate-400">Toutes vos ventes locales sont parfaitement synchronisées avec le serveur.</p>
            </div>
          ) : (
            rejectedSales.map((sale) => {
              const total = sale.payload.items.reduce((acc, it) => acc + it.quantite * it.prixReel, 0);
              const dateStr = new Date(sale.createdAt).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={sale.id}
                  className="rounded-xl border border-slate-200/90 p-4 space-y-3 bg-slate-50/50 hover:bg-white transition-colors shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        #{sale.id.slice(0, 8)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="h-3 w-3" /> {dateStr}
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">
                      {total.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  {/* Message d'erreur serveur */}
                  <div className="flex items-start gap-2 rounded-lg bg-red-50/90 border border-red-200/80 p-2.5">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-red-900">Motif de rejet serveur : </span>
                      <span className="text-red-700">{sale.error || 'Validation métier échouée (stock insuffisant ou règle violée)'}</span>
                    </div>
                  </div>

                  {/* Articles de la vente */}
                  <div className="space-y-1 text-xs text-slate-600">
                    <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider block">Articles concernés :</span>
                    <ul className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-200/60 px-3">
                      {sale.payload.items.map((it, idx) => (
                        <li key={idx} className="py-1.5 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <Package className="h-3.5 w-3.5 text-slate-400" />
                            Qté: <strong>{it.quantite}</strong>
                          </span>
                          <span className="font-mono text-slate-600">
                            {(it.quantite * it.prixReel).toLocaleString('fr-FR')} FCFA
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions commerçant */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === sale.id}
                      onClick={() => handleDiscard(sale)}
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Écarter (libérer le stock)
                    </Button>
                    <Button
                      size="sm"
                      disabled={busyId === sale.id}
                      onClick={() => handleRetry(sale)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 mr-1 ${busyId === sale.id ? 'animate-spin' : ''}`} />
                      Réessayer
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de page Modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fermer
          </Button>
        </div>
      </Card>
    </div>
  );
}
