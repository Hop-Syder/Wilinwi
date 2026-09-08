/**
 * Tests du protocole de synchronisation côté client (@wilinwi/offline), exécutés
 * sur une IndexedDB en mémoire (fake-indexeddb) : application des résultats
 * serveur (applySyncResults), découpage des lots (chunkForSync) et comportement
 * de bout en bout du SyncEngine.flush (succès, rejet permanent, panne réseau).
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateSaleInput, SyncSaleResultRow } from '@wilinwi/types';
import { getDB } from './db.js';
import { applySyncResults, chunkForSync, MAX_SYNC_BATCH, SyncEngine } from './sync.js';

const payload = (clientGeneratedId: string): CreateSaleInput => ({
  items: [
    {
      productId: 'c1c0ffe1-0000-4000-8000-000000000001',
      quantite: 1,
      prixReel: 1_000,
    },
  ],
  paymentMethod: 'CASH',
  clientGeneratedId,
});

/**
 * Poster factice : `panne` → rejette (réseau KO) ; sinon renvoie la réponse
 * donnée (ou une seule réponse pour tous les appels) et trace les requêtes.
 */
function poster(réponses: SyncSaleResultRow[] | 'panne', réponseUnique?: { results: SyncSaleResultRow[] }) {
  const appels: { path: string; body: unknown }[] = [];
  return {
    appels,
    post: (path: string, body: unknown) => {
      appels.push({ path, body });
      if (réponses === 'panne') return Promise.reject(new Error('fetch failed'));
      return Promise.resolve(réponseUnique ?? { results: réponses });
    },
  };
}

beforeEach(async () => {
  await getDB().pendingSales.clear();
});

describe('applySyncResults — application des résultats serveur', () => {
  it('une vente acceptée passe en synced avec son id serveur', async () => {
    const engine = new SyncEngine(async () => ({}));
    const vente = await engine.enqueueSale(payload('v1'));
    const c = await applySyncResults(getDB().pendingSales, [vente], [
      { clientGeneratedId: 'v1', ok: true, id: 'srv-1' },
    ]);
    expect(c).toEqual({ synced: 1, failed: 0 });
    const row = await getDB().pendingSales.get('v1');
    expect(row?.status).toBe('synced');
    expect(row?.serverId).toBe('srv-1');
  });

  it('une vente rejetée passe en rejected et porte la raison structurée (kind + détail)', async () => {
    const engine = new SyncEngine(async () => ({}));
    const vente = await engine.enqueueSale(payload('v2'));
    const c = await applySyncResults(getDB().pendingSales, [vente], [
      {
        clientGeneratedId: 'v2',
        ok: false,
        permanent: true,
        kind: 'BELOW_FLOOR',
        error: 'Opération refusée : le prix de vente est inférieur au prix plancher.',
      },
    ]);
    expect(c).toEqual({ synced: 0, failed: 1 });
    const row = await getDB().pendingSales.get('v2');
    expect(row?.status).toBe('rejected');
    expect(row?.kind).toBe('BELOW_FLOOR');
    expect(row?.error).toContain('prix plancher');
    expect(await engine.rejectedCount()).toBe(1);
  });

  it('un échec transitoire reste en error → re-tenté au prochain flush', async () => {
    const engine = new SyncEngine(async () => ({}));
    const vente = await engine.enqueueSale(payload('v3'));
    await applySyncResults(getDB().pendingSales, [vente], [
      { clientGeneratedId: 'v3', ok: false, permanent: false, error: 'Service indisponible' },
    ]);
    const row = await getDB().pendingSales.get('v3');
    expect(row?.status).toBe('error');
    expect(await engine.pendingCount()).toBe(1);
  });

  it('les résultats inconnus (id hors lot ou null) sont ignorés, sans crash', async () => {
    const engine = new SyncEngine(async () => ({}));
    const vente = await engine.enqueueSale(payload('v4'));
    const c = await applySyncResults(getDB().pendingSales, [vente], [
      { clientGeneratedId: null, ok: true, id: 'srv-x' },
      { clientGeneratedId: 'inconnu-au-bataillon', ok: true, id: 'srv-y' },
      { clientGeneratedId: 'v4', ok: true, id: 'srv-4' },
    ]);
    expect(c).toEqual({ synced: 1, failed: 0 });
    expect((await getDB().pendingSales.get('v4'))?.status).toBe('synced');
  });

  it('rejouer les mêmes résultats est idempotent (l’état posé ne bouge plus)', async () => {
    const engine = new SyncEngine(async () => ({}));
    const v1 = await engine.enqueueSale(payload('v5'));
    const v2 = await engine.enqueueSale(payload('v6'));
    const résultats: SyncSaleResultRow[] = [
      { clientGeneratedId: 'v5', ok: true, id: 'srv-5' },
      {
        clientGeneratedId: 'v6',
        ok: false,
        permanent: true,
        kind: 'STOCK_INSUFFICIENT',
        error: 'Stock insuffisant.',
      },
    ];
    const table = getDB().pendingSales;
    await applySyncResults(table, [v1, v2], résultats);
    const statuts = async () => (await table.toArray()).map((s) => s.status).sort();
    const aprèsPremierPassage = await statuts();
    await applySyncResults(table, [v1, v2], résultats);
    expect(await statuts()).toEqual(aprèsPremierPassage);
    expect(aprèsPremierPassage).toEqual(['rejected', 'synced']);
  });
});

