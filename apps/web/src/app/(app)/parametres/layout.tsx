'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Layout partagé pour la section Paramètres (/parametres)
 *
 *   Desktop (sm: et plus) : barre d'onglets horizontale persistante,
 *   inchangée — toutes les sections restent à un clic, en permanence.
 *
 *   Mobile (< sm) : plus de barre d'onglets qui défile horizontalement.
 *   Écran racine (/parametres) : uniquement le titre — le menu liste façon
 *   WhatsApp est le contenu de page.tsx lui-même (chaque section = 1 ligne
 *   tap-through vers sa propre route). Sous-écran (/parametres/xxx) :
 *   en-tête compact « ← Paramètres » + libellé de la section active,
 *   façon écran de détail WhatsApp — jamais la liste ET le contenu en
 *   même temps sur petit écran.
 * @created 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { PARAMETRES_TABS } from './tabs';

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isOwner = user?.role === 'OWNER';
  const visibleTabs = PARAMETRES_TABS.filter((tab) => !tab.ownerOnly || isOwner);
  const isMenuRoot = pathname === '/parametres';
  const activeTab = isMenuRoot ? undefined : visibleTabs.find((tab) => pathname.startsWith(tab.href));

  return (
    <div className="space-y-6">
      {/* ── En-tête desktop (toujours visible) + barre d'onglets (sm: et plus) ── */}
      <div className="hidden border-b border-slate-200/80 pb-4 sm:block">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200/70 bg-indigo-50 text-indigo-700 shadow-xs">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Paramètres & Configuration
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Centre de contrôle de votre entreprise, de vos collaborateurs et de vos postes de vente.
            </p>
          </div>
        </div>

        <nav className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none" aria-label="Onglets Paramètres">
          {visibleTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                className={`group inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 ${
                  isActive ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span>{tab.label}</span>
                {tab.ownerOnly && (
                  <span
                    className={`ml-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
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

      {/* ── Mobile : titre seul sur l'écran menu, en-tête retour sur un sous-écran ── */}
      <div className="sm:hidden">
        {isMenuRoot ? (
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">Paramètres</h1>
        ) : (
          <div className="-mx-4 -mt-4 flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
            <Link
              href="/parametres"
              aria-label="Retour aux paramètres"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="truncate text-base font-bold text-slate-900">{activeTab?.label ?? 'Paramètres'}</h1>
          </div>
        )}
      </div>

      {/* Contenu de la sous-page active — page.tsx (écran racine) gère lui-même
          son propre affichage conditionnel mobile/desktop, rien à ajouter ici. */}
      {children}
    </div>
  );
}
