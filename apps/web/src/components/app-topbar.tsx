/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Barre de navigation supérieure haute précision (AppTopbar)
 *   Inspiration Fintech Next (Stripe, Linear, Raycast)
 *   Multi-établissements, Palette de Commande (⌘K), Télémétrie Live, Profil & Sécurité
 * @created 2026-09-17
 * @updated 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Lock,
  LogOut,
  Building2,
  Sparkles,
  Command,
  ArrowRight,
  X,
  LayoutGrid,
} from 'lucide-react';
import { OfflineIndicator, cn } from '@wilinwi/ui';
import { ROLE_LABELS, type Role } from '@wilinwi/types';
import type { SessionUser } from '@/lib/auth-context';
import { EtablissementSwitcher } from '@/components/etablissement-switcher';
import { NotificationBell } from '@/components/notification-bell';

export interface TopbarNavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
}

export interface AppTopbarProps {
  user: SessionUser;
  syncState: 'online' | 'offline' | 'syncing';
  syncPending?: number;
  onLock: () => Promise<void>;
  onSignOut: () => void;
  onOpenMobileMenu: () => void;
  navItems: TopbarNavItem[];
}

/**
 * Rendu du rôle avec badge thématique
 */
function RoleTag({ role }: { role: Role }) {
  const label = ROLE_LABELS[role] ?? role;

  const styleByRole: Record<string, string> = {
    OWNER: 'bg-amber-50 text-amber-800 border-amber-200/80',
    MANAGER: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
    CAISSIER: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    COMPTABLE: 'bg-blue-50 text-blue-800 border-blue-200/80',
    MAGASINIER: 'bg-slate-100 text-slate-800 border-slate-200/80',
  };

  const badgeClass = styleByRole[role] ?? 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span
      className={cn(
        'inline-block px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase rounded-md border',
        badgeClass,
      )}
    >
      {label}
    </span>
  );
}

/**
 * Modale Palette de Commande (⌘K / Ctrl+K)
 */
function CommandPaletteDialog({
  isOpen,
  onClose,
  navItems,
  onLock,
  onSignOut,
}: {
  isOpen: boolean;
  onClose: () => void;
  navItems: TopbarNavItem[];
  onLock: () => Promise<void>;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actions = [
      {
        id: 'action-lock',
        label: 'Verrouiller le poste (PIN)',
        category: 'Sécurité',
        shortcut: 'Alt+L',
        action: () => {
          onClose();
          void onLock();
        },
      },
      {
        id: 'action-logout',
        label: 'Se déconnecter',
        category: 'Session',
        shortcut: 'Esc',
        action: () => {
          onClose();
          onSignOut();
        },
      },
    ];

    const matchedNav = navItems
      .filter((item) => item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q))
      .map((item) => ({
        id: item.href,
        label: item.label,
        category: 'Navigation',
        shortcut: item.href === '/pos' ? 'F2' : item.href === '/stock' ? 'F3' : item.href === '/tresorerie' ? 'F4' : '',
        action: () => {
          onClose();
          router.push(item.href);
        },
      }));

    const matchedActions = actions.filter(
      (act) => act.label.toLowerCase().includes(q) || act.category.toLowerCase().includes(q),
    );

    return [...matchedNav, ...matchedActions];
  }, [query, navItems, onClose, onLock, onSignOut, router]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 bg-slate-50/50">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une page, un module ou une action…"
            className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">
              Aucun résultat correspondant pour &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left text-xs transition-all duration-150',
                        isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100/80 font-medium',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            'text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md',
                            isSelected
                              ? 'bg-blue-700/80 text-blue-100'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          {item.category}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.shortcut && (
                          <kbd
                            className={cn(
                              'font-mono text-[10px] px-1.5 py-0.5 rounded-md border',
                              isSelected
                                ? 'bg-blue-700 border-blue-500 text-blue-100'
                                : 'bg-slate-50 border-slate-200 text-slate-400',
                            )}
                          >
                            {item.shortcut}
                          </kbd>
                        )}
                        <ArrowRight
                          className={cn(
                            'h-3.5 w-3.5',
                            isSelected ? 'text-white' : 'text-slate-300',
                          )}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-3">
            <span>↑↓ Naviguer</span>
            <span>↵ Sélectionner</span>
            <span>ESC Quitter</span>
          </div>
          <span className="flex items-center gap-1 text-blue-600 font-bold">
            <Sparkles className="h-3 w-3" /> Wilinwi Quick Command
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Barre de navigation principale Topbar
 */
