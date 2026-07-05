/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Éditeur super-admin des surcoûts d'infrastructure (Option C — TDR §18.1).
 *   RETAIL/SERVICE inclus (0) ; FOOD/HEALTH/WHOLESALE facturés par établissement
 *   ACTIF qui les utilise. Lecture/écriture via /api/platform/infra-pricing.
 * @created 2026-07-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { Building2, Save, RefreshCw, Check } from 'lucide-react';
import { Button, Card } from '@wilinwi/ui';
import {
  INFRASTRUCTURE_LABELS,
  type EtablissementInfrastructure,
  type InfraPricingDto,
} from '@wilinwi/types';
import { apiGet, apiPatch, ApiError } from '@/lib/api';

const inputCls =
  'w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-sm text-text-primary focus:border-primary focus:outline-none tabular';

export function InfraPricingEditor() {
  const [rows, setRows] = useState<InfraPricingDto[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<InfraPricingDto[]>('/api/platform/infra-pricing');
      setRows(data);
      setDrafts(Object.fromEntries(data.map((r) => [r.infrastructure, String(r.priceMonthly)])));
    } catch (e) {
      setError((e as ApiError).message || 'Tarifs indisponibles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(infrastructure: EtablissementInfrastructure) {
    setSaving(infrastructure);
    setError(null);
    try {
      const priceMonthly = Math.max(0, Math.trunc(Number(drafts[infrastructure] || 0)));
      const updated = await apiPatch<InfraPricingDto>(
        `/api/platform/infra-pricing/${infrastructure}`,
        { priceMonthly },
      );
      setRows((prev) => prev.map((r) => (r.infrastructure === infrastructure ? updated : r)));
      setDrafts((d) => ({ ...d, [infrastructure]: String(updated.priceMonthly) }));
      setSavedAt((s) => ({ ...s, [infrastructure]: Date.now() }));
    } catch (e) {
      setError((e as ApiError).message || 'Enregistrement impossible.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Building2 className="h-4 w-4 text-primary" /> Infrastructures — surcoût par établissement actif
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Option C (TDR §18.1) : facturé chaque mois × nombre d'établissements actifs de l'entreprise
            utilisant l'infrastructure. 0 = incluse dans tous les plans.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-surface-hover"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {error && <p className="px-4 pt-3 text-sm text-danger">{error}</p>}

      <ul className="divide-y divide-border">
        {rows.map((r) => {
          const dirty = drafts[r.infrastructure] !== String(r.priceMonthly);
          const justSaved = (Date.now() - (savedAt[r.infrastructure] ?? 0)) < 4000;
          return (
            <li key={r.infrastructure} className="flex items-center justify-between gap-3 p-4">
              <div>
                <span className="text-sm font-semibold">
                  {INFRASTRUCTURE_LABELS[r.infrastructure]}
                </span>
                <span className="ml-2 font-mono text-[11px] text-text-secondary">{r.infrastructure}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={drafts[r.infrastructure] ?? ''}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [r.infrastructure]: e.target.value }))
                  }
                  className={inputCls}
                />
                <span className="text-xs text-text-secondary">FCFA/mois</span>
                <Button
                  size="sm"
                  variant={dirty ? 'primary' : 'outline'}
                  disabled={!dirty || saving === r.infrastructure}
                  onClick={() => void save(r.infrastructure)}
                >
                  {justSaved && !dirty ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
