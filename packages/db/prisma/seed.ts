/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modèle et gestionnaire de base de données : seed.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { prisma, withTenant } from '../src/index.js';
import { ensureAuthUser, hasSupabaseEnv } from './seed-auth.js';

// Identifiants fixes pour un seed idempotent (rejouable).
const DEMO_TENANT_ID = '00000000-0000-0000-0000-0000000000a1';
const DEMO_OWNER_ID = '00000000-0000-0000-0000-0000000000b1';
const DEMO_ETAB_ID = '00000000-0000-0000-0000-0000000000c1';
const DEMO_OWNER_EMAIL = 'owner@demo.wilinwi.com';
const DEMO_OWNER_PASSWORD = 'demo-wilinwi';

async function main() {
  console.log('🌱 Seed Wilinwi — boutique démo…');

  // Compte auth réel si les creds Supabase sont présents (sinon id fixe, non
  // connectable — suffisant pour peupler la base en environnement minimal).
  let ownerId = DEMO_OWNER_ID;
  if (hasSupabaseEnv()) {
    ownerId = await ensureAuthUser(DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD, {
      tenantId: DEMO_TENANT_ID,
      role: 'OWNER',
      plan: 'PRO',
    });
    console.log(`   Compte auth démo: ${DEMO_OWNER_EMAIL} / ${DEMO_OWNER_PASSWORD}`);
  } else {
    console.log('   (SUPABASE_URL absent → propriétaire démo sans compte auth connectable)');
  }

  // Le tenant + son propriétaire (bootstrap : on pose le contexte tenant
  // avant les insertions pour satisfaire la RLS).
  await withTenant(DEMO_TENANT_ID, async (tx) => {
    // `internal: true` → exclu des vues/métriques de la console plateforme.
    await tx.tenant.upsert({
      where: { id: DEMO_TENANT_ID },
      update: { internal: true },
      create: { id: DEMO_TENANT_ID, nom: 'Boutique Démo Wilinwi', plan: 'PRO', internal: true },
    });

    await tx.user.upsert({
      where: { id: ownerId },
      update: {},
      create: {
        id: ownerId,
        tenantId: DEMO_TENANT_ID,
        nom: 'Awa la Propriétaire',
        email: DEMO_OWNER_EMAIL,
        role: 'OWNER',
      },
    });

    // Premier établissement de l'entreprise démo + accès du propriétaire.
    await tx.etablissement.upsert({
      where: { id: DEMO_ETAB_ID },
      update: {},
      create: {
        id: DEMO_ETAB_ID,
        tenantId: DEMO_TENANT_ID,
        nom: 'Boutique Démo Wilinwi',
        type: 'BOUTIQUE',
      },
    });
    await tx.userEtablissement.upsert({
      where: { userId_etablissementId: { userId: ownerId, etablissementId: DEMO_ETAB_ID } },
      update: {},
      create: {
        tenantId: DEMO_TENANT_ID,
        userId: ownerId,
        etablissementId: DEMO_ETAB_ID,
      },
    });

    const produits = [
      {
        nom: 'Pagne Wax 6 yards',
        sku: 'WAX-6Y',
        prixAchat: 8000,
        prixPlancher: 11000,
        prixCatalogue: 15000,
        stock: 24,
      },
      {
        nom: 'Sac à main cuir',
        sku: 'SAC-CUIR',
        prixAchat: 12000,
        prixPlancher: 18000,
        prixCatalogue: 25000,
        stock: 8,
      },
      {
        nom: 'Savon noir 250g',
        sku: 'SAV-250',
        prixAchat: 500,
        prixPlancher: 800,
        prixCatalogue: 1200,
        stock: 120,
      },
      // Typage produit (TDR v2) : un SERVICE (vendable sans stock) et un
      // MANUFACTURED (plat fabriqué, pas de décrément direct) pour tester le POS.
      {
        nom: 'Retouche couture express',
        sku: 'SRV-RETOUCHE',
        type: 'SERVICE' as const,
        stockPolicy: 'NO_STOCK' as const,
        unitKind: 'TIME' as const,
        prixAchat: 0,
        prixPlancher: 1000,
        prixCatalogue: 2000,
        stock: 0,
      },
      {
        nom: 'Poulet braisé + accompagnement',
        sku: 'PLAT-POULET',
        type: 'MANUFACTURED' as const,
        stockPolicy: 'RECIPE_BASED' as const,
        prixAchat: 1500,
        prixPlancher: 2500,
        prixCatalogue: 3500,
        stock: 0,
      },
    ];

    for (const p of produits) {
      let product = await tx.product.findFirst({
        where: { tenantId: DEMO_TENANT_ID, sku: p.sku },
      });
      if (!product) {
        product = await tx.product.create({ data: { ...p, tenantId: DEMO_TENANT_ID } });
      }

      // Cohérence Hub & Spoke (auto-réparatrice, idempotente) : le stock affiché
      // doit exister dans le grand livre (mouvement « Stock initial ») ET dans la
      // projection ProductStock de l'établissement — sinon le POS refuse de vendre
      // (projection = 0) alors que la fiche affiche du stock.
      const affectsStock =
        product.type === 'STANDARD' || product.type === 'BATCHED';
      if (!affectsStock || product.stock === 0) continue;

      const hasInitial = await tx.stockMovement.findFirst({
        where: { tenantId: DEMO_TENANT_ID, productId: product.id, motif: 'Stock initial' },
        select: { id: true },
      });
      if (hasInitial) continue;

      await tx.stockMovement.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          etablissementId: DEMO_ETAB_ID,
          productId: product.id,
          type: 'IN',
          quantite: product.stock,
          motif: 'Stock initial',
        },
      });
      const projection = await tx.productStock.findFirst({
        where: { etablissementId: DEMO_ETAB_ID, productId: product.id, variantId: null },
        select: { id: true },
      });
      if (projection) {
        await tx.productStock.update({
          where: { id: projection.id },
          data: { quantite: { increment: product.stock } },
        });
      } else {
        await tx.productStock.create({
          data: {
            tenantId: DEMO_TENANT_ID,
            etablissementId: DEMO_ETAB_ID,
            productId: product.id,
            quantite: product.stock,
            quantiteMin: product.seuilAlerte,
          },
        });
      }
    }
  });

  console.log('✅ Seed terminé. Tenant démo:', DEMO_TENANT_ID);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
