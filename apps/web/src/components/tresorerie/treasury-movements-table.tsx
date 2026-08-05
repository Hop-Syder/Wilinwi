/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau du Registre de Trésorerie avec Badges Colorés (Entrées 🟩, Dépenses 🟥, Transferts 🔵)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useMemo, useState } from 'react';
import { Search, Download, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from 'lucide-react';
import {
  CASH_ACCOUNT_LABELS,
  EXPENSE_CATEGORY_LABELS,
  type CashAccount,
  type ExpenseCategory,
} from '@wilinwi/types';
import { Card, Button } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

export interface CashMovementRow {
  id: string;
  type: 'IN' | 'OUT';
  compte: CashAccount;
  montant: number;
  source: string; // SALE, EXPENSE, TRANSFER, ADJUSTMENT, REPAYMENT
  categorie: string | null;
  note: string | null;
  createdAt: string;
  createdBy?: string | null;
}

interface TreasuryMovementsTableProps {
  movements: CashMovementRow[];
  onExportCsv?: () => void;
}

export function TreasuryMovementsTable({
  movements,
  onExportCsv,
}: TreasuryMovementsTableProps) {
  const { formatAmount } = useCurrency();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT' | 'TRANSFER'>('ALL');
  const [accountFilter, setAccountFilter] = useState<CashAccount | 'ALL'>('ALL');

  // Filtrage des mouvements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Type filter
      if (typeFilter === 'IN' && (m.type !== 'IN' || m.source === 'TRANSFER')) return false;
      if (typeFilter === 'OUT' && (m.type !== 'OUT' || m.source === 'TRANSFER')) return false;
      if (typeFilter === 'TRANSFER' && m.source !== 'TRANSFER') return false;

      // Account filter
      if (accountFilter !== 'ALL' && m.compte !== accountFilter) return false;

      // Query filter
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchNote = (m.note ?? '').toLowerCase().includes(q);
        const matchCategory = (m.categorie ?? '').toLowerCase().includes(q);
        const matchSource = (m.source ?? '').toLowerCase().includes(q);
        if (!matchNote && !matchCategory && !matchSource) return false;
      }
      return true;
    });
  }, [movements, typeFilter, accountFilter, query]);

  return (
    <Card className="p-4 border-slate-200/80 shadow-xs rounded-2xl space-y-4 select-none">
      {/* Barre d'outils avec Recherche + Filtres + Export CSV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Recherche */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Motif, catégorie..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Account Filter Select */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value as CashAccount | 'ALL')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-rose-500"
          >
            <option value="ALL">Tous les comptes</option>
            <option value="CAISSE">🟢 Caisse Espèces</option>
            <option value="MOBILE_MONEY">🟡 Mobile Money</option>
            <option value="BANQUE">🏦 Banque</option>
          </select>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'ALL', label: 'Tous les flux' },
              { id: 'IN', label: '🟩 Entrées' },
              { id: 'OUT', label: '🟥 Dépenses OPEX' },
              { id: 'TRANSFER', label: '🔵 Transferts' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id as any)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-full transition-all shrink-0 ${
                  typeFilter === f.id
                    ? 'bg-rose-950 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Export CSV */}
        {onExportCsv && (
          <Button
            size="sm"
            variant="outline"
            onClick={onExportCsv}
            className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 shrink-0"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Exporter CSV
          </Button>
        )}
      </div>

      {/* Vue Bureau : Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Date & Heure</th>
              <th className="py-3.5 px-4">Flux & Type</th>
              <th className="py-3.5 px-4">Catégorie</th>
              <th className="py-3.5 px-4">Compte Impacté</th>
              <th className="py-3.5 px-4">Motif / Observation</th>
              <th className="py-3.5 px-4 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredMovements.map((m) => {
              const isTransfer = m.source === 'TRANSFER';
              const isIn = m.type === 'IN';

              return (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Date & Heure */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                    <span className="font-bold text-slate-800">
                      {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                    </span>{' '}
                    <span className="text-[11px] text-slate-400">
                      {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  {/* Flux & Type */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {isTransfer ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-extrabold">
                        <ArrowRightLeft className="h-3 w-3 text-blue-600" /> Transfert neutre
                      </span>
                    ) : isIn ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold">
                        <ArrowUpCircle className="h-3 w-3 text-emerald-600" /> Recette / Entrée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-extrabold">
                        <ArrowDownCircle className="h-3 w-3 text-rose-600" /> Dépense OPEX
                      </span>
                    )}
                  </td>

                  {/* Catégorie */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800">
                    {m.categorie ? (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200/60 text-[11px]">
                        {EXPENSE_CATEGORY_LABELS[m.categorie as ExpenseCategory] || m.categorie}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">—</span>
                    )}
                  </td>

                  {/* Compte Impacté */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-slate-700">
                      {CASH_ACCOUNT_LABELS[m.compte] || m.compte}
                    </span>
                  </td>

                  {/* Motif / Observation */}
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    {m.note || '—'}
                  </td>

                  {/* Montant */}
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap text-sm">
                    {isTransfer ? (
                      <span className="text-blue-700">{formatAmount(m.montant)}</span>
                    ) : isIn ? (
                      <span className="text-emerald-700">+{formatAmount(m.montant)}</span>
                    ) : (
                      <span className="text-rose-600">-{formatAmount(m.montant)}</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredMovements.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 text-xs font-medium">
                  Aucun mouvement de trésorerie trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
