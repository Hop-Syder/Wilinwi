/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour l'assistant vocal Wilinwi AI. Orchestre :
 *   transcript → Gemini → validation Zod (schéma d'intention FERMÉ) →
 *   vérification de capacité propre à l'intention → dispatch vers les
 *   services de domaine existants. Principe non négociable : « Gemini
 *   propose, Wilinwi vérifie » — aucune sortie de Gemini n'est jamais
 *   traitée comme une autorisation ou une instruction d'exécution ; seule la
 *   capacité réelle de l'utilisateur (vérifiée ici, en code) autorise quoi
 *   que ce soit. Ce service n'écrit jamais lui-même en base.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  VoiceIntentSchema,
  hasCapability,
  type AuthContext,
  type Capability,
  type VoiceInterpretRequest,
  type VoiceInterpretResult,
  type VoiceIntentType,
} from '@wilinwi/types';
import { buildSystemPrompt } from './ai.mapper';
import { AiUnavailableError, GeminiClient } from './gemini.client';

/**
 * Capacité minimale requise pour chaque intention, en plus de `ai:use` (déjà
 * vérifiée par le contrôleur). Une seule route dessert plusieurs intentions à
 * exigences différentes → la vérification se fait ici, explicitement, et non
 * via un unique `@RequireCapabilities` sur la route.
 */
const INTENT_CAPABILITY: Partial<Record<VoiceIntentType, Capability>> = {
  ADD_PRODUCTS_TO_CART: 'sale:create',
  QUERY_SALES_TODAY: 'reports:read',
  // Expose des chiffres d'autres boutiques → exigence renforcée (cf. plan Phase 3).
  QUERY_TOP_SHOP: 'reports:read_full',
  QUERY_STOCK_LOW: 'reports:read',
  CREATE_REPLENISHMENT_DRAFT: 'supplier:manage',
};

@Injectable()
export class AiService {
  constructor(private readonly gemini: GeminiClient) {}

  async interpret(ctx: AuthContext, req: VoiceInterpretRequest): Promise<VoiceInterpretResult> {
    const systemPrompt = buildSystemPrompt(req.context);

    let raw: string;
    try {
      raw = await this.gemini.interpret(systemPrompt, req.transcript);
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        return { ok: false, error: 'AI_UNAVAILABLE' };
      }
      throw err;
    }

    // Toute sortie non conforme au JSON attendu ou au schéma fermé dégrade en
    // "indisponible" — jamais de dispatch best-effort sur une donnée non fiable.
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'AI_UNAVAILABLE' };
    }
    const parsed = VoiceIntentSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { ok: false, error: 'AI_UNAVAILABLE' };
    }
    const intent = parsed.data;

    // Le rôle effectif est celui de la session authentifiée (AuthContext),
    // jamais celui que le transcript prétendrait imposer.
    const requiredCapability = INTENT_CAPABILITY[intent.intent];
    if (requiredCapability && !hasCapability(ctx.role, requiredCapability)) {
      return { ok: false, error: 'FORBIDDEN' };
    }

    switch (intent.intent) {
      case 'NEEDS_CLARIFICATION':
        return { ok: true, clarification: { question: intent.question, candidates: [] } };

      case 'UNKNOWN':
        // Puits mort : `intent.raw` n'est utilisé qu'à des fins de diagnostic
        // (journalisation future), jamais réexécuté ni réinjecté en prompt.
        return { ok: false, error: 'AI_UNAVAILABLE' };

      case 'ADD_PRODUCTS_TO_CART':
        throw new NotImplementedException(
          'Résolution du panier vocal pas encore disponible (Phase 1 — recherche produit).',
        );

      case 'QUERY_SALES_TODAY':
      case 'QUERY_TOP_SHOP':
      case 'QUERY_STOCK_LOW':
        throw new NotImplementedException(
          'Questions vocales du tableau de bord pas encore disponibles (Phase 3).',
        );

      case 'CREATE_REPLENISHMENT_DRAFT':
        throw new NotImplementedException(
          'Brouillon de réapprovisionnement vocal pas encore disponible (Phase 4).',
        );
    }
  }
}
