/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Tiroir/Modale de suivi de synchronisation offline (SyncStatusDrawer)
 * @created 2026-08-01
 * @updated 2026-08-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  RefreshCw,
  ShoppingCart,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button, Badge, formatFCFA } from '@wilinwi/ui';
import { syncEngine } from '@/lib/sync';
import { getDB, type PendingSale } from '@wilinwi/offline';

interface SyncStatusDrawerProps {
  onRefreshProducts?: () => void;
  onFixSale?: (sale: PendingSale) => void;
}

export function SyncStatusDrawer({ onRefreshProducts, onFixSale }: SyncStatusDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingList, setPendingList] = useState<PendingSale[]>([]);
  const [rejectedList, setRejectedList] = useState<PendingSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'rejected'>('pending');

  const loadSales = useCallback(async () => {
    try {
      const [failedSales, rejectedSales, pendingSales] = await Promise.all([
        syncEngine.failedSales(),
        syncEngine.rejectedSales(),
        getDB().pendingSales.where('status').anyOf('pending', 'syncing').toArray(),
      ]);

      setPendingList(pendingSales);
      setRejectedList([...failedSales, ...rejectedSales]);
    } catch {
      /* ignore SSR / storage errors */
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      void triggerFlush();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void loadSales();
    const interval = setInterval(loadSales, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [loadSales]);

  const triggerFlush = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncEngine.flush();
      if (onRefreshProducts) onRefreshProducts();
    } finally {
      setIsSyncing(false);
      await loadSales();
    }
  };

  const handleDiscard = async (id: string) => {
    await syncEngine.discard(id);
    await loadSales();
    if (onRefreshProducts) onRefreshProducts();
  };

  const handleFix = (sale: PendingSale) => {
    if (onFixSale) {
      onFixSale(sale);
      setIsOpen(false);
    }
  };

  const pendingCount = pendingList.length;
  const rejectedCount = rejectedList.length;
  const totalIssueCount = pendingCount + rejectedCount;

  return (
    <>
      {/* Bouton Indicateur dans le Header POS */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          rejectedCount > 0
            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 animate-pulse'
            : pendingCount > 0
            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            : isOnline
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            : 'bg-gray-100 border-gray-300 text-gray-700'
        }`}
      >
        {!isOnline ? (
          <WifiOff className="w-3.5 h-3.5 text-gray-500" />
        ) : isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
        ) : (
          <Wifi className="w-3.5 h-3.5" />
        )}

        <span>
          {!isOnline
            ? 'Hors-ligne'
            : isSyncing
            ? 'Synchro...'
            : rejectedCount > 0
            ? `${rejectedCount} échec(s)`
            : pendingCount > 0
            ? `${pendingCount} en attente`
            : 'En ligne'}
        </span>

        {totalIssueCount > 0 && (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              rejectedCount > 0 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
            }`}
          >
            {totalIssueCount}
          </span>
        )}
      </button>

      {/* Modal / Tiroir de Suivi des Ventes Offline */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header du Tiroir */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <div>
                  <h3 className="font-semibold text-sm">File de Synchronisation</h3>
                  <p className="text-xs text-slate-300">
                    {isOnline ? '🟢 Connecté au serveur' : '🔴 Mode hors-ligne actif'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header Actions */}
            <div className="p-3 bg-slate-50 border-b flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-white shadow text-slate-900 border'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  En attente ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rejected')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'rejected'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  Échecs ({rejectedCount})
                </button>
              </div>

              {isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={triggerFlush}
                  disabled={isSyncing}
                  className="text-xs py-1 h-8"
                >
                  <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  Tout synchroniser
                </Button>
              )}
            </div>

            {/* Contenu de la Liste */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeTab === 'pending' && (
                <>
                  {pendingList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 stroke-[1.5]" />
                      <p className="text-sm font-medium text-slate-700">Toutes les ventes sont synchronisées !</p>
                      <p className="text-xs">Aucune vente en attente dans IndexedDB.</p>
                    </div>
                  ) : (
                    pendingList.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-3.5 border rounded-xl bg-white shadow-sm space-y-2 relative"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-500 text-[11px]">
                            ID: {sale.id.slice(0, 8)}...
                          </span>
                          <span className="text-slate-400">
                            {new Date(sale.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {formatFCFA(sale.payload.items.reduce((sum, item) => sum + item.prixReel * item.quantite, 0))}
                            </p>
                            <p className="text-xs text-slate-500">
                              {sale.payload.items.reduce((sum, item) => sum + item.quantite, 0)} articles • {sale.payload.paymentMethod}
                            </p>
                          </div>
                          <Badge variant="warning" className="text-[10px]">
                            {sale.status === 'syncing' ? 'Synchronisation...' : 'En attente'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {activeTab === 'rejected' && (
                <>
                  {rejectedList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 stroke-[1.5]" />
                      <p className="text-sm font-medium text-slate-700">Aucun échec de synchronisation</p>
                      <p className="text-xs">Le serveur a validé toutes les opérations envoyées.</p>
                    </div>
                  ) : (
                    rejectedList.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-3.5 border border-red-200 rounded-xl bg-red-50/50 shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-red-600 font-medium text-[11px]">
                            ID: {sale.id.slice(0, 8)}...
                          </span>
                          <Badge variant="danger" className="text-[10px]">
                            {sale.status === 'rejected' ? 'Refus définitif' : 'Erreur réseau'}
                          </Badge>
                        </div>

                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {formatFCFA(sale.payload.items.reduce((sum, item) => sum + item.prixReel * item.quantite, 0))}
                          </p>
                          {sale.error && (
                            <div className="mt-1.5 p-2 bg-red-100/80 rounded-md text-xs text-red-800 flex items-start gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                              <span>{sale.error}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-100">
                          <button
                            type="button"
                            onClick={() => void handleDiscard(sale.id)}
                            className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 rounded-md transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Écarter
                          </button>
                          {onFixSale && (
                            <button
                              type="button"
                              onClick={() => handleFix(sale)}
                              className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors flex items-center gap-1"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              Recharger au panier
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Footer Informations */}
            <div className="p-3 border-t bg-slate-50 text-[11px] text-slate-500 text-center">
              Les ventes refusées par le serveur ne sont pas réessayées automatiquement.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
