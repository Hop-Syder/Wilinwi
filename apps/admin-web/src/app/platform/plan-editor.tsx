/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Éditeur super-admin des tarifs & limites par plan (Lot 2.3).
 *   Lecture via /api/plans · écriture via PATCH /api/platform/plans/:plan.
 * @created 2026-06-30
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, Save, RefreshCw, Check, RotateCcw, Sparkles } from 'lucide-react';
import { Button, Card, Badge } from '@wilinwi/ui';
import {
  PLANS,
  DEFAULT_PLAN_PRICING,
  PLAN_LIMITS,
  type Plan,
  type PlanConfigDto,
  type UpdatePlanConfigInput,
} from '@wilinwi/types';
import { apiGet, apiPatch, ApiError } from '@/lib/api';

/** Brouillon éditable : tout en chaînes pour des inputs contrôlés sans NaN. */
interface Draft {
  label: string;
  priceMonthly: string; // '' = sur devis (null)
  priceYearly: string;
  maxUsers: string; // '' = illimité (-1)
  maxEtablissements: string;
  maxDevices: string;
  maxPhotos: string; // '' = illimité (-1) · '0' = désactivé
}

const toLimitStr = (v: number) => (v < 0 ? '' : String(v));
const toPriceStr = (v: number | null) => (v === null ? '' : String(v));

function toDraft(c: PlanConfigDto): Draft {
  return {
    label: c.label,
    priceMonthly: toPriceStr(c.priceMonthly),
    priceYearly: toPriceStr(c.priceYearly),
    maxUsers: toLimitStr(c.maxUsers),
    maxEtablissements: toLimitStr(c.maxEtablissements),
    maxDevices: toLimitStr(c.maxDevices),
    maxPhotos: toLimitStr(c.maxPhotos),
  };
}

function getDefaultDraft(plan: Plan): Draft {
  const p = DEFAULT_PLAN_PRICING[plan];
  const l = PLAN_LIMITS[plan];
  return {
    label: p.label,
    priceMonthly: toPriceStr(p.priceMonthly),
    priceYearly: toPriceStr(p.priceYearly),
    maxUsers: toLimitStr(l.maxUsers),
    maxEtablissements: toLimitStr(l.maxEtablissements),
    maxDevices: toLimitStr(l.maxDevices),
    maxPhotos: toLimitStr(l.maxPhotos),
  };
}

const parseLimit = (s: string) => (s.trim() === '' ? -1 : Math.trunc(Number(s)));
const parsePrice = (s: string) => (s.trim() === '' ? null : Math.trunc(Number(s)));

function draftToInput(d: Draft): UpdatePlanConfigInput {
  return {
    label: d.label.trim(),
    priceMonthly: parsePrice(d.priceMonthly),
    priceYearly: parsePrice(d.priceYearly),
    maxUsers: parseLimit(d.maxUsers),
    maxEtablissements: parseLimit(d.maxEtablissements),
    maxDevices: parseLimit(d.maxDevices),
    maxPhotos: parseLimit(d.maxPhotos), // vide = illimité (-1) · 0 = désactivé
  };
}

