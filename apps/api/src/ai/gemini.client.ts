/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Client HTTP pour l'API Gemini (interprétation d'intention vocale).
 *   Toute erreur (absence de clé, timeout, réseau, 4xx/5xx, réponse vide) est
 *   mappée vers une unique `AiUnavailableError` — l'assistant se dégrade en
 *   mode indisponible, jamais en exception non maîtrisée côté AiService.
 *   Aucune donnée produit/tenant n'est jamais envoyée à Gemini : ce client ne
 *   reçoit que le prompt système (schéma d'intention fermé) et le transcript
 *   déjà transcrit côté client.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Indisponibilité de l'assistant vocal — catchée par AiService, jamais propagée telle quelle. */
export class AiUnavailableError extends Error {
  constructor(reason: string, options?: { cause?: unknown }) {
    super(`Assistant vocal indisponible : ${reason}`, options);
    this.name = 'AiUnavailableError';
  }
}

/** Erreur interne déclenchant UNE seule retentative (5xx uniquement) — jamais exposée hors de ce fichier. */
class RetryableGeminiError extends Error {
  constructor(reason: string, options?: { cause?: unknown }) {
    super(reason, options);
    this.name = 'RetryableGeminiError';
  }
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

@Injectable()
export class GeminiClient {
  constructor(private readonly config: ConfigService) {}

  /**
   * Renvoie le texte brut produit par Gemini (attendu : un JSON conforme à
   * `VoiceIntentSchema`). Ce client ne parse/valide RIEN — la validation Zod
   * et toute décision d'autorisation se font exclusivement côté `AiService`.
   */
  async interpret(systemPrompt: string, transcript: string): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new AiUnavailableError('GEMINI_API_KEY non configurée');
    }
    const model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
    const timeoutMs = this.config.get<number>('GEMINI_TIMEOUT_MS') ?? 8000;

    try {
      return await this.callOnce(model, apiKey, systemPrompt, transcript, timeoutMs);
    } catch (err) {
      // Un seul retry, et uniquement sur 5xx (budget latence/coût — jamais sur
      // un timeout, qui a déjà consommé tout le budget alloué).
      if (err instanceof RetryableGeminiError) {
        try {
          return await this.callOnce(model, apiKey, systemPrompt, transcript, timeoutMs);
        } catch (retryErr) {
          throw new AiUnavailableError('appel Gemini échoué après retry', { cause: retryErr });
        }
      }
      throw err instanceof AiUnavailableError
        ? err
        : new AiUnavailableError('appel Gemini échoué', { cause: err });
    }
  }

  private async callOnce(
    model: string,
    apiKey: string,
    systemPrompt: string,
    transcript: string,
    timeoutMs: number,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: transcript }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
      });

      if (res.status >= 500) {
        throw new RetryableGeminiError(`Gemini a répondu ${res.status}`);
      }
      if (!res.ok) {
        throw new AiUnavailableError(`Gemini a répondu ${res.status}`);
      }

      const body = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new AiUnavailableError('réponse Gemini vide');
      }
      return text;
    } catch (err) {
      if (err instanceof AiUnavailableError || err instanceof RetryableGeminiError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AiUnavailableError('délai dépassé', { cause: err });
      }
      throw new AiUnavailableError('erreur réseau', { cause: err });
    } finally {
      clearTimeout(timeout);
    }
  }
}
