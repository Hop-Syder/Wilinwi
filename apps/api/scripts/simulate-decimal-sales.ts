/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Simulation « Prestige Store » : ventes au POIDS / au VOLUME en
 *   quantités décimales (0,5 kg · 0,25 kg · 1,15 L…) via le VRAI SalesService.
 *   Vérifie les invariants qui comptent pour un petit commerçant :
 *     1. Σ mouvements de stock = stock initial − stock restant (au milli près) ;
 *     2. on ne vend JAMAIS plus que le stock de départ (STRICT) ;
 *     3. ProductStock / Product.stock = Σ grand livre ;
 *     4. Montant de chaque ligne = prix/kg × quantité, total vente = Σ lignes ;
 *     5. L'historique restitue la quantité décimale exacte (0,25 et non 1) ;
 *     6. Retour partiel et annulation ré-entrent exactement ce qui est sorti.
 *   Base CIBLE = DATABASE_URL (utiliser une base de test, jamais la prod).
 *   Usage : DATABASE_URL=postgresql://… pnpm --filter @wilinwi/api exec tsx scripts/simulate-decimal-sales.ts
 * @created 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { randomUUID } from 'node:crypto';
import { prisma } from '@wilinwi/db';
import { formatQuantity, type AuthContext, type CreateSaleInput } from '@wilinwi/types';
import { PrismaService } from '../src/common/prisma.service';
import { AuditAlertService } from '../src/common/audit-alert.service';
import { SalesService } from '../src/pos/sales.service';

const TENANT_ID = randomUUID();
const ETAB_ID = randomUUID();
const USER_ID = randomUUID();

const results: { ok: boolean; label: string }[] = [];
function check(ok: boolean, label: string) {
  results.push({ ok, label });
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
}

async function setup() {
  await prisma.tenant.create({ data: { id: TENANT_ID, nom: 'Prestige Store (simulation)' } });
  await prisma.etablissement.create({
    data: { id: ETAB_ID, tenantId: TENANT_ID, nom: 'Prestige Store — Marché', type: 'BOUTIQUE', infrastructure: 'RETAIL' },
  });
  await prisma.user.create({
    data: { id: USER_ID, tenantId: TENANT_ID, nom: 'Caissière Azo', email: 'azo@prestige.test', role: 'CASHIER' },
  });
}

/** Crée un produit au poids/volume avec un stock initial (saisi en décimal comme l'UI). */
async function createProduct(p: {
  nom: string;
  unitKind: 'WEIGHT' | 'VOLUME';
  baseUnit: string;
  prixAchat: number;
  prixPlancher: number;
  prixCatalogue: number;
  stockStored: number;
}) {
  const product = await prisma.product.create({
    data: {
      tenantId: TENANT_ID,
      nom: p.nom,
      unitKind: p.unitKind,
      baseUnit: p.baseUnit,
      prixAchat: p.prixAchat,
      prixPlancher: p.prixPlancher,
      prixCatalogue: p.prixCatalogue,
      stock: p.stockStored,
    },
  });
  await prisma.productStock.create({
    data: { tenantId: TENANT_ID, productId: product.id, etablissementId: ETAB_ID, quantite: p.stockStored },
  });
  await prisma.stockMovement.create({
    data: {
      tenantId: TENANT_ID,
      etablissementId: ETAB_ID,
      productId: product.id,
      type: 'IN',
      quantite: p.stockStored,
      motif: 'Stock initial',
    },
  });
  return product;
}

/** Supprime le tenant de simulation (les lignes de vente bloquent la cascade produit). */
async function cleanup() {
  await prisma.saleItem.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenant.delete({ where: { id: TENANT_ID } });
}

