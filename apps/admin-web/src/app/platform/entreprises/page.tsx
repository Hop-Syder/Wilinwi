/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Entreprises : liste + tiroir détail (facturation, modules, établissements).
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Search,
  Users,
  Store,
  Calendar,
  ChevronRight,
  X,
  RefreshCw,
  MapPin,
  CreditCard,
  Clock,
  AlertTriangle,
  Ban,
  PlayCircle,
  Puzzle,
  Lock,
  Save,
} from 'lucide-react';
import { Button, Card, Badge, Input } from '@wilinwi/ui';
import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';
import {
  PLANS,
  MODULES,
  PLAN_MODULES,
  type Plan,
  type ModuleKey,
  type SubscriptionStatus,
  type PlatformTenantDto,
  type PlatformEtablissementDto,
  type PlatformPaymentResultDto,
  type PlatformOverdueResultDto,
} from '@wilinwi/types';

const MODULE_LABELS: Record<ModuleKey, string> = {
  POS: 'Caisse (POS)',
  STOCK: 'Stock',
  PAY: 'Trésorerie',
  CRM: 'CRM Clients',
  MARKET: 'Market',
  ANALYTICS: 'Analytics',
  AI: 'Assistant IA',
  DELIVERY: 'Livraisons',
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Actif',
  TRIALING: 'Essai',
  PAST_DUE: 'Impayé',
  CANCELLED: 'Suspendu',
};
const STATUS_TONE: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  TRIALING: 'warning',
  PAST_DUE: 'danger',
  CANCELLED: 'neutral',
};

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(value: string | Date | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default function EntreprisesPage() {
  const [tenants, setTenants] = useState<PlatformTenantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selectedTenant, setSelectedTenant] = useState<PlatformTenantDto | null>(null);
  const [etablissements, setEtablissements] = useState<PlatformEtablissementDto[]>([]);
  const [loadingEtabs, setLoadingEtabs] = useState(false);
  const [etabsError, setEtabsError] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [moduleDraft, setModuleDraft] = useState<ModuleKey[]>([]);

  function patchTenant(id: string, patch: Partial<PlatformTenantDto>) {
    setTenants((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSelectedTenant((t) => (t && t.id === id ? { ...t, ...patch } : t));
  }

  async function recordPayment(tenant: PlatformTenantDto) {
    setActionBusy('payment');
    setFeedback(null);
    try {
      const res = await apiPost<PlatformPaymentResultDto>(`/api/platform/tenants/${tenant.id}/payment`, {});
      patchTenant(tenant.id, {
        subscriptionStatus: res.subscriptionStatus,
        subscriptionDueDate: res.subscriptionDueDate,
      });
      setFeedback({ kind: 'ok', text: `Paiement enregistré — échéance reportée au ${formatDate(res.subscriptionDueDate)}.` });
    } catch (err) {
      setFeedback({ kind: 'err', text: (err as ApiError).message || 'Échec de l’enregistrement du paiement.' });
    } finally {
      setActionBusy(null);
    }
  }

  async function changePlan(tenant: PlatformTenantDto, plan: Plan) {
    if (plan === tenant.plan) return;
    setActionBusy('plan');
    setFeedback(null);
    try {
      await apiPost(`/api/platform/tenants/${tenant.id}/plan`, { plan });
      patchTenant(tenant.id, { plan });
      setFeedback({ kind: 'ok', text: `Plan changé en ${plan}.` });
    } catch (err) {
      setFeedback({ kind: 'err', text: (err as ApiError).message || 'Échec du changement de plan.' });
    } finally {
      setActionBusy(null);
    }
  }

  async function setStatus(tenant: PlatformTenantDto, status: SubscriptionStatus) {
    setActionBusy('status');
    setFeedback(null);
    try {
      await apiPost(`/api/platform/tenants/${tenant.id}/status`, { status });
      patchTenant(tenant.id, { subscriptionStatus: status });
      setFeedback({ kind: 'ok', text: `Statut mis à jour : ${STATUS_LABELS[status]}.` });
    } catch (err) {
      setFeedback({ kind: 'err', text: (err as ApiError).message || 'Échec du changement de statut.' });
    } finally {
      setActionBusy(null);
    }
  }

  async function runOverdue() {
    setActionBusy('overdue');
    setFeedback(null);
    try {
      const res = await apiPost<PlatformOverdueResultDto>('/api/platform/billing/run-overdue', {});
      setFeedback({
        kind: 'ok',
        text:
          res.markedPastDue === 0
            ? 'Facturation passée : aucun nouvel impayé.'
            : `Facturation passée : ${res.markedPastDue} entreprise(s) marquée(s) impayée(s).`,
      });
      await loadTenants();
    } catch (err) {
      setFeedback({ kind: 'err', text: (err as ApiError).message || 'Échec de la relève des impayés.' });
    } finally {
      setActionBusy(null);
    }
  }

  function toggleModule(mod: ModuleKey) {
    setModuleDraft((d) => (d.includes(mod) ? d.filter((m) => m !== mod) : [...d, mod]));
  }

  async function saveModules(tenant: PlatformTenantDto) {
    setActionBusy('modules');
    setFeedback(null);
    try {
      await apiPatch(`/api/platform/tenants/${tenant.id}/modules`, { modules: moduleDraft });
      patchTenant(tenant.id, { moduleAddons: moduleDraft });
      setFeedback({ kind: 'ok', text: 'Modules à la carte mis à jour (effet immédiat).' });
    } catch (err) {
      setFeedback({ kind: 'err', text: (err as ApiError).message || 'Échec de la mise à jour des modules.' });
    } finally {
      setActionBusy(null);
    }
  }

  async function loadTenants() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PlatformTenantDto[]>('/api/platform/tenants');
      setTenants(data);
    } catch (err) {
      setError((err as ApiError).message || 'Impossible de récupérer la liste des entreprises.');
    } finally {
      setLoading(false);
    }
  }

  async function loadEtablissements(tenant: PlatformTenantDto) {
    setSelectedTenant(tenant);
    setModuleDraft(tenant.moduleAddons);
    setFeedback(null);
    setLoadingEtabs(true);
    setEtabsError(null);
    setEtablissements([]);
    try {
      const data = await apiGet<PlatformEtablissementDto[]>(`/api/platform/tenants/${tenant.id}/etablissements`);
      setEtablissements(data);
    } catch (err) {
      setEtabsError((err as ApiError).message || 'Impossible de charger les établissements.');
    } finally {
      setLoadingEtabs(false);
    }
  }

  useEffect(() => {
    void loadTenants();
  }, []);

  const filteredTenants = tenants.filter(
    (t) => t.nom.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Entreprises</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Supervisez les boutiques, abonnements et points de vente enregistrés sur Wilinwi.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={runOverdue}
            disabled={loading || actionBusy !== null}
            className="flex items-center gap-1.5"
            title="Marque en impayé les abonnements dont l’échéance est dépassée"
          >
            <AlertTriangle className={`h-4 w-4 ${actionBusy === 'overdue' ? 'animate-pulse' : ''}`} />
            Lancer la facturation
          </Button>
          <Button variant="outline" size="sm" onClick={loadTenants} disabled={loading} className="flex items-center gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            feedback.kind === 'ok' ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'
          }`}
        >
          <span className="font-medium">{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="shrink-0 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between gap-4 border-b border-border p-4">
              <h2 className="flex items-center gap-2 text-base font-bold">
                🏢 Entreprises enregistrées
                {!loading && <Badge variant="neutral">{filteredTenants.length}</Badge>}
              </h2>
              <div className="relative w-full max-w-[260px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  placeholder="Rechercher boutique..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 py-1 pl-9 pr-4 text-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="mt-3 text-sm">Chargement des données de la plateforme...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-danger">
                <p className="font-semibold">{error}</p>
                <Button variant="outline" size="sm" onClick={loadTenants} className="mt-4">
                  Réessayer
                </Button>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-secondary">
                Aucune boutique ne correspond à vos critères.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-hover/50 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      <th className="p-4">Boutique</th>
                      <th className="p-4">Plan</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4">Utilisateurs / Etabs</th>
                      <th className="p-4">Créée le</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((t) => {
                      const isSelected = selectedTenant?.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => loadEtablissements(t)}
                          className={`cursor-pointer border-b border-border transition-colors hover:bg-surface-hover ${
                            isSelected ? 'border-l-4 border-l-primary bg-primary/5' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="font-extrabold text-text-primary">{t.nom}</div>
                            <div className="mt-0.5 max-w-[150px] truncate font-mono text-[10px] text-text-secondary">{t.id}</div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                t.plan === 'STARTER' ? 'neutral' : t.plan === 'PRO' ? 'brand' : t.plan === 'BUSINESS' ? 'warning' : 'success'
                              }
                            >
                              {t.plan}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={STATUS_TONE[t.subscriptionStatus]}>{STATUS_LABELS[t.subscriptionStatus]}</Badge>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-start gap-3">
                              <span className="flex items-center gap-1 font-semibold text-text-primary" title="Utilisateurs actifs">
                                <Users className="h-3.5 w-3.5 text-text-secondary" /> {t.activeUsersCount}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-text-primary" title="Établissements">
                                <Store className="h-3.5 w-3.5 text-text-secondary" /> {t.etablissementsCount}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-xs text-text-secondary">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-text-secondary/60" />
                              {new Date(t.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <ChevronRight className={`h-4 w-4 text-text-secondary transition-transform ${isSelected ? 'translate-x-1 text-primary' : ''}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div>
          {selectedTenant ? (
            <Card className="sticky top-20 border-primary/20 bg-gradient-to-b from-surface to-surface/90 shadow-md">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h3 className="text-sm font-extrabold text-text-primary">Détails de l&apos;entreprise</h3>
                  <p className="mt-0.5 max-w-[180px] truncate text-xs text-text-secondary">{selectedTenant.nom}</p>
                </div>
                <button onClick={() => setSelectedTenant(null)} className="rounded p-1 text-text-secondary hover:bg-surface-hover">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-hover/30 p-3 text-xs">
                  <div>
                    <div className="font-medium text-text-secondary">Plan en cours</div>
                    <div className="mt-1 font-bold text-text-primary">{selectedTenant.plan}</div>
                  </div>
                  <div>
                    <div className="font-medium text-text-secondary">Statut abt.</div>
                    <div className="mt-1">
                      <Badge variant={STATUS_TONE[selectedTenant.subscriptionStatus]}>
                        {STATUS_LABELS[selectedTenant.subscriptionStatus]}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-span-2 mt-1 border-t border-border/50 pt-2">
                    <div className="font-medium text-text-secondary">Propriétaire (OWNER)</div>
                    <div className="mt-1 font-bold text-text-primary">{selectedTenant.ownerName ?? '—'}</div>
                    {selectedTenant.ownerEmail && (
                      <a
                        href={`mailto:${selectedTenant.ownerEmail}`}
                        className="mt-0.5 block break-all font-mono text-[10px] text-primary hover:underline"
                      >
                        {selectedTenant.ownerEmail}
                      </a>
                    )}
                  </div>
                  <div className="col-span-2 mt-1 border-t border-border/50 pt-2">
                    <div className="font-medium text-text-secondary">Identifiant unique (ID)</div>
                    <div className="mt-1 select-all break-all font-mono text-[10px] text-text-primary">{selectedTenant.id}</div>
                  </div>
                </div>

                {/* Facturation */}
                <div className="space-y-3 rounded-lg border border-border bg-surface-hover/20 p-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Facturation
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-1 font-medium text-text-secondary">
                        <Clock className="h-3.5 w-3.5" /> Échéance
                      </div>
                      <div className="mt-1 font-bold text-text-primary">{formatDate(selectedTenant.subscriptionDueDate)}</div>
                      {(() => {
                        const d = daysUntil(selectedTenant.subscriptionDueDate);
                        if (d === null) return null;
                        return (
                          <div className={`mt-0.5 text-[10px] font-semibold ${d < 0 ? 'text-danger' : d <= 7 ? 'text-warning' : 'text-text-secondary'}`}>
                            {d < 0 ? `En retard de ${Math.abs(d)} j` : d === 0 ? "Aujourd'hui" : `Dans ${d} j`}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <div className="font-medium text-text-secondary">Cycle</div>
                      <div className="mt-1 font-bold text-text-primary">
                        {selectedTenant.billingCycle === 'YEARLY' ? 'Annuel' : 'Mensuel'}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => recordPayment(selectedTenant)}
                    disabled={actionBusy !== null}
                    className="flex w-full items-center justify-center gap-1.5"
                  >
                    <CreditCard className="h-4 w-4" />
                    {actionBusy === 'payment' ? 'Enregistrement…' : 'Enregistrer un règlement'}
                  </Button>

                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-text-secondary">Changer de plan</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PLANS.map((p) => (
                        <button
                          key={p}
                          onClick={() => changePlan(selectedTenant, p)}
                          disabled={actionBusy !== null || p === selectedTenant.plan}
                          className={`rounded-md border px-2 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-100 ${
                            p === selectedTenant.plan
                              ? 'cursor-default border-primary bg-primary/10 text-primary'
                              : 'border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-text-primary disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-text-secondary'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedTenant.subscriptionStatus === 'CANCELLED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus(selectedTenant, 'ACTIVE')}
                      disabled={actionBusy !== null}
                      className="flex w-full items-center justify-center gap-1.5 border-success/40 text-success hover:bg-success/5"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Réactiver l&apos;abonnement
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus(selectedTenant, 'CANCELLED')}
                      disabled={actionBusy !== null}
                      className="flex w-full items-center justify-center gap-1.5 border-danger/40 text-danger hover:bg-danger/5"
                    >
                      <Ban className="h-4 w-4" />
                      Suspendre l&apos;abonnement
                    </Button>
                  )}
                </div>

                {/* Modules à la carte */}
                {(() => {
                  const planSet = new Set(PLAN_MODULES[selectedTenant.plan]);
                  const dirty = [...moduleDraft].sort().join(',') !== [...selectedTenant.moduleAddons].sort().join(',');
                  return (
                    <div className="space-y-3 rounded-lg border border-border bg-surface-hover/20 p-3">
                      <h4 className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                        <Puzzle className="h-4 w-4 text-primary" />
                        Modules à la carte
                      </h4>
                      <div className="space-y-1.5">
                        {MODULES.map((mod) => {
                          const included = planSet.has(mod);
                          const active = included || moduleDraft.includes(mod);
                          return (
                            <button
                              key={mod}
                              type="button"
                              disabled={included || actionBusy !== null}
                              onClick={() => toggleModule(mod)}
                              className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                                active ? 'border-primary/30 bg-primary/5 text-text-primary' : 'border-border bg-surface text-text-secondary hover:border-primary/40'
                              } ${included ? 'cursor-default opacity-90' : ''}`}
                            >
                              <span className="font-medium">{MODULE_LABELS[mod]}</span>
                              {included ? (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-text-secondary">
                                  <Lock className="h-3 w-3" /> Inclus
                                </span>
                              ) : (
                                <span className={`relative h-4 w-7 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-border'}`}>
                                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${active ? 'left-3.5' : 'left-0.5'}`} />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-text-secondary">
                        Activés en plus du plan. Neutralisés automatiquement si l&apos;abonnement est impayé (J+7).
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => saveModules(selectedTenant)}
                        disabled={!dirty || actionBusy !== null}
                        className="flex w-full items-center justify-center gap-1.5"
                      >
                        <Save className="h-4 w-4" />
                        {actionBusy === 'modules' ? 'Enregistrement…' : 'Enregistrer les modules'}
                      </Button>
                    </div>
                  );
                })()}

                {/* Établissements */}
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <Store className="h-4 w-4 text-primary" />
                    Points de vente ({etablissements.length})
                  </h4>
                  {loadingEtabs ? (
                    <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span className="mt-2 text-xs">Chargement des établissements...</span>
                    </div>
                  ) : etabsError ? (
                    <div className="py-4 text-center text-xs text-danger">{etabsError}</div>
                  ) : etablissements.length === 0 ? (
                    <div className="py-6 text-center text-xs italic text-text-secondary">
                      Aucun établissement trouvé pour cette boutique.
                    </div>
                  ) : (
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                      {etablissements.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 shadow-sm transition-all hover:border-primary/20"
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/5 text-primary">
                              <MapPin className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-extrabold text-text-primary">{e.nom}</div>
                              <div className="mt-0.5 text-[10px] font-semibold uppercase text-text-secondary">{e.type}</div>
                            </div>
                          </div>
                          <Badge variant={e.actif ? 'success' : 'neutral'}>{e.actif ? 'Actif' : 'Désactivé'}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex h-[350px] flex-col items-center justify-center border-2 border-dashed p-8 text-center text-text-secondary">
              <Building2 className="h-10 w-10 stroke-1 text-text-secondary/40" />
              <h3 className="mt-3 text-sm font-bold text-text-primary">Aucune sélection</h3>
              <p className="mt-1 max-w-[200px] text-xs">
                Cliquez sur une entreprise dans la liste pour voir ses établissements et ses détails opérationnels.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
