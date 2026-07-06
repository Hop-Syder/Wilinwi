import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Plus, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@wilinwi/ui';
import {
  formatQuantity,
  maxProductPhotos,
  planAllowsProductImages,
  productAffectsStock,
  PRODUCT_TYPE_LABELS,
  quantityScale,
  toDisplayQuantity,
  toStoredQuantity,
  UNIT_KIND_LABELS,
  UNIT_KINDS,
  type BatchDto,
  type ProductDto,
  type ProductUnitDto,
  type ProductType,
  type RecipeDto,
  type UnitKind,
  type UpsertRecipeInput,
} from '@wilinwi/types';
import { apiGet, apiPost, apiPatch, apiPut, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ProductPhotos } from './product-photos';

interface StockMovementModalProps {
  product: ProductDto;
  onClose: () => void;
  onSuccess: () => void;
}

export function StockMovementModal({ product, onClose, onSuccess }: StockMovementModalProps) {
  const [type, setType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [variantId, setVariantId] = useState<string>('');
  const [quantite, setQuantite] = useState('');
  const [motif, setMotif] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost('/api/stock/movements', {
        productId: product.id,
        variantId: variantId || undefined,
        type,
        quantite: Number(quantite),
        motif,
      });
      onSuccess();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Mouvement de stock</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Produit : <span className="font-semibold text-brand">{product.nom}</span> (Stock actuel: {product.stock})
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Type d'opération</label>
            <div className="flex gap-2">
              <Button type="button" variant={type === 'IN' ? 'primary' : 'outline'} onClick={() => setType('IN')} className="flex-1">
                Entrée (+)
              </Button>
              <Button type="button" variant={type === 'OUT' ? 'danger' : 'outline'} onClick={() => setType('OUT')} className="flex-1">
                Sortie (-)
              </Button>
              <Button type="button" variant={type === 'ADJUST' ? 'primary' : 'outline'} onClick={() => setType('ADJUST')} className="flex-1">
                Ajustement
              </Button>
            </div>
          </div>

          {product.variants && product.variants.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Variante concernée</span>
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              >
                <option value="">-- Sélectionnez une variante (Optionnel) --</option>
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {Object.entries(v.attributs).map(([k, val]) => `${k}: ${val}`).join(', ')} (Stock: {v.stock})
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {/* ADJUST = écart SIGNÉ appliqué au stock (sémantique API), pas un stock cible. */}
              Quantité ({type === 'OUT' ? 'Sera soustraite' : type === 'IN' ? 'Sera ajoutée' : 'Écart appliqué au stock : + ajout, − retrait'})
            </span>
            <input
              type="number"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              required
              min={type === 'ADJUST' ? undefined : 1}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
            {type === 'ADJUST' && (
              <span className="mt-1 block text-[11px] text-slate-500">
                Ex. stock affiché 10, comptage réel 8 → saisir −2. Pour figer un comptage
                complet, préférez un inventaire.
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Motif (Obligatoire)</span>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              required
              placeholder={type === 'IN' ? 'Livraison fournisseur, Retour client...' : type === 'OUT' ? 'Casse, Perte, Expiration...' : 'Inventaire manuel...'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" variant="emerald" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Valider le mouvement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ProductFormModalProps {
  product?: ProductDto;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductFormModal({ product, onClose, onSuccess }: ProductFormModalProps) {
  const isEditing = !!product;
  const { user } = useAuth();
  const imagesAllowed = user ? planAllowsProductImages(user.plan) : false;
  const maxPhotos = user ? maxProductPhotos(user.plan) : 0;
  const [photos, setPhotos] = useState<string[]>(product?.photos ?? []);
  // Type de comportement stock/vente (TDR v2). BATCHED (lots/péremption) arrive
  // avec le Milestone 4 — proposé mais désactivé.
  const [type, setType] = useState<ProductType>(product?.type ?? 'STANDARD');
  const hasStock = productAffectsStock(type);
  // BATCHED : le stock s'entre exclusivement via la réception de lots (M4).
  const batched = type === 'BATCHED';
  // Milli-unités : les produits au poids/volume se saisissent en décimal
  // (1,5 kg) et se persistent en entiers (1500) — même philosophie que les FCFA.
  const [unitKind, setUnitKind] = useState<UnitKind>(product?.unitKind ?? 'UNIT');
  const [baseUnit, setBaseUnit] = useState(product?.baseUnit ?? '');
  const scaled = quantityScale(unitKind) !== 1;
  const [form, setForm] = useState({
    nom: product?.nom || '',
    sku: product?.sku || '',
    categorie: product?.categorie || '',
    prixAchat: product?.prixAchat?.toString() || '',
    prixPlancher: product?.prixPlancher?.toString() || '',
    prixCatalogue: product?.prixCatalogue?.toString() || '',
    stock: product ? toDisplayQuantity(product.stock, product.unitKind).toString() : '',
    seuilAlerte: product
      ? toDisplayQuantity(product.seuilAlerte, product.unitKind).toString()
      : '5',
  });
  const [variants, setVariants] = useState<Array<{ id?: string, key: string, val: string, sku: string, stock: string }>>(
    (product?.variants || []).map(v => {
      const entries = Object.entries(v.attributs);
      return {
        id: v.id,
        key: entries[0]?.[0] || 'Taille',
        val: entries[0]?.[1] || '',
        sku: v.sku || '',
        stock: v.stock.toString()
      };
    })
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nom: form.nom,
        sku: form.sku || undefined,
        categorie: form.categorie || undefined,
        type,
        unitKind,
        baseUnit: baseUnit.trim() || undefined,
        photos: imagesAllowed ? photos : undefined,
        prixAchat: Number(form.prixAchat),
        prixPlancher: Number(form.prixPlancher),
        prixCatalogue: Number(form.prixCatalogue),
        stock: isEditing
          ? undefined
          : hasStock && !batched
            ? toStoredQuantity(Number(form.stock || 0), unitKind)
            : 0,
        seuilAlerte: toStoredQuantity(Number(form.seuilAlerte || 5), unitKind),
        variants: variants.map(v => ({
          id: v.id,
          attributs: { [v.key || 'Variante']: v.val },
          sku: v.sku || undefined,
          stock: isEditing && v.id ? v.stock : Number(v.stock || 0) // En création on envoie le nombre
        }))
      };

      if (isEditing) {
        await apiPatch(`/api/stock/products/${product.id}`, payload);
      } else {
        await apiPost('/api/stock/products', payload);
      }
      onSuccess();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-4 sm:my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Modifier le produit' : 'Nouveau produit'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="col-span-full">
            <span className="mb-1 block text-xs font-medium text-slate-600">Nom du produit</span>
            <input type="text" value={form.nom} onChange={(e) => set('nom')(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="col-span-full sm:col-span-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">SKU (optionnel)</span>
            <input type="text" value={form.sku} onChange={(e) => set('sku')(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="col-span-full sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-600">Catégorie</span>
            <input type="text" value={form.categorie} onChange={(e) => set('categorie')(e.target.value)} placeholder="Ex: Vêtements, Électronique" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="col-span-full">
            <span className="mb-1 block text-xs font-medium text-slate-600">Type de produit</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProductType)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="STANDARD">{PRODUCT_TYPE_LABELS.STANDARD}</option>
              <option value="SERVICE">{PRODUCT_TYPE_LABELS.SERVICE}</option>
              <option value="MANUFACTURED">{PRODUCT_TYPE_LABELS.MANUFACTURED}</option>
              <option value="BATCHED">{PRODUCT_TYPE_LABELS.BATCHED}</option>
            </select>
            {!hasStock && (
              <span className="mt-1 block text-[11px] text-slate-500">
                Ce type se vend sans stock direct : aucun décrément à la vente.
              </span>
            )}
            {batched && (
              <span className="mt-1 block text-[11px] text-slate-500">
                Le stock s'entre via la réception de LOTS (numéro + péremption) —
                la vente sort en FEFO et refuse les lots périmés.
              </span>
            )}
          </label>
          <label className="col-span-full sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-600">Vendu…</span>
            <select
              value={unitKind}
              onChange={(e) => setUnitKind(e.target.value as UnitKind)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              {UNIT_KINDS.map((k) => (
                <option key={k} value={k}>{UNIT_KIND_LABELS[k]}</option>
              ))}
            </select>
          </label>
          {scaled && (
            <label className="col-span-full sm:col-span-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Unité de base</span>
              <input
                type="text"
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                placeholder={unitKind === 'WEIGHT' ? 'kg' : 'L'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Les quantités se saisissent en décimal (ex. 1,5 {baseUnit || (unitKind === 'WEIGHT' ? 'kg' : 'L')}).
              </span>
            </label>
          )}

          <div className="col-span-full my-2 border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Prix & Marges</h3>
          </div>
          <label className="col-span-full sm:col-span-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">Prix d'achat</span>
            <input type="number" value={form.prixAchat} onChange={(e) => set('prixAchat')(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="col-span-full sm:col-span-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">Prix plancher</span>
            <input type="number" value={form.prixPlancher} onChange={(e) => set('prixPlancher')(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="col-span-full sm:col-span-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">Prix catalogue</span>
            <input type="number" value={form.prixCatalogue} onChange={(e) => set('prixCatalogue')(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>

          {hasStock && (
            <>
              <div className="col-span-full my-2 border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Stock</h3>
              </div>
              {!isEditing && !batched && (
                <label className="col-span-full sm:col-span-1">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Stock initial{scaled ? ` (${baseUnit || 'unité de base'})` : ''}
                  </span>
                  <input type="number" step={scaled ? 'any' : 1} value={form.stock} onChange={(e) => set('stock')(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
                </label>
              )}
              <label className="col-span-full sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Seuil d'alerte{scaled ? ` (${baseUnit || 'unité de base'})` : ''}
                </span>
                <input type="number" step={scaled ? 'any' : 1} value={form.seuilAlerte} onChange={(e) => set('seuilAlerte')(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
              </label>
            </>
          )}

          <div className="col-span-full my-2 border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Photos du produit</h3>
            {imagesAllowed && user ? (
              <ProductPhotos
                tenantId={user.tenantId}
                photos={photos}
                onChange={setPhotos}
                max={maxPhotos}
              />
            ) : (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>Les photos produits (galerie) sont incluses dès le plan <strong>Business</strong>.</span>
                </div>
                <Link
                  href="/parametres"
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                >
                  Passer à Business
                </Link>
              </div>
            )}
          </div>

          <div className="col-span-full my-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Variantes (Tailles, Couleurs...)</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setVariants([...variants, { key: 'Taille', val: '', sku: '', stock: '0' }])}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter variante
              </Button>
            </div>
            
            {variants.length > 0 && (
              <div className="space-y-3">
                {variants.map((v, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">Attribut</span>
                        <input type="text" value={v.key} onChange={(e) => { const n = [...variants]; n[idx].key = e.target.value; setVariants(n); }} placeholder="Taille" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">Valeur</span>
                        <input type="text" value={v.val} onChange={(e) => { const n = [...variants]; n[idx].val = e.target.value; setVariants(n); }} placeholder="XL" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">SKU</span>
                        <input type="text" value={v.sku} onChange={(e) => { const n = [...variants]; n[idx].sku = e.target.value; setVariants(n); }} placeholder="SKU-XL" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                      </label>
                      {!isEditing && (
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-600">Stock init.</span>
                          <input type="number" value={v.stock} onChange={(e) => { const n = [...variants]; n[idx].stock = e.target.value; setVariants(n); }} required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        </label>
                      )}
                    </div>
                    <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 p-1 mt-5">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {variants.length === 0 && <p className="text-xs text-slate-500 italic">Aucune variante configurée pour ce produit.</p>}
          </div>

          {error && <p className="col-span-full mt-2 text-sm text-red-600">{error}</p>}
          
          <div className="col-span-full mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" variant="emerald" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface StockTransferModalProps {
  products: ProductDto[];
  onClose: () => void;
  onSuccess: () => void;
  initialProductId?: string;
}

export function StockTransferModal({ products, onClose, onSuccess, initialProductId }: StockTransferModalProps) {
  const { user } = useAuth();
  const etabs = user?.etablissements ?? [];

  const [productId, setProductId] = useState(initialProductId || (products[0]?.id ?? ''));
  const [variantId, setVariantId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [quantite, setQuantite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Canal unique de transfert : Dispatch validé immédiatement (statut,
      // référence, audit et contrôle d'accès à la source, côté warehouse).
      await apiPost('/api/dispatches', {
        sourceId,
        destinationId,
        note: 'Transfert rapide (page Stock)',
        validate: true,
        items: [
          {
            productId,
            variantId: variantId || undefined,
            quantite: Number(quantite),
          },
        ],
      });
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Transfert de stock</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Produit</label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setVariantId('');
              }}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm bg-white"
            >
              <option value="">-- Sélectionnez un produit --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} (Total: {p.stock})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Variante (Optionnel)</label>
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm bg-white"
              >
                <option value="">-- Toutes les variantes / Produit parent --</option>
                {selectedProduct.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {Object.entries(v.attributs).map(([k, val]) => `${k}: ${val}`).join(', ')} (Total: {v.stock})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Établissement Source</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm bg-white"
              >
                <option value="">-- Source --</option>
                {etabs.map((e) => (
                  <option key={e.id} value={e.id} disabled={e.id === destinationId}>
                    {e.nom} ({e.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Établissement Dest.</label>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm bg-white"
              >
                <option value="">-- Destination --</option>
                {etabs.map((e) => (
                  <option key={e.id} value={e.id} disabled={e.id === sourceId}>
                    {e.nom} ({e.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Quantité à transférer</label>
            <input
              type="number"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              required
              min="1"
              placeholder="Quantité positive"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm"
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={saving || !productId || !sourceId || !destinationId || !quantite}>
              {saving ? 'Transfert en cours...' : 'Transférer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────── Recette d'un plat (Food — Milestone 3) ───────────────────

interface RecipeModalProps {
  product: ProductDto;
  catalog: ProductDto[];
  onClose: () => void;
  onSuccess: () => void;
}

interface RecipeRow {
  ingredientProductId: string;
  /** Saisie en unités d'AFFICHAGE de l'ingrédient (décimal si poids/volume). */
  quantite: string;
}

/**
 * Éditeur de recette : à la vente du plat, chaque ingrédient est décrémenté de
 * sa quantité × nombre de plats. Les quantités se saisissent dans l'unité de
 * l'ingrédient (1,5 kg → persisté 1500 milli-kg, §19.1).
 */
export function RecipeModal({ product, catalog, onClose, onSuccess }: RecipeModalProps) {
  const [active, setActive] = useState(true);
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Ingrédients possibles : produits à stock direct, hors le plat lui-même.
  const ingredients = catalog.filter((c) => productAffectsStock(c.type) && c.id !== product.id);
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  useEffect(() => {
    apiGet<RecipeDto | null>(`/api/stock/products/${product.id}/recipe`)
      .then((r) => {
        if (r) {
          setActive(r.active);
          setRows(
            r.items.map((it) => ({
              ingredientProductId: it.ingredientProductId,
              quantite: String(toDisplayQuantity(it.quantite, it.ingredientUnitKind)),
            })),
          );
        }
      })
      .catch((e) => setError((e as ApiError).message))
      .finally(() => setLoading(false));
  }, [product.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: UpsertRecipeInput = {
        active,
        items: rows
          .filter((r) => r.ingredientProductId && Number(r.quantite) > 0)
          .map((r) => ({
            ingredientProductId: r.ingredientProductId,
            quantite: toStoredQuantity(
              Number(r.quantite),
              byId.get(r.ingredientProductId)?.unitKind,
            ),
          })),
      };
      await apiPut(`/api/stock/products/${product.id}/recipe`, payload);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recette — {product.nom}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          À chaque vente du plat, les ingrédients ci-dessous sont décrémentés du stock.
          Un ingrédient insuffisant ne bloque pas la vente : une alerte d'audit est levée.
        </p>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Chargement…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Recette active (décrémente les ingrédients à la vente)
            </label>

            {rows.map((row, idx) => {
              const ing = byId.get(row.ingredientProductId);
              const scaled = ing ? quantityScale(ing.unitKind) !== 1 : false;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={row.ingredientProductId}
                    onChange={(e) => {
                      const n = [...rows];
                      n[idx] = { ...n[idx]!, ingredientProductId: e.target.value };
                      setRows(n);
                    }}
                    required
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                  >
                    <option value="">— Ingrédient —</option>
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id}>{i.nom}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step={scaled ? 'any' : 1}
                    min={0}
                    value={row.quantite}
                    onChange={(e) => {
                      const n = [...rows];
                      n[idx] = { ...n[idx]!, quantite: e.target.value };
                      setRows(n);
                    }}
                    required
                    placeholder="Qté / plat"
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-brand tabular"
                  />
                  <span className="w-10 text-xs text-slate-500">{scaled ? ing?.baseUnit ?? '' : 'u.'}</span>
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows([...rows, { ingredientProductId: '', quantite: '' }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Ajouter un ingrédient
            </Button>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" variant="emerald" disabled={saving || rows.length === 0}>
                {saving ? 'Enregistrement…' : 'Enregistrer la recette'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─────────────── Lots & péremption (Health — Milestone 4) ───────────────

interface BatchModalProps {
  product: ProductDto;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Gestion des lots d'un produit BATCHED : réception (seule porte d'entrée du
 * stock) et correction par delta (casse, retrait de périmés). La vente sort en
 * FEFO automatiquement — aucun choix de lot à la caisse.
 */
export function BatchModal({ product, onClose, onSuccess }: BatchModalProps) {
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [numero, setNumero] = useState('');
  const [peremption, setPeremption] = useState('');
  const [quantite, setQuantite] = useState('');
  const scaled = quantityScale(product.unitKind) !== 1;

  async function load() {
    setLoading(true);
    try {
      setBatches(await apiGet<BatchDto[]>(`/api/stock/products/${product.id}/batches`));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [product.id]);

  async function receive(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/stock/products/${product.id}/batches`, {
        batchNumber: numero.trim(),
        expiresAt: peremption,
        quantite: toStoredQuantity(Number(quantite), product.unitKind),
      });
      setNumero('');
      setPeremption('');
      setQuantite('');
      await load();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  async function vider(b: BatchDto) {
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/stock/batches/${b.id}`, {
        delta: -b.quantite,
        motif: 'Retrait (périmé / casse)',
      });
      await load();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  const now = Date.now();
  const J30 = 30 * 86_400_000;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Lots — {product.nom}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={receive} className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
          <input
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            required
            placeholder="N° de lot"
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
          <input
            type="date"
            value={peremption}
            onChange={(e) => setPeremption(e.target.value)}
            required
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
          />
          <input
            type="number"
            step={scaled ? 'any' : 1}
            min={0}
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            required
            placeholder={scaled ? `Qté (${product.baseUnit ?? ''})` : 'Qté'}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-brand tabular"
          />
          <Button type="submit" variant="emerald" size="sm" disabled={saving}>
            <Plus className="mr-1 h-4 w-4" /> Réceptionner
          </Button>
        </form>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Chargement…</p>
        ) : batches.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Aucun lot — réceptionnez le premier pour entrer du stock.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {batches.map((b) => {
              const exp = new Date(b.expiresAt).getTime();
              const perime = exp <= now;
              const proche = !perime && exp - now < J30;
              return (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <span className="font-mono text-sm font-semibold">{b.batchNumber}</span>
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                        perime
                          ? 'bg-red-50 text-red-700'
                          : proche
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {perime ? 'PÉRIMÉ' : `exp. ${new Date(b.expiresAt).toLocaleDateString('fr-FR')}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-sm font-semibold">
                      {formatQuantity(b.quantite, product.unitKind, product.baseUnit)}
                    </span>
                    {b.quantite > 0 && (
                      <button
                        type="button"
                        onClick={() => void vider(b)}
                        disabled={saving}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title="Retirer tout le lot (périmé / casse)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ────────── Conditionnements (Wholesale — Milestone 5) ──────────

interface UnitsModalProps {
  product: ProductDto;
  onClose: () => void;
  onSuccess: () => void;
}

interface UnitRow {
  label: string;
  factorToBase: string;
  salePrice: string; // '' = prixCatalogue × facteur
}

/**
 * Éditeur des conditionnements commerciaux (casier, palette…). Règle F7 : un
 * tarif de conditionnement ne peut pas passer sous prixPlancher × facteur —
 * le serveur refuse, l'UI prévient.
 */
export function UnitsModal({ product, onClose, onSuccess }: UnitsModalProps) {
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<ProductUnitDto[]>(`/api/stock/products/${product.id}/units`)
      .then((units) =>
        setRows(
          units.map((u) => ({
            label: u.label,
            factorToBase: String(u.factorToBase),
            salePrice: u.salePrice === null ? '' : String(u.salePrice),
          })),
        ),
      )
      .catch((e) => setError((e as ApiError).message))
      .finally(() => setLoading(false));
  }, [product.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPut(`/api/stock/products/${product.id}/units`, {
        units: rows
          .filter((r) => r.label.trim() && Number(r.factorToBase) >= 2)
          .map((r) => ({
            label: r.label.trim(),
            factorToBase: Math.trunc(Number(r.factorToBase)),
            salePrice: r.salePrice.trim() === '' ? null : Math.trunc(Number(r.salePrice)),
          })),
      });
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Conditionnements — {product.nom}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Vendre 1 « Casier 24 » décrémente 24 unités de base. Prix vide = catalogue × facteur.
          Le tarif ne peut pas passer sous le plancher × facteur.
        </p>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Chargement…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => {
                    const n = [...rows];
                    n[idx] = { ...n[idx]!, label: e.target.value };
                    setRows(n);
                  }}
                  required
                  placeholder="Casier 24"
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                />
                <input
                  type="number"
                  min={2}
                  value={row.factorToBase}
                  onChange={(e) => {
                    const n = [...rows];
                    n[idx] = { ...n[idx]!, factorToBase: e.target.value };
                    setRows(n);
                  }}
                  required
                  placeholder="× base"
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-brand tabular"
                />
                <input
                  type="number"
                  min={0}
                  value={row.salePrice}
                  onChange={(e) => {
                    const n = [...rows];
                    n[idx] = { ...n[idx]!, salePrice: e.target.value };
                    setRows(n);
                  }}
                  placeholder="Prix (auto)"
                  className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-brand tabular"
                />
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows([...rows, { label: '', factorToBase: '', salePrice: '' }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Ajouter un conditionnement
            </Button>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" variant="emerald" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

