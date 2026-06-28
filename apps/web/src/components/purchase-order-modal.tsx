import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { SupplierDto, ProductDto, EtablissementDto } from '@wilinwi/types';

interface PurchaseOrderModalProps {
  etablissements: EtablissementDto[];
  currentEtablissementId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface DraftItem {
  productId: string;
  variantId?: string;
  quantiteCommandee: number;
  prixUnitaire: number;
  // helper UI properties
  nom: string;
}

export function PurchaseOrderModal({
  etablissements,
  currentEtablissementId,
  onClose,
  onSuccess,
}: PurchaseOrderModalProps) {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  
  const [fournisseurId, setFournisseurId] = useState('');
  const [etablissementId, setEtablissementId] = useState(
    currentEtablissementId && currentEtablissementId !== 'ALL'
      ? currentEtablissementId
      : etablissements[0]?.id ?? ''
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  
  // States for adding a new item
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [sups, prods] = await Promise.all([
          apiGet<SupplierDto[]>('/api/suppliers'),
          apiGet<ProductDto[]>('/api/stock/products'),
        ]);
        setSuppliers(sups.filter((s) => s.actif));
        setProducts(prods);
        if (sups.length > 0) setFournisseurId(sups[0].id);
      } catch (e) {
        setError('Impossible de charger les données (fournisseurs/produits).');
      }
    }
    void loadData();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  function addItem() {
    if (!selectedProductId || !qty || !price) {
      alert('Veuillez remplir le produit, la quantité et le prix unitaire.');
      return;
    }
    const q = Number(qty);
    const p = Number(price);
    if (q <= 0 || p < 0) {
      alert('Veuillez saisir des valeurs positives.');
      return;
    }

    const prod = products.find((x) => x.id === selectedProductId)!;
    const variant = prod.variants.find((v) => v.id === selectedVariantId);
    const label = variant ? `${prod.nom} (${variant.nom})` : prod.nom;

    // Check if item already added
    const existsIndex = items.findIndex(
      (item) => item.productId === selectedProductId && item.variantId === (selectedVariantId || undefined)
    );

    if (existsIndex > -1) {
      const updated = [...items];
      updated[existsIndex].quantiteCommandee += q;
      updated[existsIndex].prixUnitaire = p; // override with latest price
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          productId: selectedProductId,
          variantId: selectedVariantId || undefined,
          quantiteCommandee: q,
          prixUnitaire: p,
          nom: label,
        },
      ]);
    }

    // Reset item form
    setSelectedProductId('');
    setSelectedVariantId('');
    setQty('');
    setPrice('');
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function submit(ordered: boolean) {
    if (!fournisseurId) {
      setError('Veuillez sélectionner un fournisseur.');
      return;
    }
    if (!etablissementId) {
      setError('Veuillez sélectionner un établissement de destination.');
      return;
    }
    if (items.length === 0) {
      setError('Veuillez ajouter au moins un produit.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiPost('/api/purchase-orders', {
        fournisseurId,
        etablissementId,
        notes: notes || null,
        ordered,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || undefined,
          quantiteCommandee: i.quantiteCommandee,
          prixUnitaire: i.prixUnitaire,
        })),
      });
      onSuccess();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  const totalMontant = items.reduce((sum, item) => sum + item.quantiteCommandee * item.prixUnitaire, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Rédiger un bon de commande d&apos;achat</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fournisseur *</label>
            <select
              value={fournisseurId}
              onChange={(e) => setFournisseurId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand"
            >
              <option value="" disabled>Sélectionner un fournisseur</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} (Dette: {s.soldeDette.toLocaleString('fr-FR')} FCFA)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lieu de réception *</label>
            <select
              value={etablissementId}
              onChange={(e) => setEtablissementId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand"
            >
              {etablissements.map((e) => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes / Instructions</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ex: Livraison prévue mercredi matin" />
        </div>

        {/* Section ajout d'articles */}
        <div className="border-t border-slate-100 pt-4 mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Ajouter des articles</h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Produit</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSelectedVariantId('');
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
              >
                <option value="">Sélectionner un produit</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Variante</label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={!selectedProduct || selectedProduct.variants.length === 0}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand disabled:bg-slate-50"
              >
                <option value="">Standard</option>
                {selectedProduct?.variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.nom}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Quantité</label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Qté"
                className="py-1 px-3 text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Prix achat unitaire</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Prix (FCFA)"
                className="py-1 px-3 text-xs"
              />
            </div>

            <div className="md:col-span-1">
              <Button type="button" onClick={addItem} className="w-full h-8 p-0 flex items-center justify-center bg-brand text-white">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Liste des articles du bon */}
        <div className="border border-slate-100 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-2">Article</th>
                <th className="px-4 py-2 text-right">Quantité</th>
                <th className="px-4 py-2 text-right">Prix Unit.</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucun produit ajouté au bon de commande</td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-900">{item.nom}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{item.quantiteCommandee}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{item.prixUnitaire.toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900">
                      {(item.quantiteCommandee * item.prixUnitaire).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button type="button" onClick={() => removeItem(index)} className="p-1 hover:bg-red-50 rounded text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-100 text-slate-900">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right">Montant total estimé :</td>
                  <td className="px-4 py-2 text-right text-brand">{totalMontant.toLocaleString('fr-FR')} FCFA</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => submit(false)}
              disabled={saving}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Enregistrer Brouillon
            </Button>
            <Button type="button" onClick={() => submit(true)} disabled={saving}>
              {saving ? 'Envoi...' : 'Passer la commande'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
