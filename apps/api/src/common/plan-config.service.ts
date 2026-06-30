/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service de configuration des plans (Lot 2.3) — lecture en base + cache.
 * @created 2026-06-30
 * @updated 2026-06-30
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable } from '@nestjs/common';
import { resolveLimit, type Plan, type PlanConfigDto } from '@wilinwi/types';
import { PrismaService } from './prisma.service';

/** Limites d'un plan résolues pour le runtime (`Infinity` = illimité). */
export interface ResolvedPlanLimits {
  maxUsers: number;
  maxEtablissements: number;
  maxDevices: number;
  maxPhotos: number;
}

/**
 * Source de vérité des tarifs/limites par plan. Lit la table `plan_configs`
 * (référence globale, hors RLS tenant) et cache le résultat en mémoire avec un
 * court TTL ; `invalidate()` force le rechargement après une édition super-admin.
 */
@Injectable()
export class PlanConfigService {
  private cache: PlanConfigDto[] | null = null;
  private loadedAt = 0;
  private static readonly TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  /** Toutes les configurations de plan (telles que stockées : -1 = illimité). */
  async getAll(): Promise<PlanConfigDto[]> {
    if (this.cache && Date.now() - this.loadedAt < PlanConfigService.TTL_MS) {
      return this.cache;
    }
    const rows = await this.prisma.client.planConfig.findMany();
    this.cache = rows.map((r) => ({
      plan: r.plan as Plan,
      label: r.label,
      priceMonthly: r.priceMonthly,
      priceYearly: r.priceYearly,
      maxUsers: r.maxUsers,
      maxEtablissements: r.maxEtablissements,
      maxDevices: r.maxDevices,
      maxPhotos: r.maxPhotos,
      updatedAt: r.updatedAt,
    }));
    this.loadedAt = Date.now();
    return this.cache;
  }

  /** Configuration d'un plan donné (ou `undefined` si non configuré). */
  async get(plan: Plan): Promise<PlanConfigDto | undefined> {
    return (await this.getAll()).find((c) => c.plan === plan);
  }

  /**
   * Limites résolues d'un plan (`Infinity` pour illimité). Retombe sur des valeurs
   * permissives si le plan n'est pas en base, pour ne jamais bloquer par défaut.
   */
  async getLimits(plan: Plan): Promise<ResolvedPlanLimits> {
    const c = await this.get(plan);
    if (!c) {
      return {
        maxUsers: Number.POSITIVE_INFINITY,
        maxEtablissements: Number.POSITIVE_INFINITY,
        maxDevices: Number.POSITIVE_INFINITY,
        maxPhotos: 0,
      };
    }
    return {
      maxUsers: resolveLimit(c.maxUsers),
      maxEtablissements: resolveLimit(c.maxEtablissements),
      maxDevices: resolveLimit(c.maxDevices),
      maxPhotos: c.maxPhotos,
    };
  }

  /** Nombre de photos produit autorisées par le plan (0 = images désactivées). */
  async maxProductPhotos(plan: Plan): Promise<number> {
    return (await this.getLimits(plan)).maxPhotos;
  }

  /** Vide le cache (à appeler après une écriture de configuration). */
  invalidate(): void {
    this.cache = null;
    this.loadedAt = 0;
  }
}
