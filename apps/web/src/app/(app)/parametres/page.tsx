'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Paramètres du compte — gestion du plan d'abonnement et infos tenant.
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, CheckCircle2, Crown, Zap, Package2, AlertTriangle, RefreshCw, Users2, History, ChevronRight, Store } from 'lucide-react';
import { PLAN_MODULES, MODULES, type Plan, type PlanConfigDto } from '@wilinwi/types';
import { Button, Card, formatFCFA } from '@wilinwi/ui';

/** Libellé tarifaire d'un plan : `null` = sur devis · `0` = gratuit · sinon montant/mois. */
function formatPlanPrice(cfg: PlanConfigDto | undefined): string {
  if (!cfg || cfg.priceMonthly === null) return 'Sur devis';
  if (cfg.priceMonthly === 0) return 'Gratuit';
  return `${formatFCFA(cfg.priceMonthly)}/mois`;
}
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ContextualHelp } from '@/components/contextual-help';
import { ChangePasswordCard } from '@/components/change-password-card';
import type { TourStep } from '@/components/tour-guide';

interface TenantInfo {
  id: string;
  nom: string;
  plan: Plan;
  subscriptionStatus: string;
  createdAt: string;
}

const PLAN_INFO: Record<Plan, { label: string; color: string; icon: React.ElementType; desc: string; price: string }> = {
  STARTER: {
    label: 'Starter',
    color: 'text-slate-600 bg-slate-100',
    icon: Package2,
    desc: '1 établissement. Caisse, Stock & tableau de bord. Pour démarrer gratuitement.',
    price: 'Gratuit',
  },
  PRO: {
    label: 'Pro',
    color: 'text-brand bg-brand/10',
    icon: Zap,
    desc: 'Jusqu\'à 2 établissements, utilisateurs illimités, trésorerie, ardoise client.',
    price: '7 500 FCFA/mois',
  },
  BUSINESS: {
    label: 'Business',
    color: 'text-amber-700 bg-amber-50',
    icon: Crown,
    desc: 'Multi-établissements, CRM & marketing, images produits, API. Pour grandir.',
    price: '20 000 FCFA/mois',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    color: 'text-ai bg-ai/10',
    icon: Crown,
    desc: 'Établissements illimités, IA, site e-commerce, intégrations & SLA. Sur devis.',
    price: 'Sur devis',
  },
};

const MODULE_LABELS: Record<string, string> = {
  POS: 'Caisse (POS)',
  STOCK: 'Gestion Stock',
  ANALYTICS: 'Analytics & Rapports',
  PAY: 'Pay / Trésorerie',
  CRM: 'CRM Clients',
  MARKET: 'Market (WhatsApp)',
  AI: 'Assistant IA',
  DELIVERY: 'Livraisons',
};

