/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Modal de Clôture de Session et Bilan d'Écart de Caisse au POS (pos-close-session-modal.tsx)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Calculator,
  X,
  CreditCard,
  Smartphone,
  Wallet,
  Coins,
  Receipt,
} from 'lucide-react';
import { Button, Badge, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost } from '@/lib/api';

interface PosCloseSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface TreasuryStatsResponse {
  balances: {
    CAISSE: number;
    MOBILE_MONEY: number;
    BANQUE: number;
  };
  totalBalance: number;
  today: {
    entrees: number;
    sorties: number;
    net: number;
  };
}

interface SaleItemSummary {
  paymentMethod: string;
  montantVerse: number;
  status: string;
}

const DENOMINATIONS = [
  { value: 10000, label: '10 000 FCFA' },
  { value: 5000, label: '5 000 FCFA' },
  { value: 2000, label: '2 000 FCFA' },
  { value: 1000, label: '1 000 FCFA' },
  { value: 500, label: '500 FCFA' },
  { value: 200, label: '200 FCFA' },
  { value: 100, label: '100 FCFA' },
  { value: 50, label: '50 FCFA' },
];

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function PosCloseSessionModal({ isOpen, onClose, onSuccess }: PosCloseSessionModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Comptage/Saisie, 2: Motif/Confirmation, 3: Bilan Z
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Données théoriques
  const [soldeTheorique, setSoldeTheorique] = useState(0);
  const [salesBreakdown, setSalesBreakdown] = useState({
    cash: 0,
    mobileMoney: 0,
    card: 0,
    credit: 0,
    totalSales: 0,
  });

  // Comptage physique
  const [counts, setCounts] = useState<Record<number, number>>({
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
  });
  const [manualSoldeReel, setManualSoldeReel] = useState<string>('');
  const [useManualInput, setUseManualInput] = useState(false);
  const [note, setNote] = useState('');

  // Résultat clôture effectuée
  const [closeResult, setCloseResult] = useState<{
    soldeTheorique: number;
    soldeReel: number;
    ecart: number;
    note?: string;
    closedAt: Date;
  } | null>(null);

  const resetState = () => {
    setStep(1);
    setErrorMsg(null);
    setSoldeTheorique(0);
    setSalesBreakdown({
      cash: 0,
      mobileMoney: 0,
      card: 0,
      credit: 0,
      totalSales: 0,
    });
    setCounts({
      10000: 0,
      5000: 0,
      2000: 0,
      1000: 0,
      500: 0,
      200: 0,
      100: 0,
      50: 0,
    });
    setManualSoldeReel('');
    setUseManualInput(false);
    setNote('');
    setCloseResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Charger le solde et les ventes du jour
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setErrorMsg(null);

    Promise.all([
      apiGet<TreasuryStatsResponse>('/api/treasury/stats').catch(() => null),
      apiGet<SaleItemSummary[]>('/api/pos/sales/today').catch(() => []),
    ])
      .then(([treasuryStats, todaySales]) => {
        if (treasuryStats) {
          setSoldeTheorique(treasuryStats.balances.CAISSE ?? 0);
        }

        if (Array.isArray(todaySales)) {
          let cash = 0;
          let mobileMoney = 0;
          let card = 0;
          let credit = 0;

          todaySales.forEach((sale) => {
            if (sale.status === 'CANCELLED') return;
            const method = (sale.paymentMethod || 'CASH').toUpperCase();
            const montant = sale.montantVerse ?? 0;

            if (method.includes('CASH') || method.includes('ESPECES')) {
              cash += montant;
            } else if (
              method.includes('MOBILE') ||
              method.includes('WAVE') ||
              method.includes('ORANGE') ||
              method.includes('MTN')
            ) {
              mobileMoney += montant;
            } else if (method.includes('CARD') || method.includes('BANQUE') || method.includes('CARTE')) {
              card += montant;
            } else if (method.includes('CREDIT')) {
              credit += montant;
            } else {
              cash += montant;
            }
          });

          setSalesBreakdown({
            cash,
            mobileMoney,
            card,
            credit,
            totalSales: cash + mobileMoney + card + credit,
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  // Calcul du solde réel à partir des coupures
  const calculatedSoldeReel = useMemo(() => {
    return Object.entries(counts).reduce(
      (sum, [value, qty]) => sum + Number(value) * (qty || 0),
      0,
    );
  }, [counts]);

  const soldeReelFinal = useMemo(() => {
    if (useManualInput) {
      return parsePositiveInteger(manualSoldeReel);
    }
    return calculatedSoldeReel;
  }, [useManualInput, manualSoldeReel, calculatedSoldeReel]);

  const ecart = useMemo(() => {
    return soldeReelFinal - soldeTheorique;
  }, [soldeReelFinal, soldeTheorique]);

  const handleQuantityChange = (denomValue: number, delta: number) => {
    setCounts((prev) => {
      const current = prev[denomValue] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [denomValue]: next };
    });
  };

  const handleCloseSessionSubmit = async () => {
    if (ecart !== 0 && !note.trim()) {
      setErrorMsg('Veuillez saisir un motif obligatoire pour expliquer l\'écart constaté.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiPost<{
        cashClose: { id: string };
        soldeTheorique: number;
        soldeReel: number;
        ecart: number;
      }>('/api/treasury/close', {
        compte: 'CAISSE',
        soldeReel: soldeReelFinal,
        note: note.trim() || undefined,
      });

      setCloseResult({
        soldeTheorique: res.soldeTheorique,
        soldeReel: res.soldeReel,
        ecart: res.ecart,
        note,
        closedAt: new Date(),
      });

      setStep(3); // Passer à l'affichage du Rapport Z
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la clôture de la session');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintZReport = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* En-tête de la Modale */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Clôture de Caisse (Session POS)</h2>
              <p className="text-xs text-slate-400">Comptage physique & Bilan Z de session</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fil d'Ariane des Étapes */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-brand font-bold' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">1</span>
            Comptage espèces
          </div>
          <div className="h-0.5 w-8 bg-slate-200" />
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-brand font-bold' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">2</span>
            Validation & Écart
          </div>
          <div className="h-0.5 w-8 bg-slate-200" />
          <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-brand font-bold' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">3</span>
            Rapport Z
          </div>
        </div>

        {/* Message d'erreur */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Corps principal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ÉTAPE 1 : Comptage des Coupures FCFA & Ventes Théoriques */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Synthèse Théorique */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Solde Théorique Caisse</span>
                    <Wallet className="w-4 h-4 text-brand" />
                  </div>
                  <p className="font-bold text-slate-900 text-lg">{formatFCFA(soldeTheorique)}</p>
                  <p className="text-[11px] text-slate-400">Fond de caisse + Ventes espèces</p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Total Ventes du Jour</span>
                    <Receipt className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="font-bold text-emerald-700 text-lg">{formatFCFA(salesBreakdown.totalSales)}</p>
                  <p className="text-[11px] text-slate-400">Tous modes de paiement confondus</p>
                </div>
              </div>

              {/* Mode de saisie : Calculatrice coupures vs Saisie directe */}
              <div className="flex items-center justify-between pt-2">
                <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-brand" />
                  Comptage physique des espèces
                </h3>
                <button
                  type="button"
                  onClick={() => setUseManualInput(!useManualInput)}
                  className="text-xs text-brand font-medium hover:underline"
                >
                  {useManualInput ? 'Utiliser la grille des billets' : 'Saisir le montant directement'}
                </button>
              </div>

              {!useManualInput ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {DENOMINATIONS.map((denom) => (
                    <div
                      key={denom.value}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="font-medium text-xs text-slate-800">{denom.label}</span>
                        <p className="text-[11px] font-bold text-slate-500">
                          = {formatFCFA(denom.value * (counts[denom.value] || 0))}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(denom.value, -1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 font-bold text-sm transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={counts[denom.value] || ''}
                          onChange={(e) =>
                            setCounts({
                              ...counts,
                            [denom.value]: parsePositiveInteger(e.target.value),
                            })
                          }
                          className="w-10 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-md py-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(denom.value, 1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 font-bold text-sm transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Montant total compté en caisse (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 150000"
                    value={manualSoldeReel}
                    onChange={(e) => setManualSoldeReel(e.target.value)}
                    className="w-full text-lg font-bold p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-brand focus:outline-none"
                  />
                </div>
              )}

              {/* Bilan en direct */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Total Espèces Compté</span>
                  <p className="font-extrabold text-xl text-emerald-400">{formatFCFA(soldeReelFinal)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Écart projeté</span>
                  <p
                    className={`font-bold text-sm ${
                      ecart === 0 ? 'text-emerald-400' : ecart > 0 ? 'text-blue-400' : 'text-red-400'
                    }`}
                  >
                    {ecart > 0 ? `+${formatFCFA(ecart)}` : formatFCFA(ecart)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : Validation & Saisie du Motif obligatoire si Écart */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Carte Bilan Comparatif */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Solde Théorique Caisse</span>
                  <span className="font-bold text-slate-900">{formatFCFA(soldeTheorique)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Solde Réel Compté</span>
                  <span className="font-bold text-slate-900">{formatFCFA(soldeReelFinal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="font-bold text-slate-800">Écart Final Constaté</span>
                  <Badge
                    tone={ecart === 0 ? 'success' : ecart > 0 ? 'brand' : 'danger'}
                    className="text-xs py-1 px-2.5 font-bold"
                  >
                    {ecart === 0
                      ? 'Solde Exact (0 FCFA)'
                      : ecart > 0
                      ? `Excédent (+${formatFCFA(ecart)})`
                      : `Déficit (${formatFCFA(ecart)})`}
                  </Badge>
                </div>
              </div>

              {/* Champ motif si Écart */}
              {ecart !== 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Motif obligatoire de l'écart ({ecart > 0 ? 'Excédent' : 'Déficit'})
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Expliquez la cause de l'écart (ex: erreur de rendu de monnaie, billet découpé refusé par la banque...)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full text-xs p-2.5 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Répartition Ventes du Jour */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
                  Ventes de la journée par moyen de paiement
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-slate-500" /> Espèces
                    </span>
                    <span className="font-bold text-slate-900">{formatFCFA(salesBreakdown.cash)}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-brand" /> Mobile Money
                    </span>
                    <span className="font-bold text-slate-900">{formatFCFA(salesBreakdown.mobileMoney)}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Carte / Banque
                    </span>
                    <span className="font-bold text-slate-900">{formatFCFA(salesBreakdown.card)}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" /> Crédit Client
                    </span>
                    <span className="font-bold text-slate-900">{formatFCFA(salesBreakdown.credit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : Affichage du Ticket Z de Clôture (Imprimable) */}
          {step === 3 && closeResult && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-emerald-900 text-sm">Session de Caisse Clôturée avec Succès</h3>
                <p className="text-xs text-emerald-700">Le solde théorique de la caisse a été mis à jour.</p>
              </div>

              {/* Fiche Ticket Z */}
              <div className="p-5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-800 space-y-3 shadow-inner print:shadow-none print:border-none print:p-0">
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <p className="font-bold text-sm tracking-wider uppercase">Wilinwi — Ticket Z de Clôture</p>
                  <p className="text-[10px] text-slate-500">
                    Date : {closeResult.closedAt.toLocaleDateString()} {closeResult.closedAt.toLocaleTimeString()}
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>Ventes Espèces :</span>
                    <span className="font-bold">{formatFCFA(salesBreakdown.cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventes Mobile Money :</span>
                    <span className="font-bold">{formatFCFA(salesBreakdown.mobileMoney)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventes Carte / Banque :</span>
                    <span className="font-bold">{formatFCFA(salesBreakdown.card)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventes à Crédit :</span>
                    <span className="font-bold">{formatFCFA(salesBreakdown.credit)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                    <span>TOTAL VENTES :</span>
                    <span>{formatFCFA(salesBreakdown.totalSales)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-slate-300 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>Solde Théorique :</span>
                    <span>{formatFCFA(closeResult.soldeTheorique)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Solde Réel Compté :</span>
                    <span className="font-bold">{formatFCFA(closeResult.soldeReel)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Écart Constaté :</span>
                    <span className={closeResult.ecart === 0 ? 'text-emerald-700' : 'text-red-600'}>
                      {closeResult.ecart > 0 ? `+${formatFCFA(closeResult.ecart)}` : formatFCFA(closeResult.ecart)}
                    </span>
                  </div>
                  {closeResult.note && (
                    <div className="pt-1 text-[10px] text-slate-600 italic">
                      Motif : {closeResult.note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de Modale & Boutons d'Action */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step === 1 && (
            <>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" onClick={() => setStep(2)}>
                Vérifier l'Écart
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep(1)} disabled={isLoading}>
                Retour au comptage
              </Button>
              <Button
                variant="emerald"
                size="sm"
                onClick={handleCloseSessionSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Clôture en cours...' : 'Valider & Clôturer la Session'}
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrintZReport}>
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimer le Ticket Z
              </Button>

              <Button variant="primary" size="sm" onClick={handleClose}>
                Terminer & Fermer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
