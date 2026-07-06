/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description E2E TDR v2 — régression complète des Milestones 1→5 contre l'API
 *   locale (:4000), tenant « Groupe Prestige Bénin » (établissements RETAIL,
 *   FOOD, HEALTH, WHOLESALE seedés par prisma/seed-prestige.ts).
 *   Usage :  set -a && . ./.env && set +a
 *            node apps/api/dist/main.js &   # API démarrée
 *            node scripts/e2e-tdr.mjs
 *   Le script nettoie derrière lui (annulations) — rejouable.
 * @created 2026-07-06
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { SignJWT } from 'jose';

const SECRET = process.env.SUPABASE_JWT_SECRET;
if (!SECRET) throw new Error('SUPABASE_JWT_SECRET manquant (charger .env)');

const TENANT = '00000000-0000-0000-0000-0000000000a2';
const MAQUIS = '00000000-0000-0000-0000-0000000000c4'; // FOOD
const PHARMA = '00000000-0000-0000-0000-0000000000c5'; // HEALTH
const DEPOT = '00000000-0000-0000-0000-0000000000c6'; // WHOLESALE
const OWNER_EMAIL = 'christian@prestige.bj';
const API = process.env.E2E_API_URL ?? 'http://localhost:4000/api';

// L'OWNER est résolu dynamiquement : le seed crée un compte Supabase réel.
async function resolveOwnerId() {
  // Astuce : un JWT avec un sub bidon échoue ; on lit l'id depuis la base via
  // l'endpoint public ? Non — on le passe par variable d'env, sinon défaut connu.
  return process.env.E2E_OWNER_ID ?? '35307025-509b-45a8-b83b-0e7151748939';
}

const token = await new SignJWT({
  email: OWNER_EMAIL,
  app_metadata: { tenant_id: TENANT, role: 'OWNER' },
})
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject(await resolveOwnerId())
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(new TextEncoder().encode(SECRET));

const baseHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

function makeCaller(etablissementId) {
  return async (method, path, body) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { ...baseHeaders, 'X-Etablissement-Id': etablissementId },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
}
const call = makeCaller(MAQUIS);
const callPharma = makeCaller(PHARMA);
const callDepot = makeCaller(DEPOT);

const results = [];
const check = (name, ok, detail = '') =>
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);

// ═══════════ M1/M2 — typage produit, capacités, POS SERVICE/MANUFACTURED ═══════════

const me = await call('GET', '/auth/me');
check('auth/me → infrastructure FOOD + pos.touch/food.kitchen',
  me.json?.infrastructure === 'FOOD' &&
  ['food.kitchen', 'pos.touch'].every((c) => me.json?.infraCapabilities?.includes(c)),
  JSON.stringify(me.json?.infraCapabilities));

const prods = await call('GET', '/stock/products');
const bySku = Object.fromEntries(prods.json.map((p) => [p.sku, p]));
const service = bySku['MAQ-SRV-LOC'];
const plat = bySku['MAQ-POU-BRA'];
const biere = bySku['MAQ-BEN-50'];
check('DTO produit expose type (SERVICE/MANUFACTURED)',
  service?.type === 'SERVICE' && plat?.type === 'MANUFACTURED');
const biereStockAvant = biere.stock;

const venteService = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: service.id, quantite: 2, prixReel: service.prixCatalogue }],
});
check('Vente SERVICE à stock 0 acceptée', venteService.status === 201, `status=${venteService.status}`);

const sousPlancher = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: service.id, quantite: 1, prixReel: service.prixPlancher - 100 }],
});
check('Plancher strict, même sur un SERVICE (400)', sousPlancher.status === 400, `status=${sousPlancher.status}`);

// Vente mixte + idempotence sync + annulation
const cgid = crypto.randomUUID();
const mixte = await call('POST', '/pos/sales', {
  clientGeneratedId: cgid,
  paymentMethod: 'CASH',
  items: [
    { productId: plat.id, quantite: 3, prixReel: plat.prixCatalogue },
    { productId: biere.id, quantite: 2, prixReel: biere.prixCatalogue },
  ],
});
check('Vente mixte MANUFACTURED+STANDARD acceptée', mixte.status === 201, `status=${mixte.status}`);

