/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Caisse & Point de Vente (POS) — Refonte 5 Axes (Split-Screen 2/3 + 1/3, Raccourcis clavier F2/F4/Entrée/Échap, Encaissement & Off-line)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Lock, Unlock } from 'lucide-react';
import type { CreateSaleInput, ProductDto, ClientDto, PosSessionDto } from '@wilinwi/types';
import { apiGet } from '@/lib/api';
import { syncEngine } from '@/lib/sync';
import { useSync } from '@/lib/use-sync';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { CheckoutModal, SaleSuccessModal, type CheckoutResult, type SaleSyncStatus } from '@/components/pos-checkout';
import { ReceiptModal, type ReceiptSale } from '@/components/receipt';
import { ContextualHelp } from '@/components/contextual-help';
import { PosCloseSessionModal } from '@/components/pos-close-session-modal';
import { PosOpenSessionModal } from '@/components/pos-open-session-modal';
import type { TourStep } from '@/components/tour-guide';
import { PosCatalogZone } from '@/components/pos/pos-catalog-zone';
import { PosCartZone, type CartLine, type OrderMode } from '@/components/pos/pos-cart-zone';
import { BarcodeScannerModal } from '@/components/stock/barcode-scanner-modal';
import { FloatingCartButtons } from '@/components/pos/floating-cart-buttons';
import { MobileCartDrawer } from '@/components/pos/mobile-cart-drawer';

