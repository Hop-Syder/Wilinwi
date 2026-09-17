/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Sidebar de Navigation Pro — Architecture Sémantique 4 Groupes,
 *   Couleurs Contextuelles par Module, Raccourcis Clavier & Rich Tooltips
 * @created 2026-08-04
 * @updated 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@wilinwi/ui';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  shortcut?: string;
}

interface CollapsibleSidebarProps {
  items: NavItem[];
}

const STORAGE_KEY = 'wilinwi_sidebar_collapsed';

// Raccourcis par défaut pour les modules clés
const DEFAULT_SHORTCUTS: Record<string, string> = {
  '/pos': 'F2',
  '/stock': 'F3',
  '/clients': 'F4',
};

// Configuration thématique contextuelle par route
const ROUTE_THEMES: Record<
  string,
  {
    activeBg: string;
    activeText: string;
    activeBorder: string;
    dotColor: string;
    hoverBg: string;
    hoverText: string;
    hoverIcon: string;
  }
> = {
  '/pos': {
    activeBg: 'bg-emerald-50 text-emerald-950 shadow-xs',
    activeText: 'text-emerald-950 font-extrabold',
    activeBorder: 'border-emerald-300 ring-1 ring-emerald-400/30',
    dotColor: 'bg-emerald-500',
    hoverBg: 'hover:bg-emerald-50/60',
    hoverText: 'group-hover:text-emerald-900',
    hoverIcon: 'group-hover:text-emerald-600',
  },
  '/ventes': {
    activeBg: 'bg-emerald-50 text-emerald-950 shadow-xs',
    activeText: 'text-emerald-950 font-extrabold',
    activeBorder: 'border-emerald-300 ring-1 ring-emerald-400/30',
    dotColor: 'bg-emerald-500',
    hoverBg: 'hover:bg-emerald-50/60',
    hoverText: 'group-hover:text-emerald-900',
    hoverIcon: 'group-hover:text-emerald-600',
  },
  '/livraisons': {
    activeBg: 'bg-amber-50 text-amber-950 shadow-xs',
    activeText: 'text-amber-950 font-extrabold',
    activeBorder: 'border-amber-300 ring-1 ring-amber-400/30',
    dotColor: 'bg-amber-500',
    hoverBg: 'hover:bg-amber-50/60',
    hoverText: 'group-hover:text-amber-900',
    hoverIcon: 'group-hover:text-amber-600',
  },
  '/stock': {
    activeBg: 'bg-amber-50 text-amber-950 shadow-xs',
    activeText: 'text-amber-950 font-extrabold',
    activeBorder: 'border-amber-300 ring-1 ring-amber-400/30',
    dotColor: 'bg-amber-500',
    hoverBg: 'hover:bg-amber-50/60',
    hoverText: 'group-hover:text-amber-900',
    hoverIcon: 'group-hover:text-amber-600',
  },
  '/entrepot': {
    activeBg: 'bg-teal-50 text-teal-950 shadow-xs',
    activeText: 'text-teal-950 font-extrabold',
    activeBorder: 'border-teal-300 ring-1 ring-teal-400/30',
    dotColor: 'bg-teal-500',
    hoverBg: 'hover:bg-teal-50/60',
    hoverText: 'group-hover:text-teal-900',
    hoverIcon: 'group-hover:text-teal-600',
  },
  '/clients': {
    activeBg: 'bg-violet-50 text-violet-950 shadow-xs',
    activeText: 'text-violet-950 font-extrabold',
    activeBorder: 'border-violet-300 ring-1 ring-violet-400/30',
    dotColor: 'bg-violet-500',
    hoverBg: 'hover:bg-violet-50/60',
    hoverText: 'group-hover:text-violet-900',
    hoverIcon: 'group-hover:text-violet-600',
  },
  '/tresorerie': {
    activeBg: 'bg-rose-50 text-rose-950 shadow-xs',
    activeText: 'text-rose-950 font-extrabold',
    activeBorder: 'border-rose-300 ring-1 ring-rose-400/30',
    dotColor: 'bg-rose-500',
    hoverBg: 'hover:bg-rose-50/60',
    hoverText: 'group-hover:text-rose-900',
    hoverIcon: 'group-hover:text-rose-600',
  },
  '/dashboard': {
    activeBg: 'bg-blue-50 text-blue-950 shadow-xs',
    activeText: 'text-blue-950 font-extrabold',
    activeBorder: 'border-blue-300 ring-1 ring-blue-400/30',
    dotColor: 'bg-blue-600',
    hoverBg: 'hover:bg-blue-50/60',
    hoverText: 'group-hover:text-blue-900',
    hoverIcon: 'group-hover:text-blue-600',
  },
  '/parametres': {
    activeBg: 'bg-indigo-50 text-indigo-950 shadow-xs',
    activeText: 'text-indigo-950 font-extrabold',
    activeBorder: 'border-indigo-300 ring-1 ring-indigo-400/30',
    dotColor: 'bg-indigo-600',
    hoverBg: 'hover:bg-indigo-50/60',
    hoverText: 'group-hover:text-indigo-900',
    hoverIcon: 'group-hover:text-indigo-600',
  },
  default: {
    activeBg: 'bg-slate-100 text-slate-950 shadow-xs',
    activeText: 'text-slate-950 font-extrabold',
    activeBorder: 'border-slate-300 ring-1 ring-slate-400/30',
    dotColor: 'bg-slate-700',
    hoverBg: 'hover:bg-slate-100/80',
    hoverText: 'group-hover:text-slate-900',
    hoverIcon: 'group-hover:text-slate-700',
  },
};

