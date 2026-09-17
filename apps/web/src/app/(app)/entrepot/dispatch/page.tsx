'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Dispatch / transfert interne entrepôt → boutique.
 *   Cycle de vie complet : Brouillon (DRAFT) → Expédié / En transit (SHIPPED) → Réceptionné (VALIDATED).
 *   Permet également le transfert direct immédiat et l'annulation avec retour en stock.
 *   Réservé OWNER/MANAGER.
 * @created 2026-06-28
 * @updated 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Truck,
  X,
  Trash2,
  CheckCircle2,
  Ban,
  ArrowRight,
  Send,
  PackageCheck,
  Clock,
  Warehouse,
  Store,
} from 'lucide-react';
import {
  DISPATCH_STATUS_LABELS,
  type DispatchOrderDto,
  type DispatchStatus,
  type EtablissementDto,
  type ProductDto,
} from '@wilinwi/types';
import { Button, Card, Badge, Input, Select } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useSync } from '@/lib/use-sync';
import { OfflineBanner } from '@/components/offline-banner';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

type Row = { productId: string; quantite: string };
type CreationMode = 'draft' | 'ship' | 'direct';

const STATUS_TONE: Record<DispatchStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'warning',
  SHIPPED: 'brand',
  VALIDATED: 'success',
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
  const [filterTab, setFilterTab] = useState<'ALL' | DispatchStatus>('ALL');

  // Brouillon du formulaire de création
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [note, setNote] = useState('');
  const [creationMode, setCreationMode] = useState<CreationMode>('ship');
  const [rows, setRows] = useState<Row[]>([{ productId: '', quantite: '' }]);

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-dispatch-new',
      title: 'Créer un transfert',
      content: 'Choisissez une source (entrepôt), une boutique de destination et les produits à transférer.',
      position: 'bottom',
    },
    {
      targetId: 'tour-dispatch-tabs',
      title: 'Suivi des étapes',
      content: 'Filtrez vos transferts par statut : En transit (marchandise en route), Réceptionnés ou Brouillons.',
      position: 'bottom',
    },
    {
      targetId: 'tour-dispatch-list',
      title: 'Validation & Réception',
      content: 'Expédiez pour faire sortir le stock de la source, puis pointez et réceptionnez à la boutique de destination.',
      position: 'top',
    },
  ];

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

  function openCreate() {
    setError(null);
    setSourceId(etabs[0]?.id ?? '');
    setDestinationId(etabs[1]?.id ?? '');
    setNote('');
    setCreationMode('ship');
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
      if (sourceId === destinationId) throw new Error('Source et destination doivent être différentes.');
      if (items.length === 0) throw new Error('Ajoutez au moins un produit avec une quantité valide.');

      // Création initiale (avec validate: true si direct)
      const created = await apiPost<DispatchOrderDto>('/api/dispatches', {
        sourceId,
        destinationId,
        note: note || null,
        validate: creationMode === 'direct',
        items,
      });

      // Si le mode choisi est "Expédier immédiatement", on déclenche le passage en SHIPPED
      if (creationMode === 'ship' && created?.id) {
        await apiPost(`/api/dispatches/${created.id}/ship`, {});
      }

      setOpen(false);
      await load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, action: 'ship' | 'receive' | 'validate' | 'cancel') {
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

  // Filtrage
  const counts = useMemo(() => {
    return {
      ALL: list.length,
      SHIPPED: list.filter((d) => d.statut === 'SHIPPED').length,
      DRAFT: list.filter((d) => d.statut === 'DRAFT').length,
      VALIDATED: list.filter((d) => d.statut === 'VALIDATED').length,
      CANCELLED: list.filter((d) => d.statut === 'CANCELLED').length,
    };
  }, [list]);

  const filteredList = useMemo(() => {
    if (filterTab === 'ALL') return list;
    return list.filter((d) => d.statut === filterTab);
  }, [list, filterTab]);

  return (
    <div>
      <Link href="/entrepot" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Entrepôt
      </Link>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl sm:text-2xl font-extrabold text-teal-950">
            <Truck className="h-5 sm:h-6 w-5 sm:w-6 text-teal-600 shrink-0" /> Dispatch & Transferts
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Acheminez vos marchandises de l'entrepôt vers vos boutiques avec suivi en transit et pointage de réception.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ContextualHelp
            storageKey="wilinwi_dispatch_tour_done"
            tourSteps={tourSteps}
            useCases={[
              {
                title: 'Machine d’état sécurisée',
                description: 'Le stock est déduit de la source dès l’expédition (En transit), puis crédité à la destination uniquement après réception.',
              },
              {
                title: 'Pointage de réception',
                description: 'Le responsable de boutique valide l’arrivée effective du camion/colis pour intégrer le stock.',
              },
              {
                title: 'Annulation en cours de route',
                description: 'Si un dispatch en transit est annulé, le stock est automatiquement réintégré dans l’entrepôt source.',
              },
            ]}
          />
          <div id="tour-dispatch-new">
            <Button
              onClick={openCreate}
              disabled={offline}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 gap-1.5 transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" /> Nouveau dispatch
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <OfflineBanner message="Mode hors-ligne : les transferts de stock nécessitent une connexion internet." />
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs underline">
            Fermer
          </button>
        </div>
      )}

      {/* Onglets de filtrage */}
      <div id="tour-dispatch-tabs" className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilterTab('ALL')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            filterTab === 'ALL'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tous ({counts.ALL})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('SHIPPED')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            filterTab === 'SHIPPED'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
          }`}
        >
          <Truck className="h-3.5 w-3.5" /> En transit ({counts.SHIPPED})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('DRAFT')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            filterTab === 'DRAFT'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          Brouillons ({counts.DRAFT})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('VALIDATED')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            filterTab === 'VALIDATED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          Réceptionnés ({counts.VALIDATED})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('CANCELLED')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            filterTab === 'CANCELLED'
              ? 'bg-slate-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Annulés ({counts.CANCELLED})
        </button>
      </div>

      {/* Liste des dispatches */}
      <div id="tour-dispatch-list" className="mt-4 space-y-3">
        {filteredList.map((d) => (
          <Card key={d.id} className="p-4 transition-all hover:border-slate-300">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900">{d.reference}</span>
                  <Badge tone={STATUS_TONE[d.statut]}>
                    {DISPATCH_STATUS_LABELS[d.statut]}
                  </Badge>
                  {d.statut === 'SHIPPED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
                      <Truck className="h-3 w-3" /> En route
                    </span>
                  )}
                </div>

                {/* Trajet Source -> Destination */}
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    <Warehouse className="h-3.5 w-3.5 text-teal-600" /> {d.sourceNom ?? 'Entrepôt source'}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-teal-50 text-teal-900 px-2 py-0.5 rounded">
                    <Store className="h-3.5 w-3.5 text-teal-600" /> {d.destinationNom ?? 'Boutique cible'}
                  </span>
                </div>

                {/* Métadonnées & Horodatages */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{d.items.length} produit(s)</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Créé le {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  {d.shippedAt && (
                    <span className="text-blue-700 font-medium">
                      Expédié le {new Date(d.shippedAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {d.validatedAt && (
                    <span className="text-emerald-700 font-medium">
                      Réceptionné le {new Date(d.validatedAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {d.note && <span className="italic text-slate-600">« {d.note} »</span>}
                </div>
              </div>

              {/* Boutons d'action contextuels selon l'état */}
              <div className="flex shrink-0 items-center gap-2">
                {d.statut === 'DRAFT' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busy || offline}
                      onClick={() => void act(d.id, 'ship')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1 text-xs shadow-sm"
                      title="Sortir le stock de l'entrepôt et mettre le transfert en transit"
                    >
                      <Send className="h-3.5 w-3.5" /> Expédier
                    </Button>
                    <Button
                      variant="emerald"
                      size="sm"
                      disabled={busy || offline}
                      onClick={() => void act(d.id, 'validate')}
                      className="gap-1 text-xs"
                      title="Transférer et intégrer directement sans étape de transit"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Transfert direct
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void act(d.id, 'cancel')}
                      className="text-slate-500 hover:text-red-600 text-xs"
                    >
                      <Ban className="h-3.5 w-3.5" /> Annuler
                    </Button>
                  </>
                )}

                {d.statut === 'SHIPPED' && (
                  <>
                    <Button
                      variant="emerald"
                      size="sm"
                      disabled={busy || offline}
                      onClick={() => void act(d.id, 'receive')}
                      className="font-bold gap-1.5 text-xs shadow-md shadow-emerald-600/20"
                      title="Confirmer la réception physique et créditer le stock boutique"
                    >
                      <PackageCheck className="h-4 w-4" /> Pointer & Réceptionner
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void act(d.id, 'cancel')}
                      className="text-amber-700 hover:bg-amber-50 text-xs"
                      title="Annuler l'envoi et réintégrer la marchandise à l'entrepôt source"
                    >
                      <Ban className="h-3.5 w-3.5" /> Retourner à la source
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Détail des lignes d'articles */}
            <div className="mt-3 border-t border-slate-100 pt-2 text-sm text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {d.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1 text-xs">
                    <span className="truncate font-medium text-slate-800">{it.productNom}</span>
                    <span className="tabular font-bold text-teal-800 bg-white px-2 py-0.5 rounded border border-slate-200 ml-2">
                      × {it.quantite}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}

        {filteredList.length === 0 && (
          <Card className="p-10 text-center text-slate-400">
            {filterTab === 'ALL'
              ? 'Aucun dispatch enregistré.'
              : `Aucun transfert dans la catégorie « ${filterTab} ».`}
          </Card>
        )}
      </div>

      {/* Modal de création de transfert */}
      {open && (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <Card className="my-8 w-full max-w-2xl shadow-2xl border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg font-bold text-teal-950 flex items-center gap-2">
                <Truck className="h-5 w-5 text-teal-600" /> Nouveau transfert de stock
              </h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Établissement Source (Entrepôt)</span>
                <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  <option value="">— Choisir la source —</option>
                  {etabs.map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Destination (Boutique)</span>
                <Select value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
                  <option value="">— Choisir la destination —</option>
                  {etabs.filter((e) => e.id !== sourceId).map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </Select>
              </label>
            </div>

            {/* Articles */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Produits à transférer</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRows([...rows, { productId: '', quantite: '' }])}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter un produit
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {rows.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div className="flex-1">
                      <Select
                        value={r.productId}
                        onChange={(e) => {
                          const n = [...rows];
                          n[idx].productId = e.target.value;
                          setRows(n);
                        }}
                      >
                        <option value="">— Sélectionner un produit —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                      </Select>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Quantité"
                      value={r.quantite}
                      onChange={(e) => {
                        const n = [...rows];
                        n[idx].quantite = e.target.value;
                        setRows(n);
                      }}
                      className="w-24 bg-white"
                    />
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Note ou consigne de transport (optionnel)</span>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex. Réassort hebdomadaire, chauffeur Moussa"
              />
            </label>

            {/* Choix du mode d'exécution */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="block text-xs font-bold text-slate-800 mb-2">Mode d'exécution :</span>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="creationMode"
                    value="ship"
                    checked={creationMode === 'ship'}
                    onChange={() => setCreationMode('ship')}
                    className="mt-0.5 text-teal-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Expédier maintenant (Recommandé)</span>
                    <p className="text-[11px] text-slate-500">
                      Déduit le stock de l'entrepôt immédiatement et place le transfert en statut « En transit ». La boutique confirmera à la réception.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="creationMode"
                    value="direct"
                    checked={creationMode === 'direct'}
                    onChange={() => setCreationMode('direct')}
                    className="mt-0.5 text-teal-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Transfert direct immédiat</span>
                    <p className="text-[11px] text-slate-500">
                      Pour les déplacements sur place : sort le stock source et intègre le stock boutique en une seule étape.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="creationMode"
                    value="draft"
                    checked={creationMode === 'draft'}
                    onChange={() => setCreationMode('draft')}
                    className="mt-0.5 text-teal-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Enregistrer comme brouillon</span>
                    <p className="text-[11px] text-slate-500">
                      Prépare la liste des colis sans impacter les stocks. L'expédition pourra être lancée plus tard.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="emerald"
                disabled={busy || offline}
                onClick={save}
                className="font-bold gap-1.5 shadow-sm"
              >
                {busy ? (
                  'Enregistrement…'
                ) : creationMode === 'ship' ? (
                  <>
                    <Send className="h-4 w-4" /> Créer & Expédier
                  </>
                ) : creationMode === 'direct' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Transférer immédiatement
                  </>
                ) : (
                  'Enregistrer le brouillon'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
