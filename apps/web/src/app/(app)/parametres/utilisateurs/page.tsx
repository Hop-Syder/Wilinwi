'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Gestion des utilisateurs (collaborateurs) : rôles, permissions par module, PIN, statut.
 */

import { useEffect, useState } from 'react';
import { UserPlus, KeyRound, Power, ShieldCheck, ArrowLeft, Store } from 'lucide-react';
import Link from 'next/link';
import {
  MODULES,
  ROLES,
  ROLE_LABELS,
  ETABLISSEMENT_TYPE_LABELS,
  type ModuleKey,
  type Role,
  type UserDto,
  type EtablissementDto,
} from '@wilinwi/types';
import { Button, Card, Badge, Input, Select, IconButton } from '@wilinwi/ui';
import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

const MODULE_LABELS: Record<ModuleKey, string> = {
  POS: 'Caisse',
  STOCK: 'Stock',
  PAY: 'Trésorerie',
  CRM: 'Clients',
  MARKET: 'Market',
  ANALYTICS: 'Analytics',
  AI: 'IA',
  DELIVERY: 'Livraisons',
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
  etablissementIds: string[];
};

const emptyDraft: Draft = {
  nom: '',
  poste: '',
  role: 'SELLER',
  email: '',
  pin: '',
  customPermissions: false,
  permissions: [],
  etablissementIds: [],
};

