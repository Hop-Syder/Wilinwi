'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Trésorerie refonte — Journal financier complet : KPIs, virements, filtres avancés, clôtures, export CSV.
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  Smartphone,
  Landmark,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ArrowUpCircle,
  Lock,
  Plus,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  CASH_ACCOUNTS,
  CASH_ACCOUNT_LABELS,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type CashAccount,
} from '@wilinwi/types';
import { Button, Card, Badge, StatCard, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { readCache, writeCache } from '@wilinwi/offline';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

// ─── Types ───────────────────────────────────────────────────────────────────

type Balances = Record<CashAccount, number>;

interface TreasuryStats {
  balances: Balances;
  totalBalance: number;
  today: { entrees: number; sorties: number; net: number };
}

interface Movement {
  id: string;
  type: 'IN' | 'OUT';
  compte: CashAccount;
  montant: number;
  source: string;
  categorie: string | null;
  note: string | null;
  createdAt: string;
  soldeApres: number;
}

interface CashClose {
  id: string;
  compte: CashAccount;
  soldeTheorique: number;
  soldeReel: number;
  ecart: number;
  note: string | null;
  closedBy: string;
  createdAt: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  SALE: 'Vente',
  REPAYMENT: 'Remboursement',
  EXPENSE: 'Dépense',
  TRANSFER: 'Virement',
  ADJUSTMENT: 'Ajustement',
  OPENING: 'Ouverture de caisse',
};

const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS);

const PERIOD_OPTIONS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7days', label: '7 derniers jours' },
  { value: 'month', label: 'Ce mois' },
  { value: 'custom', label: 'Personnalisé' },
];

const ACCOUNT_ICON: Partial<Record<CashAccount, React.ElementType>> = {
  CAISSE: Wallet,
  MOBILE_MONEY: Smartphone,
  BANQUE: Landmark,
};

