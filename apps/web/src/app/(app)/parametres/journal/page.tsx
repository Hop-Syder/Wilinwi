'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Journal d'activité (audit) — consultation par le propriétaire/gérant.
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';
import { Card, Badge } from '@wilinwi/ui';
import { apiGet, ApiError } from '@/lib/api';

interface ActivityRow {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  PIN_LOGIN: 'Connexion PIN',
  USER_CREATE: 'Création utilisateur',
  USER_UPDATE: 'Modification utilisateur',
  USER_SET_PIN: 'Définition PIN',
};

export default function JournalPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ActivityRow[]>('/api/activity?limit=200')
      .then(setRows)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  return (
    <div>
      <Link href="/parametres" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Paramètres
      </Link>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-brand">
        <History className="h-6 w-6" /> Journal d'activité
      </h1>
      <p className="mt-1 text-sm text-slate-500">Historique des actions de votre équipe.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Cible</th>
              <th className="px-4 py-3 font-medium">Utilisateur</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 tabular text-slate-500">
                  {new Date(r.createdAt).toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-2">
                  <Badge tone="neutral">{ACTION_LABELS[r.action] ?? r.action}</Badge>
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {r.entity ? `${r.entity}${r.entityId ? ' · ' + r.entityId.slice(0, 8) : ''}` : '—'}
                </td>
                <td className="px-4 py-2 text-xs text-slate-400">{r.userId?.slice(0, 8) ?? 'système'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">Aucune activité enregistrée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
