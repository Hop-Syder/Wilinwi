'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Paramètres — écran racine (/parametres).
 *   Mobile : menu liste façon WhatsApp — chaque ligne (icône + libellé +
 *   description + chevron) mène à sa propre route dédiée ; aucun contenu
 *   de section n'est affiché ici, seulement le menu.
 *   Desktop : la barre d'onglets persistante (layout.tsx) affiche déjà
 *   toutes les sections en permanence, donc la racine nue redirige vers la
 *   section par défaut (Entreprise & Reçu) plutôt que de dupliquer le menu.
 * @created 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { PARAMETRES_TABS } from './tabs';

export default function ParametresMenuPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    setIsDesktop(mql.matches);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (isDesktop) router.replace('/parametres/entreprise');
  }, [isDesktop, router]);

  // État initial (avant résolution du breakpoint) ou redirection desktop en cours : rien à afficher.
  if (isDesktop !== false) return null;

  const isOwner = user?.role === 'OWNER';
  const visibleTabs = PARAMETRES_TABS.filter((tab) => !tab.ownerOnly || isOwner);

  return (
    <div className="-mx-4 -mt-4 sm:hidden">
      <div className="divide-y divide-slate-100 bg-white">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex items-center gap-3.5 px-4 py-3.5 active:bg-slate-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">{tab.label}</div>
                <div className="truncate text-xs text-slate-500">{tab.description}</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
