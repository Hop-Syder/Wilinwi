'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Package, Wallet, AlertTriangle } from 'lucide-react';
import { StatCard, Card, CardTitle, Badge, formatFCFA, formatQty } from '@wilinwi/ui';
import { apiGet, ApiError } from '@/lib/api';

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
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Dashboard>('/api/analytics/dashboard')
      .then(setData)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <p className="text-slate-400">Chargement du tableau de bord…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand">Tableau de bord</h1>
      <p className="mt-1 text-sm text-slate-500">L'état de santé de votre boutique aujourd'hui.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            icon={<Wallet className="h-5 w-5" />}
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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