function getDateRange(period: string): { from?: string; to?: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  if (period === 'today') return { from: fmt(today), to: fmt(today) };
  if (period === '7days') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { from: fmt(d), to: fmt(today) };
  }
  if (period === 'month') {
    return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(today) };
  }
  return {};
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function TresoreriePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [closes, setCloses] = useState<CashClose[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionTab, setActionTab] = useState<'expense' | 'transfer' | 'adjustment' | 'close'>('expense');
  const [showCloses, setShowCloses] = useState(false);

  // Filtres
  const [filterCompte, setFilterCompte] = useState<CashAccount | ''>('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('today');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-treso-kpis',
      title: 'Tableau de bord financier',
      content: 'Visualisez vos soldes en temps réel (Caisse, MTN MoMo, Moov Money, Banque) et le résultat de la journée.',
      position: 'bottom',
    },
    {
      targetId: 'tour-treso-actions',
      title: 'Opérations financières',
      content: 'Enregistrez dépenses, virements entre comptes, ajustements de solde, et effectuez la clôture de caisse.',
      position: 'right',
    },
    {
      targetId: 'tour-treso-history',
      title: 'Journal filtrable',
      content: 'Filtrez par compte, type d\'opération et période. La colonne "Solde après" permet de retracer l\'historique.',
      position: 'left',
    },
  ];

  const buildMovementQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filterCompte) params.set('compte', filterCompte);
    if (filterSource) params.set('source', filterSource);
    const range = filterPeriod === 'custom' ? { from: filterFrom, to: filterTo } : getDateRange(filterPeriod);
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    return params.toString() ? `?${params.toString()}` : '';
  }, [filterCompte, filterSource, filterPeriod, filterFrom, filterTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = buildMovementQuery();
    // Cache local (stale-while-revalidate) clé par filtres → affichage instantané.
    const ck = user ? `${user.tenantId}:${user.userId}:treasury${query}` : null;
    try {
      if (ck) {
        const cached = await readCache<{
          stats: TreasuryStats;
          movements: Movement[];
          closes: CashClose[];
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
        apiGet<Movement[]>(`/api/treasury/movements${query}`),
        apiGet<CashClose[]>('/api/treasury/closes'),
      ]);
      setStats(s);
      setMovements(m);
      setCloses(c);
      if (ck) void writeCache(ck, { stats: s, movements: m, closes: c });
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  }, [buildMovementQuery, user]);

  useEffect(() => {
    void load();
  }, [load]);

  function exportCsv() {
    const header = ['Date', 'Compte', 'Libellé', 'Source', 'Montant', 'Solde après'];
    const rows = movements.map((m) => [
      new Date(m.createdAt).toLocaleDateString('fr-FR'),
      CASH_ACCOUNT_LABELS[m.compte],
      m.categorie ? (EXPENSE_CATEGORY_LABELS[m.categorie as keyof typeof EXPENSE_CATEGORY_LABELS] ?? m.categorie) : (SOURCE_LABELS[m.source] ?? m.source),
      m.note ?? '',
      `${m.type === 'IN' ? '+' : '-'}${m.montant}`,
      m.soldeApres.toString(),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tresorerie_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-red-600">
        <AlertTriangle className="h-8 w-8" />
        <p className="text-sm">{error}</p>
        <button onClick={() => void load()} className="text-xs text-brand underline">
          Réessayer
        </button>
      </div>
    );
  }

  const totalBalance = stats?.totalBalance ?? 0;
  const todayNet = stats?.today.net ?? 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Trésorerie</h1>
          <p className="mt-1 text-sm text-slate-500">Journal financier · Virements · Clôtures</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser
          </button>
          <ContextualHelp
            storageKey="wilinwi_treso_tour_done"
            tourSteps={tourSteps}
            useCases={[
              {
                title: 'Enregistrer une dépense',
                description: 'Onglet "Dépense" → choisissez le compte, la catégorie et le montant. Exemple : payer le loyer depuis la Caisse.',
              },
              {
                title: 'Qui décaisse la caisse',
                description: 'Les sorties d\'espèces (compte Caisse) peuvent être faites par le caissier en plus du gérant et du propriétaire. Mobile Money et Banque restent réservés au gérant/propriétaire.',
              },
              {
                title: 'Trésorerie par boutique',
                description: 'Soldes, dépenses et clôtures sont propres à l\'établissement sélectionné en haut. Choisissez la boutique avant d\'enregistrer une opération.',
              },
              {
                title: 'Virer l\'argent de la caisse en banque',
                description: 'Onglet "Virement" → Source : Caisse, Destination : Banque, montant. Le solde est vérifié avant l\'envoi.',
              },
              {
                title: 'Clôturer la caisse le soir',
                description: 'Onglet "Clôture" → comptez l\'argent dans le tiroir, entrez le montant. En cas d\'écart, un motif vous sera demandé.',
              },
            ]}
          />
        </div>
      </div>

      {/* KPIs soldes + résultat journalier */}
      <div id="tour-treso-kpis" className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CASH_ACCOUNTS.map((acc) => {
            const Icon = (ACCOUNT_ICON[acc] ?? Wallet) as React.ElementType;
            const bal = stats?.balances[acc] ?? 0;
            const accents: Record<string, 'emerald' | 'gold' | 'brand' | 'red'> = {
              CAISSE: 'emerald',
              MOBILE_MONEY: 'gold',
              BANQUE: 'red',
            };
            return (
              <StatCard
                key={acc}
                label={CASH_ACCOUNT_LABELS[acc]}
                value={loading ? '…' : formatFCFA(bal)}
                icon={<Icon className="h-5 w-5" />}
                accent={accents[acc]}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">Total consolidé</p>
            <p className="font-display text-xl font-bold text-slate-800">
              {loading ? '…' : formatFCFA(totalBalance)}
            </p>
          </div>
          <div className="col-span-1 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs text-emerald-700">Entrées du jour</p>
            <p className="font-display text-xl font-bold text-emerald-700">
              {loading ? '…' : `+${formatFCFA(stats?.today.entrees ?? 0)}`}
            </p>
          </div>
          <div className="col-span-1 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs text-red-700">Sorties du jour</p>
            <p className="font-display text-xl font-bold text-red-700">
              {loading ? '…' : `−${formatFCFA(stats?.today.sorties ?? 0)}`}
            </p>
          </div>
          <div
            className={`col-span-1 rounded-xl border px-4 py-3 ${
              todayNet >= 0
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-amber-100 bg-amber-50'
            }`}
          >
            <p className={`text-xs ${todayNet >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              Net du jour
            </p>
            <p
              className={`font-display text-xl font-bold ${todayNet >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}
            >
              {loading ? '…' : `${todayNet >= 0 ? '+' : ''}${formatFCFA(todayNet)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Grille principale : Actions | Journal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        {/* Panneau d'actions */}
        <div id="tour-treso-actions" className="space-y-3">
          {/* Onglets */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { key: 'expense', label: 'Dépense', icon: ArrowUpCircle },
                { key: 'transfer', label: 'Virement', icon: ArrowRightLeft },
                { key: 'adjustment', label: 'Ajustement', icon: Plus },
                { key: 'close', label: 'Clôture', icon: Lock },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActionTab(key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                  actionTab === key
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {actionTab === 'expense' && (
            <ExpenseForm balances={stats?.balances ?? null} onDone={() => void load()} />
          )}
          {actionTab === 'transfer' && (
            <TransferForm balances={stats?.balances ?? null} onDone={() => void load()} />
          )}
          {actionTab === 'adjustment' && (
            <AdjustmentForm onDone={() => void load()} />
          )}
          {actionTab === 'close' && (
            <CashCloseForm balances={stats?.balances ?? null} onDone={() => void load()} />
          )}
        </div>

        {/* Journal des mouvements */}
        <div id="tour-treso-history" className="space-y-3">
          {/* Filtres */}
          <Card className="p-3">
            <div className="flex flex-wrap items-end gap-2">
              <SelectField
                label="Compte"
                value={filterCompte}
                onChange={(v) => setFilterCompte(v as CashAccount | '')}
              >
                <option value="">Tous les comptes</option>
                {CASH_ACCOUNTS.map((a) => (
                  <option key={a} value={a}>
                    {CASH_ACCOUNT_LABELS[a]}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Source"
                value={filterSource}
                onChange={setFilterSource}
              >
                <option value="">Toutes sources</option>
                {SOURCE_OPTIONS.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Période"
                value={filterPeriod}
                onChange={setFilterPeriod}
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </SelectField>

              {filterPeriod === 'custom' && (
                <>
                  <InputField label="Du" type="date" value={filterFrom} onChange={setFilterFrom} />
                  <InputField label="Au" type="date" value={filterTo} onChange={setFilterTo} />
                </>
              )}

              <button
                onClick={() => void load()}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand/90"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Filtrer
              </button>

              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
          </Card>

          {/* Table des mouvements */}
          <Card className="overflow-hidden p-0">
            {/* 📱 Mobile : cartes empilées */}
            <div className="divide-y divide-slate-100 md:hidden">
              {loading && <div className="p-10 text-center text-slate-400">Chargement…</div>}
              {!loading &&
                movements.map((m) => (
                  <div key={m.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-700">
                        {m.categorie
                          ? (EXPENSE_CATEGORY_LABELS[m.categorie as keyof typeof EXPENSE_CATEGORY_LABELS] ?? m.categorie)
                          : (SOURCE_LABELS[m.source] ?? m.source)}
                      </p>
                      {m.note && <p className="truncate text-xs text-slate-400">{m.note}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{CASH_ACCOUNT_LABELS[m.compte]}</Badge>
                        <span className="tabular text-[11px] text-slate-400">
                          {new Date(m.createdAt).toLocaleDateString('fr-FR')} ·{' '}
                          {new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`tabular font-bold ${m.type === 'IN' ? 'text-emerald-700' : 'text-red-600'}`}
                      >
                        {m.type === 'IN' ? '+' : '−'}
                        {formatFCFA(m.montant)}
                      </p>
                      <p className="tabular text-[11px] text-slate-400">
                        Solde {formatFCFA(m.soldeApres)}
                      </p>
                    </div>
                  </div>
                ))}
              {!loading && movements.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  Aucun mouvement sur cette période.
                </div>
              )}
            </div>

            {/* 🖥️ Desktop : tableau */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Compte</th>
                    <th className="px-4 py-3 font-medium">Opération</th>
                    <th className="px-4 py-3 text-right font-medium">Montant</th>
                    <th className="px-4 py-3 text-right font-medium">Solde après</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        Chargement…
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    movements.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-2.5 text-slate-400 tabular">
                          <div>{new Date(m.createdAt).toLocaleDateString('fr-FR')}</div>
                          <div className="text-xs">
                            {new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone="neutral">{CASH_ACCOUNT_LABELS[m.compte]}</Badge>
                        </td>
                        <td className="max-w-[200px] px-4 py-2.5">
                          <p className="truncate font-medium text-slate-700">
                            {m.categorie
                              ? (EXPENSE_CATEGORY_LABELS[m.categorie as keyof typeof EXPENSE_CATEGORY_LABELS] ?? m.categorie)
                              : (SOURCE_LABELS[m.source] ?? m.source)}
                          </p>
                          {m.note && (
                            <p className="truncate text-xs text-slate-400">{m.note}</p>
                          )}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-semibold tabular ${
                            m.type === 'IN' ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {m.type === 'IN' ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            {m.type === 'IN' ? '+' : '−'}
                            {formatFCFA(m.montant)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500 tabular">
                          {formatFCFA(m.soldeApres)}
                        </td>
                      </tr>
                    ))}
                  {!loading && movements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        Aucun mouvement sur cette période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Historique des clôtures */}
          <Card className="overflow-hidden p-0">
            <button
              onClick={() => setShowCloses((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400" />
                Historique des clôtures ({closes.length})
              </span>
              {showCloses ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {showCloses && (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Compte</th>
                      <th className="px-4 py-2 text-right font-medium">Théorique</th>
                      <th className="px-4 py-2 text-right font-medium">Réel</th>
                      <th className="px-4 py-2 text-right font-medium">Écart</th>
                      <th className="px-4 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Aucune clôture enregistrée.
                        </td>
                      </tr>
                    )}
                    {closes.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-500 tabular">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-2">
                          <Badge tone="neutral">{CASH_ACCOUNT_LABELS[c.compte]}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right tabular">{formatFCFA(c.soldeTheorique)}</td>
                        <td className="px-4 py-2 text-right tabular">{formatFCFA(c.soldeReel)}</td>
                        <td
                          className={`px-4 py-2 text-right font-semibold tabular ${
                            c.ecart === 0
                              ? 'text-emerald-700'
                              : c.ecart > 0
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}
                        >
                          {c.ecart === 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Juste
                            </span>
                          ) : (
                            `${c.ecart > 0 ? '+' : ''}${formatFCFA(c.ecart)}`
                          )}
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-2 text-slate-500">
                          {c.note ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Formulaires ─────────────────────────────────────────────────────────────

function ExpenseForm({
  balances,
  onDone,
}: {
  balances: Balances | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ compte: 'CAISSE' as CashAccount, montant: '', categorie: 'AUTRE', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const solde = balances?.[form.compte] ?? null;
  const montant = Number(form.montant);
  const isInsuffisant = solde !== null && montant > 0 && montant > solde;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost('/api/treasury/expenses', {
        compte: form.compte,
        montant,
        categorie: form.categorie,
        note: form.note || undefined,
      });
      setForm({ ...form, montant: '', note: '' });
      onDone();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display font-semibold text-brand">
        <ArrowUpCircle className="h-4 w-4" /> Nouvelle dépense
      </h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <SelectField label="Compte" value={form.compte} onChange={set('compte')}>
          {CASH_ACCOUNTS.map((a) => (
            <option key={a} value={a}>
              {CASH_ACCOUNT_LABELS[a]} {balances ? `(${formatFCFA(balances[a])})` : ''}
            </option>
          ))}
        </SelectField>
        <SelectField label="Catégorie" value={form.categorie} onChange={set('categorie')}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
        <InputField label="Montant (FCFA)" type="number" value={form.montant} onChange={set('montant')} />
        {isInsuffisant && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Solde insuffisant ({formatFCFA(solde ?? 0)} disponible). Confirmer quand même ?
          </div>
        )}
        <InputField label="Note (optionnel)" value={form.note} onChange={set('note')} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="danger" className="w-full" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer la dépense'}
        </Button>
      </form>
    </Card>
  );
}

function TransferForm({
  balances,
  onDone,
}: {
  balances: Balances | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ from: 'CAISSE' as CashAccount, to: 'BANQUE' as CashAccount, montant: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const soldeSrc = balances?.[form.from] ?? null;
  const montant = Number(form.montant);
  const isInsuffisant = soldeSrc !== null && montant > 0 && montant > soldeSrc;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.from === form.to) {
      setError('Les comptes source et destination doivent être différents.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost('/api/treasury/transfers', {
        from: form.from,
        to: form.to,
        montant,
        note: form.note || undefined,
      });
      setForm({ ...form, montant: '', note: '' });
      onDone();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display font-semibold text-brand">
        <ArrowRightLeft className="h-4 w-4" /> Virement entre comptes
      </h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <SelectField label="Depuis" value={form.from} onChange={set('from')}>
          {CASH_ACCOUNTS.map((a) => (
            <option key={a} value={a}>
              {CASH_ACCOUNT_LABELS[a]} {balances ? `(${formatFCFA(balances[a])})` : ''}
            </option>
          ))}
        </SelectField>
        <SelectField label="Vers" value={form.to} onChange={set('to')}>
          {CASH_ACCOUNTS.map((a) => (
            <option key={a} value={a} disabled={a === form.from}>
              {CASH_ACCOUNT_LABELS[a]}
            </option>
          ))}
        </SelectField>
        <InputField label="Montant (FCFA)" type="number" value={form.montant} onChange={set('montant')} />
        {isInsuffisant && (
          <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Solde insuffisant ({formatFCFA(soldeSrc ?? 0)} sur {CASH_ACCOUNT_LABELS[form.from]}). Le virement sera bloqué.
          </div>
        )}
        <InputField label="Note (optionnel)" value={form.note} onChange={set('note')} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={saving || isInsuffisant}>
          {saving ? 'Transfert…' : 'Effectuer le virement'}
        </Button>
      </form>
    </Card>
  );
}

function AdjustmentForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    type: 'IN' as 'IN' | 'OUT',
    compte: 'CAISSE' as CashAccount,
    montant: '',
    source: 'OPENING' as 'ADJUSTMENT' | 'OPENING',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost('/api/treasury/movements', {
        type: form.type,
        compte: form.compte,
        montant: Number(form.montant),
        source: form.source,
        note: form.note || undefined,
      });
      setForm({ ...form, montant: '', note: '' });
      onDone();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display font-semibold text-brand">
        <Plus className="h-4 w-4" /> Ajustement / Ouverture
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Initialisez un solde d'ouverture ou corrigez manuellement un compte.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <SelectField label="Type d'opération" value={form.source} onChange={set('source')}>
          <option value="OPENING">Ouverture de caisse (solde initial)</option>
          <option value="ADJUSTMENT">Ajustement manuel</option>
        </SelectField>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Sens" value={form.type} onChange={set('type')}>
            <option value="IN">Entrée (+)</option>
            <option value="OUT">Sortie (−)</option>
          </SelectField>
          <SelectField label="Compte" value={form.compte} onChange={set('compte')}>
            {CASH_ACCOUNTS.map((a) => (
              <option key={a} value={a}>
                {CASH_ACCOUNT_LABELS[a]}
              </option>
            ))}
          </SelectField>
        </div>
        <InputField label="Montant (FCFA)" type="number" value={form.montant} onChange={set('montant')} />
        <InputField label="Note explicative" value={form.note} onChange={set('note')} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer le mouvement'}
        </Button>
      </form>
    </Card>
  );
}

function CashCloseForm({
  balances,
  onDone,
}: {
  balances: Balances | null;
  onDone: () => void;
}) {
  const [compte, setCompte] = useState<CashAccount>('CAISSE');
  const [soldeReel, setSoldeReel] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{ ecart: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theorique = balances?.[compte] ?? 0;
  const ecartPreview = soldeReel ? Number(soldeReel) - theorique : null;
  const ecartNonNul = ecartPreview !== null && ecartPreview !== 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ ecart: number }>('/api/treasury/close', {
        compte,
        soldeReel: Number(soldeReel),
        note: note || undefined,
      });
      setResult(res);
      setSoldeReel('');
      setNote('');
      onDone();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display font-semibold text-brand">
        <Lock className="h-4 w-4" /> Clôture de caisse
      </h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <SelectField label="Compte à clôturer" value={compte} onChange={(v) => setCompte(v as CashAccount)}>
          {CASH_ACCOUNTS.map((a) => (
            <option key={a} value={a}>
              {CASH_ACCOUNT_LABELS[a]}
            </option>
          ))}
        </SelectField>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">Solde théorique : </span>
          <span className="font-semibold tabular">{formatFCFA(theorique)}</span>
        </div>

        <InputField
          label="Montant réellement compté (FCFA)"
          type="number"
          value={soldeReel}
          onChange={setSoldeReel}
        />

        {ecartNonNul && (
          <div className={`rounded-lg px-3 py-2 text-sm ${ecartPreview! > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-medium">
              Écart : {ecartPreview! > 0 ? '+' : ''}{formatFCFA(ecartPreview!)}
            </p>
            <p className="mt-0.5 text-xs">
              {ecartPreview! > 0 ? '📈 Excédent' : '📉 Manquant'} — Un motif est obligatoire.
            </p>
          </div>
        )}

        {ecartNonNul && (
          <InputField
            label="Motif de l'écart (obligatoire)"
            value={note}
            onChange={setNote}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy || (ecartNonNul && !note.trim())}>
          {busy ? 'Clôture…' : 'Valider la clôture'}
        </Button>
      </form>

      {result && (
        <div
          className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
            result.ecart === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {result.ecart === 0
            ? 'Caisse juste, clôture enregistrée ✓'
            : `Clôture avec écart de ${result.ecart > 0 ? '+' : ''}${formatFCFA(result.ecart)}`}
        </div>
      )}
    </Card>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function InputField({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      >
        {children}
      </select>
    </label>
  );
}
