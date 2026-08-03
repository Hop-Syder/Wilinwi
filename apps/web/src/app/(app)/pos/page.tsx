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

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Lock, RotateCcw, AlertTriangle } from 'lucide-react';
import type { CreateSaleInput, FoodTableDto, ProductDto, ClientDto } from '@wilinwi/types';
import { Button } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';
import { syncEngine } from '@/lib/sync';
import type { PendingSale as PendingSyncSale } from '@wilinwi/offline';
import { useSync } from '@/lib/use-sync';
import { useAuth } from '@/lib/auth-context';
import { useInfraCapabilities } from '@/lib/use-infra-capabilities';
import { CheckoutModal, SaleSuccessModal, type CheckoutResult, type SaleSyncStatus } from '@/components/pos-checkout';
import { ReceiptModal, type ReceiptSale } from '@/components/receipt';
import { ContextualHelp } from '@/components/contextual-help';
import { PosCloseSessionModal } from '@/components/pos-close-session-modal';
import type { TourStep } from '@/components/tour-guide';
import { PosCatalogZone } from '@/components/pos/pos-catalog-zone';
import { PosCartZone, type CartLine, type OrderMode } from '@/components/pos/pos-cart-zone';
import { BarcodeScannerModal } from '@/components/stock/barcode-scanner-modal';

export default function PosPage() {
  const { refreshPending, state } = useSync();
  const { user } = useAuth();
  const isGlobalView = user?.etablissementId === 'ALL';

  const { has: hasInfraCap } = useInfraCapabilities();
  const isFood = hasInfraCap('pos.touch');

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [livreurs, setLivreurs] = useState<{ id: string; nom: string }[]>([]);
  
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // État du Panier & Client
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientDto | null>(null);
  const [orderMode, setOrderMode] = useState<OrderMode>('SUR_PLACE');

  const [busy, setBusy] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastSale, setLastSale] = useState<ReceiptSale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [saleSync, setSaleSync] = useState<{ status: SaleSyncStatus; error?: string }>({
    status: 'pending',
  });
  const [rejected, setRejected] = useState<PendingSyncSale[]>([]);

  // Chargement Initial des Produits, Clients & Livreurs
  const loadInitialData = useCallback(async () => {
    try {
      const [prods, cls, livs] = await Promise.all([
        apiGet<ProductDto[]>('/api/stock/products'),
        apiGet<ClientDto[]>('/api/clients').catch(() => []),
        apiGet<{ id: string; nom: string }[]>('/api/livraisons/livreurs').catch(() => []),
      ]);
      setProducts(prods);
      setClients(cls);
      setLivreurs(livs);
    } catch (e) {
      console.error('Erreur chargement POS:', e);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

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
        // Focus sur la zone client
      } else if (e.key === 'Escape') {
        if (cart.length > 0) {
          e.preventDefault();
          if (confirm('Voulez-vous vraiment vider le panier en cours ?')) {
            setCart([]);
          }
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && e.target === document.body) {
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
        quantite: line.quantite,
        prixReel: line.prixReel,
      })),
      paymentMethod: result.paymentMethod,
      momoOperator: result.momoOperator,
      momoReference: result.momoReference,
      clientId: selectedClient?.id,
      clientNom: result.clientNom || selectedClient?.nom || undefined,
      clientTelephone: result.clientTelephone || selectedClient?.telephone || undefined,
    };

    try {
      const pendingSale = await syncEngine.enqueueSale(payload);
      await refreshPending();

      setLastSale({
        id: pendingSale.id,
        total,
        montantVerse: result.montantVerse ?? total,
        paymentMethod: result.paymentMethod,
        momoOperator: result.momoOperator,
        momoReference: result.momoReference,
        createdAt: new Date().toISOString(),
        receiptCode: pendingSale.id,
        items: cart.map((l) => ({
          id: l.product.id,
          quantite: l.quantite,
          prixReel: l.prixReel,
          product: { nom: l.product.nom },
        })),
        client: payload.clientNom ? { nom: payload.clientNom, telephone: payload.clientTelephone } : null,
      });

      setSaleSync({ status: state === 'offline' ? 'pending' : 'synced' });
      setShowSuccessModal(true);
      setCart([]);
      setSelectedClient(null);
    } catch (err) {
      console.error('Erreur encaissement:', err);
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
      {/* Barre d'Action Supérieure & Clôture de Caisse */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Caisse & Enregistrement des Ventes</span>
            {isGlobalView && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                Mode Tous Établissements (Lecture seule)
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ContextualHelp
            storageKey="wilinwi_pos_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Raccourcis Clavier POS', description: 'F2 (Recherche), F4 (Sélection client), Entrée/Espace (Encaissement), Échap (Vider le panier).' },
              { title: 'Clôture de caisse', description: 'Comptage physique guidé par coupures avec calcul des écarts transmis au journal d\'audit.' },
            ]}
          />

          <Button
            variant="outline"
            onClick={() => setShowCloseModal(true)}
            className="rounded-xl text-xs font-bold"
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" /> Clôturer la Session
          </Button>
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

        {/* Partie Droite : Zone Panier & Client Persistant (1 Colonne lg = 1/3) */}
        <div className="min-h-0 flex flex-col" id="tour-pos-cart">
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
            onCheckout={() => setShowCheckoutModal(true)}
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
          receiptCode={lastSale?.id}
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

      {/* Modale Clôture de Caisse (Axe 5) */}
      {showCloseModal && (
        <PosCloseSessionModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
        />
      )}
    </div>
  );
}
