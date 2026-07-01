/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Abonnements : plans/tarifs/limites éditables + échéances à venir.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { PlanEditor } from '../plan-editor';
import { ExpiringSubscriptions } from '../expiring-subscriptions';

export default function AbonnementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Abonnements</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Tarifs et limites par plan (éditables, effet immédiat) et abonnements arrivant à échéance.
        </p>
      </div>
      <ExpiringSubscriptions days={30} />
      <PlanEditor />
    </div>
  );
}