export default function ParametresPage() {
  const { user, refreshUser } = useAuth();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [planConfigs, setPlanConfigs] = useState<Record<Plan, PlanConfigDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [t, plans] = await Promise.all([
        apiGet<TenantInfo>('/api/admin/tenant'),
        apiGet<PlanConfigDto[]>('/api/plans'),
      ]);
      setTenant(t);
      setPlanConfigs(Object.fromEntries(plans.map((p) => [p.plan, p])) as Record<Plan, PlanConfigDto>);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function changePlan(plan: Plan) {
    if (user?.role !== 'OWNER') {
      setError('Seul le propriétaire peut modifier le plan.');
      return;
    }
    setUpgrading(plan);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiPatch<{ message: string; tenant: TenantInfo }>('/api/admin/tenant/plan', { plan });
      setTenant(res.tenant);
      setSuccess(res.message);
      // Rafraîchit le contexte auth pour que le plan soit mis à jour partout
      if (refreshUser) await refreshUser();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setUpgrading(null);
    }
  }

  const currentPlan = tenant?.plan ?? user?.plan ?? 'STARTER';
  const isOwner = user?.role === 'OWNER';

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-parametres-links',
      title: 'Administration de la boutique',
      content: 'Gérez vos établissements, vos collaborateurs (rôles, PIN) et consultez le journal d\'audit de l\'équipe.',
      position: 'bottom',
    },
    {
      targetId: 'tour-parametres-plans',
      title: 'Choisir un plan',
      content: 'Chaque plan débloque des modules et des limites différentes (établissements, utilisateurs). Seul le propriétaire peut changer de plan.',
      position: 'top',
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Paramètres</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion du compte et du plan d'abonnement.</p>
        </div>
        <ContextualHelp
          storageKey="wilinwi_parametres_tour_done"
          tourSteps={tourSteps}
          useCases={[
            { title: 'Modules à la carte', description: 'Selon votre plan, certains modules (CRM, Market, IA…) sont débloqués ou non — visible dans "Modules débloqués".' },
            { title: 'Abonnement impayé', description: 'En cas d\'impayé, une relance progressive restreint puis bloque certaines fonctionnalités jusqu\'à régularisation.' },
          ]}
        />
      </div>

      {/* Accès rapides administration */}
      <div id="tour-parametres-links" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/parametres/etablissements" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
          <span className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald/10 p-2.5 text-emerald"><Store className="h-5 w-5" /></span>
            <span>
              <span className="block font-display font-semibold text-slate-800">Établissements</span>
              <span className="text-sm text-slate-500">Boutiques, points de vente, entrepôts…</span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
        <Link href="/parametres/utilisateurs" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
          <span className="flex items-center gap-3">
            <span className="rounded-xl bg-brand-50 p-2.5 text-brand"><Users2 className="h-5 w-5" /></span>
            <span>
              <span className="block font-display font-semibold text-slate-800">Utilisateurs</span>
              <span className="text-sm text-slate-500">Collaborateurs, rôles, permissions, PIN</span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
        <Link href="/parametres/journal" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
          <span className="flex items-center gap-3">
            <span className="rounded-xl bg-gold-50 p-2.5 text-gold-700"><History className="h-5 w-5" /></span>
            <span>
              <span className="block font-display font-semibold text-slate-800">Journal d'activité</span>
              <span className="text-sm text-slate-500">Audit des actions de l'équipe</span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
      </div>

      {/* Infos boutique */}
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Votre boutique</p>
          <p className="mt-1 font-display text-xl font-bold text-slate-800">
            {loading ? '…' : tenant?.nom ?? 'Boutique'}
          </p>
          <p className="text-sm text-slate-500">
            Statut : <span className="font-medium">{loading ? '…' : tenant?.subscriptionStatus}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Plan actuel</p>
          {currentPlan && (
            <span
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${PLAN_INFO[currentPlan].color}`}
            >
              {(() => { const Icon = PLAN_INFO[currentPlan].icon; return <Icon className="h-3.5 w-3.5" />; })()}
              {PLAN_INFO[currentPlan].label}
            </span>
          )}
        </div>
      </Card>

      {/* Alertes */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* Sélection du plan */}
      <div id="tour-parametres-plans">
        <h2 className="mb-3 font-display font-semibold text-slate-800">Choisir un plan</h2>
        {!isOwner && (
          <p className="mb-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Seul le propriétaire de la boutique peut changer le plan.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'] as Plan[]).map((plan) => {
            const info = PLAN_INFO[plan];
            const Icon = info.icon;
            const isCurrent = currentPlan === plan;
            const modules = PLAN_MODULES[plan];
            return (
              <div
                key={plan}
                className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
                  isCurrent
                    ? 'border-brand bg-brand/5 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {isCurrent && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
                    <CheckCircle2 className="h-3 w-3" /> Actuel
                  </span>
                )}
                <div className={`inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-semibold ${info.color} w-fit`}>
                  <Icon className="h-4 w-4" />
                  {info.label}
                </div>
                <p className="mt-3 text-sm text-slate-600">{info.desc}</p>
                <p className="mt-2 font-display text-lg font-bold text-slate-800">
                  {planConfigs ? formatPlanPrice(planConfigs[plan]) : info.price}
                </p>

                <div className="mt-4 space-y-1.5">
                  {MODULES.map((mod) => {
                    const included = modules.includes(mod);
                    return (
                      <div key={mod} className={`flex items-center gap-2 text-xs ${included ? 'text-slate-700' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${included ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {MODULE_LABELS[mod] ?? mod}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-auto pt-4">
                  {isCurrent ? (
                    <div className="w-full rounded-xl border border-brand/30 bg-brand/5 py-2 text-center text-sm font-medium text-brand">
                      Plan actif ✓
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan === 'BUSINESS' ? 'primary' : 'outline'}
                      disabled={!isOwner || upgrading !== null}
                      onClick={() => void changePlan(plan)}
                    >
                      {upgrading === plan ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Mise à jour…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          {(plan === 'BUSINESS' || plan === 'ENTERPRISE') && (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          Passer en {info.label}
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modules inclus dans le plan actuel */}
      <Card>
        <h2 className="font-display font-semibold text-slate-800">Modules débloqués</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODULES.map((mod) => {
            const included = PLAN_MODULES[currentPlan]?.includes(mod);
            return (
              <div
                key={mod}
                className={`flex items-center gap-2 rounded-xl p-2.5 text-sm ${
                  included ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {included ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0 text-center">—</span>}
                {MODULE_LABELS[mod] ?? mod}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Sécurité : changement du mot de passe de connexion */}
      <ChangePasswordCard />

    </div>
  );
}
