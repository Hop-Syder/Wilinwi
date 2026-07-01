/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Utilisateurs (cross-tenant) : recherche, blocage, reset PIN / mot de passe, connexions.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  X,
  Ban,
  CheckCircle2,
  KeyRound,
  Lock,
  Clock,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { Button, Card, Badge, Input } from '@wilinwi/ui';
import type { PlatformUserDto, PlatformUserLoginDto, PlatformResetPasswordDto } from '@wilinwi/types';
import { apiGet, apiPost, ApiError } from '@/lib/api';

/** Les comptes PIN ont un e-mail technique `pin_…@pin.local`. */
function isPinAccount(email: string): boolean {
  return email.endsWith('@pin.local');
}
function displayEmail(email: string): string {
  return isPinAccount(email) ? 'Compte PIN (poste partagé)' : email;
}
function fmt(d: string | Date | null): string {
  return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

export default function UtilisateursPage() {
  const [users, setUsers] = useState<PlatformUserDto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<PlatformUserDto | null>(null);
  const [logins, setLogins] = useState<PlatformUserLoginDto[]>([]);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function loadUsers(q: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PlatformUserDto[]>(`/api/platform/users?search=${encodeURIComponent(q)}&limit=200`);
      setUsers(data);
    } catch (e) {
      setError((e as ApiError).message || 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }

  // Recherche débattue (300 ms).
  useEffect(() => {
    const id = setTimeout(() => void loadUsers(search), search ? 300 : 0);
    return () => clearTimeout(id);
  }, [search]);

  async function openUser(u: PlatformUserDto) {
    setSelected(u);
    setFeedback(null);
    setTempPassword(null);
    setLogins([]);
    try {
      const l = await apiGet<PlatformUserLoginDto[]>(`/api/platform/users/${u.id}/logins`);
      setLogins(l);
    } catch {
      /* historique best-effort */
    }
  }

  function patchUser(id: string, patch: Partial<PlatformUserDto>) {
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    setSelected((u) => (u && u.id === id ? { ...u, ...patch } : u));
  }

  async function toggleActive(u: PlatformUserDto) {
    setActionBusy('block');
    setFeedback(null);
    try {
      await apiPost(`/api/platform/users/${u.id}/block`, { active: !u.actif });
      patchUser(u.id, { actif: !u.actif });
      setFeedback({ kind: 'ok', text: !u.actif ? 'Compte débloqué.' : 'Compte bloqué.' });
    } catch (e) {
      setFeedback({ kind: 'err', text: (e as ApiError).message || 'Échec.' });
    } finally {
      setActionBusy(null);
    }
  }

  async function resetPin(u: PlatformUserDto) {
    setActionBusy('pin');
    setFeedback(null);
    try {
      await apiPost(`/api/platform/users/${u.id}/reset-pin`, {});
      setFeedback({ kind: 'ok', text: 'PIN réinitialisé à 0000 (à changer à la prochaine connexion).' });
    } catch (e) {
      setFeedback({ kind: 'err', text: (e as ApiError).message || 'Échec.' });
    } finally {
      setActionBusy(null);
    }
  }

  async function resetPassword(u: PlatformUserDto) {
    setActionBusy('password');
    setFeedback(null);
    setTempPassword(null);
    try {
      const res = await apiPost<PlatformResetPasswordDto>(`/api/platform/users/${u.id}/reset-password`, {});
      setTempPassword(res.tempPassword);
      setFeedback({ kind: 'ok', text: 'Mot de passe réinitialisé — communiquez-le à l’utilisateur.' });
    } catch (e) {
      setFeedback({ kind: 'err', text: (e as ApiError).message || 'Échec.' });
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Utilisateurs</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Gestion des comptes, toutes entreprises confondues. Recherche par nom, e-mail ou entreprise.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between gap-4 border-b border-border p-4">
              <h2 className="flex items-center gap-2 text-base font-bold">
                👤 Comptes {!loading && <Badge variant="neutral">{users.length}</Badge>}
              </h2>
              <div className="relative w-full max-w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  placeholder="Nom, e-mail, entreprise..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 py-1 pl-9 pr-4 text-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-text-secondary">
                <RefreshCw className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-danger">{error}</div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-secondary">Aucun utilisateur.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-hover/50 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      <th className="p-3">Utilisateur</th>
                      <th className="p-3">Entreprise</th>
                      <th className="p-3">Rôle</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3">Dern. connexion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => openUser(u)}
                        className={`cursor-pointer border-b border-border transition-colors hover:bg-surface-hover ${
                          selected?.id === u.id ? 'border-l-4 border-l-primary bg-primary/5' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-bold text-text-primary">{u.nom}</div>
                          <div className="max-w-[180px] truncate text-[10px] text-text-secondary">{displayEmail(u.email)}</div>
                        </td>
                        <td className="p-3 text-xs text-text-secondary">{u.tenantNom}</td>
                        <td className="p-3"><Badge variant="neutral">{u.role}</Badge></td>
                        <td className="p-3">
                          <Badge variant={u.actif ? 'success' : 'danger'}>{u.actif ? 'Actif' : 'Bloqué'}</Badge>
                        </td>
                        <td className="p-3 text-xs text-text-secondary">{u.lastLogin ? fmt(u.lastLogin) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Panneau détail / actions */}
        <div>
          {selected ? (
            <Card className="sticky top-20">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-text-primary">{selected.nom}</h3>
                  <p className="truncate text-xs text-text-secondary">{displayEmail(selected.email)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="rounded p-1 text-text-secondary hover:bg-surface-hover">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-hover/30 p-3 text-xs">
                  <div>
                    <div className="font-medium text-text-secondary">Entreprise</div>
                    <div className="mt-1 font-bold text-text-primary">{selected.tenantNom}</div>
                  </div>
                  <div>
                    <div className="font-medium text-text-secondary">Rôle</div>
                    <div className="mt-1"><Badge variant="neutral">{selected.role}</Badge></div>
                  </div>
                </div>

                {feedback && (
                  <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${feedback.kind === 'ok' ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'}`}>
                    {feedback.text}
                  </div>
                )}

                {tempPassword && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="text-[10px] font-semibold uppercase text-text-secondary">Mot de passe temporaire</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="select-all font-mono text-sm font-bold text-text-primary">{tempPassword}</code>
                      <button
                        onClick={() => navigator.clipboard?.writeText(tempPassword)}
                        className="rounded p-1 text-text-secondary hover:bg-surface-hover"
                        title="Copier"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(selected)}
                    disabled={actionBusy !== null}
                    className={`flex w-full items-center justify-center gap-1.5 ${selected.actif ? 'border-danger/40 text-danger hover:bg-danger/5' : 'border-success/40 text-success hover:bg-success/5'}`}
                  >
                    {selected.actif ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {selected.actif ? 'Bloquer le compte' : 'Débloquer le compte'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetPin(selected)}
                    disabled={actionBusy !== null}
                    className="flex w-full items-center justify-center gap-1.5"
                  >
                    <Lock className="h-4 w-4" /> Réinitialiser le PIN (0000)
                  </Button>

                  {!isPinAccount(selected.email) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetPassword(selected)}
                      disabled={actionBusy !== null}
                      className="flex w-full items-center justify-center gap-1.5"
                    >
                      <KeyRound className="h-4 w-4" /> Réinitialiser le mot de passe
                    </Button>
                  )}
                </div>

                {/* Historique de connexion */}
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <Clock className="h-4 w-4 text-primary" /> Connexions récentes
                  </h4>
                  {logins.length === 0 ? (
                    <p className="py-2 text-center text-[11px] italic text-text-secondary">
                      Aucune connexion PIN tracée (les connexions e-mail ne sont pas journalisées).
                    </p>
                  ) : (
                    <div className="max-h-[220px] space-y-1.5 overflow-y-auto">
                      {logins.map((l) => (
                        <div key={l.id} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-[11px]">
                          <span className="flex items-center gap-1.5 text-text-secondary">
                            <ShieldCheck className="h-3 w-3 text-primary" /> {l.deviceLabel ?? 'Appareil'}
                          </span>
                          <span className="text-text-secondary">{fmt(l.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex h-[300px] flex-col items-center justify-center border-2 border-dashed p-8 text-center text-text-secondary">
              <KeyRound className="h-10 w-10 stroke-1 text-text-secondary/40" />
              <p className="mt-3 max-w-[200px] text-xs">Sélectionnez un utilisateur pour gérer son compte.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
