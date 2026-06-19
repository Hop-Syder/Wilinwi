'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, ShoppingCart, CloudOff } from 'lucide-react';
import type { CreateSaleInput, PaymentMethod, ProductDto } from '@wilinwi/types';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { syncEngine } from '@/lib/sync';
import { useSync } from '@/lib/use-sync';

interface CartLine {
  product: ProductDto;
  quantite: number;
  prixReel: number;
}

export default function PosPage() {
  const { refreshPending } = useSync();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>('CASH');
  const [montantVerse, setMontantVerse] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'offline' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Catalogue : depuis l'API si en ligne, sinon depuis le cache offline.
  useEffect(() => {
    apiGet<ProductDto[]>('/api/stock/products')
      .then((p) => {
        setProducts(p);
        void syncEngine.cacheProducts(p);
      })
      .catch(async () => {
        const cached = await syncEngine.cachedProducts();
        setProducts(cached);
      });
  }, []);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.nom.toLowerCase().includes(query.toLowerCase()) ||
          (p.sku ?? '').toLowerCase().includes(query.toLowerCase()),
      ),
    [products, query],
  );

  const total = cart.reduce((s, l) => s + l.prixReel * l.quantite, 0);

  function addToCart(product: ProductDto) {
    setCart((c) => {
      const existing = c.find((l) => l.product.id === product.id);
      if (existing)
        return c.map((l) =>
          l.product.id === product.id ? { ...l, quantite: l.quantite + 1 } : l,
        );
      return [...c, { product, quantite: 1, prixReel: product.prixCatalogue }];
    });
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((c) => c.map((l) => (l.product.id === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: string) {
    setCart((c) => c.filter((l) => l.product.id !== id));
  }

  async function checkout(motifs: Record<string, string> = {}) {
    if (cart.length === 0) return;
    setBusy(true);
    setMessage(null);

    const payload: CreateSaleInput = {
      clientGeneratedId: crypto.randomUUID(),
      paymentMethod: payment,
      montantVerse: payment === 'INSTALLMENT' ? Number(montantVerse || 0) : undefined,
      items: cart.map((l) => ({
        productId: l.product.id,
        quantite: l.quantite,
        prixReel: l.prixReel,
        motifSousPlancher: motifs[l.product.id],
      })),
    };

    try {
      await apiPost('/api/pos/sales', payload);
      setCart([]);
      setMontantVerse('');
      setMessage({ tone: 'ok', text: 'Vente enregistrée ✓' });
    } catch (e) {
      if (e instanceof ApiError) {
        // Vente sous le prix plancher : demander une preuve puis réessayer.
        if (e.status === 400 && /plancher/i.test(e.message)) {
          const motif = window.prompt(
            'Vente sous le prix plancher. Indiquez le motif (preuve obligatoire) :',
          );
          if (motif) {
            const all = Object.fromEntries(cart.map((l) => [l.product.id, motif]));
            setBusy(false);
            return checkout(all);
          }
          setMessage({ tone: 'err', text: 'Vente annulée : motif requis.' });
        } else {
          setMessage({ tone: 'err', text: e.message });
        }
      } else {
        // Réseau indisponible → enregistrement hors-ligne (§5.4).
        await syncEngine.enqueueSale(payload);
        await refreshPending();
        setCart([]);
        setMontantVerse('');
        setMessage({ tone: 'offline', text: 'Hors-ligne : vente enregistrée localement.' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* Catalogue */}
      <div>
        <h1 className="font-display text-2xl font-bold text-brand">Caisse</h1>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
            >
              <div className="font-medium text-slate-900">{p.nom}</div>
              <div className="tabular mt-1 text-sm text-emerald-700">
                {formatFCFA(p.prixCatalogue)}
              </div>
              <Badge tone={p.stock <= 5 ? 'danger' : 'neutral'} className="mt-2">
                {p.stock} en stock
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Panier */}
      <Card className="h-fit lg:sticky lg:top-20">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand">
          <ShoppingCart className="h-5 w-5" /> Panier
        </h2>

        {cart.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Sélectionnez des produits…</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {cart.map((l) => (
              <li key={l.product.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{l.product.nom}</span>
                  <button onClick={() => removeLine(l.product.id)} aria-label="Retirer">
                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={l.quantite}
                    onChange={(e) =>
                      updateLine(l.product.id, { quantite: Math.max(1, Number(e.target.value)) })
                    }
                    className="tabular w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    value={l.prixReel}
                    onChange={(e) => updateLine(l.product.id, { prixReel: Number(e.target.value) })}
                    className="tabular w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    title="Prix réel négocié"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-slate-200 pt-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-600">Mode de paiement</span>
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value as PaymentMethod)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          {payment === 'INSTALLMENT' && (
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Acompte versé</span>
              <input
                type="number"
                value={montantVerse}
                onChange={(e) => setMontantVerse(e.target.value)}
                className="tabular w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total</span>
            <span className="tabular text-xl font-bold text-brand">{formatFCFA(total)}</span>
          </div>

          {message && (
            <p
              className={`mt-3 flex items-center gap-1 text-sm ${
                message.tone === 'ok'
                  ? 'text-emerald-700'
                  : message.tone === 'offline'
                    ? 'text-gold-700'
                    : 'text-red-600'
              }`}
            >
              {message.tone === 'offline' && <CloudOff className="h-4 w-4" />}
              {message.text}
            </p>
          )}

          <Button
            onClick={() => checkout()}
            variant="emerald"
            size="lg"
            className="mt-4 w-full"
            disabled={busy || cart.length === 0}
          >
            {busy ? 'Traitement…' : 'Encaisser'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