const resync = await call('POST', '/sync/sales', {
  sales: [{
    clientGeneratedId: cgid,
    paymentMethod: 'CASH',
    items: [
      { productId: plat.id, quantite: 3, prixReel: plat.prixCatalogue },
      { productId: biere.id, quantite: 2, prixReel: biere.prixCatalogue },
    ],
  }],
});
const biereApresSync = (await call('GET', `/stock/products/${biere.id}`)).json?.stock;
check('Sync rejouée idempotente (pas de double décrément)',
  resync.json?.results?.[0]?.ok === true && biereApresSync === biereStockAvant - 2,
  `stock=${biereApresSync}`);

const mvtService = await call('POST', '/stock/movements', {
  productId: service.id, type: 'IN', quantite: 5, motif: 'interdit',
});
check('Mouvement de stock sur SERVICE refusé (400)', mvtService.status === 400, `status=${mvtService.status}`);

await call('POST', `/pos/sales/${mixte.json.id}/cancel`);
const biereApresCancel = (await call('GET', `/stock/products/${biere.id}`)).json?.stock;
check('Annulation : seul le STANDARD ré-entre', biereApresCancel === biereStockAvant, `stock=${biereApresCancel}`);

// ═══════════ StockPolicy (audit) — ALLOW_NEGATIVE + alerte ═══════════

const sodabi = bySku['MAQ-SOD-33'];
await call('PATCH', `/stock/products/${sodabi.id}`, { stockPolicy: 'ALLOW_NEGATIVE' });
const sodabiAvant = (await call('GET', `/stock/products/${sodabi.id}`)).json?.stock;
const venteNeg = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: sodabi.id, quantite: sodabiAvant + 5, prixReel: sodabi.prixCatalogue }],
});
const sodabiApres = (await call('GET', `/stock/products/${sodabi.id}`)).json?.stock;
check('ALLOW_NEGATIVE : vente au-delà du stock, solde −5', venteNeg.status === 201 && sodabiApres === -5, `stock=${sodabiApres}`);
const alertes1 = await call('GET', '/audit-alerts');
const alerteNeg = (alertes1.json ?? []).find(
  (a) => a.type === 'stock.negative' && a.payload?.saleId === venteNeg.json?.id,
);
check('Alerte stock.negative levée (WARNING)', alerteNeg?.severity === 'WARNING', alerteNeg?.message ?? 'absente');
await call('POST', `/pos/sales/${venteNeg.json?.id}/cancel`);
if (alerteNeg) await call('PATCH', `/audit-alerts/${alerteNeg.id}/resolve`);
await call('PATCH', `/stock/products/${sodabi.id}`, { stockPolicy: 'STRICT' });

const venteStrict = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: sodabi.id, quantite: 9999, prixReel: sodabi.prixCatalogue }],
});
check('STRICT : vente au-delà du stock refusée (400)', venteStrict.status === 400, `status=${venteStrict.status}`);

// ═══════════ Audit — retour partiel + annulation, reçu annulé ═══════════

const stockCycleAvant = (await call('GET', `/stock/products/${biere.id}`)).json?.stock;
const venteCycle = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: biere.id, quantite: 10, prixReel: biere.prixCatalogue }],
});
await call('POST', `/pos/sales/${venteCycle.json?.id}/return`, {
  returns: [{ saleItemId: venteCycle.json?.items?.[0]?.id, quantiteRetournee: 4 }],
  action: 'REFUND_CASH',
});
await call('POST', `/pos/sales/${venteCycle.json?.id}/cancel`);
const stockCycleApres = (await call('GET', `/stock/products/${biere.id}`)).json?.stock;
check('Retour(4) puis annulation : pas de double restock', stockCycleApres === stockCycleAvant, `stock=${stockCycleApres}`);

