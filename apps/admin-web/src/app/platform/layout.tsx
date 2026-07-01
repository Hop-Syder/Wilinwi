'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Coque cockpit : sidebar de navigation + en-tête + garde super-admin.
 *   Garde côté client (l'API reste la source de vérité via PlatformAdminGuard).
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  LogOut,
  ShieldAlert,
  RefreshCw,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  BarChart3,
  ScrollText,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@wilinwi/ui';
import { useAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/platform', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/platform/entreprises', label: 'Entreprises', icon: Building2 },
  { href: '/platform/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/platform/abonnements', label: 'Abonnements', icon: CreditCard },
  { href: '/platform/revenus', label: 'Revenus', icon: TrendingUp },
  { href: '/platform/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/platform/logs', label: 'Journaux', icon: ScrollText },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <main className="flex h-screen items-center justify-center bg-background text-text-secondary">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!user.isPlatformAdmin) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <ShieldAlert className="h-10 w-10 text-danger" />
        <h1 className="text-lg font-bold text-text-primary">Accès refusé</h1>
        <p className="max-w-xs text-sm text-text-secondary">
          Ce compte ({user.email}) n&apos;est pas autorisé sur la console Wilinwi.
        </p>
        <Button variant="outline" size="sm" onClick={() => signOut()} className="mt-2">
          Se déconnecter
        </Button>
      </main>
    );
  }

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-3 flex items-center gap-2 px-2 py-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-black">Wilinwi</div>
          <div className="text-[10px] text-text-secondary">Console · Nexus Partners</div>
        </div>
      </div>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <Icon className="h-4.5 w-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-md p-1.5 text-text-secondary hover:bg-surface-hover lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-sm font-black">Wilinwi · Console</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] text-text-secondary sm:inline">{user.email}</span>
            <Button variant="outline" size="sm" onClick={() => signOut()} className="flex items-center gap-1.5">
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-60 shrink-0 overflow-y-auto border-r border-border bg-surface/50 lg:block">
          {sidebar}
        </aside>

        {/* Sidebar (mobile, overlay) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-20 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-[57px] h-[calc(100vh-57px)] w-60 overflow-y-auto border-r border-border bg-surface">
              {sidebar}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
