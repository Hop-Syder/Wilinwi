/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Pop-up / Bottom Sheet Panier Grand Format (h-[92vh]) pour POS Mobile & Tablette (MobileCartDrawer)
 * @created 2026-08-04
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useMemo, useState } from 'react';
import {
  X, Trash2, Plus, Minus, UserCheck, UserPlus, CreditCard, ShoppingBag,
  Store, ShoppingCart, AlertCircle, Truck
} from 'lucide-react';
import type { ClientDto } from '@wilinwi/types';
import { useCurrency } from '@/lib/currency-context';
import type { CartLine, OrderMode } from './pos-cart-zone';

interface MobileCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartLine[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveLine: (index: number) => void;
  onClearCart: () => void;
  clients: ClientDto[];
  selectedClient: ClientDto | null;
  onSelectClient: (client: ClientDto | null) => void;
  orderMode: OrderMode;
  onOrderModeChange: (mode: OrderMode) => void;
  onProceedToCheckout: () => void;
  disabled?: boolean;
}

export function MobileCartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveLine,
  onClearCart,
  clients,
  selectedClient,
  onSelectClient,
  orderMode,
  onOrderModeChange,
  onProceedToCheckout,
  disabled,
}: MobileCartDrawerProps) {
  const { formatAmount } = useCurrency();
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.prixReel * line.quantite, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.quantite, 0);
  }, [cart]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 5);
    const q = clientSearch.toLowerCase().trim();
    return clients.filter(
      (c) => c.nom.toLowerCase().includes(q) || c.telephone?.includes(q)
    ).slice(0, 6);
  }, [clients, clientSearch]);

  const clientSolde = selectedClient?.soldeCredit ?? 0;
  const clientPlafond = selectedClient?.plafondCredit ?? 0;
  const hasExceededPlafond = clientPlafond > 0 && clientSolde + totalAmount > clientPlafond;

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      {/* Zone d'arrière-plan cliquable pour fermer */}
      <div className="flex-1" onClick={onClose} />

      {/* Pop-up / Tiroir Grand Format (92% de la hauteur de l'écran) */}
      <div className="w-full h-[92vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border-t border-slate-200">
        
        {/* Poignée Visuelle & En-tête */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">Panier en cours</h2>
              <p className="text-xs text-slate-500 font-medium">
                {totalItemsCount} article{totalItemsCount > 1 ? 's' : ''} sélectionné{totalItemsCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vider</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-slate-200/70 text-slate-600 hover:bg-slate-300 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sélecteur de Mode de Commande */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200/70 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onOrderModeChange('SUR_PLACE')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              orderMode === 'SUR_PLACE'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sur place</span>
          </button>
          <button
            type="button"
            onClick={() => onOrderModeChange('A_EMPORTER')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              orderMode === 'A_EMPORTER'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
            <span>À emporter</span>
          </button>
          <button
            type="button"
            onClick={() => onOrderModeChange('LIVRAISON')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              orderMode === 'LIVRAISON'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Livraison</span>
          </button>
        </div>

        {/* Barre Client & Crédit CRM */}
        <div className="p-3 bg-amber-50/70 border-b border-amber-100 flex flex-col gap-2 shrink-0">
          <div className="relative">
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{selectedClient.nom}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">
                      {selectedClient.telephone || 'Aucun numéro'} • Solde: <strong className={clientSolde > 0 ? 'text-amber-700' : 'text-slate-700'}>{formatAmount(clientSolde)}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectClient(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-emerald-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Associer un client CRM (Nom ou Téléphone)..."
                    value={clientSearch}
                    onFocus={() => setShowClientDropdown(true)}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 pl-8 text-xs font-bold text-slate-900 placeholder:text-amber-700/60 focus:border-amber-400 focus:outline-none"
                  />
                  <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-600" />
                </div>

                {showClientDropdown && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-amber-200 bg-white p-1 shadow-lg">
                    {filteredClients.length === 0 ? (
                      <p className="p-2 text-center text-xs font-medium text-slate-400">Aucun client trouvé</p>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onSelectClient(c);
                            setShowClientDropdown(false);
                            setClientSearch('');
                          }}
                          className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs hover:bg-amber-50 transition-colors"
                        >
                          <span className="font-bold text-slate-900 truncate">{c.nom}</span>
                          <span className="text-[10px] font-medium text-slate-500 shrink-0">{formatAmount(c.soldeCredit ?? 0)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedClient && clientPlafond > 0 && (
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 px-1">
              <span>Plafond autorisé : <strong>{formatAmount(clientPlafond)}</strong></span>
              {hasExceededPlafond && (
                <span className="text-rose-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Dépassement !
                </span>
              )}
            </div>
          )}
        </div>

        {/* Liste des Articles Spacieuse */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart className="w-14 h-14 stroke-1 mb-3 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-700">Votre panier est vide</p>
              <p className="text-xs text-slate-400 mt-1">Touchez des articles dans le catalogue pour les ajouter.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.product.id}-${item.unitId || 'default'}-${idx}`}
                className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs"
              >
                {/* Infos Produit */}
                <div className="flex-1 pr-3 min-w-0">
                  <h4 className="text-xs font-extrabold text-slate-900 truncate">{item.product.nom}</h4>
                  {item.unitLabel && (
                    <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md mt-0.5">
                      {item.unitLabel}
                    </span>
                  )}
                  <div className="text-xs font-black text-emerald-700 mt-1">
                    {formatAmount(item.prixReel)}
                  </div>
                </div>

                {/* Sélecteur de Quantité Aéré (Grands Boutons - / +) */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs p-1">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(idx, -1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center active:bg-slate-200 transition-colors"
                      aria-label="Diminuer quantité"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-xs font-extrabold text-slate-900">
                      {item.quantite}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(idx, 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center active:bg-slate-200 transition-colors"
                      aria-label="Augmenter quantité"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bouton Suppression */}
                  <button
                    type="button"
                    onClick={() => onRemoveLine(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                    aria-label="Supprimer article"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pied de Panier Fixe d'Encaissement */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3 shadow-lg shrink-0">
          <div className="flex items-center justify-between text-sm text-slate-600 font-semibold">
            <span>Total Net à Payer</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatAmount(totalAmount)}
            </span>
          </div>

          <button
            type="button"
            disabled={cart.length === 0 || disabled || hasExceededPlafond}
            onClick={() => {
              onClose();
              onProceedToCheckout();
            }}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition-transform active:scale-[0.99]"
          >
            <CreditCard className="w-5 h-5" />
            <span>Encaisser ({formatAmount(totalAmount)})</span>
          </button>
        </div>

      </div>
    </div>
  );
}