export default function PosPage() {
  const { refreshPending, state } = useSync();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const isGlobalView = user?.etablissementId === 'ALL';

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [livreurs, setLivreurs] = useState<{ id: string; nom: string }[]>([]);
  
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const clientSearchInputRef = useRef<HTMLInputElement>(null);

  // Session de caisse active
  const [activeSession, setActiveSession] = useState<PosSessionDto | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // État du Panier & Client
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientDto | null>(null);
  const [orderMode, setOrderMode] = useState<OrderMode>('SUR_PLACE');

  const [busy, setBusy] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMobileCartDrawer, setShowMobileCartDrawer] = useState(false);
  
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastSale, setLastSale] = useState<ReceiptSale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [saleSync, setSaleSync] = useState<{ status: SaleSyncStatus; error?: string }>({
    status: 'pending',
  });

  // Chargement Initial des Produits, Clients & Livreurs
  const loadInitialData = useCallback(async () => {
    try {
      const [prods, cls, livs] = await Promise.all([
        apiGet<ProductDto[]>('/api/stock/products'),
        apiGet<ClientDto[]>('/api/crm/clients').catch(() => []),
        apiGet<{ id: string; nom: string }[]>('/api/users/pos').catch(() => []),
      ]);
      setProducts(prods);
      setClients(cls);
      setLivreurs(livs);
      void syncEngine.cacheProducts(prods);
    } catch {
      const cachedProducts = await syncEngine.cachedProducts().catch(() => []);
      setProducts(cachedProducts);
    }
  }, []);

  // Récupération dynamique de la session de caisse active
  const fetchActiveSession = useCallback(async () => {
    if (!user || isGlobalView) {
      setActiveSession(null);
      setLoadingSession(false);
      return;
    }
    setLoadingSession(true);
    try {
      const session = await apiGet<PosSessionDto | null>('/api/pos/sessions/active');
      setActiveSession(session);
    } catch {
      setActiveSession(null);
    } finally {
      setLoadingSession(false);
    }
  }, [user, isGlobalView]);

  useEffect(() => {
    void loadInitialData();
    void fetchActiveSession();
  }, [loadInitialData, fetchActiveSession]);

  // Raccourcis Clavier Globaux (F2: Recherche, F4: Client, Entrée/Espace: Encaissement, Échap: Vider)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Éviter de déclencher si une modale est ouverte
      if (showCheckoutModal || showSuccessModal || showCloseModal || showScannerModal) {
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        clientSearchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (cart.length > 0) {
          e.preventDefault();
          if (confirm('Voulez-vous vraiment vider le panier en cours ?')) {
            setCart([]);
          }
        }
      } else if (e.key === 'Enter' || e.code === 'Space') {
        const target = e.target;
        if (target instanceof HTMLElement && target.closest('input, textarea, select, button, [contenteditable="true"]')) {
          return;
        }
        if (cart.length > 0 && !isGlobalView) {
          e.preventDefault();
          setShowCheckoutModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isGlobalView, showCheckoutModal, showSuccessModal, showCloseModal, showScannerModal]);

  // Ajout au Panier
  const handleSelectProduct = (product: ProductDto) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((line) => line.product.id === product.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantite += 1;
        return copy;
      } else {
        return [
          ...prev,
          {
            product,
            quantite: 1,
            prixReel: product.prixCatalogue,
          },
        ];
      }
    });
  };

  // Mise à jour Quantité
  const handleUpdateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const newQty = copy[index].quantite + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index].quantite = newQty;
      return copy;
    });
  };

  // Suppression Ligne Panier
  const handleRemoveLine = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Confirmation Vente & Encaissement
  const handleConfirmCheckout = async (result: CheckoutResult) => {
    if (cart.length === 0 || isGlobalView) return;
    setBusy(true);
    setShowCheckoutModal(false);

    const total = cart.reduce((sum, line) => sum + line.prixReel * line.quantite, 0);
    setLastSaleTotal(total);

    const payload: CreateSaleInput = {
      items: cart.map((line) => ({
        productId: line.product.id,
        variantId: line.variantId,
        unitId: line.unitId,
        unitFactor: line.unitFactor,
        quantite: line.quantite,
        prixReel: line.prixReel,
      })),
      paymentMethod: result.paymentMethod,
      montantVerse: result.montantVerse,
      montantEspeces: result.montantEspeces,
      momoOperator: result.momoOperator,
      momoReference: result.momoReference,
      clientId: result.clientId ?? selectedClient?.id,
      clientNom: result.clientNom || selectedClient?.nom || undefined,
      clientTelephone: result.clientTelephone || selectedClient?.telephone || undefined,
      aLivrer: result.aLivrer || orderMode === 'LIVRAISON',
      livreurId: result.livreurId,
      adresseLivraison: result.adresseLivraison,
    };

    try {
      const pendingSale = await syncEngine.enqueueSale(payload);
      await refreshPending();

      if (state !== 'offline') {
        await syncEngine.flush();
        await refreshPending();
      }
      const syncedSale = await syncEngine.getSale(pendingSale.id);
      const syncStatus = syncedSale?.status ?? 'pending';

      setLastSale({
        id: pendingSale.id,
        total,
        montantVerse: result.paymentMethod === 'CREDIT' ? 0 : result.montantVerse ?? total,
        paymentMethod: result.paymentMethod,
        momoOperator: result.momoOperator,
        momoReference: result.momoReference,
        createdAt: new Date().toISOString(),
        receiptCode: syncedSale?.serverId,
        items: cart.map((l) => ({
          id: l.product.id,
          quantite: l.quantite,
          prixReel: l.prixReel,
          product: { nom: l.product.nom },
        })),
        client: payload.clientNom ? { nom: payload.clientNom, telephone: payload.clientTelephone } : null,
      });

      setSaleSync({ status: syncStatus, error: syncedSale?.error });
      setShowSuccessModal(true);
      setCart([]);
      setSelectedClient(null);
    } catch (err) {
      setSaleSync({ status: 'error', error: err instanceof Error ? err.message : 'Encaissement impossible' });
    } finally {
      setBusy(false);
    }
  };

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-pos-catalog',
      title: 'Zone Catalogue (2/3)',
      content: 'Recherchez (F2) ou filtrez par catégorie. Cliquez sur une carte produit pour l\'ajouter au panier.',
      position: 'right',
    },
    {
      targetId: 'tour-pos-cart',
      title: 'Zone Panier Persistant (1/3)',
      content: 'Ajustez les quantités, sélectionnez le client (F4) et cliquez sur Encaisser (Entrée/Espace).',
      position: 'left',
    },
  ];

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col space-y-3 pb-2 overflow-hidden">
      {/* EN-TÊTE COMPACT MOBILE & DESKTOP POS */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        {/* CÔTÉ GAUCHE : Titre + Statut de caisse unifié */}
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Titre Raccourci sur Mobile */}
          <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight shrink-0 flex items-center gap-2">
            <span className="sm:hidden font-extrabold text-emerald-950">Caisse POS</span>
            <span className="hidden sm:inline font-extrabold text-emerald-950">Caisse & Enregistrement</span>
            {isGlobalView && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                Tous Établissements (Lecture seule)
              </span>
            )}
          </h1>

          {/* Badge Statut + Fond de caisse unifié */}
          {!isGlobalView && (
            loadingSession ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 animate-pulse whitespace-nowrap">
                Chargement...
              </span>
            ) : activeSession ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-700 whitespace-nowrap shadow-xs truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">
                  Ouverte <span className="text-emerald-600/80 font-normal">({formatAmount(activeSession.fondInitial)})</span>
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200/80 rounded-full text-xs font-semibold text-rose-700 whitespace-nowrap shadow-xs truncate">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>Fermée</span>
              </span>
            )
          )}
        </div>

        {/* CÔTÉ DROITE : Actions (Aide + Clôture/Ouverture) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ContextualHelp
            storageKey="wilinwi_pos_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Raccourcis Clavier POS', description: 'F2 (Recherche), F4 (Sélection client), Entrée/Espace (Encaissement), Échap (Vider le panier).' },
              { title: 'Clôture de caisse', description: 'Comptage physique guidé par coupures avec calcul des écarts transmis au journal d\'audit.' },
            ]}
          />

          {!isGlobalView && (
            activeSession ? (
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Clôturer Caisse</span>
                <span className="sm:hidden">Clôturer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowOpenModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-xs"
              >
                <Unlock className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Ouvrir Caisse</span>
                <span className="sm:hidden">Ouvrir</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ── AXE 1 : Disposition Split-Screen 2 Colonnes Fixe (2/3 Catalogue + 1/3 Panier) ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Partie Gauche : Zone Catalogue & Recherche (2 Colonnes lg = 2/3) */}
        <div className="lg:col-span-2 min-h-0 flex flex-col" id="tour-pos-catalog">
          <PosCatalogZone
            ref={searchInputRef}
            products={products}
            query={query}
            onQueryChange={setQuery}
            onSelectProduct={handleSelectProduct}
            onOpenScanner={() => setShowScannerModal(true)}
            disabled={isGlobalView}
          />
        </div>

        {/* Partie Droite : Zone Panier & Client Persistant (1 Colonne lg = 1/3 sur Desktop) */}
        <div className="hidden lg:flex min-h-0 flex-col" id="tour-pos-cart">
          <PosCartZone
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveLine={handleRemoveLine}
            onClearCart={() => setCart([])}
            clients={clients}
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
            orderMode={orderMode}
            onOrderModeChange={setOrderMode}
            onCheckout={() => {
              if (!activeSession && !isGlobalView) {
                setShowOpenModal(true);
              } else {
                setShowCheckoutModal(true);
              }
            }}
            clientSearchInputRef={clientSearchInputRef}
            disabled={isGlobalView || busy}
          />
        </div>
      </div>

      {/* Modale d'Encaissement (Axe 4) */}
      {showCheckoutModal && (
        <CheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          cartTotal={cart.reduce((sum, line) => sum + line.prixReel * line.quantite, 0)}
          clients={clients}
          livreurs={livreurs}
          initialClientId={selectedClient?.id}
          onConfirm={handleConfirmCheckout}
        />
      )}

      {/* Modale Succès & QR Code Reçu (Axe 5) */}
      {showSuccessModal && (
        <SaleSuccessModal
          isOpen={showSuccessModal}
          total={lastSaleTotal}
          onNewSale={() => setShowSuccessModal(false)}
          onShowReceipt={() => {
            setShowSuccessModal(false);
            setShowReceipt(true);
          }}
          syncStatus={saleSync.status}
          syncError={saleSync.error}
          receiptCode={lastSale?.receiptCode}
        />
      )}

      {/* Ticket de Caisse & Impression */}
      {showReceipt && lastSale && (
        <ReceiptModal
          onClose={() => setShowReceipt(false)}
          sale={lastSale}
        />
      )}

      {/* Scanner Caméra Code-Barres */}
      {showScannerModal && (
        <BarcodeScannerModal
          onScan={(code) => {
            setQuery(code);
            setShowScannerModal(false);
          }}
          onClose={() => setShowScannerModal(false)}
        />
      )}

      {/* Modale Ouverture de Caisse */}
      {showOpenModal && (
        <PosOpenSessionModal
          isOpen={showOpenModal}
          onClose={() => setShowOpenModal(false)}
          onSuccess={(session) => {
            setActiveSession(session);
            void fetchActiveSession();
          }}
        />
      )}

      {/* Modale Clôture de Caisse (Axe 5) */}
      {showCloseModal && (
        <PosCloseSessionModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            setActiveSession(null);
            void fetchActiveSession();
          }}
        />
      )}
      {/* Bouton Panier Flottant & Compteur (Mobile & Tablette < lg) */}
      <FloatingCartButtons
        itemCount={cart.reduce((sum, line) => sum + line.quantite, 0)}
        totalAmount={cart.reduce((sum, line) => sum + line.prixReel * line.quantite, 0)}
        onOpenCart={() => setShowMobileCartDrawer(true)}
        onOpenScanner={() => setShowScannerModal(true)}
      />

      {/* Bottom Sheet Panier Grand Format 92vh (Mobile & Tablette < lg) */}
      <MobileCartDrawer
        isOpen={showMobileCartDrawer}
        onClose={() => setShowMobileCartDrawer(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveLine={handleRemoveLine}
        onClearCart={() => setCart([])}
        clients={clients}
        selectedClient={selectedClient}
        onSelectClient={setSelectedClient}
        orderMode={orderMode}
        onOrderModeChange={setOrderMode}
        onProceedToCheckout={() => {
          if (!activeSession && !isGlobalView) {
            setShowOpenModal(true);
          } else {
            setShowCheckoutModal(true);
          }
        }}
        disabled={isGlobalView || busy}
      />
    </div>
  );
}