const venteRecu = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: biere.id, quantite: 1, prixReel: biere.prixCatalogue }],
});
await call('POST', `/pos/sales/${venteRecu.json?.id}/cancel`);
const recu = await call('GET', `/public/receipt/${venteRecu.json?.receiptCode}`);
check('Reçu public marqué ANNULÉ après annulation', recu.json?.cancelled === true, `cancelled=${recu.json?.cancelled}`);

const venteCredit = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CREDIT',
  clientNom: 'Client Test Avoir',
  clientTelephone: '+22990000001',
  items: [{ productId: biere.id, quantite: 2, prixReel: biere.prixCatalogue }],
});
const refundCredit = await call('POST', `/pos/sales/${venteCredit.json?.id}/return`, {
  returns: [{ saleItemId: venteCredit.json?.items?.[0]?.id, quantiteRetournee: 1 }],
  action: 'REFUND_CASH',
});
check('REFUND_CASH sur vente CREDIT refusé (400)', refundCredit.status === 400, `status=${refundCredit.status}`);
await call('POST', `/pos/sales/${venteCredit.json?.id}/cancel`);

check('POST /stock/transfers supprimé (404, canal unique = Dispatch)',
  (await call('POST', '/stock/transfers', {})).status === 404);

// ═══════════ M3 — Food : recettes + tables ═══════════

const tablesRes = await call('GET', '/food/tables');
check('3 tables FOOD seedées', tablesRes.json?.length === 3, `n=${tablesRes.json?.length}`);

const pouletAvant = bySku['MAQ-ING-POU'].stock;
const rizAvant = bySku['MAQ-ING-RIZ'].stock;
const ventePlat = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  tableId: tablesRes.json?.[0]?.id,
  items: [{ productId: plat.id, quantite: 2, prixReel: plat.prixCatalogue }],
});
const apresPlat = await call('GET', '/stock/products');
const bySku3 = Object.fromEntries(apresPlat.json.map((p) => [p.sku, p]));
check('Recette : 2 plats → poulet −1000 milli-kg, riz −400, plat reste 0',
  ventePlat.status === 201 &&
  bySku3['MAQ-ING-POU'].stock === pouletAvant - 1000 &&
  bySku3['MAQ-ING-RIZ'].stock === rizAvant - 400 &&
  bySku3['MAQ-POU-BRA'].stock === 0,
  `poulet=${bySku3['MAQ-ING-POU'].stock} riz=${bySku3['MAQ-ING-RIZ'].stock}`);

await call('POST', `/pos/sales/${ventePlat.json?.id}/cancel`);
const apresCancelPlat = await call('GET', '/stock/products');
const bySku4 = Object.fromEntries(apresCancelPlat.json.map((p) => [p.sku, p]));
check('Annulation : ingrédients restaurés exactement',
  bySku4['MAQ-ING-POU'].stock === pouletAvant && bySku4['MAQ-ING-RIZ'].stock === rizAvant);

const nbPlats = Math.ceil(pouletAvant / 500) + 1;
const venteInsuff = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: plat.id, quantite: nbPlats, prixReel: plat.prixCatalogue }],
});
const alertes2 = await call('GET', '/audit-alerts');
const alerteIng = (alertes2.json ?? []).find(
  (a) => a.type === 'ingredient.insufficient' && a.payload?.saleId === venteInsuff.json?.id,
);
check('Ingrédient insuffisant : vente non bloquée + alerte', venteInsuff.status === 201 && !!alerteIng,
  alerteIng?.message ?? 'absente');
await call('POST', `/pos/sales/${venteInsuff.json?.id}/cancel`);
if (alerteIng) await call('PATCH', `/audit-alerts/${alerteIng.id}/resolve`);

const recetteRetail = await makeCaller('00000000-0000-0000-0000-0000000000c2')(
  'GET', `/stock/products/${plat.id}/recipe`,
);
check('Recette depuis un établissement RETAIL → 403', recetteRetail.status === 403, `status=${recetteRetail.status}`);

const venteTableKo = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  tableId: '00000000-0000-0000-0000-0000000000f9',
  items: [{ productId: biere.id, quantite: 1, prixReel: biere.prixCatalogue }],
});
check('Table inconnue → vente refusée (404)', venteTableKo.status === 404, `status=${venteTableKo.status}`);