const inputCls =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none';

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'number',
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-[11px] font-medium text-text-secondary">
        <span>{label}</span>
        {suffix && <span className="text-[10px] text-slate-400">{suffix}</span>}
      </div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} mt-0.5 font-medium`}
      />
    </label>
  );
}

export function PlanEditor() {
  const [drafts, setDrafts] = useState<Record<Plan, Draft> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Plan | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savedPlan, setSavedPlan] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const plans = await apiGet<PlanConfigDto[]>('/api/plans');
      const byPlan = {} as Record<Plan, Draft>;
      for (const p of PLANS) {
        const found = plans?.find((item) => item.plan === p);
        byPlan[p] = found ? toDraft(found) : getDefaultDraft(p);
      }
      setDrafts(byPlan);
    } catch {
      // Fallback gracieux sur les valeurs officielles du business plan
      const byPlan = {} as Record<Plan, Draft>;
      for (const p of PLANS) {
        byPlan[p] = getDefaultDraft(p);
      }
      setDrafts(byPlan);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patch(plan: Plan, field: keyof Draft, value: string) {
    setDrafts((d) => (d ? { ...d, [plan]: { ...d[plan], [field]: value } } : d));
    setSavedPlan(null);
  }

  function resetToBusinessPlan() {
    const byPlan = {} as Record<Plan, Draft>;
    for (const p of PLANS) {
      byPlan[p] = getDefaultDraft(p);
    }
    setDrafts(byPlan);
    setSavedPlan(null);
  }

  async function save(plan: Plan) {
    if (!drafts) return;
    setSaving(plan);
    setError(null);
    setSavedPlan(null);
    try {
      const updated = await apiPatch<PlanConfigDto>(`/api/platform/plans/${plan}`, draftToInput(drafts[plan]));
      setDrafts((d) => (d ? { ...d, [plan]: toDraft(updated) } : d));
      setSavedPlan(plan);
    } catch (e) {
      setError((e as ApiError).message || 'Échec de l’enregistrement.');
    } finally {
      setSaving(null);
    }
  }

  async function saveAll() {
    if (!drafts) return;
    setSavingAll(true);
    setError(null);
    try {
      for (const plan of PLANS) {
        const updated = await apiPatch<PlanConfigDto>(`/api/platform/plans/${plan}`, draftToInput(drafts[plan]));
        setDrafts((d) => (d ? { ...d, [plan]: toDraft(updated) } : d));
      }
      setSavedPlan('ALL');
      setTimeout(() => setSavedPlan(null), 3000);
    } catch (e) {
      setError((e as ApiError).message || 'Échec de l’enregistrement complet des plans.');
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <Card>
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4.5 w-4.5 text-primary" />
            Plans &amp; Tarifs du Business Plan
          </h2>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Prix en FCFA (vide = « sur devis » · limite vide = « illimité »). Modèle officiel dès 10 000 FCFA/mois.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToBusinessPlan}
            className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200"
            title="Réinitialise le formulaire avec la grille tarifaire officielle du Business Plan"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Grille Business Plan
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={saveAll}
            disabled={savingAll || loading || !drafts}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            {savingAll ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : savedPlan === 'ALL' ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-300" /> Tout enregistré
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Tout enregistrer
              </>
            )}
          </Button>
        </div>
      </div>

      {error && <div className="px-4 pt-3 text-sm text-danger">{error}</div>}

      {loading || !drafts ? (
        <div className="flex items-center justify-center py-12 text-text-secondary">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const d = drafts[plan];
            const official = DEFAULT_PLAN_PRICING[plan];

            return (
              <div key={plan} className="rounded-xl border border-border bg-surface-hover/20 p-3 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-text-primary">
                      {plan}
                    </span>
                    <Badge variant={plan === 'BUSINESS' ? 'brand' : plan === 'PRO' ? 'neutral' : 'outline'}>
                      {official.priceMonthly ? `${official.priceMonthly.toLocaleString('fr-FR')} F/m` : 'Sur devis'}
                    </Badge>
                  </div>

                  <Field label="Libellé" type="text" value={d.label} onChange={(v) => patch(plan, 'label', v)} />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Field
                      label="Prix /mois"
                      value={d.priceMonthly}
                      placeholder="Sur devis"
                      suffix="FCFA"
                      onChange={(v) => patch(plan, 'priceMonthly', v)}
                    />
                    <Field
                      label="Prix /an"
                      value={d.priceYearly}
                      placeholder="Sur devis"
                      suffix="FCFA"
                      onChange={(v) => patch(plan, 'priceYearly', v)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Utilisateurs" value={d.maxUsers} placeholder="Illimité" onChange={(v) => patch(plan, 'maxUsers', v)} />
                    <Field label="Établissements" value={d.maxEtablissements} placeholder="Illimité" onChange={(v) => patch(plan, 'maxEtablissements', v)} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Appareils" value={d.maxDevices} placeholder="Illimité" onChange={(v) => patch(plan, 'maxDevices', v)} />
                    <Field label="Photos/produit" value={d.maxPhotos} placeholder="Illimité" onChange={(v) => patch(plan, 'maxPhotos', v)} />
                  </div>
                </div>

                <Button
                  variant={savedPlan === plan ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => save(plan)}
                  disabled={saving !== null || savingAll}
                  className="w-full flex items-center justify-center gap-1.5 mt-2"
                >
                  {saving === plan ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : savedPlan === plan ? (
                    <>
                      <Check className="h-4 w-4 text-success" /> Enregistré
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Enregistrer {plan}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

