/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Panneau d'alertes de gestion (ruptures de stock, créances clients, dettes échues)
 * @created 2026-09-21
 * @updated 2026-09-21
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import Link from 'next/link';
import { PackageX, Users, FileWarning, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCurrency } from '@/lib/currency-context';

interface AlertesRupture {
  id: string;
  nom: string;
  stock: number;
}

interface AlertsPanelProps {
  ruptures?: AlertesRupture[];
  clientsEnDetteCount?: number;
  dettesEchuesCount?: number;
  creditsEncours?: number;
}

export function AlertsPanel({
  ruptures = [],
  clientsEnDetteCount = 0,
  dettesEchuesCount = 0,
  creditsEncours = 0,
}: AlertsPanelProps) {
  const { formatAmount } = useCurrency();
  const hasAlerts = ruptures.length > 0 || clientsEnDetteCount > 0 || dettesEchuesCount > 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs h-full flex flex-col space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${hasAlerts ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
        >
          {hasAlerts ? <FileWarning className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            Actions de Gestion
          </h3>
          <p className="text-xs text-slate-500 font-medium">Alertes & urgences opérationnelles</p>
        </div>
      </div>

      {!hasAlerts && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-4">
          <ShieldCheck className="h-10 w-10 text-emerald-500" />
          <p className="text-sm font-bold text-slate-800">Aucune alerte critique</p>
          <p className="text-xs text-slate-500">
            Stocks sains, aucune relance client urgente. Tout est sous contrôle.
          </p>
        </div>
      )}

      {ruptures.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageX className="h-4 w-4 text-rose-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Produits presque finis ({ruptures.length})
              </span>
            </div>
            <Link
              href="/stock"
              className="text-xs font-bold text-rose-700 hover:text-rose-800 inline-flex items-center gap-1 cursor-pointer"
            >
              Réapprovisionner <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-1">
            {ruptures.slice(0, 4).map((produit) => (
              <li key={produit.id} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 truncate pr-2">{produit.nom}</span>
                <span
                  className={`font-mono font-bold tabular-nums ${produit.stock <= 0 ? 'text-rose-700' : 'text-amber-600'}`}
                >
                  {produit.stock <= 0 ? 'Épuisé' : `${produit.stock} restant(s)`}
                </span>
              </li>
            ))}
            {ruptures.length > 4 && (
              <li className="text-[11px] font-medium text-slate-500 pt-1">
                + {ruptures.length - 4} autre(s) produit(s) en alerte
              </li>
            )}
          </ul>
        </div>
      )}

      {clientsEnDetteCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Clients qui me doivent de l'argent ({clientsEnDetteCount})
              </span>
            </div>
            <Link
              href="/clients"
              className="text-xs font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
            >
              Relancer <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-black text-slate-900 tabular-nums">
              {formatAmount(creditsEncours)}
            </span>
            <span className="text-[11px] font-medium text-slate-500">en attente de paiement</span>
          </div>
        </div>
      )}

      {dettesEchuesCount > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Factures fournisseurs en retard ({dettesEchuesCount})
              </span>
            </div>
            <Link
              href="/tresorerie"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
            >
              Payer <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Engagements fournisseurs à régulariser en priorité.
          </p>
        </div>
      )}
    </div>
  );
}
