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
          <h1 className="font-display text-2xl font-bold text-brand">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate-500">
            Aperçu de l'activité du <strong className="font-medium">{new Date().toLocaleDateString()}</strong>.
          </p>
        </div>
        <ContextualHelp 
          storageKey="wilinwi_dashboard_tour_done"
          tourSteps={tourSteps}
          useCases={[
            { title: 'Suivre la marge bénéficiaire', description: 'Le chiffre d\'affaires vous indique ce qui est entré en caisse, mais la "Marge générée" vous montre votre bénéfice réel.' },
            { title: 'Optimiser le réassort', description: 'Le panneau "Top Produits" vous montre quels articles se vendent le mieux, ce qui vous aide à savoir quoi racheter en priorité.' }
          ]}
        />
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

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2" id="tour-dashboard-charts">
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gold" /> Ruptures proches
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
