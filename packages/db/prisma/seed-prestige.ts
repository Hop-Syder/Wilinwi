/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Seed de test « Groupe Prestige Bénin » : 1 propriétaire (compte
 *   Supabase Auth réel avec mot de passe), 2 boutiques, 10 produits par boutique
 *   (catalogue tenant + mouvement IN « Stock initial » + projection ProductStock).
 *   Idempotent : rejouable sans dupliquer les données.
 * @created 2026-07-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import bcrypt from 'bcryptjs';
import { prisma, withTenant } from '../src/index.js';
import { ensureAuthUser } from './seed-auth.js';

// Identifiants fixes pour un seed idempotent (rejouable).
const TENANT_ID = '00000000-0000-0000-0000-0000000000a2';
const ETAB_PRET_ID = '00000000-0000-0000-0000-0000000000c2';
const ETAB_PARFUM_ID = '00000000-0000-0000-0000-0000000000c3';
const ETAB_MAQUIS_ID = '00000000-0000-0000-0000-0000000000c4';

const OWNER_EMAIL = 'christian@prestige.bj';
const OWNER_PASSWORD = '12345678';
const OWNER_NOM = 'Chérif Christian';
const OWNER_PIN = '1234'; // PIN poste partagé — hashé bcrypt comme dans l'API

const SEUIL_ALERTE = 5;

interface SeedProduct {
  nom: string;
  sku: string;
  categorie: string;
  prixAchat: number;
  prixPlancher: number;
  prixCatalogue: number;
  stock: number;
  /** Typage produit (TDR v2) — défaut STANDARD. SERVICE/MANUFACTURED : stock 0, aucun mouvement. */
  type?: 'STANDARD' | 'BATCHED' | 'MANUFACTURED' | 'SERVICE';
  stockPolicy?: 'STRICT' | 'ALLOW_NEGATIVE' | 'NO_STOCK' | 'RECIPE_BASED';
  unitKind?: 'UNIT' | 'WEIGHT' | 'VOLUME' | 'PACKAGE' | 'TIME';
}

const PRODUITS_PRET_A_PORTER: SeedProduct[] = [
  { nom: 'Robe Kabas en Wax', sku: 'PRT-ROB-WAX', categorie: 'Robes', prixAchat: 8000, prixPlancher: 11000, prixCatalogue: 15000, stock: 20 },
  { nom: 'Chemise Coton Local', sku: 'PRT-CHM-COT', categorie: 'Chemises', prixAchat: 5000, prixPlancher: 7500, prixCatalogue: 10000, stock: 35 },
  { nom: 'Pantalon Chino Homme', sku: 'PRT-PAN-CHI', categorie: 'Pantalons', prixAchat: 9000, prixPlancher: 13000, prixCatalogue: 18000, stock: 15 },
  { nom: 'Veste Croisée Blazer', sku: 'PRT-VES-BLZ', categorie: 'Vestes', prixAchat: 22000, prixPlancher: 30000, prixCatalogue: 45000, stock: 8 },
  { nom: 'Boubou Brodé Traditionnel', sku: 'PRT-BOU-BRO', categorie: 'Traditionnel', prixAchat: 35000, prixPlancher: 50000, prixCatalogue: 75000, stock: 12 },
  { nom: 'Ensemble Scolaire Kaki', sku: 'PRT-ENS-KAK', categorie: 'Scolaire', prixAchat: 6000, prixPlancher: 8500, prixCatalogue: 12000, stock: 40 },
  { nom: 'Jupe Plissée en Wax', sku: 'PRT-JUP-PLI', categorie: 'Jupes', prixAchat: 4500, prixPlancher: 6000, prixCatalogue: 8500, stock: 25 },
  { nom: 'T-shirt Basique en Coton', sku: 'PRT-TSH-COT', categorie: 'T-shirts', prixAchat: 2000, prixPlancher: 3000, prixCatalogue: 5000, stock: 50 },
  { nom: 'Robe de Soirée en Satin', sku: 'PRT-ROB-SAT', categorie: 'Robes', prixAchat: 28000, prixPlancher: 38000, prixCatalogue: 55000, stock: 5 },
  { nom: 'Ceinture en Cuir Véritable', sku: 'PRT-CEI-CUI', categorie: 'Accessoires', prixAchat: 3000, prixPlancher: 5000, prixCatalogue: 8000, stock: 30 },
];

