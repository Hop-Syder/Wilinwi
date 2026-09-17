'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend Trésorerie & Caisses (Route: /tresorerie)
 *   Synthèse des soldes (Caisse, MTN MoMo, Moov, Wave, Banque + Total Consolidé),
 *   Structure à 2 Onglets (Registre des flux vs Transferts & Pointage),
 *   Modales de Saisie Dépenses OPEX, Virements neutres inter-comptes et Pointage MoMo.
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { Plus, ArrowRightLeft, Scale, RefreshCw, AlertTriangle, TrendingDown } from 'lucide-react';
import {
  CASH_ACCOUNT_LABELS,
  EXPENSE_CATEGORY_LABELS,
  type CashAccount,
  type ExpenseCategory,
} from '@wilinwi/types';
import { Button, Card } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { readCache, writeCache } from '@wilinwi/offline';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

import { TreasuryKpiCards } from '@/components/tresorerie/treasury-kpi-cards';
import { ExpenseModal } from '@/components/tresorerie/expense-modal';
import { InternalTransferModal } from '@/components/tresorerie/internal-transfer-modal';
import { ReconciliationModal } from '@/components/tresorerie/reconciliation-modal';
import { TreasuryMovementsTable, type CashMovementRow } from '@/components/tresorerie/treasury-movements-table';

type Balances = Record<CashAccount, number>;

interface TreasuryStats {
  balances: Balances;
  totalBalance: number;
  today: { entrees: number; sorties: number; net: number };
}

interface CashCloseRow {
  id: string;
  compte: CashAccount;
  soldeTheorique: number;
  soldeReel: number;
  ecart: number;
  note: string | null;
  closedBy: string;
  createdAt: string;
}

