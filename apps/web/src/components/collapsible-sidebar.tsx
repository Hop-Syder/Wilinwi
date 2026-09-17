/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Sidebar de Navigation Collapsible (Développable & Réductible avec Tooltips & Storage)
 * @created 2026-08-04
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import { cn } from '@wilinwi/ui';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface CollapsibleSidebarProps {
  items: NavItem[];
}

const STORAGE_KEY = 'wilinwi_sidebar_collapsed';

export function CollapsibleSidebar({ items }: CollapsibleSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  // Charger la préférence de l'utilisateur depuis localStorage
  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
  }, []);

  // Écouter le raccourci clavier [Ctrl+B] ou [Cmd+B] pour basculer la sidebar
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
    // Rendement initial neutre pour éviter les désynchronisations SSR/Hydratation
    return <aside className="hidden sm:block w-48 shrink-0" />;
  }

  return (
    <aside
      className={cn(
        'hidden sm:block shrink-0 transition-all duration-300 ease-in-out select-none relative z-40',
        collapsed ? 'w-[72px]' : 'w-56'
      )}
    >
      <div className="sticky top-20 flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white/95 p-2.5 shadow-sm backdrop-blur-md transition-all duration-300">
        {/* Entête de contrôle (Toggle plier/déplier) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1 mb-1">
          {!collapsed && (
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 pl-2 transition-opacity duration-200">
              Navigation
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              'group flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95',
              collapsed && 'mx-auto'
            )}
            title={collapsed ? 'Développer le menu (Ctrl+B)' : 'Réduire le menu (Ctrl+B)'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 transition-transform group-hover:scale-110" />
            ) : (
              <PanelLeftClose className="h-4 w-4 transition-transform group-hover:scale-110" />
            )}
          </button>
        </div>

        {/* Liste des liens de navigation */}
        <nav className="flex-1 space-y-1">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <div key={href} className="relative group">
                <Link
                  href={href}
                  className={cn(
                    'relative flex items-center gap-3 rounded-2xl py-2.5 px-3 text-sm font-semibold transition-all duration-200 cursor-pointer',
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  {/* Icône du module */}
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-transform duration-200',
                      active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 group-hover:scale-105'
                    )}
                  />

                  {/* Libellé (Visible si développé) */}
                  {!collapsed && (
                    <span className="truncate flex-1 font-medium transition-all">
                      {label}
                    </span>
                  )}

                  {/* Badge éventuel */}
                  {!collapsed && badge !== undefined && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-2xs',
                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </Link>

                {/* Tooltip flottant (Mode réduit / Collapsed) - 100% Premier Plan z-[9999] */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 ml-3 -translate-y-1/2 z-[9999] pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100 origin-left">
                    <div className="relative flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-extrabold text-white shadow-2xl whitespace-nowrap border border-slate-700/80 ring-1 ring-black/10">
                      {/* Flèche du tooltip */}
                      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-6 border-r-slate-900" />
                      <span>{label}</span>
                      {badge !== undefined && (
                        <span className="rounded-full bg-blue-500/30 px-1.5 py-0.5 text-[10px] text-blue-200">
                          {badge}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Pied de page du menu avec bouton de réduction bas */}
        <div className="mt-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-2xl py-2 px-3 text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all',
              collapsed ? 'justify-center px-0' : 'justify-between'
            )}
          >
            {!collapsed && <span>Réduire le menu</span>}
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
