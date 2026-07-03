/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modèle et gestionnaire de base de données : verify-isolation.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { prisma, withTenant } from '../src/index.js';

// Vérifie l'isolation multi-tenant : RLS au niveau base + filtres applicatifs.
const A = '00000000-0000-0000-0000-0000000000a1'; // tenant démo (seed)
// ⚠️ UUID RÉSERVÉ à ce script — jamais utilisé par un seed ou un vrai compte
// (l'ancien '…a2' est devenu le tenant Prestige : son nettoyage supprimait
// de vraies données). Le garde-fou sur le nom ci-dessous protège en plus.
const B = 'ffffffff-0000-0000-0000-00000000b0b0';
const B_NOM = 'Boutique Test B (verify-isolation)';

async function main() {
  // Prépare un second tenant avec un produit qui lui est propre.
  await withTenant(B, async (tx) => {
    await tx.tenant.upsert({
      where: { id: B },
      update: {},
      create: { id: B, nom: B_NOM, plan: 'STARTER', internal: true },
    });
    const exists = await tx.product.findFirst({ where: { tenantId: B, sku: 'B-ONLY' } });
    if (!exists) {
      await tx.product.create({
        data: {
          tenantId: B,
          nom: 'Produit B',
          sku: 'B-ONLY',
          prixAchat: 1,
          prixPlancher: 2,
          prixCatalogue: 3,
          stock: 1,
        },
      });
    }
  });

  const aScoped = await withTenant(A, (tx) => tx.product.count({ where: { tenantId: A } }));
  const bScoped = await withTenant(B, (tx) => tx.product.count({ where: { tenantId: B } }));
  // A tente de lire les produits de B (filtre applicatif) :
  const aReadsBFilter = await withTenant(A, (tx) => tx.product.count({ where: { tenantId: B } }));
  // Dans le contexte A, comptage SANS filtre → testé par la seule RLS :
  const aRlsOnly = await withTenant(A, (tx) => tx.product.count());

  console.log('Produits visibles par A (filtre app):', aScoped);
  console.log('Produits visibles par B (filtre app):', bScoped);
  console.log('A lit les produits de B via filtre tenantId=B:', aReadsBFilter);
  console.log('Comptage dans le contexte A SANS filtre (RLS seule):', aRlsOnly);
  console.log(
    aRlsOnly === aScoped && aReadsBFilter === 0
      ? '✅ RLS ENFORCÉE au niveau base (le rôle respecte la RLS).'
      : "⚠️ RLS contournée par le rôle de connexion — l'isolation repose sur les filtres applicatifs (tenant_id explicite partout).",
  );

  // Nettoyage du tenant de test — garde-fou : on ne supprime QUE si le tenant
  // est bien celui créé par ce script (nom sentinelle), jamais un vrai compte.
  await withTenant(B, async (tx) => {
    const target = await tx.tenant.findUnique({ where: { id: B }, select: { nom: true } });
    if (target?.nom !== B_NOM) {
      throw new Error(
        `Nettoyage refusé : le tenant ${B} n'est pas le tenant de test attendu (« ${target?.nom} »).`,
      );
    }
    await tx.product.deleteMany({ where: { tenantId: B } });
    await tx.tenant.delete({ where: { id: B } });
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
