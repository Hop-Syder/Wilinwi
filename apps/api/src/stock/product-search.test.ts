import { describe, expect, it } from 'vitest';
import { matchProducts, scoreProductMatch } from './product-search';

const CATALOGUE = [
  { id: '1', nom: 'Coca-Cola 33cl', sku: 'COCA-33' },
  { id: '2', nom: 'Coca-Cola 50cl', sku: 'COCA-50' },
  { id: '3', nom: 'Coca-Cola 1L', sku: 'COCA-1L' },
  { id: '4', nom: 'Eau Possotomé 1,5L', sku: 'EAU-15' },
  { id: '5', nom: 'Biscuits Choco', sku: null },
];

describe('scoreProductMatch', () => {
  it('requête vide → aucune correspondance', () => {
    expect(scoreProductMatch(CATALOGUE[0]!, '')).toBe(0);
    expect(scoreProductMatch(CATALOGUE[0]!, '   ')).toBe(0);
  });

  it('référence exacte devance le nom exact', () => {
    const skuScore = scoreProductMatch({ nom: 'x', sku: 'ABC' }, 'ABC');
    const nomScore = scoreProductMatch({ nom: 'ABC', sku: 'ZZZ' }, 'ABC');
    expect(skuScore).toBeGreaterThan(nomScore);
  });

  it('insensible à la casse et aux espaces', () => {
    expect(scoreProductMatch({ nom: 'Coca-Cola 50cl', sku: null }, '  coca-cola 50cl  ')).toBe(90);
  });

  it('aucune correspondance → 0', () => {
    expect(scoreProductMatch(CATALOGUE[3]!, 'biscuit')).toBe(0);
  });

  it('tolère le pluriel/singulier mot-à-mot (cas réel observé en direct avec Gemini)', () => {
    // "pagnes wax" (pluriel) ne correspond pas à "Pagne Wax 6 yards" via une
    // simple sous-chaîne — confirmé en test live le 2026-09-09.
    const produit = { nom: 'Pagne Wax 6 yards', sku: 'WAX-6Y' };
    expect(scoreProductMatch(produit, 'pagnes wax')).toBeGreaterThan(0);
    expect(scoreProductMatch(produit, 'pagne wax')).toBeGreaterThan(0);
    // Score de secours, jamais prioritaire sur une vraie sous-chaîne (includes()).
    expect(scoreProductMatch(produit, 'pagnes wax')).toBeLessThan(scoreProductMatch(produit, 'pagne wax 6 yards'));
  });

  it('la tolérance mot-à-mot exige que CHAQUE mot de la requête corresponde', () => {
    // "pagnes savon" : "pagnes"→"pagne" ok, mais "savon" n'existe pas dans le
    // nom → aucune correspondance partielle silencieuse.
    expect(scoreProductMatch({ nom: 'Pagne Wax 6 yards', sku: 'WAX-6Y' }, 'pagnes savon')).toBe(0);
  });
});

describe('matchProducts — résolution d\'ambiguïté (§29 du cahier des charges)', () => {
  it('« Coca-Cola » : aucun produit ne s\'appelle exactement ainsi → plusieurs candidats plausibles', () => {
    const results = matchProducts(CATALOGUE, 'Coca-Cola', 5);
    expect(results.length).toBeGreaterThan(1);
    expect(results.map((r) => r.id)).toEqual(expect.arrayContaining(['1', '2', '3']));
  });

  it('« Coca-Cola 50cl » : correspondance exacte unique, priorisée en tête', () => {
    const results = matchProducts(CATALOGUE, 'Coca-Cola 50cl', 5);
    expect(results[0]!.id).toBe('2');
  });

  it('« eau » : un seul produit correspond → résolution directe possible', () => {
    const results = matchProducts(CATALOGUE, 'eau', 5);
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('4');
  });

  it('produit introuvable → liste vide (jamais un choix par défaut)', () => {
    expect(matchProducts(CATALOGUE, 'yaourt', 5)).toEqual([]);
  });

  it('respecte la limite demandée', () => {
    expect(matchProducts(CATALOGUE, 'Coca-Cola', 2)).toHaveLength(2);
  });

  it('un produit sans sku ne casse pas la recherche', () => {
    const results = matchProducts(CATALOGUE, 'choco', 5);
    expect(results.map((r) => r.id)).toEqual(['5']);
  });
});