// ═══════════ M4 — Health : lots, FEFO, péremption, Option B ═══════════

const mePharma = await callPharma('GET', '/auth/me');
check('Pharma : HEALTH + stock.batches/fefo',
  mePharma.json?.infrastructure === 'HEALTH' &&
  ['stock.batches', 'stock.fefo'].every((c) => mePharma.json?.infraCapabilities?.includes(c)));

const prodsPha = await callPharma('GET', '/stock/products');
const amox = prodsPha.json?.find((p) => p.sku === 'PHA-AMOX-500');
// Rejouable : d'anciens lots LOT-E2E-* soldés (0) peuvent subsister — seuls les
// 3 lots du seed et le stock total comptent.
const lotsSeed = (amox?.batches ?? []).filter((b) => !b.batchNumber.startsWith('LOT-E2E-'));
check('AMOX : 3 lots seedés exposés, stock 280', lotsSeed.length === 3 && amox?.stock === 280,
  `lots=${lotsSeed.length} stock=${amox?.stock}`);

const lotsQ = async () =>
  Object.fromEntries((await callPharma('GET', `/stock/products/${amox.id}/batches`)).json.map((b) => [b.batchNumber, b.quantite]));
const lotsAvant = await lotsQ();

const venteFefo = await callPharma('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: amox.id, quantite: 60, prixReel: amox.prixCatalogue }],
});
const lotsApres = await lotsQ();
check('FEFO : proche vidé (50→0), lointain complète (200→190), PÉRIMÉ intact (30)',
  venteFefo.status === 201 && lotsApres['LOT-2025B'] === 0 && lotsApres['LOT-2026C'] === 190 && lotsApres['LOT-2024A'] === 30,
  JSON.stringify(lotsApres));
const amoxApres = (await callPharma('GET', `/stock/products/${amox.id}`)).json;
check('Invariant Σ lots = stock (220)',
  amoxApres?.stock === 220 && (amoxApres?.batches ?? []).reduce((s, b) => s + b.quantite, 0) === 220);

await callPharma('POST', `/pos/sales/${venteFefo.json?.id}/cancel`);
const lotsRest = await lotsQ();
check('Annulation : lots restaurés exactement',
  lotsRest['LOT-2025B'] === lotsAvant['LOT-2025B'] && lotsRest['LOT-2026C'] === lotsAvant['LOT-2026C'] && lotsRest['LOT-2024A'] === lotsAvant['LOT-2024A'],
  JSON.stringify(lotsRest));

const venteConflit = await callPharma('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: amox.id, quantite: 260, prixReel: amox.prixCatalogue }],
});
const lotsConflit = await lotsQ();
const alertes3 = await callPharma('GET', '/audit-alerts');
const alerteLot = (alertes3.json ?? []).find(
  (a) => a.type === 'health.batch_conflict' && a.payload?.saleId === venteConflit.json?.id,
);
check('Option B : vente 260>250 acceptée, lot à −10, alerte CRITICAL',
  venteConflit.status === 201 && lotsConflit['LOT-2026C'] === -10 && alerteLot?.severity === 'CRITICAL',
  alerteLot?.message ?? 'alerte absente');
await callPharma('POST', `/pos/sales/${venteConflit.json?.id}/cancel`);
if (alerteLot) await callPharma('PATCH', `/audit-alerts/${alerteLot.id}/resolve`);

const numLot = `LOT-E2E-${Math.random().toString(16).slice(2, 8)}`;
const reception = await callPharma('POST', `/stock/products/${amox.id}/batches`, {
  batchNumber: numLot, expiresAt: '2027-12-01', quantite: 10,
});
const correction = await callPharma('PATCH', `/stock/batches/${reception.json?.id}`, {
  delta: -10, motif: 'nettoyage e2e',
});
check('Réception (+10) puis correction (−10) de lot',
  reception.status === 201 && correction.status === 200 && correction.json?.quantite === 0);

check('Mouvement générique sur BATCHED refusé (400)',
  (await callPharma('POST', '/stock/movements', { productId: amox.id, type: 'IN', quantite: 5, motif: 'x' })).status === 400);
