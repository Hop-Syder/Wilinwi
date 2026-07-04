'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Capacités d'infrastructure de l'établissement courant (TDR v2).
 *   MÊME résolution que le backend (resolveEffectiveCapabilities de
 *   @wilinwi/types) : infrastructure → plan → add-ons → dunning → rôle.
 *   Le frontend ne fait que refléter l'état autorisé — l'API refuse aussi
 *   (InfraCapabilitiesGuard).
 */

import { useMemo } from 'react';
import {
  resolveEffectiveCapabilities,
  type EtablissementInfrastructure,
  type InfraCapability,
} from '@wilinwi/types';
import { useAuth } from './auth-context';

export interface InfraCapabilitiesState {
  /** Infrastructure de l'établissement courant (`null` en vue globale « Tous »). */
  infrastructure: EtablissementInfrastructure | null;
  /** Capacités effectives (union en lecture des établissements en vue globale). */
  caps: Set<InfraCapability>;
  has: (cap: InfraCapability) => boolean;
}

export function useInfraCapabilities(): InfraCapabilitiesState {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      const empty = new Set<InfraCapability>();
      return { infrastructure: null, caps: empty, has: () => false };
    }

    const isGlobalView = user.etablissementId === 'ALL' || user.etablissementId === null;
    const current = isGlobalView
      ? null
      : user.etablissements.find((e) => e.id === user.etablissementId);
    const infrastructure: EtablissementInfrastructure | null = current
      ? (current.infrastructure ?? 'RETAIL')
      : null;

    const resolveFor = (infra: EtablissementInfrastructure) =>
      resolveEffectiveCapabilities({
        infrastructure: infra,
        plan: user.plan,
        role: user.role,
        dunning: user.dunning,
      });

    // Vue globale : union en lecture des établissements accessibles (miroir de l'API).
    const caps = new Set<InfraCapability>(
      infrastructure
        ? resolveFor(infrastructure)
        : user.etablissements.flatMap((e) => resolveFor(e.infrastructure ?? 'RETAIL')),
    );

    return { infrastructure, caps, has: (cap: InfraCapability) => caps.has(cap) };
  }, [user]);
}
