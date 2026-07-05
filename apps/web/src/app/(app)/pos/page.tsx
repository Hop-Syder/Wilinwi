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
import { Search, Trash2, ShoppingCart, AlertTriangle, Command } from 'lucide-react';
import type { CreateSaleInput, FoodTableDto, ProductDto } from '@wilinwi/types';
import {
  applySaleStockToProducts,
  formatQuantity,
  productAffectsStock,
  quantityScale,
  saleStockBehavior,
  toDisplayQuantity,
  toStoredQuantity,
} from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA } from '@wilinwi/ui';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { syncEngine } from '@/lib/sync';
import type { PendingSale as PendingSyncSale } from '@wilinwi/offline';
import { useSync } from '@/lib/use-sync';
import { useAuth } from '@/lib/auth-context';
import { useInfraCapabilities } from '@/lib/use-infra-capabilities';
import { CheckoutModal, SaleSuccessModal, type CheckoutResult, type SaleSyncStatus } from '@/components/pos-checkout';
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
  // Vue globale « Tous les établissements » : on ne peut pas vendre (la vente doit
  // être rattachée à une boutique précise) → on désactive l'encaissement.
  const isGlobalView = user?.etablissementId === 'ALL';
  // Capacités d'infrastructure : FOOD → grille tactile groupée + tables (M3).
  const { has: hasInfraCap } = useInfraCapabilities();
  const isFood = hasInfraCap('pos.touch');
  const [tables, setTables] = useState<FoodTableDto[]>([]);
  const [tableId, setTableId] = useState('');
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [, setMessage] = useState<{ tone: 'ok' | 'offline' | 'err'; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [livreurs, setLivreurs] = useState<{ id: string; nom: string }[]>([]);
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<ProductDto | null>(null);
  
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastSale, setLastSale] = useState<ReceiptSale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [saleSync, setSaleSync] = useState<{ status: SaleSyncStatus; error?: string }>({
    status: 'pending',
  });
  // Ventes refusées par le serveur (échec permanent) en attente d'une décision.
  const [rejected, setRejected] = useState<PendingSyncSale[]>([]);

  async function refreshRejected() {
    setRejected(await syncEngine.rejectedSales());
  }

  /**
   * Synchronise une vente déjà enregistrée localement et reflète le statut RÉEL
   * (jamais de faux succès) : hors-ligne → en attente ; en ligne → on vide la file
   * puis on relit le statut serveur de cette vente précise.
   */
  async function syncSale(saleId: string) {
    if (!navigator.onLine) {
      setSaleSync({ status: 'pending' });
      return;
    }
    setSaleSync({ status: 'syncing' });
    try {
      await syncEngine.flush();
    } catch {
      /* flush gère ses erreurs réseau en interne (remet en attente) */
    }
    const s = await syncEngine.getSale(saleId);
    await refreshPending();
    await refreshRejected();
    if (s?.status === 'synced') setSaleSync({ status: 'synced' });
    else if (s?.status === 'rejected') setSaleSync({ status: 'rejected', error: s.error });
    else if (s?.status === 'error') setSaleSync({ status: 'error', error: s.error });
    else setSaleSync({ status: 'pending' });
  }

  /** Rejoue la synchronisation de la dernière vente (bouton « Réessayer »). */
  async function retrySale() {
    if (lastSale) await syncSale(lastSale.id);
  }

  /** Recharge les lignes d'une vente refusée dans le panier (pour la corriger). */
  function rebuildCart(payload: CreateSaleInput) {
    const lines: CartLine[] = [];
    for (const it of payload.items) {
      const product = products.find((p) => p.id === it.productId);
      if (!product) continue; // produit introuvable (peut-être supprimé) → ignoré
      const variant = it.variantId ? product.variants?.find((v) => v.id === it.variantId) : undefined;
      const variantLabel = variant
        ? Object.values(variant.attributs).map(String).join(', ')
        : undefined;
      lines.push({
        product,
        variantId: it.variantId,
        variantLabel,
        quantite: it.quantite,
        prixReel: it.prixReel,
      });
    }
    setCart(lines);
  }

  /** Écarte définitivement une vente locale refusée. */
  async function discardById(id: string) {
    // Lue AVANT suppression : sert à re-créditer l'état local (miroir du cache,
    // que syncEngine.discard re-crédite de son côté).
    const sale = await syncEngine.getSale(id);
    await syncEngine.discard(id);
    if (sale && sale.status !== 'synced') {
      setProducts((prev) => applySaleStockToProducts(prev, sale.payload.items, 'credit'));
    }
    await refreshPending();
    await refreshRejected();
  }

  /** Recharge une vente refusée dans le panier puis la retire de la file. */
  async function fixFromSale(s: PendingSyncSale) {
    rebuildCart(s.payload);
    await discardById(s.id);
  }

  /** Écarter / Corriger depuis la modale de la dernière vente. */
  async function discardSale() {
    if (lastSale) await discardById(lastSale.id);
    setShowSuccessModal(false);
  }
  async function fixSale() {
    if (lastSale) {
      const s = await syncEngine.getSale(lastSale.id);
      if (s) await fixFromSale(s);
      else await discardById(lastSale.id);
    }
    setShowSuccessModal(false);
  }

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
    // Tables de la boutique FOOD (sélecteur du panier) — best-effort.
    if (hasInfraCap('food.tables')) {
      apiGet<FoodTableDto[]>('/api/food/tables')
        .then(setTables)
        .catch(() => setTables([]));
    }
    // Liste des clients (pour les ventes à crédit / acompte).
    apiGet<{ id: string; nom: string }[]>('/api/crm/clients')
      .then(setClients)
      .catch(() => setClients([]));
    // Liste des livreurs (pour la livraison).
    apiGet<{ id: string; nom: string; role: string }[]>('/api/users/pos')
      .then((users) => {
        setLivreurs(users.filter((u) => u.role === 'DELIVERY'));
      })
      .catch(() => setLivreurs([]));
    // Ventes refusées en attente d'une décision (ex. refusées en arrière-plan).
    void refreshRejected();
  }, []);

  // Rafraîchit la liste des refus pour capter ceux produits par l'auto-retry de fond.
  useEffect(() => {
    const id = setInterval(() => {
      void syncEngine.rejectedSales().then(setRejected);
    }, 20_000);
    return () => clearInterval(id);
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

  // POS tactile FOOD : produits groupés par catégorie (plats, boissons…) —
  // hors FOOD, un seul groupe sans en-tête (rendu identique à avant).
  const productGroups = useMemo((): [string | null, ProductDto[]][] => {
    if (!isFood) return [[null, displayProducts]];
    const groups = new Map<string, ProductDto[]>();
    for (const p of displayProducts) {
      const key = p.categorie ?? 'Autres';
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [displayProducts, isFood]);

  const total = cart.reduce((s, l) => s + l.prixReel * l.quantite, 0);
  // Le plancher est désormais visible : on bloque l'encaissement si une ligne
  // est négociée sous son prix plancher (cohérent avec le refus serveur).
  const hasBelowFloor = cart.some(
    (l) => l.product.prixPlancher !== undefined && l.prixReel < l.product.prixPlancher,
  );

  function addToCart(product: ProductDto, quantite: number = quantityScale(product.unitKind), prixReel: number = product.prixCatalogue, variantId?: string, variantLabel?: string) {
    // Miroir du serveur (TDR §9.1/§9.2) : pas de contrôle de disponibilité pour
    // SERVICE/MANUFACTURED ni pour les politiques ALLOW_NEGATIVE/NO_STOCK.
    const checkStock = saleStockBehavior(product.type, product.stockPolicy).precheck;
    const stockToCheck = variantId ? product.variants?.find(v => v.id === variantId)?.stock || 0 : product.stock;
    if (checkStock && stockToCheck <= 0) {
      setMessage({ tone: 'err', text: 'Opération refusée : produit en rupture de stock.' });
      return;
    }
    setCart((c) => {
      const existing = c.find((l) => l.product.id === product.id && l.variantId === variantId);
      const newQuantite = existing ? existing.quantite + quantite : quantite;
      if (checkStock && newQuantite > stockToCheck) {
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
    if (saleStockBehavior(line.product.type, line.product.stockPolicy).precheck) {
      const stockToCheck = line.variantId ? line.product.variants?.find(v => v.id === line.variantId)?.stock || 0 : line.product.stock;
      if (newQ > stockToCheck) {
        setMessage({ tone: 'err', text: `Stock maximum atteint pour ${line.product.nom}.` });
        newQ = stockToCheck;
      }
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
      tableId: tableId || undefined,
      paymentMethod: result.paymentMethod,
      montantVerse: result.montantVerse,
      montantEspeces: result.montantEspeces,
      clientId: result.clientId,
      clientNom: result.clientNom,
      clientTelephone: result.clientTelephone,
      aLivrer: result.aLivrer,
      livreurId: result.livreurId,
      adresseLivraison: result.adresseLivraison,
      items: cart.map((l) => ({
        productId: l.product.id,
        variantId: l.variantId,
        quantite: l.quantite,
        prixReel: l.prixReel,
      })),
    };

    try {
      await syncEngine.enqueueSale(payload);
      // Anti-oversell : l'état local reflète immédiatement la vente (le cache
      // Dexie est débité par enqueueSale) — la vente suivante voit le stock réduit.
      setProducts((prev) => applySaleStockToProducts(prev, payload.items, 'debit'));

      // Capture l'instantané de la vente pour le ticket (fonctionne hors-ligne).
      const montantVerse =
        result.paymentMethod === 'CREDIT'
          ? 0
          : result.paymentMethod === 'INSTALLMENT'
            ? result.montantVerse ?? 0
            : total;

      let clientInfo = null;
      if (result.clientId) {
        const client = clients.find((c) => c.id === result.clientId);
        if (client) {
          clientInfo = { nom: client.nom, telephone: client.telephone };
        }
      } else if (result.clientNom) {
        clientInfo = { nom: result.clientNom, telephone: result.clientTelephone || null };
      }

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
        client: clientInfo,
      });

      setLastSaleTotal(total);
      setCart([]);
      setTableId(''); // la table se choisit vente par vente
      setSaleSync({ status: 'pending' });
      setShowSuccessModal(true);

      await refreshPending();
      await syncSale(payload.clientGeneratedId!);
    } catch {
      setMessage({ tone: 'err', text: "Erreur lors de l'enregistrement local." });
    } finally {
      setBusy(false);
    }
  }

  const [showHistory, setShowHistory] = useState(false);



  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* Vue globale : la vente exige une boutique précise */}
      {isGlobalView && (
        <div className="lg:col-span-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Vous êtes en vue « Tous les établissements » — sélectionnez une boutique précise
            (sélecteur en haut) pour encaisser une vente.
          </p>
        </div>
      )}

      {/* Ventes refusées par le serveur (échec permanent) — action requise */}
      {rejected.length > 0 && (
        <div className="lg:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {rejected.length} vente(s) refusée(s) — à corriger ou écarter
          </p>
          <ul className="mt-2 space-y-2">
            {rejected.map((s) => {
              const t = s.payload.items.reduce((sum, i) => sum + i.prixReel * i.quantite, 0);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="tabular text-sm font-semibold text-slate-800">
                      {formatFCFA(t)}
                    </span>
                    <span className="block truncate text-xs text-red-600">{s.error}</span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => void fixFromSale(s)}>
                      Corriger
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => void discardById(s.id)}
                    >
                      Écarter
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Catalogue */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-bold text-brand">Caisse</h1>
          <div className="flex flex-wrap gap-2">
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
                { title: 'Choisir la boutique', description: 'La caisse vend pour la boutique sélectionnée dans le sélecteur en haut, et décrémente SON stock. En vue « Tous les établissements », l\'encaissement est désactivé : choisissez une boutique précise.' },
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

            {/* FOOD (pos.touch) : sections par catégorie ; sinon un seul groupe. */}
            {productGroups.map(([categorie, prods]) => (
              <div key={categorie ?? '__all__'}>
                {categorie !== null && (
                  <h3 className="mt-4 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {categorie}
                  </h3>
                )}
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {prods.map((p) => {
                    // SERVICE/MANUFACTURED : toujours vendables (pas de stock direct).
                    const noStock = !productAffectsStock(p.type);
                    // ALLOW_NEGATIVE/NO_STOCK : la rupture n'empêche pas la vente.
                    const blocking = saleStockBehavior(p.type, p.stockPolicy).precheck;
                    const outOfStock = blocking && p.stock <= 0 && (!p.variants || p.variants.length === 0);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleProductClick(p)}
                        disabled={outOfStock}
                        className={`rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md ${outOfStock ? 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:border-slate-200 hover:shadow-none' : ''}`}
                      >
                        <div className="font-medium text-slate-900 line-clamp-2 min-h-[40px]">{p.nom}</div>
                        <div className="tabular mt-1 text-sm font-bold text-emerald-700">
                          {formatFCFA(p.prixCatalogue)}
                        </div>
                        <Badge tone={noStock ? 'neutral' : p.stock <= 0 ? 'danger' : p.stock <= p.seuilAlerte ? 'warning' : 'neutral'} className="mt-2 text-[10px]">
                          {noStock ? (p.type === 'SERVICE' ? 'Service' : 'Fabriqué') : p.stock === 0 ? 'Rupture' : `${formatQuantity(p.stock, p.unitKind, p.baseUnit)} en stock`}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {displayProducts.length === 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                {products.length === 0 ? (
                  <>
                    <p className="font-medium text-slate-700">Aucun produit dans le catalogue</p>
                    {user?.modules.includes('STOCK') ? (
                      <>
                        <p className="mt-1 text-sm text-slate-400">
                          Ajoutez des produits dans le Stock pour commencer à vendre.
                        </p>
                        <Link href="/stock">
                          <Button variant="outline" className="mt-4">
                            Aller au Stock
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-slate-400">
                        Demandez à un responsable d&apos;ajouter des produits.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400">
                    Aucun produit ne correspond à « {query} ».
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>



      {/* Panier */}
      <Card className="h-fit lg:sticky lg:top-20" id="tour-cart">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand">
          <ShoppingCart className="h-5 w-5" /> Panier
        </h2>

        {/* Table FOOD (M3) : rattache la vente à une table de la boutique. */}
        {tables.length > 0 && (
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value="">— Sans table (comptoir / à emporter) —</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>{t.nom}</option>
            ))}
          </select>
        )}

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
                  {/* Milli-unités : les produits au poids/volume se saisissent en
                      décimal (1,5 kg) — persistés en entiers (×1000). Les ± font
                      un pas d'UNE unité de base. */}
                  <div className="flex items-center border rounded-md bg-white">
                    <button
                      className="px-2 py-0.5 hover:bg-slate-50 text-slate-500 font-bold border-r"
                      onClick={() => updateQuantity(l, -quantityScale(l.product.unitKind))}
                    >-</button>
                    <input
                      type="number"
                      step={quantityScale(l.product.unitKind) !== 1 ? 'any' : 1}
                      value={toDisplayQuantity(l.quantite, l.product.unitKind)}
                      onChange={(e) => setExactQuantity(l, toStoredQuantity(Number(e.target.value), l.product.unitKind))}
                      className="w-12 text-center text-xs border-none focus:ring-0 p-1 focus:outline-none tabular"
                    />
                    <button
                      className="px-2 py-0.5 hover:bg-slate-50 text-slate-500 font-bold border-l"
                      onClick={() => updateQuantity(l, quantityScale(l.product.unitKind))}
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

            {hasBelowFloor && (
              <div className="mb-4 text-xs font-medium text-red-600 bg-red-50 p-2 rounded border border-red-200 flex justify-center text-center">
                Un prix est sous le prix plancher autorisé. Ajustez-le pour encaisser.
              </div>
            )}

            <Button
              className="w-full h-12 text-lg"
              disabled={cart.length === 0 || busy || hasBelowFloor || isGlobalView}
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
          <div className="w-full max-w-sm max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Choisir une variante</h3>
            <p className="mb-4 text-sm text-slate-600">{variantSelectionProduct.nom}</p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {variantSelectionProduct.variants?.map(v => {
                const label = Object.entries(v.attributs).map(([, val]) => `${val}`).join(', ');
                const isOos = v.stock <= 0;
                return (
                  <button 
                    key={v.id} 
                    disabled={isOos}
                    onClick={() => {
                      addToCart(variantSelectionProduct, quantityScale(variantSelectionProduct.unitKind), variantSelectionProduct.prixCatalogue, v.id, label);
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
        livreurs={livreurs}
        onConfirm={handleConfirmCheckout}
      />

      {/* Modale de succès affichée après l'enregistrement de la vente */}
      <SaleSuccessModal
        isOpen={showSuccessModal}
        total={lastSaleTotal}
        syncStatus={saleSync.status}
        syncError={saleSync.error}
        onRetry={retrySale}
        onDiscard={discardSale}
        onFix={fixSale}
        onNewSale={() => setShowSuccessModal(false)}
        receiptCode={lastSale?.receiptCode}
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

      {/* 📱 Barre de panier fixe (mobile) — accès direct à l'encaissement sans scroller.
          Positionnée au-dessus de la barre d'onglets + marge safe-area. */}
      {cart.length > 0 && (
        <div
          className="fixed inset-x-0 z-30 px-3 sm:hidden"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-3 rounded-2xl bg-brand px-4 py-3 text-white shadow-xl shadow-brand/30">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById('tour-cart')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="flex min-w-0 items-center gap-2.5"
              aria-label="Voir le panier"
            >
              <span className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-brand">
                  {cart.reduce((s, l) => s + l.quantite, 0)}
                </span>
              </span>
              <span className="tabular text-base font-bold">{total.toLocaleString()} F</span>
            </button>
            <button
              type="button"
              onClick={openCheckout}
              disabled={busy || hasBelowFloor || isGlobalView}
              className="ml-auto rounded-xl bg-white px-5 py-2 text-sm font-bold text-brand shadow-sm transition-transform active:scale-95 disabled:opacity-60"
            >
              Encaisser
            </button>
          </div>
        </div>
      )}
    </div>
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
                  <Badge tone={s.status === 'COMPLETED' ? 'success' : 'neutral'} className="ml-2">
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
