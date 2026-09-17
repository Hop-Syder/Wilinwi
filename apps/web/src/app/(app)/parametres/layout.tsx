'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Layout partagé pour la section Paramètres (/parametres)
 *   Offre une barre de navigation par onglets unifiée (Single Source of Truth UX)
 *   desservant toutes les sous-sections :
 *   1. Entreprise & Reçus (/parametres)
 *   2. Collaborateurs & PIN (/parametres/utilisateurs)
 *   3. Établissements & Dépôts (/parametres/etablissements)
 *   4. Appareils Connectés (/parametres/appareils)
 *   5. Abonnement & Quotas (/parametres/abonnement)
 *   6. Journal d'Audit (/parametres/journal — OWNER uniquement)
 * @created 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  Building2,
  Users,
  Store,
  MonitorSmartphone,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface TabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  ownerOnly?: boolean;
}

const TABS: TabItem[] = [
  {
    href: '/parametres',
    label: 'Entreprise & Reçu',
    icon: Building2,
  },
  {
    href: '/parametres/utilisateurs',
    label: 'Équipe & PIN',
    icon: Users,
  },
  {
    href: '/parametres/etablissements',
    label: 'Établissements',
    icon: Store,
  },
  {
    href: '/parametres/appareils',
    label: 'Appareils',
    icon: MonitorSmartphone,
  },
  {
    href: '/parametres/abonnement',
    label: 'Abonnement & Plan',
    icon: CreditCard,
  },
  {
    href: '/parametres/journal',
    label: 'Journal d’Audit',
    icon: ShieldCheck,
    ownerOnly: true,
  },
];

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isOwner = user?.role === 'OWNER';
  const visibleTabs = TABS.filter((tab) => !tab.ownerOnly || isOwner);

  return (
    <div className="space-y-6">
      {/* En-tête Paramètres & Navigation par Onglets */}
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
                Paramètres & Configuration
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Centre de contrôle de votre entreprise, de vos collaborateurs et de vos postes de vente.
              </p>
            </div>
          </div>
        </div>

        {/* Barre d'onglets persistante et scrollable sur mobile */}
        <nav
          className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none"
          aria-label="Onglets Paramètres"
        >
          {visibleTabs.map((tab) => {
            // Correspondance stricte pour la racine /parametres, startsWith pour les sous-routes
            const isActive =
              tab.href === '/parametres'
                ? pathname === '/parametres'
                : pathname.startsWith(tab.href);

            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                className={`group inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.ownerOnly && (
                  <span
                    className={`ml-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      isActive ? 'bg-indigo-700/80 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    Owner
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Contenu de la sous-page active */}
      <div>{children}</div>
    </div>
  );
}
