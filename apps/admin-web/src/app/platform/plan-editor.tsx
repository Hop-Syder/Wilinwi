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
import { SlidersHorizontal, Save, RefreshCw, Check } from 'lucide-react';
import { Button, Card } from '@wilinwi/ui';
import { PLANS, type Plan, type PlanConfigDto, type UpdatePlanConfigInput } from '@wilinwi/types';
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} mt-0.5`}
      />
    </label>
  );
}

export function PlanEditor() {
  const [drafts, setDrafts] = useState<Record<Plan, Draft> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Plan | null>(null);
  const [savedPlan, setSavedPlan] = useState<Plan | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const plans = await apiGet<PlanConfigDto[]>('/api/plans');
      const byPlan = Object.fromEntries(plans.map((p) => [p.plan, toDraft(p)])) as Record<Plan, Draft>;
      setDrafts(byPlan);
    } catch (e) {
      setError((e as ApiError).message || 'Impossible de charger les plans.');
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

  return (
    <Card>
      <div className="p-4 border-b border-border flex items-center justify-between gap-3">
        <h2 className="font-bold text-base flex items-center gap-2">
          <SlidersHorizontal className="h-4.5 w-4.5 text-primary" />
          Plans &amp; tarifs
        </h2>
        <span className="text-[11px] text-text-secondary">
          Prix vide = « sur devis » · limite vide = « illimité »
        </span>
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
            return (
              <div key={plan} className="rounded-xl border border-border bg-surface-hover/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{plan}</span>
                </div>
                <Field label="Libellé" type="text" value={d.label} onChange={(v) => patch(plan, 'label', v)} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Prix /mois" value={d.priceMonthly} placeholder="Sur devis" onChange={(v) => patch(plan, 'priceMonthly', v)} />
                  <Field label="Prix /an" value={d.priceYearly} placeholder="Sur devis" onChange={(v) => patch(plan, 'priceYearly', v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Utilisateurs" value={d.maxUsers} placeholder="Illimité" onChange={(v) => patch(plan, 'maxUsers', v)} />
                  <Field label="Établissements" value={d.maxEtablissements} placeholder="Illimité" onChange={(v) => patch(plan, 'maxEtablissements', v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Appareils" value={d.maxDevices} placeholder="Illimité" onChange={(v) => patch(plan, 'maxDevices', v)} />
                  <Field label="Photos/produit" value={d.maxPhotos} placeholder="Illimité" onChange={(v) => patch(plan, 'maxPhotos', v)} />
                </div>
                <Button
                  variant={savedPlan === plan ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => save(plan)}
                  disabled={saving !== null}
                  className="w-full flex items-center justify-center gap-1.5"
                >
                  {saving === plan ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : savedPlan === plan ? (
                    <>
                      <Check className="h-4 w-4 text-success" /> Enregistré
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Enregistrer
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