// Définition des groupes sémantiques métier
interface NavGroup {
  id: string;
  label: string;
  routes: string[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operations',
    label: 'Ventes & Terrain',
    routes: ['/pos', '/ventes', '/livraisons'],
  },
  {
    id: 'logistics',
    label: 'Stocks & Logistique',
    routes: ['/stock', '/entrepot'],
  },
  {
    id: 'finances',
    label: 'Finances & CRM',
    routes: ['/clients', '/tresorerie'],
  },
  {
    id: 'management',
    label: 'Pilotage & Système',
    routes: ['/', '/dashboard', '/parametres'],
  },
];

export function CollapsibleSidebar({ items }: CollapsibleSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
  }, []);

  // Raccourci clavier global [Ctrl+B] / [Cmd+B]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsed]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  if (!isMounted) {
    return <aside className="hidden sm:block w-64 shrink-0" />;
  }

  const getTheme = (href: string) => ROUTE_THEMES[href] || ROUTE_THEMES.default;

  return (
    <aside
      className={cn(
        'hidden sm:block shrink-0 transition-all duration-300 ease-in-out select-none relative z-40',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      <div className="sticky top-20 flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white/95 p-3 shadow-xs backdrop-blur-md transition-all duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
        {/* Entête de contrôle (Titre & Toggle) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 px-1 mb-2">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 pl-1">
                Espace Pro
              </span>
              <kbd className="hidden lg:inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400">
                Ctrl+B
              </kbd>
            </div>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mx-auto mb-1" />
          )}

          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              'group flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95 border border-transparent hover:border-slate-200/70',
              collapsed && 'mx-auto'
            )}
            title={collapsed ? 'Déplier la barre (Ctrl+B)' : 'Réduire la barre (Ctrl+B)'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 transition-transform group-hover:scale-110" />
            ) : (
              <PanelLeftClose className="h-4 w-4 transition-transform group-hover:scale-110" />
            )}
          </button>
        </div>

        {/* Navigation Groupée Sémantiquement */}
        <nav className="flex-1 space-y-3.5">
          {NAV_GROUPS.map((group) => {
            const groupItems = items.filter((item) => group.routes.includes(item.href));
            if (groupItems.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1">
                {/* En-tête de section (Masqué en mode réduit) */}
                {!collapsed && (
                  <p className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                    {group.label}
                  </p>
                )}

                <div className="space-y-1">
                  {groupItems.map(({ href, label, icon: Icon, badge, shortcut }) => {
                    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                    const theme = getTheme(href);
                    const itemShortcut = shortcut || DEFAULT_SHORTCUTS[href];

                    return (
                      <div key={href} className="relative group">
                        <Link
                          href={href}
                          className={cn(
                            'relative flex items-center gap-3 rounded-2xl py-2 px-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer border border-transparent',
                            active
                              ? cn(theme.activeBg, theme.activeBorder)
                              : cn('text-slate-600', theme.hoverBg, theme.hoverText),
                            collapsed && 'justify-center px-0 py-2.5'
                          )}
                        >
                          {/* Dot indicateur actif */}
                          {active && !collapsed && (
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full shrink-0 animate-pulse',
                                theme.dotColor
                              )}
                            />
                          )}

                          {/* Icône du module */}
                          <Icon
                            className={cn(
                              'h-4.5 w-4.5 shrink-0 transition-transform duration-200',
                              active ? theme.activeText : cn('text-slate-400', theme.hoverIcon),
                              'group-hover:scale-110'
                            )}
                          />

                          {/* Libellé */}
                          {!collapsed && (
                            <span className={cn('truncate flex-1', active && 'font-extrabold')}>
                              {label}
                            </span>
                          )}

                          {/* Badge ou raccourci clavier */}
                          {!collapsed && (
                            <>
                              {badge !== undefined ? (
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold bg-slate-100 text-slate-600 shadow-2xs">
                                  {badge}
                                </span>
                              ) : itemShortcut ? (
                                <kbd className="hidden lg:inline-flex text-[9px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shadow-2xs">
                                  {itemShortcut}
                                </kbd>
                              ) : null}
                            </>
                          )}
                        </Link>

                        {/* Rich Tooltip (Mode Réduit) */}
                        {collapsed && (
                          <div className="absolute left-full top-1/2 ml-3 -translate-y-1/2 z-[9999] pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100 origin-left">
                            <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-2xl whitespace-nowrap border border-slate-700/80 ring-1 ring-black/20">
                              <span
                                className={cn('h-2 w-2 rounded-full shrink-0', theme.dotColor)}
                              />
                              <span>{label}</span>
                              {itemShortcut && (
                                <kbd className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                  {itemShortcut}
                                </kbd>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Pied de Sidebar : Action Rapide POS + Toggle Réduire */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          {/* Raccourci Vente Rapide */}
          {!collapsed ? (
            <Link
              href="/pos"
              className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-white shadow-sm shadow-emerald-600/20 hover:shadow-md transition-all active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 fill-white/30 text-white" />
                <span className="text-[11px] font-extrabold tracking-tight">Ouvrir Caisse</span>
              </div>
              <kbd className="text-[9px] font-mono font-extrabold bg-white/20 text-white px-1.5 py-0.5 rounded">
                POS
              </kbd>
            </Link>
          ) : (
            <Link
              href="/pos"
              className="flex h-9 w-9 mx-auto items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
              title="Ouvrir la Caisse (POS)"
            >
              <Zap className="h-4 w-4 fill-white/40 text-white" />
            </Link>
          )}

          {/* Bouton Toggle Bas */}
          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl py-1.5 px-2.5 text-[11px] font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all',
              collapsed ? 'justify-center px-0' : 'justify-between'
            )}
          >
            {!collapsed && <span>Réduire la barre</span>}
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
