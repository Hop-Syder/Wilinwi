'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page de gestion des retours partiels et des avoirs (POS)
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, CardContent } from '@wilinwi/ui';
import { ArrowLeft, Search, CheckCircle2, RotateCcw, CreditCard, Banknote } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

interface SaleItemDto {
  id: string;
  productId: string;
  productName: string;
  quantite: number;
  quantiteRetournee?: number;
  prixReel: number;
}

interface SaleDto {
  id: string;
  status: string;
  total: number;
  clientId?: string;
  items: SaleItemDto[];
  paymentMethod: string;
}

export default function PosReturnsPage() {
  const router = useRouter();
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sale, setSale] = useState<SaleDto | null>(null);
  
  // { saleItemId: quantiteRetournee }
  const [returns, setReturns] = useState<Record<string, number>>({});
  const [action, setAction] = useState<'REFUND_CASH' | 'CREATE_CREDIT'>('REFUND_CASH');
  const [success, setSuccess] = useState(false);

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    setError('');
    setSale(null);
    setReturns({});
    setSuccess(false);

    try {
      // Pour une vraie app, on a besoin d'un endpoint pour fetch une seule vente, 
      // ou on récupère la liste et on filtre
      const sales = await apiGet<SaleDto[]>('/api/pos/sales');
      const found = sales.find(s => s.id.startsWith(searchId) || s.id === searchId);
      
      if (!found) {
        setError("Vente introuvable avec cet ID");
      } else if (found.status !== 'COMPLETED') {
        setError("Cette vente n'est pas finalisée ou est déjà annulée.");
      } else {
        setSale(found);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnAmountChange = (itemId: string, val: number, maxAllowed: number) => {
    if (val < 0) val = 0;
    if (val > maxAllowed) val = maxAllowed;
    
    setReturns(prev => ({ ...prev, [itemId]: val }));
  };

  const totalRefund = sale?.items.reduce((sum, item) => {
    const qty = returns[item.id] || 0;
    return sum + (qty * item.prixReel);
  }, 0) || 0;

  const handleSubmit = async () => {
    if (!sale) return;
    
    const returnPayload = Object.entries(returns)
      .filter(([_, qty]) => qty > 0)
      .map(([saleItemId, quantiteRetournee]) => ({ saleItemId, quantiteRetournee }));

    if (returnPayload.length === 0) {
      setError("Sélectionnez au moins un article à retourner.");
      return;
    }

    if (action === 'CREATE_CREDIT' && !sale.clientId) {
      setError("Impossible de créer un avoir : aucun client n'est associé à cette vente.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiPost(`/api/pos/sales/${sale.id}/return`, {
        returns: returnPayload,
        action
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors du traitement du retour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/pos')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-xl font-bold text-slate-900">Retours & Avoirs</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          
          {/* RECHERCHE */}
          <Card>
            <CardHeader>
              <CardTitle>Rechercher une vente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input 
                    placeholder="Entrez l'ID de la vente (ex: 4a2b...)" 
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading} className="w-32">
                  {loading ? 'Recherche...' : <><Search className="mr-2 h-4 w-4" /> Chercher</>}
                </Button>
              </div>
              {error && <p className="mt-3 text-sm text-red-500 font-medium">{error}</p>}
            </CardContent>
          </Card>

          {/* SUCCÈS */}
          {success && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />
              <h3 className="text-lg font-bold text-green-900">Retour traité avec succès !</h3>
              <p className="text-green-700 mt-1">Le stock a été mis à jour et {action === 'CREATE_CREDIT' ? "l'avoir a été crédité au client" : "le remboursement est enregistré"}.</p>
              <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={() => {
                setSuccess(false);
                setSale(null);
                setSearchId('');
                setReturns({});
              }}>
                Nouveau retour
              </Button>
            </div>
          )}

          {/* DETAILS VENTE */}
          {sale && !success && (
            <Card className="animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Détails de la Vente <span className="text-slate-500 font-mono text-sm ml-2">#{sale.id.slice(0, 8)}</span></CardTitle>
                    {sale.clientId && <Badge variant="outline" className="mt-2 border-brand/20 bg-brand/5 text-brand">Client rattaché</Badge>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 mb-1">Montant Total</p>
                    <p className="text-2xl font-bold text-slate-900">{sale.total} FCFA</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                    <div className="col-span-5">Article</div>
                    <div className="col-span-2 text-center">Vendu</div>
                    <div className="col-span-2 text-center">Déjà Retourné</div>
                    <div className="col-span-3 text-right">A Retourner</div>
                  </div>

                  {sale.items.map(item => {
                    const prevReturned = item.quantiteRetournee || 0;
                    const maxAllowed = item.quantite - prevReturned;
                    const currentRet = returns[item.id] || 0;
                    
                    return (
                      <div key={item.id} className="grid grid-cols-12 gap-4 items-center rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                        <div className="col-span-5 font-medium text-slate-900">{item.productName || 'Produit'}</div>
                        <div className="col-span-2 text-center text-slate-600">{item.quantite}</div>
                        <div className="col-span-2 text-center text-amber-600 font-medium">{prevReturned > 0 ? prevReturned : '-'}</div>
                        <div className="col-span-3 flex justify-end">
                          <div className="flex items-center gap-2 max-w-[120px]">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 shrink-0 rounded-full"
                              disabled={currentRet <= 0}
                              onClick={() => handleReturnAmountChange(item.id, currentRet - 1, maxAllowed)}
                            >-</Button>
                            <span className="w-8 text-center font-bold">{currentRet}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 shrink-0 rounded-full"
                              disabled={currentRet >= maxAllowed}
                              onClick={() => handleReturnAmountChange(item.id, currentRet + 1, maxAllowed)}
                            >+</Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-2xl bg-slate-100 p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-3 flex-1 w-full">
                      <label className="text-sm font-semibold text-slate-700">Méthode de compensation</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${action === 'REFUND_CASH' ? 'border-brand bg-white shadow-sm' : 'border-transparent bg-slate-200/50 hover:bg-slate-200'}`}>
                          <input 
                            type="radio" 
                            name="action" 
                            className="sr-only" 
                            checked={action === 'REFUND_CASH'} 
                            onChange={() => setAction('REFUND_CASH')} 
                          />
                          <Banknote className={`h-5 w-5 ${action === 'REFUND_CASH' ? 'text-brand' : 'text-slate-400'}`} />
                          <span className={`font-medium ${action === 'REFUND_CASH' ? 'text-slate-900' : 'text-slate-600'}`}>Remboursement</span>
                        </label>
                        
                        <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${!sale.clientId ? 'opacity-50 cursor-not-allowed' : action === 'CREATE_CREDIT' ? 'border-brand bg-white shadow-sm' : 'border-transparent bg-slate-200/50 hover:bg-slate-200'}`}>
                          <input 
                            type="radio" 
                            name="action" 
                            className="sr-only" 
                            disabled={!sale.clientId}
                            checked={action === 'CREATE_CREDIT'} 
                            onChange={() => setAction('CREATE_CREDIT')} 
                          />
                          <CreditCard className={`h-5 w-5 ${action === 'CREATE_CREDIT' ? 'text-brand' : 'text-slate-400'}`} />
                          <span className={`font-medium ${action === 'CREATE_CREDIT' ? 'text-slate-900' : 'text-slate-600'}`}>Avoir Client</span>
                        </label>
                      </div>
                      {!sale.clientId && <p className="text-xs text-amber-600 font-medium mt-1">L'avoir nécessite un client rattaché.</p>}
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-slate-500 mb-1">Montant à {action === 'REFUND_CASH' ? 'Rembourser' : 'Créditer'}</p>
                      <p className="text-3xl font-bold text-brand">{totalRefund} FCFA</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto"
                      disabled={totalRefund === 0 || loading}
                      onClick={handleSubmit}
                    >
                      {loading ? 'Traitement...' : <><RotateCcw className="mr-2 h-5 w-5" /> Confirmer le Retour</>}
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
