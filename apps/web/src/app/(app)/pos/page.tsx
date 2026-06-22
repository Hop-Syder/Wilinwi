'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend (Route: pos)
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useMemo, useState, useRef } from 'react';
import { Search, Trash2, ShoppingCart, CloudOff, AlertTriangle, Lock, Star, Command } from 'lucide-react';
import type { CreateSaleInput, ProductDto } from '@wilinwi/types';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA } from '@wilinwi/ui';
import Link from 'next/link';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { syncEngine } from '@/lib/sync';
import { useSync } from '@/lib/use-sync';
import { useAuth } from '@/lib/auth-context';
import { CheckoutModal, SaleSuccessModal, type CheckoutResult } from '@/components/pos-checkout';
import { ReceiptModal, type ReceiptSale } from '@/components/receipt';
import { RotateCcw } from 'lucide-react';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

interface CartLine {
  product: ProductDto;
  variantId?: string;
  variantLabel?: string;
  quantite: number;
  prixReel: number;
}

export default function PosPage() {
  const { refreshPending } = useSync();
  const { user } = useAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [message, setMessage] = useState<{ tone: 'ok' | 'offline' | 'err'; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<ProductDto | null>(null);
  
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastSale, setLastSale] = useState<ReceiptSale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-search',
      title: 'Recherche Rapide',
      content: 'Utilisez la barre de recherche ou le raccourci Cmd+K pour trouver rapidement un produit. Entrée l\'ajoute directement au panier.',
      position: 'bottom',
    },
    {
      targetId: 'tour-categories',
      title: 'Filtres et Favoris',
      content: 'Filtrez par catégorie ou accédez rapidement à vos favoris (top ventes).',
      position: 'bottom',
    },
    {
      targetId: 'tour-cart',
      title: 'Votre Panier',
      content: 'Modifiez la quantité ou négociez le prix (dans la limite du prix plancher autorisé).',
      position: 'left',
    },
    {
      targetId: 'tour-checkout',
      title: 'Encaissement',
      content: 'Choisissez le paiement, assignez un client si besoin et encaissez. Fonctionne même sans internet !',
      position: 'left',
    }
  ];

  // useEffect removed since ContextualHelp handles initial display

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
    // Liste des clients (pour les ventes à crédit / acompte).
    apiGet<{ id: string; nom: string }[]>('/api/crm/clients')
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  // Raccourci clavier Cmd+K pour le champ de recherche
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.nom.toLowerCase().includes(query.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(query.toLowerCase()),
    );
  }, [products, query]);

  const total = cart.reduce((s, l) => s + l.prixReel * l.quantite, 0);

  function addToCart(product: ProductDto, quantite: number = 1, prixReel: number = product.prixCatalogue, variantId?: string, variantLabel?: string) {
    const stockToCheck = variantId ? product.variants?.find(v => v.id === variantId)?.stock || 0 : product.stock;
    if (stockToCheck <= 0) {
      setMessage({ tone: 'err', text: 'Opération refusée : produit en rupture de stock.' });
      return;
    }
    setCart((c) => {
      const existing = c.find((l) => l.product.id === product.id && l.variantId === variantId);
      const newQuantite = existing ? existing.quantite + quantite : quantite;
      if (newQuantite > stockToCheck) {
        setMessage({ tone: 'err', text: `Stock maximum atteint pour ${product.nom}${variantLabel ? ' ('+variantLabel+')' : ''}.` });
        return c;
      }
      if (existing)
        return c.map((l) => (l.product.id === product.id && l.variantId === variantId ? { ...l, quantite: newQuantite, prixReel } : l));
      return [...c, { product, quantite, prixReel, variantId, variantLabel }];
    });
  }

  function handleProductClick(product: ProductDto) {
    if (product.variants && product.variants.length > 0) {
      setVariantSelectionProduct(product);
    } else {
      addToCart(product);
    }
  }

  function updateQuantity(line: CartLine, delta: number) {
    const newQ = line.quantite + delta;
    if (newQ <= 0) setCart(c => c.filter(x => x !== line));
    else setExactQuantity(line, newQ);
  }
  function setExactQuantity(line: CartLine, newQ: number) {
    if (newQ <= 0) return;
    const stockToCheck = line.variantId ? line.product.variants?.find(v => v.id === line.variantId)?.stock || 0 : line.product.stock;
    if (newQ > stockToCheck) {
      setMessage({ tone: 'err', text: `Stock maximum atteint pour ${line.product.nom}.` });
      newQ = stockToCheck;
    }
    setCart(c => c.map(l => l === line ? { ...l, quantite: newQ } : l));
  }
  function setExactPrice(line: CartLine, newPrice: number) {
    setCart(c => c.map(l => l === line ? { ...l, prixReel: newPrice } : l));
  }
  function removeLine(productId: string, variantId: string | undefined) {
    setCart((c) => c.filter((l) => !(l.product.id === productId && l.variantId === variantId)));
  }
  function openCheckout() {
    if (cart.length === 0) return;
    setShowCheckoutModal(true);
  }

  async function handleConfirmCheckout(result: CheckoutResult) {
    setShowCheckoutModal(false);
    setBusy(true);
    setMessage(null);

    const payload: CreateSaleInput = {
      clientGeneratedId: crypto.randomUUID(),
      paymentMethod: result.paymentMethod,
      montantVerse: result.montantVerse,
      clientId: result.clientId,
      items: cart.map((l) => ({
        productId: l.product.id,
        variantId: l.variantId,
        quantite: l.quantite,
        prixReel: l.prixReel,
      })),
    };

    try {
      await syncEngine.enqueueSale(payload);

      // Capture l'instantané de la vente pour le ticket (fonctionne hors-ligne).
      const montantVerse =
        result.paymentMethod === 'CREDIT'
          ? 0
          : result.paymentMethod === 'INSTALLMENT'
            ? result.montantVerse ?? 0
            : total;
      const client = result.clientId ? clients.find((c) => c.id === result.clientId) : null;
      setLastSale({
        id: payload.clientGeneratedId!,
        total,
        montantVerse,
        paymentMethod: result.paymentMethod,
        createdAt: new Date().toISOString(),
        receiptCode: null,
        items: cart.map((l) => ({
          id: `${l.product.id}-${l.variantId ?? 'base'}`,
          quantite: l.quantite,
          prixReel: l.prixReel,
          product: { nom: l.product.nom },
        })),
        client: client ? { nom: client.nom, telephone: client.telephone } : null,
      });

      setLastSaleTotal(total);
      setCart([]);
      setShowSuccessModal(true);
      
      await refreshPending();
      if (navigator.onLine) {
        syncEngine.flush().then(() => refreshPending()).catch(() => {});
      }
    } catch (e) {
      setMessage({ tone: 'err', text: "Erreur lors de l'enregistrement local." });
    } finally {
      setBusy(false);
    }
  }

  const [showHistory, setShowHistory] = useState(false);



  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      

      {/* Catalogue */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-brand">Caisse</h1>
          <div className="flex gap-2">
            <Link href="/pos/returns">
              <Button variant="outline" size="sm">
                <RotateCcw className="mr-1 h-4 w-4" />
                Retours
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
              Historique
            </Button>
            <ContextualHelp 
              storageKey="wilinwi_pos_tour_done"
              tourSteps={tourSteps}
              useCases={[
                { title: 'Faire une remise (Négociation)', description: 'Cliquez sur le prix réel d\'un produit dans le panier et modifiez-le. Le système vérifiera automatiquement que vous restez au-dessus du prix plancher.' },
                { title: 'Vente à crédit ou acompte', description: 'Dans le panneau d\'encaissement, changez le mode de paiement sur Acompte/Crédit, sélectionnez un client enregistré, et indiquez le montant versé aujourd\'hui.' },
                { title: 'Travailler sans connexion', description: 'Continuez d\'encaisser même sans internet. Les ventes sont sauvegardées localement et seront synchronisées automatiquement au retour de la connexion.' },
                { title: 'Retour de marchandise', description: 'Ouvrez l\'historique des ventes, sélectionnez la vente concernée et indiquez la quantité retournée pour chaque produit. Le stock sera automatiquement réajusté.' }
              ]}
            />
            
          </div>
        </div>
        <div className="relative mt-4" id="tour-search">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
    if (e.key === 'Enter') {
      const exactMatch = products.find(p => p.sku?.toLowerCase() === query.toLowerCase());
      if (exactMatch) {
        handleProductClick(exactMatch);
        setQuery('');
      } else if (displayProducts.length > 0) {
        handleProductClick(displayProducts[0]);
        setQuery('');
      }
    }
  }}
            placeholder="Rechercher un produit..."
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-12 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <div className="absolute right-3 top-2.5 flex items-center gap-1 text-xs text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
            <Command className="h-3 w-3" /> K
          </div>
        </div>

        {showHistory ? (
          <TodaySalesPanel onClose={() => setShowHistory(false)} />
        ) : (
          <>
            {/* Titre du Catalogue */}
            <div className="mt-4 flex items-center justify-between pb-2" id="tour-categories">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Catalogue des produits</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {displayProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  disabled={p.stock <= 0 && (!p.variants || p.variants.length === 0)}
                  className={`rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md ${p.stock <= 0 && (!p.variants || p.variants.length === 0) ? 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:border-slate-200 hover:shadow-none' : ''}`}
                >
                  <div className="font-medium text-slate-900 line-clamp-2 min-h-[40px]">{p.nom}</div>
                  <div className="tabular mt-1 text-sm font-bold text-emerald-700">
                    {formatFCFA(p.prixCatalogue)}
                  </div>
                  <Badge tone={p.stock <= 0 ? 'danger' : p.stock <= 5 ? 'warning' : 'neutral'} className="mt-2 text-[10px]">
                    {p.stock === 0 ? 'Rupture' : `${p.stock} en stock`}
                  </Badge>
                </button>
              ))}
            </div>
          </>
        )}
      </div>



      {/* Panier */}
      <Card className="h-fit lg:sticky lg:top-20" id="tour-cart">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand">
          <ShoppingCart className="h-5 w-5" /> Panier
        </h2>

        {cart.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Sélectionnez des produits…</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {cart.map((l) => (
              <li key={`${l.product.id}-${l.variantId || 'base'}`} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {l.product.nom}
                    {l.variantLabel && <span className="ml-1 text-slate-500 font-normal">({l.variantLabel})</span>}
                  </span>
                  <button onClick={() => removeLine(l.product.id, l.variantId)} aria-label="Retirer">
                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center border rounded-md bg-white">
                    <button 
                      className="px-2 py-0.5 hover:bg-slate-50 text-slate-500 font-bold border-r"
                      onClick={() => updateQuantity(l, -1)}
                    >-</button>
                    <input 
                      type="number" 
                      value={l.quantite} 
                      onChange={(e) => setExactQuantity(l, Number(e.target.value))}
                      className="w-10 text-center text-xs border-none focus:ring-0 p-1 focus:outline-none tabular"
                    />
                    <button 
                      className="px-2 py-0.5 hover:bg-slate-50 text-slate-500 font-bold border-l"
                      onClick={() => updateQuantity(l, 1)}
                    >+</button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <input
                        type="number"
                        min={l.product.prixPlancher ?? 0}
                        value={l.prixReel}
                        onChange={(e) => setExactPrice(l, Number(e.target.value))}
                        onBlur={(e) => {
                          const plancher = l.product.prixPlancher;
                          if (plancher !== undefined && Number(e.target.value) < plancher) {
                            setExactPrice(l, plancher);
                          }
                        }}
                        className={`tabular w-24 text-right rounded-md border px-2 py-1 text-xs ${
                          l.product.prixPlancher !== undefined && l.prixReel < l.product.prixPlancher
                            ? 'border-red-500 bg-red-50 text-red-700 font-medium'
                            : 'border-slate-300'
                        }`}
                      />
                      {l.product.prixPlancher !== undefined && (
                        <span className="text-[9px] text-slate-500 mt-0.5">
                          Min: {formatFCFA(l.product.prixPlancher)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-slate-200 pt-4" id="tour-checkout">
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="flex justify-between items-end mb-4">
              <span className="text-sm font-medium text-slate-500">Total à payer</span>
              <span className="text-3xl font-black text-brand">{total.toLocaleString()} F</span>
            </div>

            {!navigator.onLine && (
              <div className="mb-4 text-xs font-medium text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 flex justify-center">
                Hors ligne (synchronisation en attente)
              </div>
            )}

            <Button
              className="w-full h-12 text-lg"
              disabled={cart.length === 0 || busy}
              onClick={openCheckout}
            >
              Encaisser
            </Button>
          </div>
        </div>
      </Card>

      {/* ContextualHelp gère le composant TourGuide en interne */}
      {/* Modale de sélection de variante */}
      {variantSelectionProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Choisir une variante</h3>
            <p className="mb-4 text-sm text-slate-600">{variantSelectionProduct.nom}</p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {variantSelectionProduct.variants?.map(v => {
                const label = Object.entries(v.attributs).map(([k, val]) => `${val}`).join(', ');
                const isOos = v.stock <= 0;
                return (
                  <button 
                    key={v.id} 
                    disabled={isOos}
                    onClick={() => {
                      addToCart(variantSelectionProduct, 1, variantSelectionProduct.prixCatalogue, v.id, label);
                      setVariantSelectionProduct(null);
                    }}
                    className={`w-full flex justify-between items-center p-3 rounded-lg border ${isOos ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-brand hover:bg-brand/5 transition-colors'} text-left`}
                  >
                    <span className="font-medium text-sm">{label}</span>
                    <span className="text-xs text-slate-500">{v.stock} en stock</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setVariantSelectionProduct(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'encaissement (ouverte par le bouton « Encaisser ») */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        cartTotal={total}
        clients={clients}
        onConfirm={handleConfirmCheckout}
      />

      {/* Modale de succès affichée après l'enregistrement de la vente */}
      <SaleSuccessModal
        isOpen={showSuccessModal}
        total={lastSaleTotal}
        onNewSale={() => setShowSuccessModal(false)}
        onShowReceipt={
          lastSale
            ? () => {
                setShowSuccessModal(false);
                setShowReceipt(true);
              }
            : undefined
        }
      />

      {/* Ticket de caisse : affichage + impression + QR (réutilise ReceiptModal) */}
      {showReceipt && lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}

interface PendingSale {
  id: string;
  total: number;
  items: {
    id: string;
    quantite: number;
    prixReel: number;
    product?: { nom: string };
    priceOverride?: { prixPlancher?: number; motif: string } | null;
  }[];
}

/** Panneau gérant : ventes sous le plancher en attente de validation (§5.5). */
function ManagerApprovalPanel() {
  const [pending, setPending] = useState<PendingSale[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setPending(await apiGet<PendingSale[]>('/api/pos/sales/pending'));
    } catch {
      /* silencieux */
    }
  };
  useEffect(() => {
    void load();
  }, []);

  async function decide(id: string, approuve: boolean) {
    setBusyId(id);
    try {
      await apiPost(`/api/pos/sales/${id}/approve`, { approuve });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (pending.length === 0) return null;

  return (
    <Card className="border-gold-200 bg-gold-50/40">
      <h2 className="font-display text-lg font-semibold text-gold-700">
        Ventes à valider ({pending.length})
      </h2>
      <p className="mb-3 text-sm text-slate-500">
        Ventes sous le prix plancher en attente de votre approbation.
      </p>
      <ul className="space-y-3">
        {pending.map((s) => (
          <li key={s.id} className="rounded-lg border border-gold-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="tabular font-semibold text-brand">{formatFCFA(s.total)}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="emerald"
                  disabled={busyId === s.id}
                  onClick={() => decide(s.id, true)}
                >
                  Approuver
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busyId === s.id}
                  onClick={() => decide(s.id, false)}
                >
                  Rejeter
                </Button>
              </div>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {s.items.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium">{it.product?.nom ?? 'Produit'}</span>
                  <span className="tabular">
                    {it.quantite} × {formatFCFA(it.prixReel)}
                  </span>
                  {it.priceOverride?.prixPlancher !== undefined && (
                    <Badge tone="warning">
                      plancher {formatFCFA(it.priceOverride.prixPlancher)}
                    </Badge>
                  )}
                  {it.priceOverride?.motif && (
                    <span className="italic text-slate-400">« {it.priceOverride.motif} »</span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TodaySalesPanel({ onClose }: { onClose: () => void }) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet<any[]>('/api/pos/sales/today');
        setSales(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function printReceipt(sale: any) {
    const receiptHtml = `
      <html>
        <head>
          <title>Ticket de Caisse</title>
          <style>
            body { font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="center bold">WILINWI</div>
          <div class="center">Ticket de caisse</div>
          <div class="divider"></div>
          <div>Date: ${new Date(sale.createdAt).toLocaleString()}</div>
          <div>Vente #: ${sale.id.slice(0, 8).toUpperCase()}</div>
          <div class="divider"></div>
          ${sale.items.map((i: any) => `
            <div class="item">
              <span>${i.quantite}x ${i.product?.nom || 'Produit'}</span>
              <span>${formatFCFA(i.prixReel * i.quantite)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item bold">
            <span>TOTAL</span>
            <span>${formatFCFA(sale.total)}</span>
          </div>
          <div class="item">
            <span>Payé (${sale.paymentMethod})</span>
            <span>${formatFCFA(sale.montantVerse)}</span>
          </div>
          <div class="divider"></div>
          <div class="center">Merci de votre visite !</div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  return (
    <Card className="mt-4 border-brand/20 bg-brand/5 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-brand">Ventes du jour</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : sales.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune vente aujourd'hui.</p>
      ) : (
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {sales.map((s) => (
            <li key={s.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="tabular font-semibold text-slate-900">{formatFCFA(s.total)}</span>
                  <Badge tone={s.status === 'COMPLETED' ? 'success' : s.status === 'PENDING_APPROVAL' ? 'warning' : 'neutral'} className="ml-2">
                    {s.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => printReceipt(s)}>
                    Imprimer
                  </Button>
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-600 border-t border-slate-100 pt-2">
                {s.items.map((it: any) => (
                  <li key={it.id} className="flex justify-between">
                    <span>{it.quantite} × {it.product?.nom ?? 'Produit'}</span>
                    <span className="tabular text-slate-500">{formatFCFA(it.prixReel * it.quantite)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