const PRODUITS_PARFUMS: SeedProduct[] = [
  { nom: 'Eau de Parfum Oud Impérial', sku: 'PRF-OUD-IMP', categorie: 'Eaux de parfum', prixAchat: 25000, prixPlancher: 35000, prixCatalogue: 50000, stock: 15 },
  { nom: 'Brume Vanille Sauvage', sku: 'PRF-BRU-VAN', categorie: 'Brumes', prixAchat: 4000, prixPlancher: 6000, prixCatalogue: 9000, stock: 50 },
  { nom: 'Encens Traditionnel Tiouraye', sku: 'PRF-ENC-TIO', categorie: 'Encens', prixAchat: 1500, prixPlancher: 2200, prixCatalogue: 3500, stock: 100 },
  { nom: 'Huile de Parfum Musc Blanc', sku: 'PRF-HUI-MUS', categorie: 'Huiles', prixAchat: 2000, prixPlancher: 3000, prixCatalogue: 5000, stock: 80 },
  { nom: 'Coffret Cadeau Prestige', sku: 'PRF-COF-PRE', categorie: 'Coffrets', prixAchat: 30000, prixPlancher: 45000, prixCatalogue: 65000, stock: 10 },
  { nom: "Cologne Citronnelle d'Afrique", sku: 'PRF-COL-CIT', categorie: 'Colognes', prixAchat: 3000, prixPlancher: 4500, prixCatalogue: 7000, stock: 30 },
  { nom: 'Parfum Ambiance Bois de Santal', sku: 'PRF-AMB-SAN', categorie: 'Ambiance', prixAchat: 5000, prixPlancher: 7500, prixCatalogue: 11000, stock: 25 },
  { nom: 'Eau de Parfum Rose Nectar', sku: 'PRF-ROS-NEC', categorie: 'Eaux de parfum', prixAchat: 12000, prixPlancher: 18000, prixCatalogue: 25000, stock: 20 },
  { nom: 'Encens Résine Oliban', sku: 'PRF-RES-OLI', categorie: 'Encens', prixAchat: 1000, prixPlancher: 1500, prixCatalogue: 2500, stock: 60 },
  { nom: 'Parfum Solide Ambre Céleste', sku: 'PRF-SOL-AMB', categorie: 'Solides', prixAchat: 2500, prixPlancher: 4000, prixCatalogue: 6000, stock: 40 },
];

// Maquis (infrastructure FOOD) : boissons STANDARD (stock direct), plats
// MANUFACTURED (vendables sans stock direct) et une prestation SERVICE.
const PRODUITS_MAQUIS: SeedProduct[] = [
  { nom: 'Sodabi artisanal 33cl', sku: 'MAQ-SOD-33', categorie: 'Boissons', prixAchat: 500, prixPlancher: 800, prixCatalogue: 1200, stock: 60 },
  { nom: 'Béninoise 50cl', sku: 'MAQ-BEN-50', categorie: 'Boissons', prixAchat: 350, prixPlancher: 500, prixCatalogue: 800, stock: 120 },
  { nom: 'Poulet bicyclette braisé', sku: 'MAQ-POU-BRA', categorie: 'Plats', type: 'MANUFACTURED', stockPolicy: 'RECIPE_BASED', prixAchat: 1800, prixPlancher: 3000, prixCatalogue: 4500, stock: 0 },
  { nom: 'Pâte rouge + fromage peulh', sku: 'MAQ-PAT-ROU', categorie: 'Plats', type: 'MANUFACTURED', stockPolicy: 'RECIPE_BASED', prixAchat: 800, prixPlancher: 1500, prixCatalogue: 2500, stock: 0 },
  { nom: 'Location espace privé (heure)', sku: 'MAQ-SRV-LOC', categorie: 'Services', type: 'SERVICE', stockPolicy: 'NO_STOCK', unitKind: 'TIME', prixAchat: 0, prixPlancher: 5000, prixCatalogue: 8000, stock: 0 },
];

// ───────────────────────────────── Seed ─────────────────────────────────

