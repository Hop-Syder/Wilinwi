'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Dispatch / transfert interne entrepôt → boutique.
 *   Liste, création (brouillon ou validation immédiate), validation, annulation.
 *   Réservé OWNER/MANAGER. La validation déplace le stock des deux emplacements.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Truck, X, Trash2, CheckCircle2, Ban, ArrowRight } from 'lucide-react';
import {
  DISPATCH_STATUS_LABELS,
  type DispatchOrderDto,
  type EtablissementDto,
  type ProductDto,
} from '@wilinwi/types';
import { Button, Card, Badge, Input, Select } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useSync } from '@/lib/use-sync';
import { OfflineBanner } from '@/components/offline-banner';

type Row = { productId: string; quantite: string };

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  VALIDATED: 'success',
  DRAFT: 'warning',
  CANCELLED: 'danger',
};

export default function DispatchPage() {
  const { state } = useSync();
  const offline = state === 'offline';
  const [list, setList] = useState<DispatchOrderDto[]>([]);
  const [etabs, setEtabs] = useState<EtablissementDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  // Brouillon du formulaire de création.
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [note, setNote] = useState('');
  const [validateNow, setValidateNow] = useState(true);
  const [rows, setRows] = useState<Row[]>([{ productId: '', quantite: '' }]);

  async function load() {
    try {
      const [d, e, p] = await Promise.all([
        apiGet<DispatchOrderDto[]>('/api/dispatches'),
        apiGet<EtablissementDto[]>('/api/etablissements'),
        apiGet<ProductDto[]>('/api/stock/products'),
      ]);
      setList(d);
      setEtabs(e);
      setProducts(p);
    } catch (err) {
      setError((err as ApiError).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const productName = useMemo(
    () => new Map(products.map((p) => [p.id, p.nom])),
    [products],
  );

  function openCreate() {
    setError(null);
    setSourceId('');
    setDestinationId('');
    setNote('');
    setValidateNow(true);
    setRows([{ productId: '', quantite: '' }]);
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const items = rows
        .filter((r) => r.productId && Number(r.quantite) > 0)
        .map((r) => ({ productId: r.productId, quantite: Number(r.quantite) }));
      if (!sourceId || !destinationId) throw new Error('Source et destination sont requises.');
      if (sourceId === destinationId) throw new Error('Source et destination doivent différer.');
      if (items.length === 0) throw new Error('Ajoutez au moins un produit avec une quantité.');
      await apiPost('/api/dispatches', {
        sourceId,
        destinationId,
        note: note || null,
        validate: validateNow,
        items,
      });
      setOpen(false);
      await load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, action: 'validate' | 'cancel') {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/dispatches/${id}/${action}`, {});
      await load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/entrepot" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Entrepôt
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-brand">
            <Truck className="h-6 w-6" /> Dispatch
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Transférez la marchandise de l'entrepôt vers une boutique. La validation déplace le stock.
          </p>
        </div>
        <Button onClick={openCreate} disabled={offline}>
          <Plus className="h-4 w-4" /> Nouveau dispatch
        </Button>
      </div>

      <div className="mt-4">
        <OfflineBanner message="Mode hors-ligne : la création et la validation d'un dispatch nécessitent une connexion." />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-3">
        {list.map((d) => (
          <Card key={d.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-800">{d.reference}</span>
                  <Badge tone={STATUS_TONE[d.statut] ?? 'warning'}>
                    {DISPATCH_STATUS_LABELS[d.statut]}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium">{d.sourceNom ?? '—'}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{d.destinationNom ?? '—'}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {d.items.length} produit(s) · {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                  {d.note ? ` · ${d.note}` : ''}
                </div>
              </div>
              {d.statut === 'DRAFT' && (
                <div className="flex shrink-0 gap-2">
                  <Button variant="emerald" size="sm" disabled={busy || offline} onClick={() => void act(d.id, 'validate')}>
                    <CheckCircle2 className="h-4 w-4" /> Valider
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void act(d.id, 'cancel')}>
                    <Ban className="h-4 w-4" /> Annuler
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-2 text-sm text-slate-600">
              {d.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-0.5">
                  <span className="truncate">{it.productNom}</span>
                  <span className="tabular font-medium">× {it.quantite}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="p-10 text-center text-slate-400">Aucun dispatch.</Card>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => setOpen(false)}>
          <Card className="my-8 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-brand">Nouveau dispatch</h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Source (entrepôt)</span>
                <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {etabs.map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Destination (boutique)</span>
                <Select value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {etabs.filter((e) => e.id !== sourceId).map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Produits à transférer</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, { productId: '', quantite: '' }])}>
                  <Plus className="mr-1 h-4 w-4" /> Ligne
                </Button>
              </div>
              <div className="space-y-2">
                {rows.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={r.productId}
                        onChange={(e) => {
                          const n = [...rows]; n[idx].productId = e.target.value; setRows(n);
                        }}
                      >
                        <option value="">— Produit —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                      </Select>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qté"
                      value={r.quantite}
                      onChange={(e) => { const n = [...rows]; n[idx].quantite = e.target.value; setRows(n); }}
                      className="w-24"
                    />
                    <button type="button" onClick={() => setRows(rows.filter((_, i) => i !== idx))} className="p-1.5 text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Note (optionnel)</span>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. réassort hebdo" />
            </label>

            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={validateNow} onChange={(e) => setValidateNow(e.target.checked)} />
              Valider immédiatement (déplace le stock maintenant)
            </label>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button variant="emerald" disabled={busy || offline} onClick={save}>
                {busy ? 'Enregistrement…' : validateNow ? 'Créer & valider' : 'Créer le brouillon'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