export default function UtilisateursPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [etablissements, setEtablissements] = useState<EtablissementDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const etabNameById = (id: string) => etablissements.find((e) => e.id === id)?.nom ?? '—';

  async function load() {
    try {
      const [u, etabs] = await Promise.all([
        apiGet<UserDto[]>('/api/users'),
        apiGet<EtablissementDto[]>('/api/etablissements/manage'),
      ]);
      setUsers(u);
      setEtablissements(etabs);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setError(null);
    setNotice(null);
    setCreatedInviteLink(null);
    // Nouveau collaborateur : accès à tous les établissements par défaut.
    setDraft({ ...emptyDraft, etablissementIds: etablissements.map((e) => e.id) });
  }
  function openEdit(u: UserDto) {
    setError(null);
    setNotice(null);
    setCreatedInviteLink(null);
    setDraft({
      id: u.id,
      nom: u.nom,
      poste: u.poste ?? '',
      role: u.role,
      email: u.email ?? '',
      pin: '',
      customPermissions: u.customPermissions,
      permissions: u.permissions as ModuleKey[],
      etablissementIds: u.etablissementIds ?? [],
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCreatedInviteLink(null);
    if (draft.pin && !/^\d{4}$/.test(draft.pin)) {
      setError("Le code PIN doit comporter exactement 4 chiffres.");
      setBusy(false);
      return;
    }
    try {
      if (draft.id) {
        await apiPatch(`/api/users/${draft.id}`, {
          nom: draft.nom,
          poste: draft.poste || null,
          role: draft.role,
          customPermissions: draft.customPermissions,
          permissions: draft.permissions,
          etablissementIds: draft.etablissementIds,
        });
        if (draft.pin) await apiPost(`/api/users/${draft.id}/pin`, { pin: draft.pin });
      } else {
        const created = await apiPost<UserDto>('/api/users', {
          nom: draft.nom,
          poste: draft.poste || undefined,
          role: draft.role,
          email: draft.email || undefined,
          pin: draft.pin || undefined,
          customPermissions: draft.customPermissions,
          permissions: draft.permissions,
          etablissementIds: draft.etablissementIds,
        });
        if (draft.email) {
          if (created.invitationLink) {
            setCreatedInviteLink(created.invitationLink);
          } else {
            setNotice(`Invitation envoyée par email à ${draft.email}. Le lien permet de définir le mot de passe.`);
          }
        }
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
    const pin = window.prompt(`Nouveau code PIN (4 chiffres) pour ${u.nom} :`);
    if (!pin) return;
    if (!/^\d{4}$/.test(pin)) {
      alert("Le code PIN doit comporter exactement 4 chiffres.");
      return;
    }
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

  function toggleEtablissement(id: string) {
    if (!draft) return;
    const has = draft.etablissementIds.includes(id);
    setDraft({
      ...draft,
      etablissementIds: has
        ? draft.etablissementIds.filter((x) => x !== id)
        : [...draft.etablissementIds, id],
    });
  }

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-utilisateurs-new',
      title: 'Invitez un collaborateur',
      content: 'Choisissez un rôle (Owner, Manager, Seller, Cashier, Delivery) qui définit ses capacités par défaut, et fixez-lui un code PIN pour la caisse.',
      position: 'bottom',
    },
    {
      targetId: 'tour-utilisateurs-list',
      title: 'Accès et permissions',
      content: 'Personnalisez les modules accessibles ou limitez l\'accès à certains établissements pour chaque collaborateur.',
      position: 'top',
    },
  ];

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
        <div className="flex items-center gap-2">
          <ContextualHelp
            storageKey="wilinwi_utilisateurs_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Code PIN', description: 'Le PIN (4 chiffres) permet de basculer rapidement d\'utilisateur sur la caisse partagée sans se reconnecter.' },
              { title: 'Permissions personnalisées', description: 'Par défaut, l\'accès aux modules suit le rôle ; cochez "Permissions personnalisées" pour affiner au cas par cas.' },
              { title: 'Établissements accessibles', description: 'Aucune case cochée = accès à tous les établissements. Utile pour restreindre un vendeur à sa seule boutique.' },
            ]}
          />
          <div id="tour-utilisateurs-new">
            <Button onClick={openCreate}>
              <UserPlus className="h-4 w-4" /> Nouveau collaborateur
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {notice && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}
      {createdInviteLink && (
        <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-4 text-sm text-brand">
          <p className="font-semibold mb-1">🎉 Collaborateur invité avec succès !</p>
          <p className="text-xs text-slate-500 mb-3">
            L&apos;invitation a été initiée. Si le collaborateur ne reçoit pas l&apos;email (SMTP non configuré ou spam), vous pouvez copier ce lien et lui envoyer manuellement :
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
            <input
              type="text"
              readOnly
              value={createdInviteLink}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 outline-none"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(createdInviteLink);
                  alert("Lien d'invitation copié !");
                }}
                className="text-xs py-1 px-3 bg-brand text-white hover:bg-brand/90 transition-colors"
              >
                Copier
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreatedInviteLink(null)}
                className="text-xs py-1 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card id="tour-utilisateurs-list" className="mt-6 overflow-x-auto p-0">
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
                  <div>{u.customPermissions ? (u.permissions.join(', ') || 'aucun') : 'Défaut du rôle'}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald">
                    <Store className="h-3 w-3" />
                    {u.role === 'OWNER'
                      ? 'Tous les établissements'
                      : (u.etablissementIds?.length ?? 0) === 0
                        ? 'Tous les établissements'
                        : (u.etablissementIds.length <= 2
                            ? u.etablissementIds.map(etabNameById).join(', ')
                            : `${u.etablissementIds.length} établissements`)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.actif ? 'success' : 'danger'}>{u.actif ? 'Actif' : 'Inactif'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconButton
                      icon={<ShieldCheck className="h-4 w-4" />}
                      onClick={() => openEdit(u)}
                      aria-label="Éditer"
                      title="Éditer"
                    />
                    <IconButton
                      icon={<KeyRound className="h-4 w-4" />}
                      onClick={() => resetPin(u)}
                      className="text-brand"
                      aria-label="Définir le PIN"
                      title="Définir le PIN"
                    />
                    {u.role !== 'OWNER' && (
                      <IconButton
                        icon={<Power className={`h-4 w-4 ${u.actif ? 'text-emerald-600' : 'text-red-500'}`} />}
                        onClick={() => toggleActif(u)}
                        disabled={busy}
                        aria-label={u.actif ? 'Désactiver' : 'Activer'}
                        title={u.actif ? 'Désactiver' : 'Activer'}
                      />
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
          <Card className="w-full max-w-lg max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                <Input inputMode="numeric" value={draft.pin} onChange={(e) => setDraft({ ...draft, pin: e.target.value })} placeholder="4 chiffres" />
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

            {/* Établissements accessibles (le rôle définit les actions, l'établissement les données visibles). */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Store className="h-3.5 w-3.5 text-emerald" /> Établissements accessibles
              </div>
              {etablissements.length === 0 ? (
                <p className="text-xs text-slate-400">Aucun établissement. Créez-en un d'abord.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {etablissements.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.etablissementIds.includes(e.id)}
                        onChange={() => toggleEtablissement(e.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-800">{e.nom}</span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {ETABLISSEMENT_TYPE_LABELS[e.type]}
                          {!e.actif && ' · inactif'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-slate-400">
                Aucune case cochée = accès à tous les établissements par défaut.
              </p>
            </div>

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
