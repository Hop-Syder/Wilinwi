/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Simulation « dépôt de boissons » : fourchette de prix à la caisse et
 *   suivi des remises, via les VRAIS services (StockService, SalesService,
 *   AnalyticsService). Cas : grande Béninoise, casier de 12 — achat 5 800,
 *   minimum 5 900, vente 6 000. Vérifie :
 *     1. le minimum d'un casier ne peut pas descendre sous le prix d'achat ;
 *     2. vente à 6 000 sans nom de client → acceptée (pas de remise) ;
 *     3. vente à 5 900 sans nom → refusée ; avec le nom « Koffi » → acceptée ;
 *     4. 5 850 (sous le minimum) et 6 100 (au-dessus du prix) → refusés ;
 *     5. la bouteille au détail garde SA fourchette (490 – 500) ;
 *     6. le rapport des remises totalise par caissier et par client.
 *   Base CIBLE = DATABASE_URL (base de test, jamais la prod).
 *   Usage : DATABASE_URL=postgresql://… pnpm --filter @wilinwi/api exec tsx scripts/simulate-price-range.ts
 * @created 2026-10-06
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { randomUUID } from 'node:crypto';
import { prisma } from '@wilinwi/db';
import type { AuthContext, CreateSaleInput } from '@wilinwi/types';
import { PrismaService } from '../src/common/prisma.service';
import { AuditAlertService } from '../src/common/audit-alert.service';
import type { PlanConfigService } from '../src/common/plan-config.service';
import { SalesService } from '../src/pos/sales.service';
import { StockService } from '../src/stock/stock.service';
import { AnalyticsService } from '../src/analytics/analytics.service';

const TENANT_ID = randomUUID();
const ETAB_ID = randomUUID();
const CAISSIER_ID = randomUUID();

const results: { ok: boolean; label: string }[] = [];
function check(ok: boolean, label: string) {
  results.push({ ok, label });
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
}

