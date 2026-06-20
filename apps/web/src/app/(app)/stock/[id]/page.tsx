'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRightLeft, Clock, Package } from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA, formatQty } from '@wilinwi/ui';
import { apiGet, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StockMovementModal } from '@/components/stock-modals';

type Movement = {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantite: number;
  motif: string;
  createdAt: string;
  saleId?: string;
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

  if (error) {
    return (
      <div className="p-4">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <p className="text-red-600">Erreur : {error}</p>
      </div>
    );
  }

  if (!product) {
    return <div className="p-4 text-slate-500">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">{product.nom}</h1>
          <p className="text-sm text-slate-500">{product.sku ? `SKU: ${product.sku}` : 'Aucun SKU'} • {product.categorie || 'Sans catégorie'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canWrite && (
            <Button onClick={() => setShowMovementModal(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Mouvement manuel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm font-medium text-slate-500">Stock actuel</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{formatQty(product.stock)}</span>
            <Badge tone={product.stock <= (product.seuilAlerte ?? 5) ? 'danger' : 'success'}>
              Alerte: {product.seuilAlerte ?? 5}
            </Badge>
          </div>
        </Card>
        
        <Card className="p-4">
          <p className="text-sm font-medium text-slate-500">Prix Catalogue</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatFCFA(product.prixCatalogue)}</p>
        </Card>

        {canSeeCost && (
          <Card className="p-4">
            <p className="text-sm font-medium text-slate-500">Prix Plancher</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{product.prixPlancher !== undefined ? formatFCFA(product.prixPlancher) : '—'}</p>
          </Card>
        )}

        {canSeeCost && (
          <Card className="p-4">
            <p className="text-sm font-medium text-slate-500">Prix d'Achat</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{product.prixAchat !== undefined ? formatFCFA(product.prixAchat) : '—'}</p>
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-4 flex items-center text-lg font-bold text-slate-900">
          <Clock className="mr-2 h-5 w-5 text-slate-400" />
          Historique des Mouvements
        </h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Quantité</th>
                <th className="px-4 py-3 font-medium">Motif</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(m.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={m.type === 'IN' ? 'success' : m.type === 'OUT' ? 'danger' : 'warning'}>
                      {m.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className={m.quantite > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {m.quantite > 0 ? '+' : ''}{formatQty(m.quantite)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {m.motif}
                    {m.saleId && <Badge tone="brand" className="ml-2">Vente</Badge>}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    <Package className="mx-auto mb-2 h-8 w-8" />
                    Aucun mouvement enregistré pour ce produit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

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