check('Lots depuis un établissement FOOD → 403',
  (await call('GET', `/stock/products/${amox.id}/batches`)).status === 403);

// ═══════════ M5 — Wholesale : multi-conditionnement ═══════════

const meDepot = await callDepot('GET', '/auth/me');
check('Dépôt : WHOLESALE + stock.unitConversions',
  meDepot.json?.infrastructure === 'WHOLESALE' &&
  meDepot.json?.infraCapabilities?.includes('stock.unitConversions'));

const prodsDep = await callDepot('GET', '/stock/products');
const beninoise = prodsDep.json?.find((p) => p.sku === 'DEP-BEN-33');
const casier = beninoise?.units?.find((u) => u.label === 'Casier 24');
check('Casier 24 exposé (facteur 24, tarif 15 600)',
  casier?.factorToBase === 24 && casier?.salePrice === 15600, JSON.stringify(beninoise?.units));
const stockDepAvant = beninoise.stock;

const venteCasier = await callDepot('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: beninoise.id, unitId: casier.id, quantite: 2, prixReel: casier.salePrice }],
});
const stockDep1 = (await callDepot('GET', `/stock/products/${beninoise.id}`)).json?.stock;
check('2 casiers vendus : total 31 200, stock −48 unités de base',
  venteCasier.status === 201 && venteCasier.json?.total === 31200 && stockDep1 === stockDepAvant - 48,
  `total=${venteCasier.json?.total} stock=${stockDep1}`);

const casierBrade = await callDepot('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: beninoise.id, unitId: casier.id, quantite: 1, prixReel: 10000 }],
});
check('F7 : casier sous plancher × 24 (10 800) refusé (400)', casierBrade.status === 400, `status=${casierBrade.status}`);

await callDepot('POST', `/pos/sales/${venteCasier.json?.id}/return`, {
  returns: [{ saleItemId: venteCasier.json?.items?.[0]?.id, quantiteRetournee: 1 }],
  action: 'REFUND_CASH',
});
const stockDep2 = (await callDepot('GET', `/stock/products/${beninoise.id}`)).json?.stock;
check('Retour d’1 casier : +24 unités de base', stockDep2 === stockDepAvant - 24, `stock=${stockDep2}`);

await callDepot('POST', `/pos/sales/${venteCasier.json?.id}/cancel`);
const stockDep3 = (await callDepot('GET', `/stock/products/${beninoise.id}`)).json?.stock;
check('Annulation après retour : stock exactement restauré', stockDep3 === stockDepAvant, `stock=${stockDep3}`);

const unitsBrades = await callDepot('PUT', `/stock/products/${beninoise.id}/units`, {
  units: [{ label: 'Casier 24', factorToBase: 24, salePrice: 9000 }],
});
check('F7 config : tarif casier sous plancher × facteur refusé (400)', unitsBrades.status === 400, `status=${unitsBrades.status}`);

check('Conditionnements depuis FOOD → 403',
  (await call('GET', `/stock/products/${beninoise.id}/units`)).status === 403);

// ═══════════ Opt-Out — exclusions par établissement + vendablePos ═══════════

// vendablePos : les ingrédients sont gérés en stock mais invendables au POS.
const ingPos = (await call('GET', '/stock/products')).json?.find((p) => p.sku === 'MAQ-ING-POU');
check('Ingrédient exposé en stock avec vendablePos=false', ingPos?.vendablePos === false,
  `vendablePos=${ingPos?.vendablePos}`);
const venteIng = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: ingPos.id, quantite: 1000, prixReel: ingPos.prixCatalogue }],
});
check('Vente directe d’un ingrédient refusée (400)', venteIng.status === 400, `status=${venteIng.status}`);

// Exclusion : refusée tant que le stock local n'est pas nul.
const exclusionStock = await call('PUT', `/stock/products/${biere.id}/exclusions`, {
  etablissementIds: [MAQUIS],
});
check('Exclure un produit avec stock local ≠ 0 refusé (400)', exclusionStock.status === 400,
  `status=${exclusionStock.status}`);

