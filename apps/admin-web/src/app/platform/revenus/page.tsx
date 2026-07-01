/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Revenus : MRR, ARR, ARPU, LTV, churn (proxy snapshot).
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, Users, RefreshCw, UserMinus, Repeat } from 'lucide-react';
import { Card, StatCard, formatFCFA } from '@wilinwi/ui';
import type { PlatformRevenueDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';

export default function RevenusPage() {
  const [data, setData] = useState<PlatformRevenueDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiGet<PlatformRevenueDto>('/api/platform/revenue');
        if (!cancelled) setData(r);
      } catch (e) {
        if (!cancelled) setError((e as ApiError).message || 'Indicateurs indisponibles.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Revenus</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Vue financière de la plateforme (abonnements actifs). Churn = proxy instantané (annulés / total).
        </p>
      </div>

      {error ? (
        <Card className="p-6 text-center text-danger">{error}</Card>
      ) : loading || !data ? (
        <Card className="flex items-center justify-center py-16 text-text-secondary">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="MRR" value={formatFCFA(data.mrr)} hint="Revenu mensuel récurrent" icon={<Wallet className="h-4.5 w-4.5" />} accent="emerald" />
            <StatCard label="ARR" value={formatFCFA(data.arr)} hint="Revenu annuel (MRR × 12)" icon={<TrendingUp className="h-4.5 w-4.5" />} accent="emerald" />
            <StatCard label="ARPU" value={formatFCFA(data.arpu)} hint="Revenu moyen / entreprise active" icon={<Users className="h-4.5 w-4.5" />} accent="brand" />
            <StatCard label="LTV" value={formatFCFA(data.ltv)} hint="Valeur vie client (estimée)" icon={<Repeat className="h-4.5 w-4.5" />} accent="gold" />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Actifs" value={data.active.toString()} hint="Abonnements payés" icon={<TrendingUp className="h-4.5 w-4.5" />} accent="emerald" />
            <StatCard label="En essai" value={data.trialing.toString()} hint="Comptes TRIALING" icon={<Users className="h-4.5 w-4.5" />} accent="brand" />
            <StatCard label="Annulés" value={data.cancelled.toString()} hint="Abonnements résiliés" icon={<UserMinus className="h-4.5 w-4.5" />} accent={data.cancelled > 0 ? 'gold' : 'brand'} />
            <StatCard label="Churn" value={`${(data.churnRate * 100).toFixed(1)} %`} hint="Taux de résiliation (proxy)" icon={<UserMinus className="h-4.5 w-4.5" />} accent={data.churnRate > 0.05 ? 'gold' : 'emerald'} />
          </div>

          <Card className="p-4 text-xs text-text-secondary">
            <p>
              <strong className="text-text-primary">Note méthodologie :</strong> le <strong>churn</strong> et la <strong>LTV</strong> sont
              des approximations <em>instantanées</em> (basées sur le ratio d&apos;annulés actuel), pas un calcul temporel. Un suivi exact
              nécessitera un historique d&apos;événements de facturation (table <code>billing_events</code>) — amélioration future.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
