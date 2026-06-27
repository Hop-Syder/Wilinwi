'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend (Route: (app))
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  CreditCard,
  Users,
  Store,
  BarChart3,
  Sparkles,
  Lock,
  Truck,
} from 'lucide-react';
import { PLAN_MODULES, type ModuleKey, type Plan } from '@wilinwi/types';
import { Badge, cn } from '@wilinwi/ui';
import { useAuth } from '@/lib/auth-context';
import { ActivationChecklist } from '@/components/activation-checklist';
import { WaveHome } from '@/components/wave-home';

interface ModuleDef {
  key: ModuleKey;
  label: string;
  desc: string;
  href: string | null;
  icon: typeof Package;
  accent: string;
}

const MODULES: ModuleDef[] = [
  {
    key: 'POS',
    label: 'Caisse',
    desc: 'Vendre, encaisser, négocier',
    href: '/pos',
    icon: ShoppingCart,
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    key: 'STOCK',
    label: 'Stock',
    desc: 'Produits, prix, inventaire',
    href: '/stock',
    icon: Package,
    accent: 'bg-brand-50 text-brand',
  },
  {
    key: 'ANALYTICS',
    label: 'Analytics',
    desc: 'Tableau de bord & rapports',
    href: '/dashboard',
    icon: BarChart3,
    accent: 'bg-gold-50 text-gold-700',
  },
  {
    key: 'PAY',
    label: 'Pay',
    desc: 'Mobile Money, trésorerie',
    href: '/tresorerie',
    icon: CreditCard,
    accent: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'CRM',
    label: 'CRM',
    desc: 'Clients, crédits, fidélité',
    href: '/clients',
    icon: Users,
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    key: 'MARKET',
    label: 'Market',
    desc: 'Catalogue WhatsApp',
    href: null,
    icon: Store,
    accent: 'bg-green-50 text-green-600',
  },
  {
    key: 'AI',
    label: 'AI',
    desc: 'Assistant intelligent',
    href: null,
    icon: Sparkles,
    accent: 'bg-purple-50 text-purple-700',
  },
];

function isIncluded(plan: Plan, key: ModuleKey) {
  return PLAN_MODULES[plan].includes(key);
}

export default function HubPage() {
  const { user } = useAuth();
  if (!user) return null;

  // Le livreur n'a qu'un seul module : on l'envoie directement vers ses livraisons.
  if (user.role === 'DELIVERY') {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Truck className="h-8 w-8" />
        </span>
        <h1 className="font-display text-2xl font-bold text-brand">Bonjour 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Consultez les livraisons qui vous sont assignées.</p>
        <Link
          href="/livraisons"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <Truck className="h-5 w-5" /> Mes livraisons
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ActivationChecklist />

      {/* 📱 Mobile : accueil « Wave » (hero + Vendre + raccourcis) */}
      <div className="sm:hidden">
        <WaveHome />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const included = isIncluded(user.plan, m.key);
          const available = included && m.href;
          const Icon = m.icon;
          const content = (
            <div
              className={cn(
                'group relative h-full rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 overflow-hidden',
                available
                  ? 'cursor-pointer border-slate-200/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/5 hover:border-brand/20'
                  : 'border-dashed border-slate-200 opacity-70',
              )}
            >
              {/* Ligne de dégradé au sommet au survol */}
              {available && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#12355B] via-[#00A86B] to-[#F59E0B] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              )}

              <div className="flex items-start justify-between">
                <span className={cn('rounded-xl p-3', m.accent)}>
                  <Icon className="h-6 w-6" />
                </span>
                {!included ? (
                  <Badge tone="warning">
                    <Lock className="h-3 w-3" /> À débloquer
                  </Badge>
                ) : !m.href ? (
                  <Badge tone="neutral">Bientôt</Badge>
                ) : (
                  <Badge tone="success">Actif</Badge>
                )}
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold text-slate-900 transition-colors duration-200 group-hover:text-brand">
                Wilinwi {m.label}
              </h2>
              <p className="text-sm text-slate-500">{m.desc}</p>
            </div>
          );

          return available ? (
            <Link key={m.key} href={m.href!}>
              {content}
            </Link>
          ) : (
            <div key={m.key}>{content}</div>
          );
        })}
      </div>
    </div>
    </div >
  );
}
