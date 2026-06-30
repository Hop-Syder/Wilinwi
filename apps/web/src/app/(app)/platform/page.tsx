/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Console Platform Super-admin pour superviser toutes les entreprises de Wilinwi.
 * @created 2026-06-29
 * @updated 2026-06-29
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
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
  ShieldCheck,
  ChevronRight,
  X,
  RefreshCw,
  Sparkles,
  MapPin,
  CreditCard,
  Clock,
  AlertTriangle,
  Ban,
  PlayCircle,
  Puzzle,
  Lock,
  Save
} from 'lucide-react';
import { Button, Card, Badge, Input, StatCard } from '@wilinwi/ui';
import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';
import { PlanEditor } from './plan-editor';
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

/** Jours restants (négatif = en retard) jusqu'à l'échéance. */
function daysUntil(value: string | Date | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default function PlatformPage() {
  const [tenants, setTenants] = useState<PlatformTenantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Détails du tenant sélectionné
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenantDto | null>(null);
  const [etablissements, setEtablissements] = useState<PlatformEtablissementDto[]>([]);
  const [loadingEtabs, setLoadingEtabs] = useState(false);
  const [etabsError, setEtabsError] = useState<string | null>(null);

  // Facturation (actions super-admin)
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Modules « à la carte » (brouillon éditable du tenant sélectionné)
  const [moduleDraft, setModuleDraft] = useState<ModuleKey[]>([]);

  /** Remplace localement un tenant mis à jour (liste + sélection) sans recharger tout. */
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

  const filteredTenants = tenants.filter(t => 
    t.nom.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  // Statistiques calculées
  const totalTenants = tenants.length;
  const totalUsers = tenants.reduce((acc, t) => acc + Number(t.activeUsersCount), 0);
  const totalEtabs = tenants.reduce((acc, t) => acc + Number(t.etablissementsCount), 0);
  const premiumTenants = tenants.filter(t => t.plan !== 'STARTER').length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight">Console Plateforme</h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
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
          <Button
            variant="outline"
            size="sm"
            onClick={loadTenants}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            feedback.kind === 'ok'
              ? 'border-success/30 bg-success/5 text-success'
              : 'border-danger/30 bg-danger/5 text-danger'
          }`}
        >
          <span className="font-medium">{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="shrink-0 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cartes KPI (Premium Black Luxury Design) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Boutiques"
          value={loading ? '...' : totalTenants.toString()}
          hint="Inscrites sur la plateforme"
          icon={<Building2 className="h-4.5 w-4.5" />}
          accent="brand"
        />
        <StatCard
          label="Collaborateurs"
          value={loading ? '...' : totalUsers.toString()}
          hint="Utilisateurs actifs"
          icon={<Users className="h-4.5 w-4.5" />}
          accent="brand"
        />
        <StatCard
          label="Points de Vente"
          value={loading ? '...' : totalEtabs.toString()}
          hint="Établissements physiques"
          icon={<Store className="h-4.5 w-4.5" />}
          accent="emerald"
        />
        <StatCard
          label="Abonnements Payants"
          value={loading ? '...' : premiumTenants.toString()}
          hint="Plans Pro / Business / Enterprise"
          icon={<Sparkles className="h-4.5 w-4.5" />}
          accent="gold"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Liste des entreprises (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="p-4 border-b border-border flex items-center justify-between gap-4">
              <h2 className="font-bold text-base flex items-center gap-2">
                🏢 Entreprises enregistrées
                {!loading && <Badge variant="neutral">{filteredTenants.length}</Badge>}
              </h2>
              {/* Barre de recherche */}
              <div className="relative w-full max-w-[260px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  placeholder="Rechercher boutique..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-1 h-9 text-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm mt-3">Chargement des données de la plateforme...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-danger">
                <p className="font-semibold">{error}</p>
                <Button variant="outline" size="sm" onClick={loadTenants} className="mt-4">
                  Réessayer
                </Button>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="py-16 text-center text-text-secondary text-sm">
                Aucune boutique ne correspond à vos critères.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
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
                    {filteredTenants.map(t => {
                      const isSelected = selectedTenant?.id === t.id;
                      return (
                        <tr 
                          key={t.id} 
                          onClick={() => loadEtablissements(t)}
                          className={`border-b border-border hover:bg-surface-hover cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="font-extrabold text-text-primary">{t.nom}</div>
                            <div className="text-[10px] text-text-secondary font-mono mt-0.5 truncate max-w-[150px]">{t.id}</div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                t.plan === 'STARTER' ? 'neutral' :
                                t.plan === 'PRO' ? 'brand' :
                                t.plan === 'BUSINESS' ? 'warning' : 'success'
                              }
                            >
                              {t.plan}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={STATUS_TONE[t.subscriptionStatus]}>
                              {STATUS_LABELS[t.subscriptionStatus]}
                            </Badge>
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
                          <td className="p-4 text-text-secondary text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-text-secondary/60" />
                              {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <ChevronRight className={`h-4 w-4 transition-transform text-text-secondary ${isSelected ? 'translate-x-1 text-primary' : ''}`} />
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

        {/* Détails du tenant sélectionné (Col 3) */}
        <div>
          {selectedTenant ? (
            <Card className="sticky top-20 border-primary/20 bg-gradient-to-b from-surface to-surface/90 shadow-md">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-text-primary">Détails de l&apos;entreprise</h3>
                  <p className="text-xs text-text-secondary mt-0.5 truncate max-w-[180px]">{selectedTenant.nom}</p>
                </div>
                <button 
                  onClick={() => setSelectedTenant(null)}
                  className="rounded p-1 hover:bg-surface-hover text-text-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Métadonnées de l'entreprise */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface-hover/30 p-3 rounded-lg border border-border">
                  <div>
                    <div className="text-text-secondary font-medium">Plan en cours</div>
                    <div className="font-bold text-text-primary mt-1">{selectedTenant.plan}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary font-medium">Statut abt.</div>
                    <div className="mt-1">
                      <Badge variant={STATUS_TONE[selectedTenant.subscriptionStatus]}>
                        {STATUS_LABELS[selectedTenant.subscriptionStatus]}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border/50 mt-1">
                    <div className="text-text-secondary font-medium">Identifiant unique (ID)</div>
                    <div className="font-mono text-[10px] text-text-primary mt-1 select-all break-all">{selectedTenant.id}</div>
                  </div>
                </div>

                {/* Facturation */}
                <div className="space-y-3 rounded-lg border border-border bg-surface-hover/20 p-3">
                  <h4 className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Facturation
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-text-secondary font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Échéance
                      </div>
                      <div className="font-bold text-text-primary mt-1">{formatDate(selectedTenant.subscriptionDueDate)}</div>
                      {(() => {
                        const d = daysUntil(selectedTenant.subscriptionDueDate);
                        if (d === null) return null;
                        return (
                          <div className={`text-[10px] mt-0.5 font-semibold ${d < 0 ? 'text-danger' : d <= 7 ? 'text-warning' : 'text-text-secondary'}`}>
                            {d < 0 ? `En retard de ${Math.abs(d)} j` : d === 0 ? "Aujourd'hui" : `Dans ${d} j`}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <div className="text-text-secondary font-medium">Cycle</div>
                      <div className="font-bold text-text-primary mt-1">
                        {selectedTenant.billingCycle === 'YEARLY' ? 'Annuel' : 'Mensuel'}
                      </div>
                    </div>
                  </div>

                  {/* Enregistrer un règlement */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => recordPayment(selectedTenant)}
                    disabled={actionBusy !== null}
                    className="w-full flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="h-4 w-4" />
                    {actionBusy === 'payment' ? 'Enregistrement…' : 'Enregistrer un règlement'}
                  </Button>

                  {/* Changer de plan */}
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
                              ? 'border-primary bg-primary/10 text-primary cursor-default'
                              : 'border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-text-primary disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-text-secondary'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suspendre / Réactiver */}
                  {selectedTenant.subscriptionStatus === 'CANCELLED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus(selectedTenant, 'ACTIVE')}
                      disabled={actionBusy !== null}
                      className="w-full flex items-center justify-center gap-1.5 text-success border-success/40 hover:bg-success/5"
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
                      className="w-full flex items-center justify-center gap-1.5 text-danger border-danger/40 hover:bg-danger/5"
                    >
                      <Ban className="h-4 w-4" />
                      Suspendre l&apos;abonnement
                    </Button>
                  )}
                </div>

                {/* Modules à la carte (Lot 2.4) */}
                {(() => {
                  const planSet = new Set(PLAN_MODULES[selectedTenant.plan]);
                  const dirty =
                    [...moduleDraft].sort().join(',') !==
                    [...selectedTenant.moduleAddons].sort().join(',');
                  return (
                    <div className="space-y-3 rounded-lg border border-border bg-surface-hover/20 p-3">
                      <h4 className="font-bold text-xs text-text-primary flex items-center gap-1.5">
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
                                active
                                  ? 'border-primary/30 bg-primary/5 text-text-primary'
                                  : 'border-border bg-surface text-text-secondary hover:border-primary/40'
                              } ${included ? 'cursor-default opacity-90' : ''}`}
                            >
                              <span className="font-medium">{MODULE_LABELS[mod]}</span>
                              {included ? (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-text-secondary">
                                  <Lock className="h-3 w-3" /> Inclus
                                </span>
                              ) : (
                                <span
                                  className={`relative h-4 w-7 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-border'}`}
                                >
                                  <span
                                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${active ? 'left-3.5' : 'left-0.5'}`}
                                  />
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
                        className="w-full flex items-center justify-center gap-1.5"
                      >
                        <Save className="h-4 w-4" />
                        {actionBusy === 'modules' ? 'Enregistrement…' : 'Enregistrer les modules'}
                      </Button>
                    </div>
                  );
                })()}

                {/* Liste des points de vente (établissements) */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-primary" />
                    Points de vente ({etablissements.length})
                  </h4>

                  {loadingEtabs ? (
                    <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs mt-2">Chargement des établissements...</span>
                    </div>
                  ) : etabsError ? (
                    <div className="text-center py-4 text-xs text-danger">
                      {etabsError}
                    </div>
                  ) : etablissements.length === 0 ? (
                    <div className="text-center py-6 text-xs text-text-secondary italic">
                      Aucun établissement trouvé pour cette boutique.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {etablissements.map(e => (
                        <div 
                          key={e.id} 
                          className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl shadow-sm hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/5 text-primary shrink-0 mt-0.5">
                              <MapPin className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="font-extrabold text-xs text-text-primary truncate">{e.nom}</div>
                              <div className="text-[10px] text-text-secondary font-semibold uppercase mt-0.5">{e.type}</div>
                            </div>
                          </div>
                          <Badge variant={e.actif ? 'success' : 'neutral'}>
                            {e.actif ? 'Actif' : 'Désactivé'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center text-text-secondary h-[350px]">
              <Building2 className="h-10 w-10 text-text-secondary/40 stroke-1" />
              <h3 className="font-bold text-sm text-text-primary mt-3">Aucune sélection</h3>
              <p className="text-xs mt-1 max-w-[200px]">
                Cliquez sur une entreprise dans la liste pour voir ses établissements et ses détails opérationnels.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Plans & tarifs éditables (Lot 2.3) */}
      <PlanEditor />
    </div>
  );
}
