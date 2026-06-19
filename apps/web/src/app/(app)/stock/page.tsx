'use client';

import { useEffect, useState } from 'react';
import { Plus, Package } from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA, formatQty } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function StockPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canSeeCost = canWrite;
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Stock</h1>
          <p className="mt-1 text-sm text-slate-500">Vos produits, prix et quantités.</p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> Nouveau produit
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {showForm && canWrite && (
        <NewProductForm
          onCreated={() => {
            setShowForm(false);
            void load();
          }}
        />
      )}

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Catalogue</th>
              {canSeeCost && <th className="px-4 py-3 font-medium">Plancher</th>}
              {canSeeCost && <th className="px-4 py-3 font-medium">Achat</th>}
              <th className="px-4 py-3 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{p.nom}</div>
                  {p.sku && <div className="text-xs text-slate-400">{p.sku}</div>}
                </td>
                <td className="tabular px-4 py-3">{formatFCFA(p.prixCatalogue)}</td>
                {canSeeCost && (
                  <td className="tabular px-4 py-3 text-slate-600">
                    {p.prixPlancher !== undefined ? formatFCFA(p.prixPlancher) : '—'}
                  </td>
                )}
                {canSeeCost && (
                  <td className="tabular px-4 py-3 text-slate-600">
                    {p.prixAchat !== undefined ? formatFCFA(p.prixAchat) : '—'}
                  </td>
                )}
                <td className="px-4 py-3">
                  <Badge tone={p.stock <= 5 ? 'danger' : 'success'}>{formatQty(p.stock)}</Badge>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  <Package className="mx-auto mb-2 h-8 w-8" />
                  Aucun produit. Créez-en un pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function NewProductForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    nom: '',
    sku: '',
    prixAchat: '',
    prixPlancher: '',
    prixCatalogue: '',
    stock: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost('/api/stock/products', {
        nom: form.nom,
        sku: form.sku || undefined,
        prixAchat: Number(form.prixAchat),
        prixPlancher: Number(form.prixPlancher),
        prixCatalogue: Number(form.prixCatalogue),
        stock: Number(form.stock || 0),
      });
      onCreated();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-4">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Input label="Nom" value={form.nom} onChange={set('nom')} className="col-span-2 sm:col-span-3" />
        <Input label="SKU (optionnel)" value={form.sku} onChange={set('sku')} />
        <Input label="Prix d'achat" type="number" value={form.prixAchat} onChange={set('prixAchat')} />
        <Input label="Prix plancher" type="number" value={form.prixPlancher} onChange={set('prixPlancher')} />
        <Input label="Prix catalogue" type="number" value={form.prixCatalogue} onChange={set('prixCatalogue')} />
        <Input label="Stock initial" type="number" value={form.stock} onChange={set('stock')} />
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        <div className="col-span-full">
          <Button type="submit" variant="emerald" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer le produit'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Input({
  label,
  type = 'text',
  value,
  onChange,
  className,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={type !== 'text' || label === 'Nom'}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
