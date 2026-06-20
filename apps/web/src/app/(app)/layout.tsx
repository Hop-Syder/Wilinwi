'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Layout de l'application (Route: (app))
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, Package, ShoppingCart, BarChart3, Users, LogOut } from 'lucide-react';
import { OfflineIndicator, cn } from '@wilinwi/ui';
import { ROLE_LABELS } from '@wilinwi/types';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/use-sync';

const NAV = [
  { href: '/', label: 'Hub', icon: LayoutGrid },
  { href: '/dashboard', label: 'Tableau de bord', icon: BarChart3 },
  { href: '/stock', label: 'Stock', icon: Package },
  { href: '/pos', label: 'Caisse', icon: ShoppingCart },
  { href: '/clients', label: 'Clients', icon: Users },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { state, pending } = useSync();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-display text-lg font-bold text-brand">
            ◈ Wilinwi
          </Link>
          <div className="flex items-center gap-3">
            <OfflineIndicator state={state} pending={pending} />
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.email} · {ROLE_LABELS[user.role] ?? user.role}
            </span>
            <button
              onClick={() => signOut()}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <nav className="hidden w-48 shrink-0 sm:block">
          <ul className="space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      active ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
