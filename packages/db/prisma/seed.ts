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

// Identifiants fixes pour un seed idempotent (rejouable).
const DEMO_TENANT_ID = '00000000-0000-0000-0000-0000000000a1';
const DEMO_OWNER_ID = '00000000-0000-0000-0000-0000000000b1';
const DEMO_ETAB_ID = '00000000-0000-0000-0000-0000000000c1';

async function main() {
  console.log('🌱 Seed Wilinwi — boutique démo…');

  // Le tenant + son propriétaire (bootstrap : on pose le contexte tenant
  // avant les insertions pour satisfaire la RLS).
  await withTenant(DEMO_TENANT_ID, async (tx) => {
    await tx.tenant.upsert({
      where: { id: DEMO_TENANT_ID },
      update: {},
      create: { id: DEMO_TENANT_ID, nom: 'Boutique Démo Wilinwi', plan: 'PRO' },
    });

    await tx.user.upsert({
      where: { id: DEMO_OWNER_ID },
      update: {},
      create: {
        id: DEMO_OWNER_ID,
        tenantId: DEMO_TENANT_ID,
        nom: 'Awa la Propriétaire',
        email: 'owner@demo.wilinwi.com',
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
      where: { userId_etablissementId: { userId: DEMO_OWNER_ID, etablissementId: DEMO_ETAB_ID } },
      update: {},
      create: {
        tenantId: DEMO_TENANT_ID,
        userId: DEMO_OWNER_ID,
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
    ];

    for (const p of produits) {
      const existing = await tx.product.findFirst({
        where: { tenantId: DEMO_TENANT_ID, sku: p.sku },
      });
      if (!existing) {
        await tx.product.create({ data: { ...p, tenantId: DEMO_TENANT_ID } });
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
