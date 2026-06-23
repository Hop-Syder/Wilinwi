'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Livraisons (MVP minimal) : le livreur voit ses courses et les marque
 *   livrées ; le gérant/propriétaire voit tout et peut assigner une vente à livrer. (OT-8)
 */

import { useEffect, useState } from 'react';
import { Truck, Check, MapPin, Phone, Plus, X } from 'lucide-react';
import { Card, Button, Badge, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';
import { useAuth } from '@/lib/auth-context';

interface Delivery {
  id: string;
  total: number;
  adresseLivraison: string | null;
  livreLe: string | null;
  livreurId: string | null;
  livreurNom: string | null;
  clientNom: string | null;
  clientTel: string | null;
  createdAt: string;
  statut: 'A_LIVRER' | 'LIVRE';
}

interface UserLite {
  id: string;
  nom: string;
  role: string;
}

interface RecentSale {
  id: string;
  total: number;
  createdAt: string;
  client?: { nom: string } | null;
}

export default function LivraisonsPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const { data, loading, error, refetch } = useCachedQuery<Delivery[]>('pos/deliveries', () =>
    apiGet<Delivery[]>('/api/pos/deliveries'),
  );
  const deliveries = data ?? [];

  const [busyId, setBusyId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  async function markDelivered(id: string) {
    setBusyId(id);
    try {
      await apiPost(`/api/pos/sales/${id}/delivered`, {});
      await refetch();
    } catch (e) {
      alert((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-brand">
          <Truck className="h-6 w-6" /> Livraisons
        </h1>
        {isManager && (
          <Button onClick={() => setAssignOpen(true)}>
            <Plus className="h-4 w-4" /> Assigner une livraison
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {isManager
          ? 'Suivez et assignez les livraisons de votre boutique.'
          : 'Les livraisons qui vous sont assignées.'}
      </p>

      {error && deliveries.length === 0 && (
        <p className="mt-6 text-sm text-red-600">{error.message}</p>
      )}
      {loading && deliveries.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">Chargement…</p>
      )}

      {!loading && deliveries.length === 0 ? (
        <Card className="mt-6 border-dashed p-10 text-center text-slate-400">
          <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          Aucune livraison{isManager ? '' : ' assignée'} pour le moment.
        </Card>
      ) : (
        <ul className="mt-6 space-y-3">
          {deliveries.map((d) => (
            <li key={d.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="tabular font-semibold text-slate-900">{formatFCFA(d.total)}</span>
                    <Badge tone={d.statut === 'LIVRE' ? 'success' : 'warning'}>
                      {d.statut === 'LIVRE' ? 'Livré' : 'À livrer'}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                    {d.clientNom && <div>{d.clientNom}</div>}
                    {d.adresseLivraison && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {d.adresseLivraison}
                      </div>
                    )}
                    {d.clientTel && (
                      <a
                        href={`tel:${d.clientTel}`}
                        className="flex items-center gap-1 text-brand hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" /> {d.clientTel}
                      </a>
                    )}
                    {isManager && (
                      <div className="text-xs text-slate-400">
                        Livreur : {d.livreurNom ?? 'non assigné'}
                      </div>
                    )}
                  </div>
                </div>

                {d.statut === 'A_LIVRER' ? (
                  <Button
                    variant="emerald"
                    className="shrink-0"
                    disabled={busyId === d.id}
                    onClick={() => void markDelivered(d.id)}
                  >
                    <Check className="h-4 w-4" /> Marquer livré
                  </Button>
                ) : (
                  <span className="shrink-0 text-xs text-slate-400">
                    {d.livreLe ? new Date(d.livreLe).toLocaleString('fr-FR') : ''}
                  </span>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {assignOpen && isManager && (
        <AssignModal
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            setAssignOpen(false);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

/** Modale d'assignation (gérant) : choisir une vente récente, un livreur, une adresse. */
function AssignModal({ onClose, onAssigned }: { onClose: () => void; onAssigned: () => void }) {
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [livreurs, setLivreurs] = useState<UserLite[]>([]);
  const [saleId, setSaleId] = useState('');
  const [livreurId, setLivreurId] = useState('');
  const [adresse, setAdresse] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiGet<RecentSale[]>('/api/pos/sales').then(setSales).catch(() => setSales([]));
    apiGet<UserLite[]>('/api/users')
      .then((u) => setLivreurs(u.filter((x) => x.role === 'DELIVERY')))
      .catch(() => setLivreurs([]));
  }, []);

  async function submit() {
    if (!saleId) {
      setErr('Choisissez une vente.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await apiPatch(`/api/pos/sales/${saleId}/delivery`, {
        livreurId: livreurId || null,
        adresseLivraison: adresse || null,
      });
      onAssigned();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-brand">Assigner une livraison</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Vente</span>
            <select
              value={saleId}
              onChange={(e) => setSaleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">-- Choisir une vente --</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatFCFA(s.total)} · {s.client?.nom ?? 'Client comptoir'} ·{' '}
                  {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Livreur</span>
            <select
              value={livreurId}
              onChange={(e) => setLivreurId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">-- Non assigné --</option>
              {livreurs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nom}
                </option>
              ))}
            </select>
            {livreurs.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Aucun collaborateur « Livreur ». Créez-en un dans Paramètres → Utilisateurs.
              </p>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Adresse de livraison</span>
            <input
              type="text"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Ex: Rue 12, Cocody…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={() => void submit()} disabled={saving || !saleId}>
            Assigner
          </Button>
        </div>
      </div>
    </div>
  );
}
