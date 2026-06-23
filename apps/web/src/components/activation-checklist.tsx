'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Checklist d'activation (onboarding propriétaire) : guide les 3 premiers
 *   pas (1er produit → 1ère vente → inviter l'équipe). Progression dérivée des données
 *   réelles, masquable, persistée par tenant. Affichée au seul OWNER.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Package, ShoppingCart, Users, X, Sparkles } from 'lucide-react';
import { Card, cn } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Steps {
  product: boolean;
  sale: boolean;
  team: boolean;
}

export function ActivationChecklist() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Steps | null>(null);
  const [dismissed, setDismissed] = useState(true); // masqué tant qu'on ne sait rien

  const storageKey = user ? `wilinwi_activation_${user.tenantId}` : null;

  // Lecture de l'état « masqué » (par tenant).
  useEffect(() => {
    if (!storageKey) return;
    setDismissed(localStorage.getItem(storageKey) === 'done');
  }, [storageKey]);

  // Progression réelle : produits, ventes, collaborateurs (OWNER uniquement).
  useEffect(() => {
    if (user?.role !== 'OWNER') return;
    let cancelled = false;
    const arr = (r: PromiseSettledResult<unknown>) =>
      r.status === 'fulfilled' && Array.isArray(r.value) ? (r.value as unknown[]) : [];
    void Promise.allSettled([
      apiGet<unknown[]>('/api/stock/products'),
      apiGet<unknown[]>('/api/pos/sales'),
      apiGet<unknown[]>('/api/users'),
    ]).then(([p, s, u]) => {
      if (cancelled) return;
      setSteps({
        product: arr(p).length > 0,
        sale: arr(s).length > 0,
        team: arr(u).length > 1, // l'OWNER lui-même + au moins 1 collaborateur
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user?.role !== 'OWNER' || dismissed || !steps) return null;

  const items = [
    { ok: steps.product, label: 'Ajoutez votre premier produit', href: '/stock', icon: Package },
    { ok: steps.sale, label: 'Réalisez une première vente', href: '/pos', icon: ShoppingCart },
    { ok: steps.team, label: 'Invitez un collaborateur', href: '/parametres/utilisateurs', icon: Users },
  ];
  const count = items.filter((i) => i.ok).length;
  if (count === items.length) return null; // tout est prêt → on n'encombre plus

  const dismiss = () => {
    if (storageKey) localStorage.setItem(storageKey, 'done');
    setDismissed(true);
  };

  return (
    <Card className="relative mb-6 overflow-hidden border-brand/15 bg-gradient-to-br from-brand/5 to-white p-5">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 text-slate-400 transition-colors hover:text-slate-600"
        aria-label="Masquer la checklist"
        title="Masquer"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2">
        <span className="rounded-xl bg-brand/10 p-2 text-brand">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-brand">Configurez votre boutique</h2>
          <p className="text-sm text-slate-500">
            {count}/{items.length} étapes — quelques minutes pour être opérationnel.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 transition-all',
                  it.ok
                    ? 'border-emerald-100 bg-emerald-50/50'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand hover:shadow-sm',
                )}
              >
                {it.ok ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                )}
                <Icon className={cn('h-4 w-4 shrink-0', it.ok ? 'text-emerald-600' : 'text-slate-400')} />
                <span
                  className={cn(
                    'text-sm font-medium',
                    it.ok ? 'text-slate-400 line-through' : 'text-slate-800',
                  )}
                >
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