describe('chunkForSync — découpage du lot', () => {
  it('un lot vide ne produit aucune requête', () => {
    expect(chunkForSync([])).toEqual([]);
  });

  it('un lot partiel passe en une seule tranche', () => {
    const deux = [{ id: 'a' }, { id: 'b' }];
    expect(chunkForSync(deux)).toEqual([deux]);
  });

  it('au-delà de MAX_SYNC_BATCH, la file est découpée (200 + reste)', () => {
    const items = Array.from({ length: MAX_SYNC_BATCH + 1 }, (_, i) => ({ id: `${i}` }));
    const tranches = chunkForSync(items);
    expect(tranches.map((t) => t.length)).toEqual([MAX_SYNC_BATCH, 1]);
  });

  it('la taille de lot est bornée à 200 (alignée sur SyncBatchSchema côté API)', () => {
    expect(MAX_SYNC_BATCH).toBe(200);
  });
});

describe('SyncEngine.flush — vidage de la file', () => {
  it('les ventes acceptées sont confirmées et la file se vide', async () => {
    const { post } = poster([{ clientGeneratedId: 'f1', ok: true, id: 'srv-f1' }]);
    const engine = new SyncEngine(post);
    await engine.enqueueSale(payload('f1'));
    const r = await engine.flush();
    expect(r).toEqual({ synced: 1, failed: 0, remaining: 0 });
    expect((await engine.getSale('f1'))?.status).toBe('synced');
  });

  it('une vente rejetée est écartée de l’auto-retry et ne bloque pas les autres', async () => {
    const { post, appels } = poster([
      { clientGeneratedId: 'ok1', ok: true, id: 'srv-ok1' },
      { clientGeneratedId: 'ko1', ok: false, permanent: true, kind: 'BELOW_FLOOR', error: 'plancher' },
    ]);
    const engine = new SyncEngine(post);
    await engine.enqueueSale(payload('ok1'));
    await engine.enqueueSale(payload('ko1'));
    const r = await engine.flush();
    expect(r.synced).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.remaining).toBe(0); // 'rejected' est exclu du compteur d'attente
    expect((await engine.getSale('ok1'))?.status).toBe('synced');
    expect((await engine.getSale('ko1'))?.status).toBe('rejected');
    // Au flush suivant, la vente rejetée n'est plus renvoyée au serveur.
    const secondFlush = await engine.flush();
    expect(secondFlush).toEqual({ synced: 0, failed: 0, remaining: 0 });
    expect(appels.length).toBe(1); // aucun nouvel appel : la file est vide
  });

  it('une panne réseau remet le lot en attente (aucune perte, aucun état partiel)', async () => {
    const { post, appels } = poster('panne');
    const engine = new SyncEngine(post);
    await engine.enqueueSale(payload('p1'));
    await engine.enqueueSale(payload('p2'));
    const r = await engine.flush();
    expect(r).toEqual({ synced: 0, failed: 2, remaining: 2 });
    const statuts = (await getDB().pendingSales.toArray()).map((s) => s.status).sort();
    expect(statuts).toEqual(['pending', 'pending']);
    expect(appels.length).toBe(1);
  });

  it('une file de plus de 200 ventes est envoyée par tranches acceptées par le serveur', async () => {
    const n = MAX_SYNC_BATCH + 3;
    const { post, appels } = poster(
      [],
      {
        results: Array.from({ length: n }, (_, i) => ({
          clientGeneratedId: `g${i}`,
          ok: true,
          id: `srv-g${i}`,
        })),
      },
    );
    const engine = new SyncEngine(post);
    for (let i = 0; i < n; i++) await engine.enqueueSale(payload(`g${i}`));
    const r = await engine.flush();
    expect(appels.length).toBe(2);
    // Chaque requête porte un lot ≤ MAX_SYNC_BATCH.
    for (const appel of appels) {
      const corps = appel.body as { sales: unknown[] };
      expect(corps.sales.length).toBeLessThanOrEqual(MAX_SYNC_BATCH);
    }
    expect(r.synced).toBe(n);
    expect(r.remaining).toBe(0);
  });
});
