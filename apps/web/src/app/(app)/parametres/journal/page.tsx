'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Journal d'activité (audit) — libellés humains, auteur, filtre. OWNER/MANAGER.
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, History, Search } from 'lucide-react';
import Link from 'next/link';
import { Card, Badge, Button } from '@wilinwi/ui';
import { apiGet, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface ActivityRow {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

// Actions « sémantiques » journalisées explicitement par les services.
const SEMANTIC: Record<string, string> = {
  PIN_LOGIN: 'Connexion (PIN)',
  USER_CREATE: 'Collaborateur créé',
  USER_UPDATE: 'Collaborateur modifié',
  USER_SET_PIN: 'PIN défini',
};

// Actions auto-journalisées (méthode + route) → libellé métier.
const ROUTE_LABELS: Record<string, string> = {
  'POST /pos/sales': 'Vente créée',
  'POST /pos/sales/:id/cancel': 'Vente annulée',
  'POST /pos/sales/:id/return': 'Retour de marchandise',
  'POST /pos/sales/:id/payments': 'Versement (acompte)',
  'POST /pos/sales/:id/approve': 'Validation de vente',
  'POST /stock/products': 'Produit créé',
  'PATCH /stock/products/:id': 'Produit modifié',
  'POST /stock/movements': 'Mouvement de stock',
  'POST /inventory': 'Inventaire ouvert',
  'POST /inventory/:id/count': 'Comptage inventaire',
  'POST /inventory/:id/validate': 'Inventaire validé',
  'POST /crm/clients': 'Client créé',
  'PATCH /crm/clients/:id': 'Client modifié',
  'POST /crm/clients/:id/payments': 'Remboursement client',
  'POST /treasury/expenses': 'Dépense',
  'POST /treasury/movements': 'Mouvement de trésorerie',
  'POST /treasury/transfers': 'Virement entre comptes',
  'POST /treasury/close': 'Clôture de caisse',
  'PATCH /admin/tenant/plan': 'Changement de plan',
  'POST /users': 'Collaborateur créé',
  'PATCH /users/:id': 'Collaborateur modifié',
  'POST /users/:id/pin': 'PIN défini',
  'POST /auth/invite': 'Invitation envoyée',
};

function toneFor(label: string): Tone {
  if (/annul/i.test(label)) return 'danger';
  if (/créée?|validé|invitation/i.test(label)) return 'success';
  if (/dépense|virement|clôture/i.test(label)) return 'warning';
  return 'neutral';
}

/** Traduit une action brute en libellé humain + couleur. */
function resolveAction(action: string): { label: string; tone: Tone } {
  if (SEMANTIC[action]) return { label: SEMANTIC[action], tone: toneFor(SEMANTIC[action]) };
  const m = action.match(/^(GET|POST|PATCH|PUT|DELETE)\s+(.+)$/);
  if (m) {
    const method = m[1];
    const path = m[2]
      .replace(/^\/api/, '')
      .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id'); // UUID → :id
    const label = ROUTE_LABELS[`${method} ${path}`];
    if (label) return { label, tone: toneFor(label) };
    return { label: `${method} ${path}`, tone: 'neutral' };
  }
  return { label: action, tone: 'neutral' };
}

export default function JournalPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOwner) return;
    apiGet<ActivityRow[]>('/api/activity?limit=200')
      .then(setRows)
      .catch((e: ApiError) => setError(e.message));
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Card className="max-w-md p-6 text-center border-red-200 bg-red-50/50">
          <History className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 font-display text-lg font-bold text-slate-900">Accès refusé</h2>
          <p className="mt-2 text-sm text-slate-500">
            Seul le propriétaire du compte est autorisé à consulter le journal d&apos;activité de l&apos;équipe.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/parametres">
              <Button className="inline-flex items-center gap-1 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" /> Retour aux paramètres
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Pré-calcule le libellé pour filtrer/afficher.
  const enriched = useMemo(
    () => rows.map((r) => ({ ...r, ...resolveAction(r.action) })),
    [rows],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        (r.userName ?? '').toLowerCase().includes(q) ||
        (r.entity ?? '').toLowerCase().includes(q),
    );
  }, [enriched, query]);

  return (
    <div>
      <Link
        href="/parametres"
        className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" /> Paramètres
      </Link>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-brand">
        <History className="h-6 w-6" /> Journal d&apos;activité
      </h1>
      <p className="mt-1 text-sm text-slate-500">Historique des actions de votre équipe.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="relative mt-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filtrer par action, collaborateur…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Cible</th>
              <th className="px-4 py-3 font-medium">Collaborateur</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 tabular text-slate-500">
                  {new Date(r.createdAt).toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-2">
                  <Badge tone={r.tone}>{r.label}</Badge>
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {r.entity ? `${r.entity}${r.entityId ? ' · ' + r.entityId.slice(0, 8) : ''}` : '—'}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {r.userName ?? (r.userId ? r.userId.slice(0, 8) : 'système')}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  {rows.length === 0 ? 'Aucune activité enregistrée.' : 'Aucun résultat.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