async function main() {
  await setup();
  const ctx = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    role: 'OWNER',
    email: 'owner@prestige.test',
    plan: 'BUSINESS',
    modules: [],
    etablissementId: ETAB_ID,
    isGlobalView: false,
    etablissementIds: [ETAB_ID],
    infrastructure: 'RETAIL',
    timezone: null,
    infraCapabilities: [],
    subscriptionStatus: 'ACTIVE',
    isPlatformAdmin: false,
  } as unknown as AuthContext;
  const prismaSvc = new PrismaService();
  const sales = new SalesService(prismaSvc, new AuditAlertService(prismaSvc));

  // ── Poisson : 5 kg au départ, 3 000 FCFA/kg ; stock persisté en milli-kg (§19.1).
  const poisson = await createProduct({
    nom: 'Poisson chinchard (kg)', unitKind: 'WEIGHT', baseUnit: 'kg',
    prixAchat: 1800, prixPlancher: 2200, prixCatalogue: 3000, stockStored: 5000,
  });
  // ── Huile rouge : 10 L au départ, 1 500 FCFA/L.
  const huile = await createProduct({
    nom: 'Huile rouge (L)', unitKind: 'VOLUME', baseUnit: 'L',
    prixAchat: 900, prixPlancher: 1200, prixCatalogue: 1500, stockStored: 10000,
  });

  // Ventes saisies au POS en DÉCIMAL (ce que la caissière tape).
  const poissonQtys = [0.5, 0.25, 0.25, 1.5, 0.75, 1.75]; // Σ = 5 kg exactement
  const huileQtys = [1.15, 0.5, 0.25, 0.33, 2.77]; // Σ = 5 L
  const saleIds: string[] = [];

  const sell = async (productId: string, quantite: number, prixReel: number) => {
    const input = {
      items: [{ productId, quantite, prixReel }],
      paymentMethod: 'CASH',
      clientGeneratedId: randomUUID(),
    } as unknown as CreateSaleInput;
    return sales.create(ctx, input);
  };

  console.log('\n🐟 Ventes poisson (3 000 FCFA/kg) :');
  for (const q of poissonQtys) {
    const s = (await sell(poisson.id, q, 3000)) as any;
    saleIds.push(s.id);
    const it = s.items[0];
    console.log(`  vente ${q} kg → ligne quantite=${it.quantite} total=${s.total} FCFA`);
    check(s.total === Math.round(3000 * q), `prix ${q} kg = ${Math.round(3000 * q)} FCFA (obtenu ${s.total})`);
    check(Math.abs(Number(it.quantite) - q) < 1e-9, `historique restitue ${q} kg (obtenu ${it.quantite})`);
  }

  // Tout le poisson est vendu : 0,25 kg de plus DOIT être refusé (STRICT).
  let refused = false;
  try {
    await sell(poisson.id, 0.25, 3000);
  } catch {
    refused = true;
  }
  check(refused, 'vente de 0,25 kg au-delà du stock de départ refusée');

  console.log('\n🛢️  Ventes huile (1 500 FCFA/L) :');
  for (const q of huileQtys) {
    const s = (await sell(huile.id, q, 1500)) as any;
    saleIds.push(s.id);
    console.log(`  vente ${q} L → ligne quantite=${s.items[0].quantite} total=${s.total} FCFA`);
    check(s.total === Math.round(1500 * q), `prix ${q} L = ${Math.round(1500 * q)} FCFA (obtenu ${s.total})`);
  }

  // Retour partiel de 0,25 L sur la vente de 0,5 L, puis annulation de la vente de 1,15 L.
  const venteHuile05 = (await sales.get(ctx, saleIds[poissonQtys.length + 1]!)) as any;
  await sales.returnPartial(ctx, venteHuile05.id, [{ saleItemId: venteHuile05.items[0].id, quantiteRetournee: 0.25 }], 'REFUND_CASH');
  const apresRetour = (await sales.get(ctx, venteHuile05.id)) as any;
  check(apresRetour.items[0].quantiteRetournee === 0.25, `retour de 0,25 L tracé dans l'historique (obtenu ${apresRetour.items[0].quantiteRetournee})`);
  await sales.cancelSale(ctx, saleIds[poissonQtys.length]!);

  console.log('\n📒 Contrôle du grand livre :');
  for (const [p, initial, expectedRemaining] of [
    [poisson, 5000, 0],
    // 10 L − 5 L vendus + 0,25 L retourné + 1,15 L annulé = 6,4 L
    [huile, 10000, 6400],
  ] as const) {
    const moves = await prisma.stockMovement.findMany({ where: { productId: p.id }, orderBy: { createdAt: 'asc' } });
    const ledger = moves.reduce((s, m) => s + m.quantite, 0);
    const ps = await prisma.productStock.findFirstOrThrow({ where: { productId: p.id } });
    const prod = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    console.log(`  ${p.nom} : mouvements = [${moves.map((m) => formatQuantity(m.quantite, p.unitKind, p.baseUnit)).join(' | ')}]`);
    check(ledger === expectedRemaining, `${p.nom} : Σ mouvements = ${formatQuantity(expectedRemaining, p.unitKind, p.baseUnit)} (obtenu ${formatQuantity(ledger, p.unitKind, p.baseUnit)})`);
    check(ps.quantite === ledger && prod.stock === ledger, `${p.nom} : stock restant (ProductStock/Product) = grand livre`);
    const out = moves.filter((m) => m.type === 'OUT').reduce((s, m) => s - m.quantite, 0);
    check(out <= initial, `${p.nom} : sorties (${formatQuantity(out, p.unitKind, p.baseUnit)}) ≤ stock de départ`);
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${failed === 0 ? '✅' : '❌'} ${results.length - failed}/${results.length} contrôles OK`);

  // Nettoyage : la simulation ne laisse rien derrière elle.
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
