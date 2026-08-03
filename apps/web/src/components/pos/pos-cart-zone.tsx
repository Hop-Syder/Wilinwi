/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Zone Panier & Gestion Client POS (Axe 3 : Panier Persistant 1/3, Crédit Client & Mode Commande)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useMemo, useState } from 'react';
import {
  ShoppingCart, Trash2, Plus, Minus, UserCheck, AlertTriangle,
  CreditCard, ChevronRight, UserPlus, X, Store, ShoppingBag, Truck
} from 'lucide-react';
import type { ProductDto, ClientDto } from '@wilinwi/types';
import { Button, formatFCFA, formatQty } from '@wilinwi/ui';

export interface CartLine {
  product: ProductDto;
  variantId?: string;
  variantLabel?: string;
  unitId?: string;
  unitLabel?: string;
  unitFactor?: number;
  quantite: number;
  prixReel: number;
}

export type OrderMode = 'SUR_PLACE' | 'A_EMPORTER' | 'LIVRAISON';

interface PosCartZoneProps {
  cart: CartLine[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveLine: (index: number) => void;
  onClearCart: () => void;
  clients: ClientDto[];
  selectedClient: ClientDto | null;
  onSelectClient: (client: ClientDto | null) => void;
  orderMode: OrderMode;
  onOrderModeChange: (mode: OrderMode) => void;
  onCheckout: () => void;
  disabled?: boolean;
}

export function PosCartZone({
  cart,
  onUpdateQuantity,
  onRemoveLine,
  onClearCart,
  clients,
  selectedClient,
  onSelectClient,
  orderMode,
  onOrderModeChange,
  onCheckout,
  disabled,
}: PosCartZoneProps) {
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Calcul du sous-total du panier
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.prixReel * line.quantite, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.quantite, 0);
  }, [cart]);

  // Filtrage recherche client (Nom ou Téléphone)
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 5);
    const q = clientSearch.toLowerCase().trim();
    return clients.filter(
      (c) => c.nom.toLowerCase().includes(q) || c.telephone?.includes(q)
    ).slice(0, 6);
  }, [clients, clientSearch]);

  // Alerte Crédit Client
  const clientSolde = selectedClient?.soldeCredit ?? 0;
  const clientPlafond = selectedClient?.plafondCredit ?? 0;
  const hasExceededPlafond = clientPlafond > 0 && clientSolde + totalAmount > clientPlafond;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* En-tête du Panier */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white font-bold">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Panier en cours</h2>
            <p className="text-[11px] font-semibold text-slate-400">
              {totalItemsCount} article{totalItemsCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-all"
            title="Vider le panier (Échap)"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Vider</span>
          </button>
        )}
      </div>

      {/* Barre Sélection Client & Alerte Crédit (F4) */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/40">
        <div className="relative">
          {selectedClient ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{selectedClient.nom}</p>
                  <p className="text-[10px] font-medium text-slate-500 truncate">
                    {selectedClient.telephone || 'Aucun numéro'} • Solde: <strong className={clientSolde > 0 ? 'text-amber-700' : 'text-slate-700'}>{formatFCFA(clientSolde)}</strong>
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
                  placeholder="Client (F4) — Nom ou téléphone..."
                  value={clientSearch}
                  onFocus={() => setShowClientDropdown(true)}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Menu déroulant des clients */}
              {showClientDropdown && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectClient(c);
                        setShowClientDropdown(false);
                        setClientSearch('');
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{c.nom}</p>
                        <p className="text-[10px] text-slate-400">{c.telephone || 'Sans tél'}</p>
                      </div>
                      {c.plafondCredit && c.plafondCredit > 0 ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                          Crédit max: {formatFCFA(c.plafondCredit)}
                        </span>
                      ) : null}
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400 font-medium">
                      Aucun client trouvé.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Encadré d'alerte en cas de Vente à Crédit / Dépassement du Plafond */}
        {selectedClient && hasExceededPlafond && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-extrabold">Attention : Plafond de crédit dépassé !</p>
              <p className="text-[11px] text-rose-700">
                Plafond autorisé: {formatFCFA(clientPlafond)} • Nouveau solde théorique: {formatFCFA(clientSolde + totalAmount)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mode de Commande (Sur place, À emporter, En livraison) */}
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/20">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onOrderModeChange('SUR_PLACE')}
            className={`flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-extrabold transition-all ${
              orderMode === 'SUR_PLACE'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            <span>Sur place</span>
          </button>

          <button
            type="button"
            onClick={() => onOrderModeChange('A_EMPORTER')}
            className={`flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-extrabold transition-all ${
              orderMode === 'A_EMPORTER'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>À emporter</span>
          </button>

          <button
            type="button"
            onClick={() => onOrderModeChange('LIVRAISON')}
            className={`flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-extrabold transition-all ${
              orderMode === 'LIVRAISON'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Livraison</span>
          </button>
        </div>
      </div>

      {/* Liste des Articles du Panier */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.map((line, idx) => (
          <div
            key={`${line.product.id}-${line.variantId || ''}-${line.unitId || ''}-${idx}`}
            className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition-all"
          >
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-900 truncate">{line.product.nom}</p>
              {line.variantLabel && (
                <p className="text-[10px] font-semibold text-emerald-600">{line.variantLabel}</p>
              )}
              <p className="font-mono text-xs font-black text-slate-700">
                {formatFCFA(line.prixReel)}
              </p>
            </div>

            {/* Ingrément/Décrément Tactile direct [ - ] [ Qté ] [ + ] */}
            <div className="flex items-center gap-1">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(idx, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center font-mono text-xs font-extrabold text-slate-900">
                  {formatQty(line.quantite)}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(idx, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onRemoveLine(idx)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Supprimer la ligne"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
            <ShoppingCart className="h-10 w-10 text-slate-200 mb-2" />
            <p className="text-xs font-bold text-slate-600">Le panier est vide</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cliquez sur un article du catalogue pour l'ajouter.</p>
          </div>
        )}
      </div>

      {/* Pied de Panier & Grand Bouton d'Encaissement (Entrée/Espace) */}
      <div className="p-4 border-t border-slate-200 bg-slate-900 text-white space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total à payer</span>
          <span className="font-mono text-2xl font-black text-emerald-400 tracking-tight">
            {formatFCFA(totalAmount)}
          </span>
        </div>

        <Button
          variant="emerald"
          size="lg"
          disabled={disabled || cart.length === 0}
          onClick={onCheckout}
          className="w-full py-4 text-base font-extrabold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <span>ENCAISSER (Entrée)</span>
          <ChevronRight className="h-5 w-5 stroke-[3]" />
        </Button>
      </div>
    </div>
  );
}
