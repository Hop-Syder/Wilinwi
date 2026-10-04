/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Dock de navigation mobile ultra-pro (Floating Dynamic Island / Frosted Glass).
 *   Design épuré et minimaliste, feedback tactile haptique, zéro surcharge textuelle.
 * @created 2026-09-17
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Receipt,
  Users,
  BarChart3,
  Truck,
  Wallet,
  Settings,
  MoreHorizontal,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@wilinwi/ui';
import type { Role, ModuleKey } from '@wilinwi/types';

export interface MobileDockItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isHero?: boolean;
  module?: ModuleKey | 'ADMIN';
}

interface MobileDockProps {
  onOpenMore: () => void;
  userRole?: Role;
  userModules?: ModuleKey[];
  canSeeItem?: (item: { href: string; label: string; icon: LucideIcon; module?: ModuleKey | 'ADMIN' }) => boolean;
}

export function MobileDock({
  onOpenMore,
  userRole = 'SELLER',
  userModules = [],
  canSeeItem,
}: MobileDockProps) {
  const pathname = usePathname();

  // 🎯 Détermination intelligente des raccourcis en fonction du profil collaborateur (Minimum 4 icônes)
  const getDockSlots = (): MobileDockItem[] => {
    // 🛵 1. Profil LIVREUR (Focus Livraisons, Commandes & Clients)
    if (userRole === 'DELIVERY') {
      return [
        { href: '/', label: 'Hub', icon: LayoutGrid },
        { href: '/livraisons', label: 'Livraisons', icon: Truck, isHero: true, module: 'DELIVERY' },
        { href: '/ventes', label: 'Commandes', icon: Receipt, module: 'POS' },
        { href: '/clients', label: 'Clients', icon: Users, module: 'CRM' },
      ];
    }

    // 🟢 2. Profil CAISSIER (Focus Caisse, Ventes, Clients / Stock)
    if (userRole === 'CASHIER') {
      const slots: MobileDockItem[] = [
        { href: '/', label: 'Hub', icon: LayoutGrid },
        { href: '/pos', label: 'Caisse', icon: ShoppingCart, isHero: true, module: 'POS' },
        { href: '/ventes', label: 'Ventes', icon: Receipt, module: 'POS' },
      ];
      // 4e icône garantie
      if (userModules.includes('CRM')) {
        slots.push({ href: '/clients', label: 'Clients', icon: Users, module: 'CRM' });
      } else if (userModules.includes('STOCK')) {
        slots.push({ href: '/stock', label: 'Stock', icon: Package, module: 'STOCK' });
      } else {
        slots.push({ href: '/clients', label: 'Clients', icon: Users });
      }
      return slots;
    }

    // 🛍️ 3. Profil VENDEUR (Focus Stock, Caisse, Ventes)
    if (userRole === 'SELLER') {
      return [
        { href: '/', label: 'Hub', icon: LayoutGrid },
        { href: '/stock', label: 'Stock', icon: Package, module: 'STOCK' },
        { href: '/pos', label: 'Caisse', icon: ShoppingCart, isHero: true, module: 'POS' },
        { href: '/ventes', label: 'Ventes', icon: Receipt, module: 'POS' },
      ];
    }

    // 👔 4. Profil GÉRANT / MANAGER (Supervision & Opérations)
    if (userRole === 'MANAGER') {
      return [
        { href: '/', label: 'Hub', icon: LayoutGrid },
        { href: '/dashboard', label: 'Bilan', icon: BarChart3, module: 'ANALYTICS' },
        { href: '/pos', label: 'Caisse', icon: ShoppingCart, isHero: true, module: 'POS' },
        { href: '/stock', label: 'Stock', icon: Package, module: 'STOCK' },
      ];
    }

    // 👑 5. Profil PROPRIÉTAIRE / OWNER (Pilotage financier & stratégique)
    return [
      { href: '/', label: 'Hub', icon: LayoutGrid },
      { href: '/dashboard', label: 'Bilan', icon: BarChart3, module: 'ANALYTICS' },
      { href: '/ventes', label: 'Ventes', icon: Receipt, isHero: true, module: 'POS' },
      { href: '/tresorerie', label: 'Trésorerie', icon: Wallet, module: 'PAY' },
    ];
  };

  // Filtrage selon les autorisations réelles
  const baseSlots = getDockSlots();
  const visibleSlots = canSeeItem
    ? baseSlots.filter((slot) =>
        canSeeItem({ href: slot.href, label: slot.label, icon: slot.icon, module: slot.module })
      )
    : baseSlots;

  // 🛡️ Fallback : toujours garantir au moins 4 icônes si des autorisations manquent
  const fallbackCandidates: MobileDockItem[] = [
    { href: '/', label: 'Hub', icon: LayoutGrid },
    { href: '/ventes', label: 'Ventes', icon: Receipt, module: 'POS' },
    { href: '/stock', label: 'Stock', icon: Package, module: 'STOCK' },
    { href: '/clients', label: 'Clients', icon: Users, module: 'CRM' },
    { href: '/dashboard', label: 'Bilan', icon: BarChart3, module: 'ANALYTICS' },
    { href: '/livraisons', label: 'Livraisons', icon: Truck, module: 'DELIVERY' },
    { href: '/parametres', label: 'Paramètres', icon: Settings, module: 'ADMIN' },
  ];

  const dockSlots = [...visibleSlots];
  if (dockSlots.length < 4) {
    for (const candidate of fallbackCandidates) {
      if (dockSlots.length >= 4) break;
      const alreadyPresent = dockSlots.some((s) => s.href === candidate.href);
      if (!alreadyPresent) {
        if (!canSeeItem || canSeeItem({ href: candidate.href, label: candidate.label, icon: candidate.icon, module: candidate.module })) {
          dockSlots.push(candidate);
        }
      }
    }
  }

  return (
    <nav
      aria-label="Navigation mobile principale"
      className="fixed inset-x-0 bottom-2.5 z-40 flex justify-center pointer-events-none sm:hidden px-4"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
    >
      {/* Conteneur adaptatif : w-auto et inline-flex pour épouser élégamment le nombre d'icônes */}
      <div className="pointer-events-auto inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.36)] w-auto max-w-[360px] mx-auto transition-all">
        {dockSlots.map(({ href, label, icon: Icon, isHero }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

          if (isHero) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={label}
                className={cn(
                  'relative flex items-center justify-center h-11 w-11 rounded-full transition-all duration-200 active:scale-90 shrink-0',
                  active
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-400/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30',
                )}
              >
                <Icon className="h-5 w-5" />
                {active && (
                  <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                )}
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              className={cn(
                'relative flex flex-col items-center justify-center h-10 w-11 rounded-full transition-all duration-150 active:scale-90 shrink-0',
                active
                  ? 'text-emerald-400 bg-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform', active && 'scale-105')} />
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400 shadow-xs" />
              )}
            </Link>
          );
        })}

        {/* Bouton Plus (Toutes les fonctions) */}
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Toutes les applications"
          title="Plus"
          className="relative flex items-center justify-center h-10 w-11 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-150 active:scale-90 shrink-0"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}
