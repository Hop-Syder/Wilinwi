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

/** Durée max d'un enregistrement, appliquée côté client (arrêt automatique — garde-fou UX/coût). */
export const VOICE_MAX_RECORDING_MS = 15_000;

/**
 * Taille max du payload audio en base64 (garde-fou serveur anti-abus). Un
 * ordre vocal de quelques secondes (opus ~24-64 kbps) pèse quelques dizaines
 * de Ko une fois encodé en base64 — cette limite reste très généreuse tout en
 * bornant la requête contre un client compromis ou rejoué.
 */
export const VOICE_MAX_AUDIO_BASE64_LENGTH = 4_000_000;

/**
 * Liste FERMÉE des intentions que Gemini peut produire. Volontairement sans
 * fallback générique (`EXECUTE_COMMAND`/`RUN_ACTION`) : toute intention non
 * reconnue par ce schéma est rejetée par `safeParse()`, jamais exécutée.
 *
 * Chaque variante porte aussi `transcript` (optionnel) : la transcription que
 * Gemini a lui-même produite à partir de l'audio (aucune transcription n'est
 * plus faite côté client). Le prompt système lui demande de le renseigner
 * systématiquement, mais le schéma le tolère absent — un simple écho manquant
 * ne doit jamais dégrader tout l'assistant en indisponible. Ce champ est un
 * simple écho affiché à l'utilisateur : il ne sert JAMAIS de base à une
 * décision d'autorisation ou de dispatch.
 *
 * Sécurité : un éventuel champ `confidence` renvoyé par Gemini est
 * silencieusement retiré (un schéma `z.object()` ignore par défaut les clés
 * non déclarées) — la confiance de Gemini n'est JAMAIS un critère
 * d'autorisation, le backend résout et valide dans tous les cas.
 */
export const VoiceIntentSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal('ADD_PRODUCTS_TO_CART'),
    transcript: z.string().optional(),
    items: z
      .array(z.object({ query: z.string().min(1), quantity: z.number().positive() }))
      .min(1),
  }),
  z.object({ intent: z.literal('QUERY_SALES_TODAY'), transcript: z.string().optional() }),
  z.object({ intent: z.literal('QUERY_TOP_SHOP'), transcript: z.string().optional() }),
  z.object({ intent: z.literal('QUERY_STOCK_LOW'), transcript: z.string().optional() }),
  z.object({
    intent: z.literal('CREATE_REPLENISHMENT_DRAFT'),
    transcript: z.string().optional(),
    destinationQuery: z.string().min(1),
    items: z
      .array(z.object({ query: z.string().min(1), quantity: z.number().positive() }))
      .min(1),
  }),
  z.object({
    intent: z.literal('NEEDS_CLARIFICATION'),
    transcript: z.string().optional(),
    question: z.string().min(1),
  }),
  // Puits mort : `raw` sert uniquement au diagnostic/log — jamais réexécuté,
  // jamais réinjecté comme instruction dans un prompt ultérieur.
  z.object({ intent: z.literal('UNKNOWN'), transcript: z.string().optional(), raw: z.string().optional() }),
]);
export type VoiceIntent = z.infer<typeof VoiceIntentSchema>;
export type VoiceIntentType = VoiceIntent['intent'];

/**
 * Requête entrante côté API : audio brut capturé par le navigateur (aucune
 * transcription côté client — Web Speech API abandonnée, cf. `gemini.client.ts`)
 * + le contexte d'usage. `mimeType` reflète le format choisi par
 * `MediaRecorder` (ex. `audio/webm;codecs=opus`, `audio/mp4` sur Safari).
 */
export const VoiceInterpretRequestSchema = z.object({
  audio: z.string().min(1).max(VOICE_MAX_AUDIO_BASE64_LENGTH),
  mimeType: z.string().min(1).max(100),
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
 * Exception délibérée : `transcript`, simple écho de ce que Gemini a compris
 * de l'audio (affiché tel quel, ex. « vous avez dit… »), jamais utilisé pour
 * une décision — absent sur les réponses d'erreur.
 */
export const VoiceInterpretResultSchema = z.object({
  ok: z.boolean(),
  transcript: z.string().optional(),
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
      // Présent uniquement pour une clarification de résolution produit
      // (Phase 1) — absent pour un NEEDS_CLARIFICATION générique de Gemini,
      // qui n'a pas de quantité associée.
      quantity: z.number().positive().optional(),
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
