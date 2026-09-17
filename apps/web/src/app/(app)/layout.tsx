'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Layout de l'application (Route: (app) — Conteneur élargi max-w-[1536px])
 * @created 2026-06-20
 * @updated 2026-08-03
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
  Warehouse,
  Building2,
} from 'lucide-react';
import { OfflineIndicator, cn } from '@wilinwi/ui';
import { ROLE_LABELS, type InfraCapability, type ModuleKey } from '@wilinwi/types';
import { useAuth } from '@/lib/auth-context';
import { useInfraCapabilities } from '@/lib/use-infra-capabilities';
import { useSync } from '@/lib/use-sync';
import { apiGet, apiPost, ApiError, getPinToken } from '@/lib/api';
import { PinSwitchModal, type PinUser } from '@/components/PinSwitchModal';
import { Preloader } from '@/components/preloader';
import { EtablissementSwitcher } from '@/components/etablissement-switcher';
import { DunningBanner, DunningBlock } from '@/components/dunning-banner';
import { OnboardingLocalisationModal } from '@/components/onboarding-localisation-modal';
import { NotificationBell } from '@/components/notification-bell';
import { CollapsibleSidebar } from '@/components/collapsible-sidebar';

// `infraCap` (optionnel) : capacité d'infrastructure requise pour voir l'entrée
// (TDR v2) — les entrées verticales (Food, Santé…) se brancheront ici.
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  module?: ModuleKey | 'ADMIN';
  infraCap?: InfraCapability;
};

