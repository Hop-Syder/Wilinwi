'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Accueil mobile « Wave » : hero ventes du jour + gros bouton Vendre +
 *   raccourcis tactiles. App-like, connecté aux ventes du jour. Affiché sur mobile.
 */

import Link from 'next/link';
import {
  ShoppingCart,
  Package,
  Users,
  Wallet,
  Receipt,
  BarChart3,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import type { ModuleKey } from '@wilinwi/types';
import { formatFCFA } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';
import { useAuth } from '@/lib/auth-context';

interface SaleLite {
  total: number;
}

const SHORTCUTS: { label: string; href: string; icon: typeof Package; module: ModuleKey }[] = [
  { label: 'Caisse', href: '/pos', icon: ShoppingCart, module: 'POS' },
  { label: 'Stock', href: '/stock', icon: Package, module: 'STOCK' },
  { label: 'Clients', href: '/clients', icon: Users, module: 'CRM' },
  { label: 'Trésorerie', href: '/tresorerie', icon: Wallet, module: 'PAY' },
  { label: 'Ventes', href: '/ventes', icon: Receipt, module: 'POS' },
  { label: 'Rapports', href: '/dashboard', icon: BarChart3, module: 'ANALYTICS' },
];

export function WaveHome() {
  const { user } = useAuth();
  const hasPos = user?.modules.includes('POS') ?? false;

  // Total des ventes du jour (accessible à tous les rôles vendeurs via sale:read).
  const { data: sales } = useCachedQuery<SaleLite[]>(
    hasPos ? 'pos/sales/today' : null,
    () => apiGet<SaleLite[]>('/api/pos/sales/today'),
  );
  const total = (sales ?? []).reduce((s, v) => s + (v.total ?? 0), 0);
  const count = (sales ?? []).length;

  const shortcuts = SHORTCUTS.filter((s) => user?.modules.includes(s.module));

  return (
    <div className="space-y-5">
      {/* Salutation */}
      <div>
        <p className="text-sm text-text-secondary">Bonjour 👋</p>
        <h1 className="font-display text-2xl font-black tracking-tight text-text-primary">
          {user?.boutiqueNom ?? 'Votre boutique'}
        </h1>
      </div>

      {/* Hero — Ventes du jour */}
      <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-white shadow-lg shadow-primary/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-medium text-white/80">Ventes du jour</p>
          <p className="tabular mt-1 text-4xl font-black tracking-tight">{formatFCFA(total)}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <TrendingUp className="h-3.5 w-3.5" />
            {count} vente{count > 1 ? 's' : ''} aujourd&apos;hui
          </div>
        </div>
      </div>

      {/* CTA principal — Vendre */}
      {hasPos && (
        <Link
          href="/pos"
          className="flex items-center justify-center gap-2.5 rounded-2xl bg-emerald py-4 text-lg font-bold text-white shadow-md shadow-emerald/25 transition-transform active:scale-[0.98]"
        >
          <ShoppingCart className="h-6 w-6" />
          Vendre
        </Link>
      )}

      {/* Raccourcis */}
      {shortcuts.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
              Accès rapide
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {shortcuts.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-text-primary">
                  {label}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-text-secondary/40 transition-transform group-active:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
