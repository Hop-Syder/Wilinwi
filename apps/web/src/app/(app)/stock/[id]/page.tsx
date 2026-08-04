/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Fiche Détail Produit — Page /stock/[id] (Axe 4 : Navigation par Onglets Synthèse, Journal & Performance)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRightLeft, Package, Layers
} from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA, formatQty } from '@wilinwi/ui';
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StockMovementModal } from '@/components/stock-modals';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

type Movement = {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantite: number;
  motif: string;
  createdAt: string;
  saleId?: string;
  createdByName?: string;
};

export default function ProductStockDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canSeeCost = canWrite;

  const [product, setProduct] = useState<ProductDto | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);

  // Onglet Actif (1: Synthèse, 2: Mouvements, 3: Performance)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'performance'>('overview');

  async function loadData() {
    try {
      const [prod, movs] = await Promise.all([
        apiGet<ProductDto>(`/api/stock/products/${id}`),
        apiGet<Movement[]>(`/api/stock/products/${id}/movements`),
      ]);
      setProduct(prod);
      setMovements(movs);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  useEffect(() => {
    void loadData();
  }, [id]);

  // Analyse des Performances (30 derniers jours)
  const performanceStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const outMovements30d = movements.filter(
      (m) => m.type === 'OUT' && new Date(m.createdAt) >= thirtyDaysAgo
    );

    const volumeVendu30j = Math.abs(
      outMovements30d.reduce((sum, m) => sum + m.quantite, 0)
    );

    const caEstime30j = volumeVendu30j * (product?.prixCatalogue || 0);

    // Vitesse de rotation : Fast mover (>30 ventes), Slow mover (1-30), Dormant (0)
    const rotationSpeed =
      volumeVendu30j >= 30
        ? { label: 'Fast Mover (Rotation Rapide)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
        : volumeVendu30j > 0
          ? { label: 'Slow Mover (Rotation Modérée)', color: 'bg-amber-50 text-amber-700 border-amber-200' }
          : { label: 'Dormant (Aucune vente 30j)', color: 'bg-slate-100 text-slate-600 border-slate-200' };

    return { volumeVendu30j, caEstime30j, rotationSpeed };
  }, [movements, product]);

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <p className="text-red-600 font-bold">Erreur : {error}</p>
      </div>
    );
  }

  if (!product) {
    return <div className="p-8 text-center text-slate-500 font-medium">Chargement des détails...</div>;
  }

  const prixVente = product.prixCatalogue || 0;
  const prixAchat = product.prixAchat || 0;
  const margeMontant = prixVente - prixAchat;
  const margePercent = prixVente > 0 && prixAchat > 0 ? Math.round((margeMontant / prixVente) * 100) : 0;

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-stockdetail-tabs',
      title: 'Navigation par Onglets',
      content: 'Basculez entre la Synthèse globale, le Journal complet des mouvements et l\'Analyse de performance 30 jours.',
      position: 'bottom',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Fiche Produit */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-slate-900">{product.nom}</h1>
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${performanceStats.rotationSpeed.color}`}>
                {performanceStats.rotationSpeed.label}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500">
              {product.sku ? `SKU: ${product.sku}` : 'Aucun SKU'} • Catégorie: <strong className="text-slate-800">{product.categorie || 'Général'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ContextualHelp
            storageKey="wilinwi_stock_detail_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Ajustement manuel', description: 'Corrigez le stock physiquement présent en rayon en enregistrant une entrée, une sortie ou un inventaire.' },
              { title: 'Suivi des ventes 30j', description: 'Consultez le volume écoulé sur les 30 derniers jours dans l\'onglet Analyse des Performances.' },
            ]}
          />
          {canWrite && (
            <Button
              onClick={() => setShowMovementModal(true)}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 transition-transform active:scale-95"
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Mouvement manuel
            </Button>
          )}
        </div>
      </div>

      {/* ── AXE 4 : Barre d'Onglets (Tabs UI) ── */}
      <div className="border-b border-slate-200" id="tour-stockdetail-tabs">
        <nav className="flex space-x-6 text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Synthèse & Tarification
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Journal des Mouvements ({movements.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'performance'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Analyse des Performances
          </button>
        </nav>
      </div>

      {/* ── ONGLET 1 : Synthèse & Tarification ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Galerie Photos Produit */}
          {product.photos && product.photos.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {product.photos.map((url, idx) => (
                <div key={idx} className="relative h-28 w-28 overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                  <Image src={url} alt={product.nom} fill sizes="112px" className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}

          {/* Grille Tarifaire & Stock */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stock Actuel</span>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-3xl font-extrabold text-slate-900 tabular-nums">
                  {formatQty(product.stock)}
                </span>
                <Badge tone={product.stock <= (product.seuilAlerte ?? 5) ? 'danger' : 'success'}>
                  Seuil: {product.seuilAlerte ?? 5}
                </Badge>
              </div>
            </Card>

            <Card className="p-5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prix Catalogue (Vente)</span>
              <p className="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                {formatFCFA(prixVente)}
              </p>
            </Card>

            {canSeeCost && (
              <Card className="p-5 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prix Plancher (Min)</span>
                <p className="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                  {product.prixPlancher !== undefined ? formatFCFA(product.prixPlancher) : '—'}
                </p>
              </Card>
            )}

            {canSeeCost && (
              <Card className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prix d'Achat (Coût)</span>
                  {prixAchat > 0 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      +{margePercent}% Marge
                    </span>
                  )}
                </div>
                <p className="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                  {prixAchat > 0 ? formatFCFA(prixAchat) : '—'}
                </p>
              </Card>
            )}
          </div>

          {/* Déclinaisons & Variantes si présentes */}
          {product.variants && product.variants.length > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span>Déclinaisons & Variantes ({product.variants.length})</span>
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {product.variants.map((v, i) => (
                  <span key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                    {Object.values(v.attributs).join(', ') || 'Variante'} {v.sku ? `(${v.sku})` : ''} • Stock: {v.stock ?? 0}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {canWrite && (
            <ThresholdCard
              productId={product.id}
              etablissementId={user?.etablissementId ?? null}
              defaultMin={product.seuilAlerte ?? 0}
            />
          )}
        </div>
      )}

      {/* ── ONGLET 2 : Journal des Mouvements ── */}
      {activeTab === 'history' && (
        <Card className="overflow-hidden p-0 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Date & Heure</th>
                  <th className="px-4 py-3.5">Type de mouvement</th>
                  <th className="px-4 py-3.5">Quantité</th>
                  <th className="px-4 py-3.5">Motif / Référence</th>
                  <th className="px-4 py-3.5">Auteur / Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {new Date(m.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={m.type === 'IN' ? 'success' : m.type === 'OUT' ? 'danger' : 'warning'}>
                        {m.type === 'IN' ? 'Entrée (+)' : m.type === 'OUT' ? 'Sortie (-)' : 'Régularisation'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">
                      <span className={m.quantite > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {m.quantite > 0 ? '+' : ''}{formatQty(m.quantite)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {m.motif}
                      {m.saleId && <Badge tone="brand" className="ml-2">Ticket Vente</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-semibold">
                      {m.createdByName || (m.saleId ? 'Système Vente POS' : 'Gérant / Admin')}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 space-y-2">
                      <Package className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">Aucun mouvement enregistré pour ce produit.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── ONGLET 3 : Analyse des Performances ── */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Volume Vendu (30 jours)</span>
              <p className="font-mono text-3xl font-extrabold text-slate-900 tabular-nums">
                {formatQty(performanceStats.volumeVendu30j)} unités
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">CA Estimé Généré (30j)</span>
              <p className="font-mono text-3xl font-extrabold text-emerald-700 tabular-nums">
                {formatFCFA(performanceStats.caEstime30j)}
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vitesse de Rotation</span>
              <p className="text-sm font-bold text-slate-900 pt-1">
                {performanceStats.rotationSpeed.label}
              </p>
            </Card>
          </div>
        </div>
      )}

      {showMovementModal && (
        <StockMovementModal
          product={product}
          onClose={() => setShowMovementModal(false)}
          onSuccess={() => { setShowMovementModal(false); void loadData(); }}
        />
      )}
    </div>
  );
}

function ThresholdCard({
  productId,
  etablissementId,
  defaultMin,
}: {
  productId: string;
  etablissementId: string | null;
  defaultMin: number;
}) {
  const isGlobal = etablissementId === 'ALL' || !etablissementId;
  const [value, setValue] = useState(String(defaultMin));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (isGlobal) return;
    setSaving(true);
    setErr(null);
    setDone(false);
    try {
      await apiPatch(`/api/stock/products/${productId}/threshold`, {
        etablissementId,
        quantiteMin: Number(value) || 0,
      });
      setDone(true);
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-slate-800">Seuil d'alerte de stock</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Alerte « stock bas » quand la quantité de cet établissement passe sous ce seuil.
      </p>
      {isGlobal ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-500 border border-slate-200">
          Sélectionnez un établissement précis dans la barre supérieure pour personnaliser son seuil d'alerte.
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => { setValue(e.target.value); setDone(false); }}
            className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 font-mono font-bold"
          />
          <Button variant="emerald" disabled={saving} onClick={save} className="rounded-xl">
            {saving ? 'Enregistrement…' : 'Définir le seuil'}
          </Button>
          {done && <span className="text-xs font-bold text-emerald-600">✓ Enregistré</span>}
        </div>
      )}
      {err && <p className="mt-2 text-xs font-bold text-rose-600">{err}</p>}
    </Card>
  );
}
