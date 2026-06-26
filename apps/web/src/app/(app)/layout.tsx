'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Layout de l'application (Route: (app))
 * @created 2026-06-20
 * @updated 2026-06-25
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Receipt,
  BarChart3,
  Users,
  Wallet,
  LogOut,
  Settings,
  Lock,
  Menu,
  X,
  Truck,
} from 'lucide-react';
import { OfflineIndicator, cn } from '@wilinwi/ui';
import { ROLE_LABELS, type ModuleKey } from '@wilinwi/types';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/use-sync';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { PinSwitchModal, type PinUser } from '@/components/PinSwitchModal';
import { Preloader } from '@/components/preloader';

const NAV: { href: string; label: string; icon: typeof LayoutGrid; module?: ModuleKey | 'ADMIN' }[] = [
  { href: '/', label: 'Hub', icon: LayoutGrid },
  { href: '/dashboard', label: 'Tableau de bord', icon: BarChart3, module: 'ANALYTICS' },
  { href: '/stock', label: 'Stock', icon: Package, module: 'STOCK' },
  { href: '/pos', label: 'Caisse', icon: ShoppingCart, module: 'POS' },
  { href: '/ventes', label: 'Ventes', icon: Receipt, module: 'POS' },
  { href: '/clients', label: 'Clients', icon: Users, module: 'CRM' },
  { href: '/tresorerie', label: 'Trésorerie', icon: Wallet, module: 'PAY' },
  { href: '/livraisons', label: 'Livraisons', icon: Truck, module: 'DELIVERY' },
  { href: '/parametres', label: 'Paramètres', icon: Settings, module: 'ADMIN' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, loginWithPin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { state, pending } = useSync();
  const [locked, setLocked] = useState(false);
  const [pinUsers, setPinUsers] = useState<PinUser[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function lock() {
    try {
      setPinUsers(await apiGet<PinUser[]>('/api/users/pos'));
    } catch {
      setPinUsers([]);
    }
    setLocked(true);
  }

  async function unlock(userId: string, pin: string) {
    try {
      const res = await apiPost<{ access_token: string }>('/api/auth/pin-login', { userId, pin });
      await loginWithPin(res.access_token);
      setLocked(false);
    } catch (e) {
      // PIN refusé : le modal réinitialise la saisie. (rate-limit côté serveur)
      void (e as ApiError);
    }
  }

  const canSee = (m?: ModuleKey | 'ADMIN') => {
    if (!m) return true;
    if (m === 'ADMIN') return user?.role === 'OWNER' || user?.role === 'MANAGER';
    return user?.modules.includes(m) ?? false;
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <Preloader />;
  }

  if (locked) {
    return (
      <PinSwitchModal
        users={pinUsers}
        onUnlock={(id, pin) => void unlock(id, pin)}
        onCancel={() => setLocked(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-text-primary relative overflow-hidden">
      {/* Conteneur de navigation fixe (Sticky) */}
      <div className="sticky top-0 z-30 w-full">
        {/* Ligne de dégradé de marque en haut (Black Luxury: Gold, Blue, Green) */}
        <div className="h-1 w-full bg-gradient-to-r from-[#C79A2B] via-[#2563EB] to-[#10B981]" />

        {/* Header / Navbar */}
        <header className="w-full border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Navigation mobile */}
            <Link href="/" className="font-display text-xl font-black tracking-tight text-primary flex items-center gap-2 shrink-0" title="Wilinwi">
              <Image src="/logo.png" alt="Wilinwi" width={150} height={150} className="object-contain" />
              {user.boutiqueNom && (
                <span className="sm:hidden truncate max-w-[150px]">{user.boutiqueNom}</span>
              )}
            </Link>

            {user.boutiqueNom && (
              <span className="hidden items-center gap-2 border-l border-border pl-4 text-base font-extrabold tracking-tight text-text-primary sm:flex">
                <span className="text-primary text-lg">🏢</span> {user.boutiqueNom}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <OfflineIndicator state={state} pending={pending} />
            
            {/* Badge Utilisateur (Desktop) */}
            <div className="hidden items-center gap-3 rounded border border-border bg-surface p-1.5 pr-3 shadow-sm sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                {user.email.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-xs font-semibold text-text-primary max-w-[120px] truncate">{user.email}</span>
                <span className="text-[10px] text-text-secondary font-medium mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</span>
              </div>
            </div>

            <div className="hidden items-center gap-1.5 border-l border-border pl-3 sm:flex">
              <button
                onClick={() => void lock()}
                className="flex h-9 w-9 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                aria-label="Verrouiller"
                title="Verrouiller (poste partagé)"
              >
                <Lock className="h-4 w-4" />
              </button>
              <button
                onClick={() => signOut()}
                className="flex h-9 w-9 items-center justify-center rounded text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
      </div>

      {/* Halos lumineux en arrière-plan (Or et Bleu) */}
      <div className="absolute top-[-200px] left-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-[#C79A2B]/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 -z-10 h-[700px] w-[700px] rounded-full bg-[#2563EB]/3 blur-[150px] pointer-events-none" />

      {/* Overlay pour le menu mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Menu mobile (Drawer) */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between bg-surface border-r border-border px-5 py-6 shadow-2xl transition-transform duration-300 ease-in-out sm:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div className="flex flex-col min-w-0">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="font-display text-xl font-black text-primary flex items-center gap-2" title="Wilinwi">
                <Image src="/logo.png" alt="Wilinwi" width={150} height={150} className="object-contain" />
              </Link>
              {user.boutiqueNom && (
                <span className="text-xs font-bold text-text-secondary mt-1 pl-5 truncate max-w-[180px]">
                  🏢 {user.boutiqueNom}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-2">
            <ul className="space-y-1">
              {NAV.filter((item) => canSee(item.module)).map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer',
                        active
                          ? 'bg-primary text-slate-900 shadow-md shadow-primary/10'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                      )}
                    >
                      <Icon className={cn('h-4.5 w-4.5 transition-colors', active ? 'text-slate-900' : 'text-text-secondary/60 group-hover:text-text-primary')} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Infos utilisateur en bas du menu mobile */}
        <div className="border-t border-border pt-4 mt-auto">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary font-bold text-sm">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-text-primary truncate">{user.email}</span>
              <span className="text-xs text-text-secondary font-medium">{ROLE_LABELS[user.role] ?? user.role}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                void lock();
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded border border-border bg-surface py-2 text-xs font-semibold text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <Lock className="h-3.5 w-3.5" />
              Verrouiller
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                signOut();
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded border border-border bg-surface py-2 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Quitter
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pt-6 pb-24 sm:pb-6">
        {/* Floating Sidebar (Desktop) */}
        <nav className="hidden w-52 shrink-0 sm:block">
          <div className="sticky top-20 flex flex-col gap-4 rounded border border-border bg-surface p-4 shadow-sm">
            <ul className="space-y-1">
              {NAV.filter((item) => canSee(item.module)).map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group flex items-center gap-3 rounded px-3 py-2 text-sm font-semibold transition-all duration-250 cursor-pointer',
                        active
                          ? 'bg-primary text-slate-900 shadow-md shadow-primary/10'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                      )}
                    >
                      <Icon className={cn('h-4.5 w-4.5 transition-colors', active ? 'text-slate-900' : 'text-text-secondary/60 group-hover:text-text-primary')} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Content main */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Barre d'onglets mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {NAV.filter((item) => canSee(item.module))
            .slice(0, 4)
            .map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors',
                    active ? 'text-primary' : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  <Icon className={cn('h-5 w-5', active && 'scale-110 transition-transform')} />
                  <span className="max-w-[64px] truncate">{label}</span>
                </Link>
              );
            })}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
          >
            <Menu className="h-5 w-5" />
            <span>Plus</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
