/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrat d'intention structurée de l'assistant vocal Wilinwi AI.
 *   Frontière stricte entre la sortie de Gemini et le dispatch backend : Gemini
 *   ne produit jamais qu'une INTENTION parmi cette liste fermée, jamais une
 *   instruction d'exécution ni une preuve d'autorisation — « Gemini propose,
 *   Wilinwi vérifie » (§37, §52, §53 du cahier des charges MVP1).
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, MoneySchema } from './common.js';

/** Contextes d'usage de l'assistant vocal (change le jeu d'intentions pertinent côté prompt). */
export const VOICE_CONTEXTS = ['pos', 'dashboard'] as const;
export type VoiceContext = (typeof VOICE_CONTEXTS)[number];

/**
 * Liste FERMÉE des intentions que Gemini peut produire. Volontairement sans
 * fallback générique (`EXECUTE_COMMAND`/`RUN_ACTION`) : toute intention non
 * reconnue par ce schéma est rejetée par `safeParse()`, jamais exécutée.
 *
 * Sécurité : un éventuel champ `confidence` renvoyé par Gemini est
 * silencieusement retiré (un schéma `z.object()` ignore par défaut les clés
 * non déclarées) — la confiance de Gemini n'est JAMAIS un critère
 * d'autorisation, le backend résout et valide dans tous les cas.
 */
export const VoiceIntentSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal('ADD_PRODUCTS_TO_CART'),
    items: z
      .array(z.object({ query: z.string().min(1), quantity: z.number().positive() }))
      .min(1),
  }),
  z.object({ intent: z.literal('QUERY_SALES_TODAY') }),
  z.object({ intent: z.literal('QUERY_TOP_SHOP') }),
  z.object({ intent: z.literal('QUERY_STOCK_LOW') }),
  z.object({
    intent: z.literal('CREATE_REPLENISHMENT_DRAFT'),
    destinationQuery: z.string().min(1),
    items: z
      .array(z.object({ query: z.string().min(1), quantity: z.number().positive() }))
      .min(1),
  }),
  z.object({ intent: z.literal('NEEDS_CLARIFICATION'), question: z.string().min(1) }),
  // Puits mort : `raw` sert uniquement au diagnostic/log — jamais réexécuté,
  // jamais réinjecté comme instruction dans un prompt ultérieur.
  z.object({ intent: z.literal('UNKNOWN'), raw: z.string().optional() }),
]);
export type VoiceIntent = z.infer<typeof VoiceIntentSchema>;
export type VoiceIntentType = VoiceIntent['intent'];

/** Requête entrante côté API : uniquement le transcript déjà transcrit côté client + le contexte d'usage. */
export const VoiceInterpretRequestSchema = z.object({
  transcript: z.string().min(1).max(500),
  context: z.enum(VOICE_CONTEXTS),
});
export type VoiceInterpretRequest = z.infer<typeof VoiceInterpretRequestSchema>;

/** Candidat produit proposé en cas d'ambiguïté — résolu par un tap côté client, pas par un second appel Gemini. */
export const VoiceProductCandidateSchema = z.object({
  productId: IdSchema,
  nom: z.string(),
  sku: z.string().nullable().optional(),
});
export type VoiceProductCandidate = z.infer<typeof VoiceProductCandidateSchema>;

/**
 * Réponse backend → frontend. Ne contient JAMAIS de texte brut généré par
 * Gemini au-delà de la classification d'intention : `resolvedCartItems` et
 * `answer.data` proviennent exclusivement de données résolues côté serveur
 * (toProductDto(), AnalyticsService, etc. — jamais d'invention de chiffres).
 */
export const VoiceInterpretResultSchema = z.object({
  ok: z.boolean(),
  resolvedCartItems: z
    .array(
      z.object({
        productId: IdSchema,
        variantId: IdSchema.nullable().optional(),
        sku: z.string().nullable().optional(),
        nom: z.string(),
        quantite: z.number().positive(),
        prixReel: MoneySchema,
        matchedQuery: z.string(),
      }),
    )
    .optional(),
  unresolvedQueries: z.array(z.string()).optional(),
  clarification: z
    .object({
      question: z.string(),
      candidates: z.array(VoiceProductCandidateSchema),
    })
    .optional(),
  answer: z
    .object({
      text: z.string(),
      data: z.record(z.string(), z.unknown()),
    })
    .optional(),
  draft: z
    .object({
      destinationId: IdSchema.optional(),
      destinationNom: z.string().optional(),
      items: z.array(
        z.object({ productId: IdSchema, nom: z.string(), quantite: z.number().positive() }),
      ),
    })
    .optional(),
  error: z.enum(['AI_UNAVAILABLE', 'TRANSCRIPT_EMPTY', 'FORBIDDEN']).optional(),
});
export type VoiceInterpretResult = z.infer<typeof VoiceInterpretResultSchema>;