export function AppTopbar({
  user,
  syncState,
  syncPending = 0,
  onLock,
  onSignOut,
  onOpenMobileMenu,
  navItems,
}: AppTopbarProps) {
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Raccourci clavier global ⌘K ou Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const userName = user.nom || (user.email.endsWith('@pin.local') ? 'Caissier' : user.email);
  const initials = userName.substring(0, 2).toUpperCase();

  return (
    <>
      <div className="sticky top-0 z-30 w-full">
        {/* Ligne de crête de marque (Black Luxury : Or, Bleu Royal, Émeraude) */}
        <div className="h-[2px] w-full bg-gradient-to-r from-amber-400 via-blue-600 to-emerald-500 shadow-2xs" />

        {/* Floating Glass Navbar */}
        <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-xs transition-all">
          <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between px-3 sm:px-6 lg:px-8 gap-3">
            {/* Zone Gauche : Burger mobile + Logo + Boutique Switcher */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="flex sm:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>

              <Link
                href="/"
                className="font-display text-xl font-black tracking-tight text-slate-900 flex items-center gap-2 group transition-transform active:scale-95"
                title="Wilinwi POS & Commerce"
              >
                <Image
                  src="/logo.png"
                  alt="Wilinwi"
                  width={132}
                  height={132}
                  priority
                  className="object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </Link>

              <div className="hidden md:block h-5 w-px bg-slate-200/80" />

              {/* Contexte Entreprise (Desktop) */}
              {user.boutiqueNom && (
                <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 text-xs font-black text-slate-900 shadow-2xs">
                  <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[160px]">{user.boutiqueNom}</span>
                </div>
              )}

              {/* Sélecteur d'établissement actif */}
              <div className="hidden sm:block">
                <EtablissementSwitcher />
              </div>
            </div>

            {/* Zone Centrale : Barre de recherche rapide (⌘K) */}
            <div className="flex-1 max-w-sm lg:max-w-md hidden md:flex items-center justify-center px-2">
              <button
                type="button"
                onClick={() => setIsCommandOpen(true)}
                className="group flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-slate-300 hover:shadow-xs px-3.5 py-2 text-xs text-slate-500 transition-all duration-200 cursor-pointer"
                title="Ouvrir la palette de commande (⌘K ou Ctrl+K)"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                  <span className="truncate text-slate-400 group-hover:text-slate-600">
                    Rechercher pages, actions...
                  </span>
                </div>
                <kbd className="hidden lg:inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-white border border-slate-200/90 text-slate-400 px-1.5 py-0.5 rounded-lg shadow-2xs group-hover:border-slate-300">
                  <Command className="h-2.5 w-2.5" /> K
                </kbd>
              </button>
            </div>

            {/* Zone Droite : Télémétrie + Cloche + Profil + Contrôles */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Recherche rapide (Icône mobile/tablette) */}
              <button
                type="button"
                onClick={() => setIsCommandOpen(true)}
                className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 hover:bg-white active:scale-95 transition-all"
                aria-label="Recherche rapide"
                title="Rechercher (⌘K)"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Télémétrie Connectivité / Synchronisation */}
              {syncState === 'online' ? (
                <div
                  className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 shadow-2xs"
                  title="Système opérationnel et synchronisé en temps réel"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>En ligne</span>
                </div>
              ) : (
                <OfflineIndicator state={syncState} pending={syncPending} />
              )}

              {/* Cloche de Notifications */}
              <div className="flex items-center justify-center p-0.5 rounded-xl hover:bg-slate-100/80 transition-colors">
                <NotificationBell />
              </div>

              <div className="hidden sm:block h-5 w-px bg-slate-200/80" />

              {/* Badge Utilisateur Haute Définition */}
              <div className="hidden sm:flex items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-slate-50/60 p-1.5 pr-3 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all">
                <div className="relative shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-xs font-black text-white shadow-xs">
                    {initials}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                    title="En ligne"
                  />
                </div>
                <div className="flex flex-col text-left leading-tight min-w-0">
                  <span
                    className="text-xs font-extrabold text-slate-900 max-w-[110px] lg:max-w-[150px] truncate"
                    title={userName}
                  >
                    {userName}
                  </span>
                  <div className="mt-0.5">
                    <RoleTag role={user.role} />
                  </div>
                </div>
              </div>

              {/* Contrôles de Poste de Travail */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void onLock()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95"
                  aria-label="Verrouiller la session"
                  title="Verrouiller la session (Changement d'opérateur PIN)"
                >
                  <Lock className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
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

      {/* Dialog Command Palette */}
      <CommandPaletteDialog
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        navItems={navItems}
        onLock={onLock}
        onSignOut={onSignOut}
      />
    </>
  );
}
