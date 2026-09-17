/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Abonnements : plans/tarifs/limites éditables + échéances à venir.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { Card, Badge } from '@wilinwi/ui';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { PlanEditor } from '../plan-editor';
import { InfraPricingEditor } from '../infra-pricing-editor';
import { ExpiringSubscriptions } from '../expiring-subscriptions';

export default function AbonnementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Abonnements &amp; Tarification</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Modèle économique officiel du Business Plan (dès 10 000 FCFA/mois), configuration pilotable et échéances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand" className="px-2.5 py-1 text-xs">
            <Sparkles className="h-3 w-3 mr-1" /> Grille active : Business Plan v2
          </Badge>
        </div>
      </div>

      {/* Grille de référence synthétique du Business Plan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-3.5 border-l-4 border-l-slate-400 bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">Solo</span>
          </div>
          <div className="mt-2 font-black text-lg text-text-primary">10 000 <span className="text-xs font-semibold text-text-secondary">FCFA /m</span></div>
          <p className="text-[11px] text-text-secondary mt-0.5">100 000 FCFA /an (2 mois offerts)</p>
          <div className="mt-2.5 pt-2 border-t border-border/50 text-[11px] text-text-secondary space-y-1">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> 1 boutique · 1 caisse</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> POS + Stock + WhatsApp</div>
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-primary bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Pro</span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Croissance</span>
          </div>
          <div className="mt-2 font-black text-lg text-text-primary">25 000 <span className="text-xs font-semibold text-text-secondary">FCFA /m</span></div>
          <p className="text-[11px] text-text-secondary mt-0.5">250 000 FCFA /an (2 mois offerts)</p>
          <div className="mt-2.5 pt-2 border-t border-border/50 text-[11px] text-text-secondary space-y-1">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary" /> 2 points de vente · 5 users</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary" /> Trésorerie + Crédit Client</div>
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-amber-500 bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Business</span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">Réseau</span>
          </div>
          <div className="mt-2 font-black text-lg text-text-primary">50 000 <span className="text-xs font-semibold text-text-secondary">FCFA /m</span></div>
          <p className="text-[11px] text-text-secondary mt-0.5">500 000 FCFA /an (2 mois offerts)</p>
          <div className="mt-2.5 pt-2 border-t border-border/50 text-[11px] text-text-secondary space-y-1">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-500" /> Boutiques illimitées · 15 users</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-500" /> Dépôt &amp; Dispatches multi-sites</div>
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-emerald-600 bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Enterprise</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">Sur-mesure</span>
          </div>
          <div className="mt-2 font-black text-lg text-text-primary">Sur Devis</div>
          <p className="text-[11px] text-text-secondary mt-0.5">Facturation personnalisée</p>
          <div className="mt-2.5 pt-2 border-t border-border/50 text-[11px] text-text-secondary space-y-1">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Tout illimité + Support VIP</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Intégration ERP &amp; API dédiée</div>
          </div>
        </Card>
      </div>

      <ExpiringSubscriptions days={30} />
      <PlanEditor />
      <InfraPricingEditor />
    </div>
  );
}