/** Exécute `fn` et renvoie le message d'erreur (null si acceptée). */
async function refusal(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

async function cleanup() {
  await prisma.saleItem.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenant.delete({ where: { id: TENANT_ID } });
}

async function main() {
  await prisma.tenant.create({ data: { id: TENANT_ID, nom: 'Dépôt de boissons (simulation)' } });
  await prisma.etablissement.create({
    data: { id: ETAB_ID, tenantId: TENANT_ID, nom: 'Dépôt central', type: 'ENTREPOT', infrastructure: 'WHOLESALE' },
  });
  await prisma.user.create({
    data: { id: CAISSIER_ID, tenantId: TENANT_ID, nom: 'Caissier Rodrigue', email: 'rodrigue@depot.test', role: 'CASHIER' },
  });
  const ctx = {
    userId: CAISSIER_ID,
    tenantId: TENANT_ID,
    role: 'OWNER',
    email: 'patron@depot.test',
    plan: 'BUSINESS',
    modules: [],
    etablissementId: ETAB_ID,
    isGlobalView: false,
    etablissementIds: [ETAB_ID],
    infrastructure: 'WHOLESALE',
    timezone: null,
    infraCapabilities: [],
    subscriptionStatus: 'ACTIVE',
    isPlatformAdmin: false,
  } as unknown as AuthContext;
  const prismaSvc = new PrismaService();
  const alerts = new AuditAlertService(prismaSvc);
  const sales = new SalesService(prismaSvc, alerts);
  const stock = new StockService(prismaSvc, {} as PlanConfigService, alerts);
  const analytics = new AnalyticsService(prismaSvc);

  // Bouteille de grande Béninoise : achat 483, minimum 490, vente 500 ; 10 casiers en stock.
  const biere = await prisma.product.create({
    data: {
      tenantId: TENANT_ID,
      nom: 'Béninoise grande 65 cl',
      prixAchat: 483,
      prixPlancher: 490,
      prixCatalogue: 500,
      stock: 120,
    },
  });
  await prisma.productStock.create({
    data: { tenantId: TENANT_ID, productId: biere.id, etablissementId: ETAB_ID, quantite: 120 },
  });

  console.log('\n📦 Conditionnement « Casier 12 » :');
  const perte = await refusal(() =>
    stock.upsertUnits(ctx, biere.id, { units: [{ label: 'Casier 12', factorToBase: 12, salePrice: 6000, floorPrice: 5700 }] }),
  );
  check(!!perte && perte.includes('perte'), `minimum 5 700 < achat 5 796 refusé (${perte ?? 'accepté'})`);
  const [casier] = await stock.upsertUnits(ctx, biere.id, {
    units: [{ label: 'Casier 12', factorToBase: 12, salePrice: 6000, floorPrice: 5900 }],
  });
  check(casier?.floorPrice === 5900 && casier?.salePrice === 6000, 'casier enregistré : 5 900 – 6 000');

  // unitId : le casier par défaut ; `null` = bouteille au détail.
  const sell = (prixReel: number, extra: Partial<CreateSaleInput> = {}, unitId: string | null = casier!.id) =>
    sales.create(ctx, {
      items: [{ productId: biere.id, unitId: unitId ?? undefined, quantite: 1, prixReel }],
      paymentMethod: 'CASH',
      clientGeneratedId: randomUUID(),
      ...extra,
    } as CreateSaleInput);

  console.log('\n🍺 Ventes au casier :');
  check((await refusal(() => sell(6000))) === null, '6 000 F (prix affiché), sans nom de client → acceptée');
  const sansNom = await refusal(() => sell(5900));
  check(!!sansNom && sansNom.includes('nom du client'), `5 900 F sans nom de client → refusée (${sansNom ?? 'acceptée'})`);
  check((await refusal(() => sell(5900, { clientNom: 'Koffi' }))) === null, '5 900 F pour « Koffi » → acceptée');
  check((await refusal(() => sell(5950, { clientNom: 'Koffi' }))) === null, '5 950 F pour « Koffi » → acceptée');
  check((await refusal(() => sell(5900, { clientNom: 'Maman Bella', clientTelephone: '+22997000000' }))) === null,
    '5 900 F pour « Maman Bella » (fiche CRM créée) → acceptée');
  const sous = await refusal(() => sell(5850, { clientNom: 'Koffi' }));
  check(!!sous && sous.includes('minimum'), `5 850 F (sous le minimum) → refusée (${sous ?? 'acceptée'})`);
  const dessus = await refusal(() => sell(6100, { clientNom: 'Koffi' }));
  check(!!dessus && dessus.includes('dépasse'), `6 100 F (au-dessus du prix) → refusée (${dessus ?? 'acceptée'})`);

  console.log('\n🍾 Bouteille au détail (fourchette 490 – 500) :');
  const btl = await refusal(() => sell(495, { clientNom: 'Koffi' }, null));
  check(btl === null, `1 bouteille à 495 F → acceptée (${btl ?? 'ok'})`);
  check((await refusal(() => sell(510, {}, null))) !== null, '1 bouteille à 510 F → refusée');
  check((await refusal(() => sell(480, { clientNom: 'Koffi' }, null))) !== null, '1 bouteille à 480 F → refusée');

  console.log('\n📊 Rapport des remises :');
  const report = await analytics.discounts(ctx);
  for (const l of report.lignes) {
    console.log(`  · ${l.clientNom} — ${l.productNom}${l.unitLabel ? ` (${l.unitLabel})` : ''} : ${l.prixReel} au lieu de ${l.prixReference} → remise ${l.remise} F`);
  }
  // Koffi : 100 + 50 + 5 ; Maman Bella : 100 → total 255.
  check(report.totalRemise === 255, `remise totale = 255 F (obtenu ${report.totalRemise})`);
  check(report.lignes.length === 4, `4 lignes remisées (obtenu ${report.lignes.length})`);
  const koffi = report.parClient.find((c) => c.nom === 'Koffi');
  check(koffi?.remise === 155 && koffi.lignes === 3, `Koffi : 155 F sur 3 lignes (obtenu ${koffi?.remise} / ${koffi?.lignes})`);
  check(report.parClient.some((c) => c.nom === 'Maman Bella' && c.remise === 100), 'Maman Bella : 100 F (nom de la fiche CRM)');
  check(report.parVendeur[0]?.nom === 'Caissier Rodrigue' && report.parVendeur[0]?.remise === 255,
    'Caissier Rodrigue : 255 F de remises accordées');

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${failed === 0 ? '✅' : '❌'} ${results.length - failed}/${results.length} contrôles OK`);
  await cleanup();
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await cleanup().catch(() => {});
  await prisma.$disconnect();
  process.exit(2);
});
