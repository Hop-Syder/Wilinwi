/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Skeletons de chargement adaptés aux widgets du Tableau de bord
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';

export function KpiCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="h-8 w-8 rounded-xl bg-slate-100" />
      </div>
      <div className="space-y-2">
        <div className="h-7 w-36 rounded bg-slate-200" />
        <div className="h-4 w-24 rounded bg-slate-100" />
      </div>
      <div className="h-3 w-32 rounded bg-slate-100" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="h-3 w-64 rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-72 w-full rounded-xl bg-slate-100 flex items-end justify-between p-4 gap-2">
        {[40, 65, 30, 85, 50, 90, 70, 45, 60, 80].map((h, i) => (
          <div
            key={i}
            className="w-full rounded-t bg-slate-200"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function DonutSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm flex flex-col justify-between h-full space-y-4">
      <div className="space-y-2">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="h-3 w-48 rounded bg-slate-100" />
      </div>
      <div className="flex items-center justify-center h-52">
        <div className="h-40 w-40 rounded-full border-8 border-slate-200 flex items-center justify-center">
          <div className="h-12 w-20 rounded bg-slate-100" />
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-3 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeletonGrid() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartSkeleton />
        </div>
        <div>
          <DonutSkeleton />
        </div>
      </div>
    </div>
  );
}