const NAV: NavItem[] = [
  { href: '/', label: 'Hub', icon: LayoutGrid },
  { href: '/dashboard', label: 'Tableau de bord', icon: BarChart3, module: 'ANALYTICS' },
  { href: '/stock', label: 'Stock', icon: Package, module: 'STOCK' },
  { href: '/entrepot', label: 'Entrepôt', icon: Warehouse, module: 'ADMIN' },
  { href: '/pos', label: 'Caisse', icon: ShoppingCart, module: 'POS' },
  { href: '/ventes', label: 'Ventes', icon: Receipt, module: 'POS' },
  { href: '/clients', label: 'Clients', icon: Users, module: 'CRM' },
  { href: '/tresorerie', label: 'Trésorerie', icon: Wallet, module: 'PAY' },
  { href: '/livraisons', label: 'Livraisons', icon: Truck, module: 'DELIVERY' },
  { href: '/parametres', label: 'Paramètres', icon: Settings, module: 'ADMIN' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, loginWithPin, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { state, pending } = useSync();
  const [locked, setLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !getPinToken();
  });
  const [pinUsers, setPinUsers] = useState<PinUser[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // La console super-admin vit désormais dans une app séparée (apps/admin-web,
  // domaine dédié) — plus aucun code admin dans l'app cliente.
  const menuItems = [...NAV];

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

  const isGlobalView = user?.etablissementId === null && (user?.etablissements?.length ?? 0) > 1;
  const { has: hasInfraCap } = useInfraCapabilities();

  const canSee = ({ module: m, href, infraCap }: NavItem) => {
    // La Caisse est toujours masquée en vue "Tous les établissements".
    if (href === '/pos' && isGlobalView) return false;
    // Capacité d'infrastructure requise (même résolution que l'API).
    if (infraCap && !hasInfraCap(infraCap)) return false;
    if (!m) return true;
    if (m === 'ADMIN') return user?.role === 'OWNER' || user?.role === 'MANAGER';
    return user?.modules.includes(m) ?? false;
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    } else if (!loading && user && !getPinToken()) {
      void lock();
    } else if (!loading && user && getPinToken()) {
      setLocked(false);
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <Preloader />;
  }

  if (locked) {
    const hasPin = !!getPinToken();
    return (
      <PinSwitchModal
        users={pinUsers}
        onUnlock={(id, pin) => void unlock(id, pin)}
        onCancel={hasPin ? () => setLocked(false) : undefined}
      />
    );
  }

  // Onboarding localisation : bloque le propriétaire (après le déverrouillage PIN)
  // tant que le pays/ville du siège n'est pas renseigné — comptes neufs ou existants.
  if (user.role === 'OWNER' && !user.pays) {
    return <OnboardingLocalisationModal onDone={() => { void refreshUser(); }} />;
  }

  // Impayé J+30 : écran bloquant — sauf l'OWNER sur les Paramètres (pour régulariser).
  if (user.dunning.posBlocked && !(user.role === 'OWNER' && pathname.startsWith('/parametres'))) {
    return <DunningBlock />;
  }

  return (
    // Pas d'overflow-hidden ici : il neutraliserait le `sticky` du header
    // (les halos décoratifs sont rognés par leur propre conteneur ci-dessous).
    <div className="min-h-screen bg-background font-sans antialiased text-text-primary relative">
      {/* Conteneur de navigation fixe (Sticky) */}
      <div className="sticky top-0 z-30 w-full">
        {/* Ligne de dégradé de marque en haut (Black Luxury: Gold, Blue, Green) */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-blue-600 to-emerald-500 shadow-xs" />

        {/* Header Floating Glass Navbar */}
        <header className="w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-xs transition-all">
          <div className="mx-auto flex h-16 max-w-[1536px] items-center justify-between px-3 sm:px-6">
            {/* Zone Gauche : Logo + Groupe/Entreprise + Switcher Boutique */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="font-display text-xl font-black tracking-tight text-slate-900 flex items-center gap-2 shrink-0 group transition-transform active:scale-95"
                title="Wilinwi"
              >
                <Image src="/logo.png" alt="Wilinwi" width={140} height={140} className="object-contain transition-transform group-hover:scale-105" />
                {user.boutiqueNom && (
                  <span className="sm:hidden truncate max-w-[140px] text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/70">
                    {user.boutiqueNom}
                  </span>
                )}
              </Link>

              {/* Nom du Groupe / Entreprise (Desktop) */}
              {user.boutiqueNom && (
                <div className="hidden items-center gap-2 border-l border-slate-200 pl-4 text-xs font-black tracking-tight text-slate-900 lg:flex bg-slate-100/80 px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[200px]">{user.boutiqueNom}</span>
                </div>
              )}

              {/* Sélecteur d'établissement courant */}
              <div className="hidden border-l border-slate-200 pl-3 sm:block">
                <EtablissementSwitcher />
              </div>
            </div>

            {/* Zone Droite : Statut Sync + Cloche Notification + Badge Profil + Actions */}
            <div className="flex items-center gap-3">
              <OfflineIndicator state={state} pending={pending} />
              
              <div className="flex items-center justify-center p-1 rounded-2xl hover:bg-slate-100/80 transition-colors">
                <NotificationBell />
              </div>

              {/* Badge Utilisateur Profil (Desktop) */}
              <div className="hidden items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-1.5 pr-3.5 shadow-2xs hover:border-slate-300 transition-all sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-black text-white shadow-xs">
                  {(user.nom || user.email).substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-xs font-extrabold text-slate-900 max-w-[130px] truncate" title={user.nom || user.email}>
                    {user.nom || (user.email.endsWith('@pin.local') ? 'Caissier' : user.email)}
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold mt-0.5 tracking-wide uppercase">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </div>
              </div>

              {/* Quick Actions (Verrouiller + Se Déconnecter) */}
              <div className="hidden items-center gap-1.5 border-l border-slate-200 pl-3 sm:flex">
                <button
                  onClick={() => void lock()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95"
                  aria-label="Verrouiller"
                  title="Verrouiller la session (poste partagé)"
                >
                  <Lock className="h-4 w-4" />
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200/60 bg-rose-50/50 text-rose-600 shadow-2xs transition-all hover:bg-rose-100/80 hover:border-rose-300 active:scale-95"
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

      {/* Halos lumineux en arrière-plan (Or et Bleu) — rognés par leur wrapper */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-200px] left-1/4 h-[600px] w-[600px] rounded-full bg-gold/[0.03] blur-[120px]" />
        <div className="absolute bottom-10 right-10 h-[700px] w-[700px] rounded-full bg-brand/[0.03] blur-[150px]" />
      </div>

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

          {/* Sélecteur d'établissement (mobile) — on ne ferme le drawer qu'à la SÉLECTION
              d'une boutique (onSelect), pas à l'ouverture du menu déroulant. */}
          <div className="mb-4">
            <EtablissementSwitcher className="w-full" onSelect={() => setIsMobileMenuOpen(false)} />
          </div>

          <nav className="mt-2">
            <ul className="space-y-1">
              {menuItems.filter((item) => canSee(item)).map(({ href, label, icon: Icon }) => {
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
              {(user.nom || user.email).substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-text-primary truncate">
                {user.nom || (user.email.endsWith('@pin.local') ? 'Caissier' : user.email)}
              </span>
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
      <div className="mx-auto flex max-w-[1536px] gap-4 px-3 sm:px-6 pt-6 pb-24 sm:pb-6">
        {/* Sidebar Collapsible (Desktop - Développable & Réductible) */}
        <CollapsibleSidebar items={menuItems.filter((item) => canSee(item))} />

        {/* Content main */}
        {/* La `key` sur l'établissement courant remonte le contenu de page à chaque
            changement de boutique → toutes les pages re-chargent les données de la
            boutique choisie (y compris celles qui ne passent pas par useCachedQuery). */}
        <main className="min-w-0 flex-1">
          <DunningBanner />
          <div key={user.etablissementId ?? 'none'}>{children}</div>
        </main>
      </div>

      {/* Barre d'onglets mobile (BottomNav) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 h-16 border-t border-slate-200/90 bg-white/95 backdrop-blur-md sm:hidden shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex h-full max-w-md items-center justify-around">
          {menuItems.filter((item) => canSee(item))
            .slice(0, 4)
            .map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-bold transition-colors min-h-[48px]',
                    active ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  <Icon className={cn('h-5 w-5', active && 'scale-110 transition-transform')} />
                  <span className="max-w-[64px] truncate">{label}</span>
                </Link>
              );
            })}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-bold text-slate-500 transition-colors hover:text-slate-900 min-h-[48px]"
          >
            <Menu className="h-5 w-5" />
            <span>Plus</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
