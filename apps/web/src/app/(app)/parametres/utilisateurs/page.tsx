'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Gestion des utilisateurs (collaborateurs) : rôles, permissions par module, PIN, statut.
 */

import { useEffect, useState } from 'react';
import { UserPlus, KeyRound, Power, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  MODULES,
  ROLES,
  ROLE_LABELS,
  type ModuleKey,
  type Role,
  type UserDto,
} from '@wilinwi/types';
import { Button, Card, Badge, Input, Select } from '@wilinwi/ui';
import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';

const MODULE_LABELS: Record<ModuleKey, string> = {
  POS: 'Caisse',
  STOCK: 'Stock',
  PAY: 'Trésorerie',
  CRM: 'Clients',
  MARKET: 'Market',
  ANALYTICS: 'Analytics',
  AI: 'IA',
};

type Draft = {
  id?: string;
  nom: string;
  poste: string;
  role: Role;
  email: string;
  pin: string;
  customPermissions: boolean;
  permissions: ModuleKey[];
};

const emptyDraft: Draft = {
  nom: '',
  poste: '',
  role: 'SELLER',
  email: '',
  pin: '',
  customPermissions: false,
  permissions: [],
};

export default function UtilisateursPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setUsers(await apiGet<UserDto[]>('/api/users'));
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setError(null);
    setDraft({ ...emptyDraft });
  }
  function openEdit(u: UserDto) {
    setError(null);
    setDraft({
      id: u.id,
      nom: u.nom,
      poste: u.poste ?? '',
      role: u.role,
      email: u.email ?? '',
      pin: '',
      customPermissions: u.customPermissions,
      permissions: u.permissions as ModuleKey[],
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      if (draft.id) {
        await apiPatch(`/api/users/${draft.id}`, {
          nom: draft.nom,
          poste: draft.poste || null,
          role: draft.role,
          customPermissions: draft.customPermissions,
          permissions: draft.permissions,
        });
        if (draft.pin) await apiPost(`/api/users/${draft.id}/pin`, { pin: draft.pin });
      } else {
        await apiPost('/api/users', {
          nom: draft.nom,
          poste: draft.poste || undefined,
          role: draft.role,
          email: draft.email || undefined,
          pin: draft.pin || undefined,
          customPermissions: draft.customPermissions,
          permissions: draft.permissions,
        });
      }
      setDraft(null);
      await load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActif(u: UserDto) {
    setBusy(true);
    try {
      await apiPatch(`/api/users/${u.id}`, { actif: !u.actif });
      await load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPin(u: UserDto) {
    const pin = window.prompt(`Nouveau code PIN (4 à 6 chiffres) pour ${u.nom} :`);
    if (!pin) return;
    try {
      await apiPost(`/api/users/${u.id}/pin`, { pin });
      await load();
    } catch (e) {
      alert((e as ApiError).message);
    }
  }

  function toggleModule(m: ModuleKey) {
    if (!draft) return;
    const has = draft.permissions.includes(m);
    setDraft({
      ...draft,
      permissions: has ? draft.permissions.filter((x) => x !== m) : [...draft.permissions, m],
    });
  }

  return (
    <div>
      <Link href="/parametres" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Paramètres
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Utilisateurs</h1>
          <p className="mt-1 text-sm text-slate-500">Collaborateurs, rôles, permissions et codes PIN.</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="h-4 w-4" /> Nouveau collaborateur
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Poste</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Accès</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{u.nom}</div>
                  <div className="text-xs text-slate-400">{u.email ?? 'PIN seulement'}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.poste ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone="brand">{ROLE_LABELS[u.role]}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {u.customPermissions ? (u.permissions.join(', ') || 'aucun') : 'Défaut du rôle'}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.actif ? 'success' : 'danger'}>{u.actif ? 'Actif' : 'Inactif'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Éditer">
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                    <button onClick={() => resetPin(u)} className="rounded-lg p-1.5 text-brand hover:bg-brand-50" title="Définir le PIN">
                      <KeyRound className="h-4 w-4" />
                    </button>
                    {u.role !== 'OWNER' && (
                      <button onClick={() => toggleActif(u)} disabled={busy} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title={u.actif ? 'Désactiver' : 'Activer'}>
                        <Power className={`h-4 w-4 ${u.actif ? 'text-emerald-600' : 'text-red-500'}`} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Aucun collaborateur.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {draft && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setDraft(null)}>
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-semibold text-brand">
              {draft.id ? 'Modifier le collaborateur' : 'Nouveau collaborateur'}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nom complet"><Input value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })} /></Field>
              <Field label="Poste (ex: Caissier principal)"><Input value={draft.poste} onChange={(e) => setDraft({ ...draft, poste: e.target.value })} /></Field>
              <Field label="Rôle (préréglage)">
                <Select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
                  {ROLES.filter((r) => r !== 'OWNER').map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </Select>
              </Field>
              {!draft.id && (
                <Field label="Email (optionnel)"><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
              )}
              <Field label={draft.id ? 'Nouveau PIN (optionnel)' : 'Code PIN (optionnel)'}>
                <Input inputMode="numeric" value={draft.pin} onChange={(e) => setDraft({ ...draft, pin: e.target.value })} placeholder="4 à 6 chiffres" />
              </Field>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.customPermissions} onChange={(e) => setDraft({ ...draft, customPermissions: e.target.checked })} />
              Permissions personnalisées (sinon : modules par défaut du rôle)
            </label>

            {draft.customPermissions && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MODULES.map((m) => (
                  <label key={m} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <input type="checkbox" checked={draft.permissions.includes(m)} onChange={() => toggleModule(m)} />
                    {MODULE_LABELS[m]}
                  </label>
                ))}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDraft(null)}>Annuler</Button>
              <Button variant="emerald" disabled={busy || !draft.nom} onClick={save}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
