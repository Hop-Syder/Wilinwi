/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Montant en toutes lettres (français, orthographe traditionnelle) pour
 *   la mention légale des factures d'Afrique francophone : « Arrêtée la présente
 *   facture à la somme de quarante-quatre mille quatre cent soixante-quinze
 *   francs CFA ». Entiers uniquement (le FCFA n'a pas de centimes).
 * @created 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

/** 0–99. `final` : le nombre termine le montant (accord de « quatre-vingts »). */
function below100(n: number, final: boolean): string {
  if (n < 20) return UNITS[n]!;
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  // 70–79 et 90–99 se construisent sur 60 et 80 (+ 10–19).
  if (ten === 7 || ten === 9) {
    const base = ten === 7 ? 'soixante' : 'quatre-vingt';
    const rest = 10 + unit;
    const joiner = ten === 7 && unit === 1 ? ' et ' : '-';
    return `${base}${joiner}${UNITS[rest]}`;
  }
  if (ten === 8) {
    if (unit === 0) return final ? 'quatre-vingts' : 'quatre-vingt';
    return `quatre-vingt-${UNITS[unit]}`;
  }
  if (unit === 0) return TENS[ten]!;
  if (unit === 1) return `${TENS[ten]} et un`;
  return `${TENS[ten]}-${UNITS[unit]}`;
}

/** 0–999. `final` : le groupe termine le montant (accord de « cents »). */
function below1000(n: number, final: boolean): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (hundred === 0) return below100(rest, final);
  const head = hundred === 1 ? 'cent' : `${UNITS[hundred]} cent${rest === 0 && final ? 's' : ''}`;
  return rest === 0 ? head : `${head} ${below100(rest, final)}`;
}

/**
 * Entier positif ou nul → toutes lettres. Ex. 44 475 → « quarante-quatre mille
 * quatre cent soixante-quinze » ; 1 280 000 → « un million deux cent
 * quatre-vingt mille ». Les nombres négatifs sont précédés de « moins ».
 */
export function amountInWords(value: number): string {
  let n = Math.round(Math.abs(value));
  if (n === 0) return 'zéro';
  const parts: string[] = [];
  const scales: [number, string, string][] = [
    [1_000_000_000, 'milliard', 'milliards'],
    [1_000_000, 'million', 'millions'],
  ];
  for (const [size, singular, plural] of scales) {
    const count = Math.floor(n / size);
    if (count > 0) {
      parts.push(`${below1000(count, true)} ${count > 1 ? plural : singular}`);
      n %= size;
    }
  }
  const thousands = Math.floor(n / 1000);
  if (thousands > 0) {
    // « mille » est invariable et ne prend pas « un » devant ;
    // « quatre-vingt mille », « deux cent mille » (pas d'accord devant mille).
    parts.push(thousands === 1 ? 'mille' : `${below1000(thousands, false)} mille`);
    n %= 1000;
  }
  if (n > 0) parts.push(below1000(n, true));
  const words = parts.join(' ');
  return value < 0 ? `moins ${words}` : words;
}

/** Montant FCFA en lettres, prêt pour la mention légale : « … francs CFA ». */
export function fcfaInWords(value: number): string {
  const n = Math.round(Math.abs(value));
  const words = amountInWords(value);
  // « un million de francs », « deux milliards de francs » (nom après million/milliard).
  const needsDe = n > 0 && n % 1_000_000 === 0;
  return `${words} ${needsDe ? 'de ' : ''}franc${n > 1 ? 's' : ''} CFA`;
}
