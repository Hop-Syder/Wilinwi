'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend (Route: dashboard)
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import Link from 'next/link';
import { Activity, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle } from 'lucide-react';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';
import { StatCard, Card, CardTitle, Badge, formatFCFA, formatQty } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';

interface Dashboard {
  ventesDuJour: number;
  articlesVendus: number;
  valeurStockCatalogue: number;
  beneficeDuJour?: number;
  valeurStockAchat?: number;
  alertes: {
    ruptures: { id: string; nom: string; stock: number }[];
    dormants: { id: string; nom: string; stock: number }[];
  };
}

export default function DashboardPage() {
  const { data, loading, error } = useCachedQuery<Dashboard>(
    'dashboard',
    () => apiGet<Dashboard>('/api/analytics/dashboard'),
  );

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-dashboard-stats',
      title: 'Performance du jour',
      content: 'Analysez rapidement le chiffre d\'affaires, le nombre de ventes et votre marge générée sur la journée.',
      position: 'bottom',
    },
    {
      targetId: 'tour-dashboard-charts',
      title: 'Tendances & Top produits',
      content: 'Visualisez l\'évolution des ventes sur la semaine et identifiez vos meilleures ventes pour anticiper vos réassorts.',
      position: 'top',
    }
  ];

  // Affiche les erreurs seulement si aucune donnée (cache) n'est disponible :
  // un échec de rafraîchissement en arrière-plan ne doit pas masquer la vue en cache.
  if (error && !data) return <ErrorState message={error.message} />;
  if (loading || !data) return <p className="text-slate-400">Chargement du tableau de bord…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate-500">
            Aperçu de l'activité du <strong className="font-medium">{new Date().toLocaleDateString()}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/rapports"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <TrendingUp className="h-4 w-4" /> Rapports
          </Link>
          <ContextualHelp
            storageKey="wilinwi_dashboard_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Suivre la marge bénéficiaire', description: 'Le chiffre d\'affaires vous indique ce qui est entré en caisse, mais la "Marge générée" vous montre votre bénéfice réel.' },
              { title: 'Optimiser le réassort', description: 'Le panneau "Top Produits" vous montre quels articles se vendent le mieux, ce qui vous aide à savoir quoi racheter en priorité.' }
            ]}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" id="tour-dashboard-stats">
        <StatCard
          label="Ventes du jour"
          value={formatFCFA(data.ventesDuJour)}
          hint={`${formatQty(data.articlesVendus)} article(s) vendu(s)`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="emerald"
        />
        {data.beneficeDuJour !== undefined && (
          <StatCard
            label="Bénéfice du jour"
            value={formatFCFA(data.beneficeDuJour)}
            hint="Marge réelle"
            icon={<DollarSign className="h-5 w-5" />}
            accent="brand"
          />
        )}
        <StatCard
          label="Valeur du stock (catalogue)"
          value={formatFCFA(data.valeurStockCatalogue)}
          hint="Potentiel de vente"
          icon={<Package className="h-5 w-5" />}
          accent="gold"
        />
        {data.valeurStockAchat !== undefined && (
          <StatCard
            label="Stock (prix d'achat)"
            value={formatFCFA(data.valeurStockAchat)}
            hint="Argent immobilisé"
            icon={<Package className="h-5 w-5" />}
            accent="brand"
          />
        )}
      </div>

      {/* Graphique d'activité hebdomadaire Fintech */}
      <div className="mt-8" id="tour-dashboard-charts">
        <Card className="p-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">Activité</span>
            <CardTitle className="text-xl">Volume de transactions (7 derniers jours)</CardTitle>
          </div>
          
          <div className="mt-6 h-64 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Grille horizontale en arrière-plan */}
              <line x1="0" y1="60" x2="700" y2="60" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="120" x2="700" y2="120" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="180" x2="700" y2="180" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />

              {/* Remplissage sous la courbe */}
              <path
                d="M 50 180 Q 150 110 250 150 T 450 70 T 650 40 L 650 200 L 50 200 Z"
                fill="url(#chart-gradient)"
              />

              {/* Ligne principale de la courbe */}
              <path
                d="M 50 180 Q 150 110 250 150 T 450 70 T 650 40"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points de données et effets lumineux */}
              <circle cx="50" cy="180" r="4.5" fill="var(--surface)" stroke="var(--color-primary)" strokeWidth="3" />
              <circle cx="250" cy="150" r="4.5" fill="var(--surface)" stroke="var(--color-primary)" strokeWidth="3" />
              <circle cx="450" cy="70" r="4.5" fill="var(--surface)" stroke="var(--color-primary)" strokeWidth="3" />
              <circle cx="650" cy="40" r="4.5" fill="var(--surface)" stroke="var(--color-primary)" strokeWidth="3" />
            </svg>
          </div>

          <div className="flex justify-between px-2 text-xs font-semibold text-text-secondary/70 mt-4 border-t border-border pt-4">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mer</span>
            <span>Jeu</span>
            <span>Ven</span>
            <span>Sam</span>
            <span>Dim</span>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Ruptures proches
            </span>
          </CardTitle>
          <AlertList items={data.alertes.ruptures} emptyLabel="Aucune rupture imminente." />
        </Card>
        <Card>
          <CardTitle>Produits dormants</CardTitle>
          <AlertList items={data.alertes.dormants} emptyLabel="Aucun produit dormant." />
        </Card>
      </div>
    </div>
  );
}

function AlertList({
  items,
  emptyLabel,
}: {
  items: { id: string; nom: string; stock: number }[];
  emptyLabel: string;
}) {
  if (items.length === 0) return <p className="mt-3 text-sm text-slate-400">{emptyLabel}</p>;
  return (
    <ul className="mt-3 space-y-2">
      {items.map((it) => (
        <li key={it.id} className="flex items-center justify-between text-sm">
          <span className="text-slate-700">{it.nom}</span>
          <Badge tone={it.stock <= 0 ? 'danger' : 'warning'}>{formatQty(it.stock)} en stock</Badge>
        </li>
      ))}
    </ul>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}
