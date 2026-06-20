'use client';

import { useEffect, useState } from 'react';
import { Plus, Package, Search, Filter, AlertTriangle, ArrowRightLeft, Edit, Clock } from 'lucide-react';
import Link from 'next/link';
import type { ProductDto } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA, formatQty, Input } from '@wilinwi/ui';
import { apiGet, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StockMovementModal, ProductFormModal } from '@/components/stock-modals';

export default function StockPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canSeeCost = canWrite;
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | undefined>();
  const [movementProduct, setMovementProduct] = useState<ProductDto | undefined>();
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  async function load() {
    try {
      setProducts(await apiGet<ProductDto[]>('/api/stock/products'));
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const filteredProducts = products.filter(p => {
    if (filterLowStock && p.stock > (p.seuilAlerte ?? 5)) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.nom.toLowerCase().includes(s) && !p.sku?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Stock</h1>
          <p className="mt-1 text-sm text-slate-500">Gérez vos produits, mouvements et inventaires.</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setEditingProduct(undefined); setShowProductModal(true); }}>
            <Plus className="h-4 w-4" /> Nouveau produit
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou SKU..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={filterLowStock ? 'danger' : 'outline'} 
            onClick={() => setFilterLowStock(!filterLowStock)}
          >
            <AlertTriangle className="h-4 w-4" />
            Stock Faible
          </Button>
        </div>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Catalogue</th>
              {canSeeCost && <th className="px-4 py-3 font-medium">Achat</th>}
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{p.nom}</div>
                  {p.sku && <div className="text-xs text-slate-400">{p.sku}</div>}
                </td>
                <td className="px-4 py-3 text-slate-500">{p.categorie || '—'}</td>
                <td className="tabular px-4 py-3">{formatFCFA(p.prixCatalogue)}</td>
                {canSeeCost && (
                  <td className="tabular px-4 py-3 text-slate-600">
                    {p.prixAchat !== undefined ? formatFCFA(p.prixAchat) : '—'}
                  </td>
                )}
                <td className="px-4 py-3">
                  <Badge tone={p.stock <= (p.seuilAlerte ?? 5) ? 'danger' : 'success'}>
                    {formatQty(p.stock)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canWrite && (
                      <>
                        <button onClick={() => setMovementProduct(p)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors" title="Mouvement de stock">
                          <ArrowRightLeft className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Modifier le produit">
                          <Edit className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <Link href={`/stock/${p.id}`} className="p-1.5 text-slate-400 hover:text-brand rounded-md hover:bg-brand/10 transition-colors" title="Historique">
                      <Clock className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={canSeeCost ? 6 : 5} className="px-4 py-10 text-center text-slate-400">
                  <Package className="mx-auto mb-2 h-8 w-8" />
                  Aucun produit trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showProductModal && (
        <ProductFormModal 
          product={editingProduct} 
          onClose={() => setShowProductModal(false)} 
          onSuccess={() => { setShowProductModal(false); void load(); }} 
        />
      )}

      {movementProduct && (
        <StockMovementModal 
          product={movementProduct} 
          onClose={() => setMovementProduct(undefined)} 
          onSuccess={() => { setMovementProduct(undefined); void load(); }} 
        />
      )}
    </div>
  );
}