export default function TresoreriePage() {
  const { user } = useAuth();

  // Onglets Principaux (Tabs UI)
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'TRANSFERS_AND_CLOSES'>('REGISTER');

  // Données Trésorerie
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [movements, setMovements] = useState<CashMovementRow[]>([]);
  const [closes, setCloses] = useState<CashCloseRow[]>([]);

  // Modales
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-treso-kpis',
      title: 'Synthèse des Comptes & Liquidité',
      content: 'Consultez la liquidité en temps réel sur la Caisse Espèces, MTN MoMo, Moov Money, Wave et Banque.',
      position: 'bottom',
    },
    {
      targetId: 'tour-treso-tabs',
      title: 'Registre & Transferts Neutres',
      content: 'Basculez entre le registre quotidien des flux et l’historique des virements inter-comptes et pointages.',
      position: 'bottom',
    },
  ];

  const cacheKey = (suffix: string) => (user ? `${user.tenantId}:${user.userId}:${suffix}` : null);

  // Chargement des données (Stats, Mouvements, Clôtures)
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ck = cacheKey('treasury_data');

    try {
      if (ck) {
        const cached = await readCache<{
          stats: TreasuryStats;
          movements: CashMovementRow[];
          closes: CashCloseRow[];
        }>(ck);
        if (cached) {
          setStats(cached.stats);
          setMovements(cached.movements);
          setCloses(cached.closes);
          setLoading(false);
        }
      }

      const [s, m, c] = await Promise.all([
        apiGet<TreasuryStats>('/api/treasury/stats'),
        apiGet<CashMovementRow[]>('/api/treasury/movements'),
        apiGet<CashCloseRow[]>('/api/treasury/closes'),
      ]);
      setStats(s);
      setMovements(m);
      setCloses(c);
      if (ck) void writeCache(ck, { stats: s, movements: m, closes: c });
    } catch (e: any) {
      setError((e as ApiError).message || 'Erreur lors du chargement de la trésorerie');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Exportation CSV
  const handleExportCsv = () => {
    const header = ['Date', 'Compte', 'Flux', 'Catégorie', 'Motif', 'Montant (FCFA)'];
    const rows = movements.map((m) => [
      new Date(m.createdAt).toLocaleString('fr-FR'),
      CASH_ACCOUNT_LABELS[m.compte] || m.compte,
      m.source === 'TRANSFER' ? 'Transfert neutre' : m.type === 'IN' ? 'Entrée' : 'Dépense OPEX',
      m.categorie ? (EXPENSE_CATEGORY_LABELS[m.categorie as ExpenseCategory] || m.categorie) : '—',
      (m.note ?? '').replace(/"/g, '""'),
      `${m.type === 'IN' ? '+' : '-'}${m.montant}`,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tresorerie_wilinwi_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Traitement d'une Dépense OPEX
  const handleRecordExpense = async (dto: { compte: CashAccount; montant: number; categorie: ExpenseCategory; note?: string }) => {
    await apiPost('/api/treasury/expenses', dto);
    await loadData();
  };

  // Traitement d'un Apport de Capital
  const handleRecordCapitalInjection = async (dto: { compte: CashAccount; montant: number; note?: string }) => {
    await apiPost('/api/treasury/movements', {
      type: 'IN',
      compte: dto.compte,
      montant: dto.montant,
      source: 'OPENING',
      note: dto.note,
    });
    await loadData();
  };

  // Traitement d'un Transfert Inter-Comptes Neutre
  const handleTransfer = async (dto: { from: CashAccount; to: CashAccount; montant: number; note?: string }) => {
    await apiPost('/api/treasury/transfers', dto);
    await loadData();
  };

  // Traitement du Pointage / Clôture de Solde
  const handleRecordClose = async (dto: { compte: CashAccount; soldeReel: number; note?: string }) => {
    await apiPost('/api/treasury/close', dto);
    await loadData();
  };

  if (error && !stats) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-rose-600">
        <AlertTriangle className="h-8 w-8" />
        <p className="text-sm font-bold">{error}</p>
        <Button size="sm" onClick={() => void loadData()} className="bg-rose-600 text-white font-extrabold">
          Réessayer
        </Button>
      </div>
    );
  }

  const defaultBalances: Balances = { CAISSE: 0, MOBILE_MONEY: 0, BANQUE: 0 };
  const currentBalances = stats?.balances ?? defaultBalances;

  return (
    <div className="space-y-6 select-none relative pb-16">
      {/* En-tête de page avec Thème Rose Contextuel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-rose-950 font-display">
              Trésorerie & Caisses
            </h1>

            {/* Structure Onglets Principaux (Tabs UI) */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80" id="tour-treso-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('REGISTER')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'REGISTER'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                💸 Registre & Dépenses
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TRANSFERS_AND_CLOSES')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'TRANSFERS_AND_CLOSES'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🔄 Transferts & Pointage
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {activeTab === 'REGISTER'
              ? 'Suivi de la liquidité en temps réel et imputer des dépenses d’exploitation OPEX'
              : 'Transferts neutres entre caisse, MoMo et banque avec vérification de solde réel'}
          </p>
        </div>

        {/* Boutons d'Action Rapides */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <ContextualHelp
            storageKey="wilinwi_treso_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Contrôle de la Liquidité', description: 'Consultez instantanément les soldes réels de la Caisse, MTN MoMo, Wave et de la Banque.' },
              { title: 'Dépenses OPEX', description: 'Imputez les factures d’électricité SBEE, eau SONEB, loyer et salaires en 1 clic.' },
              { title: 'Virements Neutres Inter-Comptes', description: 'Déplacez de l’argent du compte MoMo vers le tiroir-caisse sans altérer le Chiffre d’Affaires.' },
            ]}
          />
          <Button
            onClick={() => setShowExpenseModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1" /> Saisir Dépense
          </Button>
          <Button
            onClick={() => setShowTransferModal(true)}
            variant="outline"
            className="bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-extrabold text-xs rounded-xl"
          >
            <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfert Neutre
          </Button>
          <Button
            onClick={() => setShowReconciliationModal(true)}
            variant="outline"
            className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-extrabold text-xs rounded-xl"
          >
            <Scale className="h-4 w-4 mr-1" /> Pointage Solde
          </Button>
        </div>
      </div>

      {/* Synthesis Top Cards */}
      <div id="tour-treso-kpis">
        <TreasuryKpiCards
          balances={currentBalances}
          totalBalance={stats?.totalBalance ?? 0}
          todayEntrees={stats?.today.entrees ?? 0}
          todaySorties={stats?.today.sorties ?? 0}
        />
      </div>

      {/* ONGLET 1 : REGISTRE DES MOUVEMENTS & DÉPENSES */}
      {activeTab === 'REGISTER' && (
        <div className="space-y-4">
          <TreasuryMovementsTable
            movements={movements}
            onExportCsv={handleExportCsv}
          />
        </div>
      )}

      {/* ONGLET 2 : TRANSFERTS INTER-COMPTES & HISTORIQUE DES POINTAGES */}
      {activeTab === 'TRANSFERS_AND_CLOSES' && (
        <div className="space-y-4">
          <Card className="p-4 border-slate-200/80 shadow-xs rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Historique des Pointages & Clôtures de Solde ({closes.length})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Réconciliation entre le solde théorique calculé par Wilinwi et le solde réel constaté
                </p>
              </div>
              <Button
                onClick={() => setShowReconciliationModal(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs"
              >
                <Scale className="h-3.5 w-3.5 mr-1" /> Nouveau Pointage
              </Button>
            </div>

            {closes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Aucun pointage ou clôture enregistré.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Compte</th>
                      <th className="p-3 text-right">Solde Théorique</th>
                      <th className="p-3 text-right">Solde Réel Constaté</th>
                      <th className="p-3 text-right">Écart</th>
                      <th className="p-3">Motif / Observation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {closes.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="p-3 whitespace-nowrap text-slate-600">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR')} {new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 whitespace-nowrap font-bold text-slate-800">
                          {CASH_ACCOUNT_LABELS[c.compte] || c.compte}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700">
                          {c.soldeTheorique.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                          {c.soldeReel.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold">
                          {c.ecart === 0 ? (
                            <span className="text-emerald-700">0 FCFA 🟢</span>
                          ) : c.ecart > 0 ? (
                            <span className="text-emerald-700">+{c.ecart.toLocaleString('fr-FR')} FCFA</span>
                          ) : (
                            <span className="text-rose-600">{c.ecart.toLocaleString('fr-FR')} FCFA 🔴</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">{c.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Floating Action Button (FAB) pour Saisie Rapide de Dépense sur Smartphone */}
      <div className="fixed bottom-6 right-6 z-30 sm:hidden">
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex items-center gap-2 rounded-full bg-rose-600 text-white font-extrabold px-4 py-3.5 shadow-2xl active:scale-95 transition-transform"
        >
          <TrendingDown className="h-5 w-5" />
          <span className="text-xs">+ Saisir Dépense</span>
        </button>
      </div>

      {/* Modale Saisie Dépense OPEX & Apports */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSubmitExpense={handleRecordExpense}
          onSubmitCapitalInjection={handleRecordCapitalInjection}
        />
      )}

      {/* Modale Virement Inter-Comptes Neutre */}
      {showTransferModal && (
        <InternalTransferModal
          onClose={() => setShowTransferModal(false)}
          onTransfer={handleTransfer}
          onRecordExpense={async (dto) => {
            await handleRecordExpense({
              compte: dto.compte,
              montant: dto.montant,
              categorie: dto.categorie,
              note: dto.note,
            });
          }}
        />
      )}

      {/* Modale Pointage Solde MoMo / Caisse */}
      {showReconciliationModal && (
        <ReconciliationModal
          balances={currentBalances}
          onClose={() => setShowReconciliationModal(false)}
          onSubmitClose={handleRecordClose}
        />
      )}
    </div>
  );
}