async function main() {
  console.log('🌱 Seed Wilinwi — Groupe Prestige Bénin…');

  const ownerId = await ensureAuthUser(OWNER_EMAIL, OWNER_PASSWORD, {
    tenantId: TENANT_ID,
    role: 'OWNER',
    plan: 'BUSINESS',
  });
  console.log(`   Compte auth propriétaire: ${OWNER_EMAIL} (${ownerId})`);

  await withTenant(TENANT_ID, async (tx) => {
    // `internal: false` → visible dans la console plateforme comme un vrai client.
    await tx.tenant.upsert({
      where: { id: TENANT_ID },
      update: { plan: 'BUSINESS', internal: false },
      create: {
        id: TENANT_ID,
        nom: 'Groupe Prestige Bénin',
        plan: 'BUSINESS',
        internal: false,
      },
    });

    const pinHash = await bcrypt.hash(OWNER_PIN, 10);
    await tx.user.upsert({
      where: { id: ownerId },
      update: { nom: OWNER_NOM, role: 'OWNER', actif: true, pinCode: pinHash },
      create: {
        id: ownerId,
        tenantId: TENANT_ID,
        nom: OWNER_NOM,
        email: OWNER_EMAIL,
        role: 'OWNER',
        pinCode: pinHash,
      },
    });

    const boutiques = [
      { id: ETAB_PRET_ID, nom: 'Prestige Prêt-à-Porter', type: 'BOUTIQUE', infrastructure: 'RETAIL', produits: PRODUITS_PRET_A_PORTER },
      { id: ETAB_PARFUM_ID, nom: 'Prestige Parfums', type: 'BOUTIQUE', infrastructure: 'RETAIL', produits: PRODUITS_PARFUMS },
      // Établissement FOOD : exerce la résolution de capacités par infrastructure.
      { id: ETAB_MAQUIS_ID, nom: 'Prestige Maquis', type: 'RESTAURANT', infrastructure: 'FOOD', produits: PRODUITS_MAQUIS },
    ] as const;

    for (const boutique of boutiques) {
      await tx.etablissement.upsert({
        where: { id: boutique.id },
        update: { nom: boutique.nom, infrastructure: boutique.infrastructure },
        create: {
          id: boutique.id,
          tenantId: TENANT_ID,
          nom: boutique.nom,
          type: boutique.type,
          infrastructure: boutique.infrastructure,
        },
      });
      await tx.userEtablissement.upsert({
        where: { userId_etablissementId: { userId: ownerId, etablissementId: boutique.id } },
        update: {},
        create: { tenantId: TENANT_ID, userId: ownerId, etablissementId: boutique.id },
      });

      for (const p of boutique.produits) {
        const existing = await tx.product.findFirst({
          where: { tenantId: TENANT_ID, sku: p.sku },
          select: { id: true },
        });
        if (existing) continue; // déjà seedé — on ne rejoue ni le stock ni le mouvement

        const affectsStock = p.type === undefined || p.type === 'STANDARD' || p.type === 'BATCHED';
        const created = await tx.product.create({
          data: {
            tenantId: TENANT_ID,
            nom: p.nom,
            sku: p.sku,
            categorie: p.categorie,
            type: p.type ?? 'STANDARD',
            stockPolicy: p.stockPolicy ?? 'STRICT',
            unitKind: p.unitKind ?? 'UNIT',
            prixAchat: p.prixAchat,
            prixPlancher: p.prixPlancher,
            prixCatalogue: p.prixCatalogue,
            stock: affectsStock ? p.stock : 0,
            seuilAlerte: SEUIL_ALERTE,
          },
        });

        // SERVICE/MANUFACTURED : pas de stock direct → ni mouvement ni projection.
        if (!affectsStock) continue;

        // Grand livre : stock initial = mouvement IN rattaché à la boutique.
        await tx.stockMovement.create({
          data: {
            tenantId: TENANT_ID,
            etablissementId: boutique.id,
            productId: created.id,
            type: 'IN',
            quantite: p.stock,
            motif: 'Stock initial',
          },
        });
        // Projection par emplacement (ProductStock) — cohérente avec le grand livre.
        await tx.productStock.create({
          data: {
            tenantId: TENANT_ID,
            etablissementId: boutique.id,
            productId: created.id,
            quantite: p.stock,
            quantiteMin: SEUIL_ALERTE,
          },
        });
      }
      console.log(`   🏪 ${boutique.nom}: ${boutique.produits.length} produits OK`);
    }
  });

  console.log('✅ Seed Prestige terminé.');
  console.log(`   Connexion: ${OWNER_EMAIL} / ${OWNER_PASSWORD} — tenant ${TENANT_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
