/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Bandeau d'alertes opérationnelles supérieures (Heads-Up Banner)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, AlertCircle, Clock, ChevronRight, X } from 'lucide-react';

export interface OperationalAlerts {
  ruptures?: { id: string; nom: string; stock: number }[];
  dettesEchuesCount?: number;
  clientsEnDetteCount?: number;
}

interface HeadsUpBannerProps {
  alerts: OperationalAlerts;
}

export function HeadsUpBanner({ alerts }: HeadsUpBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const rupturesCount = alerts.ruptures?.length ?? 0;
  const dettesCount = alerts.dettesEchuesCount ?? 0;

  if (dismissed || (rupturesCount === 0 && dettesCount === 0)) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm backdrop-blur-sm transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700">
          <AlertTriangle className="h-5 w-5 animate-pulse text-amber-600" />
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-900">
              Alertes opérationnelles ({rupturesCount + dettesCount} urgence{rupturesCount + dettesCount > 1 ? 's' : ''})
            </h4>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-lg p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-900 transition-colors"
              title="Masquer le bandeau"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-amber-800">
            {rupturesCount > 0 && (
              <Link
                href="/stock?filter=low"
                className="inline-flex items-center gap-1.5 hover:underline font-semibold text-amber-900"
              >
                <AlertCircle className="h-4 w-4 text-rose-500" />
                <span>
                  {rupturesCount} produit{rupturesCount > 1 ? 's' : ''} en rupture proche ({alerts.ruptures?.slice(0, 2).map((r) => r.nom).join(', ')}…)
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-amber-600" />
              </Link>
            )}

            {dettesCount > 0 && (
              <Link
                href="/clients?filter=overdue"
                className="inline-flex items-center gap-1.5 hover:underline font-semibold text-amber-900"
              >
                <Clock className="h-4 w-4 text-amber-600" />
                <span>
                  {dettesCount} échéance{dettesCount > 1 ? 's' : ''} de créance arrivée{dettesCount > 1 ? 's' : ''} à terme
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-amber-600" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
