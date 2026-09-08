'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description React Hook personnalisé : use-tts.ts
 *   Synthèse vocale (lecture des réponses de l'assistant), purement côté
 *   client via `window.speechSynthesis` — aucune dépendance backend. Optionnelle
 *   par construction : si non supportée, `speak()` ne fait rien, l'interface
 *   écrite reste entièrement fonctionnelle (§34 du cahier des charges).
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useCallback } from 'react';

export function useTts(lang = 'fr-FR') {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text) return;
      window.speechSynthesis.cancel(); // n'empêche jamais une nouvelle réponse de s'enchaîner
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    },
    [lang, supported],
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speak, stop };
}