// Exclusion effective : la Béninoise du dépôt (stock local 0 au maquis) exclue du maquis.
const cible = (await callDepot('GET', '/stock/products')).json?.find((p) => p.sku === 'DEP-BEN-33');
const poseExclusion = await call('PUT', `/stock/products/${cible.id}/exclusions`, {
  etablissementIds: [MAQUIS],
});
check('Pose d’une exclusion acceptée', poseExclusion.status === 200 && poseExclusion.json?.includes(MAQUIS),
  `status=${poseExclusion.status}`);

const listeMaquis = (await call('GET', '/stock/products')).json ?? [];
check('Produit exclu ABSENT des listes de la boutique', !listeMaquis.some((p) => p.id === cible.id));
const listeDepot = (await callDepot('GET', '/stock/products')).json ?? [];
check('…mais toujours présent dans les autres boutiques', listeDepot.some((p) => p.id === cible.id));

const venteExclu = await call('POST', '/pos/sales', {
  clientGeneratedId: crypto.randomUUID(),
  paymentMethod: 'CASH',
  items: [{ productId: cible.id, quantite: 1, prixReel: cible.prixCatalogue }],
});
check('Vente d’un produit exclu refusée (404 non révélateur)', venteExclu.status === 404, `status=${venteExclu.status}`);

const mvtExclu = await call('POST', '/stock/movements', {
  productId: cible.id, type: 'IN', quantite: 5, motif: 'test exclu',
});
check('Mouvement sur un produit exclu refusé (404)', mvtExclu.status === 404, `status=${mvtExclu.status}`);

const dspExclu = await callDepot('POST', '/dispatches', {
  sourceId: DEPOT,
  destinationId: MAQUIS,
  validate: true,
  items: [{ productId: cible.id, quantite: 24 }],
});
check('Dispatch vers un établissement d’exclusion refusé (400)', dspExclu.status === 400, `status=${dspExclu.status}`);

// Restauration : levée de l'exclusion → tout redevient normal.
await call('PUT', `/stock/products/${cible.id}/exclusions`, { etablissementIds: [] });
const listeMaquisApres = (await call('GET', '/stock/products')).json ?? [];
check('Levée de l’exclusion : produit de nouveau visible', listeMaquisApres.some((p) => p.id === cible.id));

// ═══════════ Appareils — limite maxDevices (registre + révocation) ═══════════

const DEVICE = 'E2E-DEVICE-FIXE'; // réutilisé à chaque run (pas de prolifération)
async function meAvecAppareil() {
  const res = await fetch(`${API}/auth/me`, {
    headers: { ...baseHeaders, 'X-Etablissement-Id': MAQUIS, 'X-Device-Id': DEVICE },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

check('Session avec X-Device-Id acceptée (enregistrement)', (await meAvecAppareil()).status === 200);
const appareils = (await call('GET', '/auth/devices')).json ?? [];
const monAppareil = appareils.find((d) => d.deviceId === DEVICE);
check('Appareil présent au registre', !!monAppareil, `n=${appareils.length}`);

const renomme = await call('PATCH', `/auth/devices/${monAppareil?.id}`, { label: 'Poste E2E' });
check('Renommage de l’appareil', renomme.status === 200 && renomme.json?.label === 'Poste E2E');

await call('PATCH', `/auth/devices/${monAppareil?.id}`, { revoked: true });
const meRevoque = await meAvecAppareil();
check('Appareil révoqué → session refusée (403)', meRevoque.status === 403, `status=${meRevoque.status}`);

await call('PATCH', `/auth/devices/${monAppareil?.id}`, { revoked: false });
check('Réactivation → session de nouveau acceptée', (await meAvecAppareil()).status === 200);

// ═══════════ Bilan ═══════════

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('❌')).length;
console.log(
  failed === 0
    ? `\n🎉 E2E TDR v2 : ${results.length}/${results.length} vérifications vertes`
    : `\n⚠️ ${failed}/${results.length} échec(s)`,
);
process.exit(failed === 0 ? 0 : 1);
