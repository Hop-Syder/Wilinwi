import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@wilinwi/ui';
import type { ProductDto } from '@wilinwi/types';
import { apiPost, apiPatch, ApiError } from '@/lib/api';

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
              Quantité ({type === 'OUT' ? 'Sera soustraite' : type === 'IN' ? 'Sera ajoutée' : 'Stock exact après ajustement'})
            </span>
            <input
              type="number"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              required
              min={type === 'ADJUST' ? 0 : 1}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
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
  const [form, setForm] = useState({
    nom: product?.nom || '',
    sku: product?.sku || '',
    categorie: product?.categorie || '',
    prixAchat: product?.prixAchat?.toString() || '',
    prixPlancher: product?.prixPlancher?.toString() || '',
    prixCatalogue: product?.prixCatalogue?.toString() || '',
    stock: product?.stock?.toString() || '',
    seuilAlerte: product?.seuilAlerte?.toString() || '5',
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
        prixAchat: Number(form.prixAchat),
        prixPlancher: Number(form.prixPlancher),
        prixCatalogue: Number(form.prixCatalogue),
        stock: isEditing ? undefined : Number(form.stock || 0),
        seuilAlerte: Number(form.seuilAlerte || 5),
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

          <div className="col-span-full my-2 border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Stock</h3>
          </div>
          {!isEditing && (
            <label className="col-span-full sm:col-span-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Stock initial</span>
              <input type="number" value={form.stock} onChange={(e) => set('stock')(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
            </label>
          )}
          <label className="col-span-full sm:col-span-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">Seuil d'alerte</span>
            <input type="number" value={form.seuilAlerte} onChange={(e) => set('seuilAlerte')(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          </label>

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
