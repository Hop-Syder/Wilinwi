'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend Trésorerie (Route: tresorerie) — soldes, dépenses, clôture de caisse
 */

import { useEffect, useState } from 'react';
import { Wallet, Smartphone, Landmark, ArrowDownCircle, ArrowUpCircle, Lock } from 'lucide-react';
import {
  CASH_ACCOUNTS,
  CASH_ACCOUNT_LABELS,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type CashAccount,
} from '@wilinwi/types';
import { Button, Card, Badge, StatCard, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

type Balances = Record<CashAccount, number>;
interface Movement {
  id: string;
  type: 'IN' | 'OUT';
  compte: CashAccount;
  montant: number;
  source: string;
  categorie: string | null;
  note: string | null;
  createdAt: string;
}

const ACCOUNT_ICON: Record<CashAccount, typeof Wallet> = {
  CAISSE: Wallet,
  MOBILE_MONEY: Smartphone,
  BANQUE: Landmark,
};

export default function TresoreriePage() {
  const [balances, setBalances] = useState<Balances | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'expense' | 'close'>('expense');

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-treso-balances',
      title: 'Soldes actuels',
      content: 'Consultez la trésorerie disponible dans vos différents comptes (Caisse physique, Mobile Money, Banque).',
      position: 'bottom',
    },
    {
      targetId: 'tour-treso-actions',
      title: 'Opérations',
      content: 'Enregistrez les sorties d\'argent (loyer, factures, salaires) et effectuez la clôture de caisse quotidienne.',
      position: 'right',
    },
    {
      targetId: 'tour-treso-history',
      title: 'Historique',
      content: 'Suivez la trace de toutes vos entrées et sorties (ventes, remboursements, dépenses) pour une comptabilité sans faille.',
      position: 'left',
    }
  ];

  async function load() {
    try {
      const [b, m] = await Promise.all([
        apiGet<Balances>('/api/treasury/balances'),
        apiGet<Movement[]>('/api/treasury/movements'),
      ]);
      setBalances(b);
      setMovements(m);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Trésorerie</h1>
          <p className="mt-1 text-sm text-slate-500">Soldes, dépenses et clôture de caisse.</p>
        </div>
        <ContextualHelp 
          storageKey="wilinwi_treso_tour_done"
          tourSteps={tourSteps}
          useCases={[
            { title: 'Enregistrer une dépense courante', description: 'Cliquez sur l\'onglet "Dépense", choisissez le compte à débiter (ex: Caisse), la catégorie (ex: Électricité) et le montant.' },
            { title: 'Clôturer la caisse (Fin de journée)', description: 'Sélectionnez "Clôture caisse", comptez l\'argent physique dans votre tiroir et entrez le montant. Le système identifiera les écarts éventuels.' }
          ]}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3" id="tour-treso-balances">
        {CASH_ACCOUNTS.map((acc) => {
          const Icon = ACCOUNT_ICON[acc];
          return (
            <StatCard
              key={acc}
              label={CASH_ACCOUNT_LABELS[acc]}
              value={balances ? formatFCFA(balances[acc]) : '…'}
              icon={<Icon className="h-5 w-5" />}
              accent={acc === 'CAISSE' ? 'emerald' : acc === 'MOBILE_MONEY' ? 'gold' : 'brand'}
            />
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <div id="tour-treso-actions">
          <div className="mb-3 flex gap-2">
            <TabBtn active={tab === 'expense'} onClick={() => setTab('expense')}>
              Dépense
            </TabBtn>
            <TabBtn active={tab === 'close'} onClick={() => setTab('close')}>
              Clôture caisse
            </TabBtn>
          </div>
          {tab === 'expense' ? (
            <ExpenseForm onDone={load} />
          ) : (
            <CashCloseForm theorique={balances?.CAISSE ?? 0} onDone={load} />
          )}
        </div>

        <Card className="overflow-x-auto p-0" id="tour-treso-history">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Compte</th>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 text-slate-500">
                    {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone="neutral">{CASH_ACCOUNT_LABELS[m.compte]}</Badge>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {m.categorie
                      ? EXPENSE_CATEGORY_LABELS[m.categorie as keyof typeof EXPENSE_CATEGORY_LABELS] ??
                        m.categorie
                      : labelForSource(m.source)}
                    {m.note ? <span className="text-slate-400"> · {m.note}</span> : null}
                  </td>
                  <td
                    className={`tabular px-4 py-2 text-right font-medium ${
                      m.type === 'IN' ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {m.type === 'IN' ? (
                        <ArrowDownCircle className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                      )}
                      {m.type === 'IN' ? '+' : '−'}
                      {formatFCFA(m.montant)}
                    </span>
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    Aucun mouvement de trésorerie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function labelForSource(s: string) {
  return (
    { SALE: 'Vente', REPAYMENT: 'Remboursement', TRANSFER: 'Virement', ADJUSTMENT: 'Ajustement', OPENING: 'Ouverture' }[
      s
    ] ?? s
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
        active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function ExpenseForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ compte: 'CAISSE', montant: '', categorie: 'LOYER', note: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost('/api/treasury/expenses', {
        compte: form.compte,
        montant: Number(form.montant),
        categorie: form.categorie,
        note: form.note || undefined,
      });
      setForm({ compte: form.compte, montant: '', categorie: form.categorie, note: '' });
      onDone();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display font-semibold text-brand">Nouvelle dépense</h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <Select label="Compte" value={form.compte} onChange={set('compte')}>
          {CASH_ACCOUNTS.map((a) => (
            <option key={a} value={a}>
              {CASH_ACCOUNT_LABELS[a]}
            </option>
          ))}
        </Select>
        <Select label="Catégorie" value={form.categorie} onChange={set('categorie')}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <Field label="Montant (FCFA)" type="number" value={form.montant} onChange={set('montant')} />
        <Field label="Note (optionnel)" value={form.note} onChange={set('note')} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="danger" className="w-full" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer la dépense'}
        </Button>
      </form>
    </Card>
  );
}

function CashCloseForm({ theorique, onDone }: { theorique: number; onDone: () => void }) {
  const [soldeReel, setSoldeReel] = useState('');
  const [result, setResult] = useState<{ ecart: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ ecart: number }>('/api/treasury/close', {
        compte: 'CAISSE',
        soldeReel: Number(soldeReel),
      });
      setResult(res);
      setSoldeReel('');
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
      <p className="mt-1 text-sm text-slate-500">
        Solde théorique :{' '}
        <span className="tabular font-semibold">{formatFCFA(theorique)}</span>
      </p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <Field
          label="Montant réellement compté"
          type="number"
          value={soldeReel}
          onChange={setSoldeReel}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Clôture…' : 'Clôturer la caisse'}
        </Button>
      </form>
      {result && (
        <p
          className={`mt-3 text-sm ${result.ecart === 0 ? 'text-emerald-700' : 'text-gold-700'}`}
        >
          {result.ecart === 0
            ? 'Caisse juste, aucun écart ✓'
            : `Écart enregistré : ${result.ecart > 0 ? '+' : ''}${formatFCFA(result.ecart)}`}
        </p>
      )}
    </Card>
  );
}

function Field({
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
        required={type === 'number'}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}

function Select({
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
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        {children}
      </select>
    </label>
  );
}
