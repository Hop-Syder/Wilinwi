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
    <div className="min-h-screen bg-slate-50/50 font-sans antialiased text-slate-900 relative overflow-hidden">
      {/* Ligne de dégradé de marque en haut */}
      <div className="h-1 w-full bg-gradient-to-r from-[#12355B] via-[#00A86B] to-[#F59E0B]" />

      {/* Halos lumineux en arrière-plan */}
      <div className="absolute top-[-200px] left-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-[#12355B]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 -z-10 h-[700px] w-[700px] rounded-full bg-[#00A86B]/5 blur-[150px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-950 active:scale-95 sm:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="font-display text-xl font-black tracking-tight text-brand flex items-center gap-2 shrink-0" title="Wilinwi">
              <Image src="/logo.png" alt="Wilinwi" width={32} height={32} className="object-contain" />
              {user.boutiqueNom && (
                <span className="sm:hidden truncate max-w-[150px]">{user.boutiqueNom}</span>
              )}
            </Link>

            {user.boutiqueNom && (
              <span className="hidden items-center gap-1.5 border-l border-slate-200 pl-3 text-xs font-bold text-brand truncate max-w-[200px] md:max-w-xs sm:flex">
                🏢 {user.boutiqueNom}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <OfflineIndicator state={state} pending={pending} />
            
            {/* Badge Utilisateur (Desktop) */}
            <div className="hidden items-center gap-3 rounded-xl border border-slate-100 bg-white p-1.5 pr-3 shadow-sm sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand">
                {user.email.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-xs font-semibold text-slate-750 max-w-[120px] truncate">{user.email}</span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</span>
              </div>
            </div>

            <div className="hidden items-center gap-1.5 border-l border-slate-200 pl-3 sm:flex">
              <button
                onClick={() => void lock()}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Verrouiller"
                title="Verrouiller (poste partagé)"
              >
                <Lock className="h-4 w-4" />
              </button>
              <button
                onClick={() => signOut()}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Overlay pour le menu mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm transition-opacity sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Menu mobile (Drawer) */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between bg-white px-5 py-6 shadow-2xl transition-transform duration-300 ease-in-out sm:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex flex-col min-w-0">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="font-display text-xl font-black text-brand flex items-center gap-2" title="Wilinwi">
                <Image src="/logo.png" alt="Wilinwi" width={32} height={32} className="object-contain" />
              </Link>
              {user.boutiqueNom && (
                <span className="text-xs font-bold text-slate-500 mt-1 pl-5 truncate max-w-[180px]">
                  🏢 {user.boutiqueNom}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
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
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer',
                        active
                          ? 'bg-brand text-white shadow-lg shadow-brand/15'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-brand',
                      )}
                    >
                      <Icon className={cn('h-4.5 w-4.5 transition-colors', active ? 'text-white' : 'text-slate-400 group-hover:text-brand')} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Infos utilisateur en bas du menu mobile */}
        <div className="border-t border-slate-100 pt-4 mt-auto">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand font-bold text-sm">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-800 truncate">{user.email}</span>
              <span className="text-xs text-slate-500 font-medium">{ROLE_LABELS[user.role] ?? user.role}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                void lock();
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" />
              Verrouiller
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                signOut();
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Quitter
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        {/* Floating Sidebar (Desktop) */}
        <nav className="hidden w-52 shrink-0 sm:block">
          <div className="sticky top-20 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <ul className="space-y-1">
              {NAV.filter((item) => canSee(item.module)).map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer',
                        active
                          ? 'bg-brand text-white shadow-lg shadow-brand/15'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-brand',
                      )}
                    >
                      <Icon className={cn('h-4.5 w-4.5 transition-colors', active ? 'text-white' : 'text-slate-400 group-hover:text-brand')} />
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
    </div>
  );
}
