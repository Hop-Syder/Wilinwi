'use client';

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
} from 'lucide-react';
import { PLAN_MODULES, type ModuleKey, type Plan } from '@wilinwi/types';
import { Badge, cn } from '@wilinwi/ui';
import { useAuth } from '@/lib/auth-context';

interface ModuleDef {
  key: ModuleKey;
  label: string;
  desc: string;
  href: string | null;
  icon: typeof Package;
  accent: string;
}

const MODULES: ModuleDef[] = [
  { key: 'POS', label: 'Caisse', desc: 'Vendre, encaisser, négocier', href: '/pos', icon: ShoppingCart, accent: 'bg-emerald-50 text-emerald-700' },
  { key: 'STOCK', label: 'Stock', desc: 'Produits, prix, inventaire', href: '/stock', icon: Package, accent: 'bg-brand-50 text-brand' },
  { key: 'ANALYTICS', label: 'Analytics', desc: 'Tableau de bord & rapports', href: '/dashboard', icon: BarChart3, accent: 'bg-gold-50 text-gold-700' },
  { key: 'PAY', label: 'Pay', desc: 'Mobile Money, trésorerie', href: null, icon: CreditCard, accent: 'bg-slate-100 text-slate-500' },
  { key: 'CRM', label: 'CRM', desc: 'Clients, crédits, fidélité', href: null, icon: Users, accent: 'bg-slate-100 text-slate-500' },
  { key: 'MARKET', label: 'Market', desc: 'Catalogue WhatsApp', href: null, icon: Store, accent: 'bg-slate-100 text-slate-500' },
  { key: 'AI', label: 'AI', desc: 'Assistant intelligent', href: null, icon: Sparkles, accent: 'bg-slate-100 text-slate-500' },
];

function isIncluded(plan: Plan, key: ModuleKey) {
  return PLAN_MODULES[plan].includes(key);
}

export default function HubPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand">Vos modules Wilinwi</h1>
      <p className="mt-1 text-sm text-slate-500">
        Plan <span className="font-semibold uppercase">{user.plan}</span> · un seul compte pour tout
        votre commerce.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const included = isIncluded(user.plan, m.key);
          const available = included && m.href;
          const Icon = m.icon;
          const content = (
            <div
              className={cn(
                'group relative h-full rounded-2xl border bg-white p-5 shadow-sm transition-all',
                available
                  ? 'cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:shadow-md'
                  : 'border-dashed border-slate-200 opacity-70',
              )}
            >
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
              <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">
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
  );
}
