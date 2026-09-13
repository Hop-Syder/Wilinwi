/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Seed complet de vitrine/démo : Boutique "Prestige Store", 7 mois de ventes,
 *   factures/reçus publics, clients CRM, encaissements, dettes et trésorerie.
 *   Découpé par transaction mensuelle pour garantir 100% de succès sans timeout.
 * @created 2026-09-13
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { prisma, withTenant } from '../src/index.js';
import { ensureAuthUser } from './seed-auth.js';

// Charger .env depuis la racine
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  const envContent = fs.readFileSync(rootEnvPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prismaDirect = new PrismaClient({ datasources: { db: { url: directUrl } } });

// Identifiants fixes
const TENANT_ID = '00000000-0000-0000-0000-0000000000a2';
const ETAB_PRINCIPAL_ID = '00000000-0000-0000-0000-0000000000c2';
const ETAB_SECONDAIRE_ID = '00000000-0000-0000-0000-0000000000c3';

// Comptes utilisateurs
const OWNER_EMAIL = 'christian@prestige.bj';
const OWNER_PASSWORD = '12345678';
const OWNER_NOM = 'Christian Daouda';
const OWNER_PIN = '1234';

const CASHIER_EMAIL = 'amina@prestige.bj';
const CASHIER_PASSWORD = '12345678';
const CASHIER_NOM = 'Amina la Vendeuse';
const CASHIER_PIN = '5678';

// Catalogue de 16 produits phares
interface ProductDef {
  nom: string;
  sku: string;
  categorie: string;
  prixAchat: number;
  prixPlancher: number;
  prixCatalogue: number;
  stockInitial: number;
}

const PRODUITS: ProductDef[] = [
  { nom: 'Robe Kabas en Wax Hollandais', sku: 'PRT-ROB-WAX', categorie: 'Mode Féminine', prixAchat: 9000, prixPlancher: 13000, prixCatalogue: 18000, stockInitial: 70 },
  { nom: 'Chemise Lin Col Mao', sku: 'PRT-CHM-MAO', categorie: 'Mode Masculine', prixAchat: 6000, prixPlancher: 8500, prixCatalogue: 12000, stockInitial: 80 },
  { nom: 'Ensemble Veste & Pantalon Chino', sku: 'PRT-ENS-CHI', categorie: 'Mode Masculine', prixAchat: 18000, prixPlancher: 25000, prixCatalogue: 35000, stockInitial: 45 },
  { nom: 'Boubou Royal Brodé Fil d’Or', sku: 'PRT-BOU-ROY', categorie: 'Traditionnel Luxe', prixAchat: 40000, prixPlancher: 55000, prixCatalogue: 85000, stockInitial: 35 },
  { nom: 'T-shirt Coton Bio Wilinwi Signature', sku: 'PRT-TSH-WIL', categorie: 'Sportwear & Casual', prixAchat: 2500, prixPlancher: 3500, prixCatalogue: 6000, stockInitial: 140 },
  { nom: 'Jupe Plissée Soie Végétale', sku: 'PRT-JUP-SOI', categorie: 'Mode Féminine', prixAchat: 5000, prixPlancher: 7000, prixCatalogue: 10000, stockInitial: 60 },
  { nom: 'Eau de Parfum Oud Impérial 100ml', sku: 'PRF-OUD-IMP', categorie: 'Parfumerie Prestige', prixAchat: 28000, prixPlancher: 38000, prixCatalogue: 55000, stockInitial: 50 },
  { nom: 'Brume Corporelle Vanille Bourbon', sku: 'PRF-BRU-VAN', categorie: 'Soins & Beauté', prixAchat: 4500, prixPlancher: 6500, prixCatalogue: 9500, stockInitial: 100 },
  { nom: 'Huile de Parfum Musc Blanc Pur', sku: 'PRF-HUI-MUS', categorie: 'Parfumerie Prestige', prixAchat: 3000, prixPlancher: 4500, prixCatalogue: 7000, stockInitial: 90 },
  { nom: 'Coffret Cadeau Prestige Luxe', sku: 'PRF-COF-LUX', categorie: 'Coffrets Cadeaux', prixAchat: 35000, prixPlancher: 48000, prixCatalogue: 70000, stockInitial: 30 },
  { nom: 'Savon Artisanal Karité & Curcuma', sku: 'PRF-SAV-KAR', categorie: 'Soins & Beauté', prixAchat: 800, prixPlancher: 1200, prixCatalogue: 2000, stockInitial: 180 },
  { nom: 'Sac à Main Cuir Pleine Fleur', sku: 'ACC-SAC-CUI', categorie: 'Maroquinerie', prixAchat: 14000, prixPlancher: 20000, prixCatalogue: 30000, stockInitial: 40 },
  { nom: 'Ceinture Cuir Fait Main', sku: 'ACC-CEI-CUI', categorie: 'Maroquinerie', prixAchat: 3500, prixPlancher: 5000, prixCatalogue: 8500, stockInitial: 70 },
  { nom: 'Portefeuille Élégance Homme', sku: 'ACC-POR-ELE', categorie: 'Maroquinerie', prixAchat: 4000, prixPlancher: 6000, prixCatalogue: 10000, stockInitial: 60 },
  { nom: 'Lunettes de Soleil Vintage UV400', sku: 'ACC-LUN-VIN', categorie: 'Accessoires', prixAchat: 5000, prixPlancher: 7500, prixCatalogue: 12000, stockInitial: 50 },
  { nom: 'Montre Minimaliste Cadran Noir', sku: 'ACC-MON-MIN', categorie: 'Accessoires', prixAchat: 15000, prixPlancher: 22000, prixCatalogue: 35000, stockInitial: 35 },
];

// Clients CRM
const CLIENTS_DEF = [
  { nom: 'Mme Séfako Agboton', telephone: '+229 97 12 34 56', notes: 'Cliente VIP, préfère les paiements MoMo', soldeCredit: 0 },
  { nom: 'Dr. Patrick Houndété', telephone: '+229 95 88 44 22', notes: 'Achète régulièrement des costumes et parfums Oud', soldeCredit: 0 },
  { nom: 'Société Bénin Tech Hub', telephone: '+229 94 00 11 22', notes: 'Commandes corporate d’uniformes et coffrets de fin d’année', soldeCredit: 70000, plafondCredit: 300000 },
  { nom: 'Mlle Nadège Kpodji', telephone: '+229 96 33 22 11', notes: 'Paiements échelonnés réguliers', soldeCredit: 25000, plafondCredit: 100000 },
  { nom: 'M. Innocent Tossou', telephone: '+229 97 77 88 99', notes: 'Client fidèle Haie Vive', soldeCredit: 0 },
  { nom: 'Cabinet Avocats & Associés', telephone: '+229 95 66 77 88', notes: 'Commandes de groupe, paiement par virement ou chèque', soldeCredit: 45000, plafondCredit: 200000 },
  { nom: 'Mme Béatrice Dossou', telephone: '+229 96 11 44 55', notes: 'Amatrice de robes en soie', soldeCredit: 0 },
];

async function cleanTenantData() {
  console.log('🧹 Nettoyage des données du tenant avant seed...');
  const statements = [
    `DELETE FROM public.public_receipts WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.sale_installments WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.sale_items WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.sales WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.cash_movements WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.stock_movements WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.product_stock WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.products WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.clients WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.user_etablissements WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.etablissements WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.users WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM public.tenants WHERE id = '${TENANT_ID}';`,
  ];
  for (const sql of statements) {
    await prismaDirect.$executeRawUnsafe(sql);
  }
  console.log('  ✅ Tables du tenant nettoyées.');
}

async function main() {
  console.log('🌟 Démarrage du Seed Démo Showcase (Prestige Store — 7 Mois de Ventes) 🌟\n');

  // 1. Nettoyage idempotent
  await cleanTenantData();

  // 2. Création des comptes Supabase Auth
  console.log('\n--- 1. CRÉATION DES COMPTES SUPABASE AUTH ---');
  const ownerId = await ensureAuthUser(OWNER_EMAIL, OWNER_PASSWORD, {
    tenantId: TENANT_ID,
    role: 'OWNER',
    plan: 'BUSINESS',
  });
  console.log(`  ✅ Propriétaire Auth créé : ${OWNER_EMAIL} (${ownerId})`);

  const cashierId = await ensureAuthUser(CASHIER_EMAIL, CASHIER_PASSWORD, {
    tenantId: TENANT_ID,
    role: 'CASHIER',
    plan: 'BUSINESS',
  });
  console.log(`  ✅ Caissière Auth créée  : ${CASHIER_EMAIL} (${cashierId})`);

  // 3. Initialisation du Socle (Tenant, Users, Etablissements, Produits, Clients)
  console.log('\n--- 2. INITIALISATION DU SOCLE COMMERCIAL ---');
  const createdProducts: Array<{ id: string; nom: string; sku: string; prixAchat: number; prixPlancher: number; prixCatalogue: number; stock: number }> = [];
  const createdClients: Array<{ id: string; nom: string; soldeCredit: number }> = [];

  await withTenant(TENANT_ID, async (tx) => {
    await tx.tenant.create({
      data: { id: TENANT_ID, nom: 'Prestige Concept Store', plan: 'BUSINESS', internal: false },
    });

    const ownerPinHash = await bcrypt.hash(OWNER_PIN, 10);
    const cashierPinHash = await bcrypt.hash(CASHIER_PIN, 10);

    await tx.user.create({
      data: { id: ownerId, tenantId: TENANT_ID, nom: OWNER_NOM, email: OWNER_EMAIL, role: 'OWNER', actif: true, pinCode: ownerPinHash },
    });
    await tx.user.create({
      data: { id: cashierId, tenantId: TENANT_ID, nom: CASHIER_NOM, email: CASHIER_EMAIL, role: 'CASHIER', actif: true, pinCode: cashierPinHash },
    });

    // Établissements
    await tx.etablissement.create({
      data: { id: ETAB_PRINCIPAL_ID, tenantId: TENANT_ID, nom: 'Prestige Flagship (Haie Vive)', type: 'BOUTIQUE' },
    });
    await tx.etablissement.create({
      data: { id: ETAB_SECONDAIRE_ID, tenantId: TENANT_ID, nom: 'Prestige Corner (Ganhi)', type: 'BOUTIQUE' },
    });

    // Affectations
    await tx.userEtablissement.create({
      data: { tenantId: TENANT_ID, userId: ownerId, etablissementId: ETAB_PRINCIPAL_ID },
    });
    await tx.userEtablissement.create({
      data: { tenantId: TENANT_ID, userId: ownerId, etablissementId: ETAB_SECONDAIRE_ID },
    });
    await tx.userEtablissement.create({
      data: { tenantId: TENANT_ID, userId: cashierId, etablissementId: ETAB_PRINCIPAL_ID },
    });

    // Catalogue Produits
    for (const p of PRODUITS) {
      const prod = await tx.product.create({
        data: {
          tenantId: TENANT_ID,
          nom: p.nom,
          sku: p.sku,
          categorie: p.categorie,
          prixAchat: p.prixAchat,
          prixPlancher: p.prixPlancher,
          prixCatalogue: p.prixCatalogue,
          stock: p.stockInitial,
          seuilAlerte: 10,
        },
      });

      await tx.stockMovement.create({
        data: {
          tenantId: TENANT_ID,
          etablissementId: ETAB_PRINCIPAL_ID,
          productId: prod.id,
          type: 'IN',
          quantite: p.stockInitial,
          motif: 'Stock initial',
          createdAt: new Date('2026-02-25T08:00:00Z'),
        },
      });

      await tx.productStock.create({
        data: {
          tenantId: TENANT_ID,
          etablissementId: ETAB_PRINCIPAL_ID,
          productId: prod.id,
          quantite: p.stockInitial,
          quantiteMin: 10,
        },
      });

      createdProducts.push({
        id: prod.id,
        nom: prod.nom,
        sku: prod.sku,
        prixAchat: prod.prixAchat,
        prixPlancher: prod.prixPlancher,
        prixCatalogue: prod.prixCatalogue,
        stock: p.stockInitial,
      });
    }

    // Clients CRM
    for (const c of CLIENTS_DEF) {
      const cl = await tx.client.create({
        data: {
          tenantId: TENANT_ID,
          nom: c.nom,
          telephone: c.telephone,
          notes: c.notes,
          soldeCredit: c.soldeCredit,
          plafondCredit: c.plafondCredit,
        },
      });
      createdClients.push({ id: cl.id, nom: cl.nom, soldeCredit: cl.soldeCredit });
    }
  }, { timeout: 60_000, maxWait: 15_000 });

  console.log(`  ✅ 2 Établissements créés.`);
  console.log(`  ✅ ${createdProducts.length} Produits avec stock initial créés.`);
  console.log(`  ✅ ${createdClients.length} Clients CRM créés.`);

  // 4. Génération par mois (transactions indépendantes pour éviter les timeouts)
  console.log('\n--- 3. GÉNÉRATION DES 7 MOIS DE VENTES & FLUX DE TRÉSORERIE ---');
  const monthsConfig = [
    { year: 2026, month: 2, name: 'Mars 2026', count: 12 },
    { year: 2026, month: 3, name: 'Avril 2026', count: 15 },
    { year: 2026, month: 4, name: 'Mai 2026', count: 18 },
    { year: 2026, month: 5, name: 'Juin 2026', count: 20 },
    { year: 2026, month: 6, name: 'Juillet 2026', count: 24 },
    { year: 2026, month: 7, name: 'Août 2026', count: 28 },
    { year: 2026, month: 8, name: 'Septembre 2026', count: 18 },
  ];

  let totalVentesGenerees = 0;
  let totalCAGenere = 0;
  let saleCounter = 1000;

  for (const m of monthsConfig) {
    await withTenant(TENANT_ID, async (tx) => {
      // Dépense mensuelle d'exploitation
      const expenseDate = new Date(Date.UTC(m.year, m.month, 5, 10, 0, 0));
      await tx.cashMovement.create({
        data: {
          tenantId: TENANT_ID,
          etablissementId: ETAB_PRINCIPAL_ID,
          type: 'OUT',
          compte: 'CAISSE',
          montant: 120000,
          source: 'EXPENSE',
          categorie: 'Loyer boutique',
          note: `Loyer mensuel ${m.name}`,
          createdBy: ownerId,
          createdAt: expenseDate,
        },
      });

      let monthCA = 0;

      for (let i = 0; i < m.count; i++) {
        saleCounter++;
        const day = Math.min(28, Math.floor((i / m.count) * 28) + 1);
        const hour = 9 + (i % 10);
        const minute = (i * 17) % 60;
        const saleDate = new Date(Date.UTC(m.year, m.month, day, hour, minute, 0));

        // Sélectionner 1 ou 2 produits
        const numItems = (i % 2) + 1;
        const selectedProdIndices = [
          (i * 3) % createdProducts.length,
          ((i * 3) + 1) % createdProducts.length,
        ].slice(0, numItems);

        let saleTotal = 0;
        const itemsData: Array<{ productId: string; nom: string; quantite: number; prixReel: number; coutUnitaire: number }> = [];

        for (const idx of selectedProdIndices) {
          const prod = createdProducts[idx];
          const qty = (i % 3 === 0) ? 2 : 1;
          const discount = (i % 4 === 0) ? Math.floor((prod.prixCatalogue - prod.prixPlancher) * 0.25) : 0;
          const prixReel = prod.prixCatalogue - discount;
          saleTotal += prixReel * qty;

          itemsData.push({
            productId: prod.id,
            nom: prod.nom,
            quantite: qty,
            prixReel,
            coutUnitaire: prod.prixAchat,
          });

          prod.stock = Math.max(5, prod.stock - qty);
        }

        // Mode de paiement
        let paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CREDIT' = 'CASH';
        if (i % 3 === 0) paymentMethod = 'MOBILE_MONEY';
        if (i % 10 === 0) paymentMethod = 'CREDIT';

        const client = (i % 2 === 0) ? createdClients[i % createdClients.length] : null;
        const sellerId = (i % 2 === 0) ? cashierId : ownerId;
        const receiptCode = `PRST-${m.year % 100}${String(m.month + 1).padStart(2, '0')}-${String(saleCounter).padStart(4, '0')}`;

        const isCredit = paymentMethod === 'CREDIT';
        const status = isCredit ? 'PENDING_PAYMENT' : 'COMPLETED';
        const montantVerse = isCredit ? Math.floor(saleTotal * 0.5) : saleTotal;
        const soldeRestant = saleTotal - montantVerse;

        // Vente
        const createdSale = await tx.sale.create({
          data: {
            tenantId: TENANT_ID,
            etablissementId: ETAB_PRINCIPAL_ID,
            vendeurId: sellerId,
            clientId: client?.id || null,
            status,
            paymentMethod,
            total: saleTotal,
            montantVerse,
            receiptCode,
            createdAt: saleDate,
            items: {
              create: itemsData.map((item) => ({
                tenantId: TENANT_ID,
                productId: item.productId,
                quantite: item.quantite,
                prixReel: item.prixReel,
                coutUnitaire: item.coutUnitaire,
              })),
            },
          },
        });

        // Échéance si crédit
        if (isCredit) {
          const echeance = new Date(saleDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          await tx.saleInstallment.create({
            data: {
              tenantId: TENANT_ID,
              saleId: createdSale.id,
              montantTotal: saleTotal,
              montantVerse,
              soldeRestant,
              status: 'PARTIAL',
              echeance,
              createdAt: saleDate,
            },
          });
        }

        // Facture / Reçu public
        await tx.publicReceipt.create({
          data: {
            code: receiptCode,
            tenantId: TENANT_ID,
            boutiqueNom: 'Prestige Concept Store',
            total: saleTotal,
            montantVerse,
            items: itemsData.map((it) => ({ nom: it.nom, quantite: it.quantite, prixReel: it.prixReel })),
            saleDate,
            createdAt: saleDate,
          },
        });

        // Encaissement en caisse / momo
        if (montantVerse > 0) {
          await tx.cashMovement.create({
            data: {
              tenantId: TENANT_ID,
              etablissementId: ETAB_PRINCIPAL_ID,
              type: 'IN',
              compte: paymentMethod === 'MOBILE_MONEY' ? 'MOBILE_MONEY' : 'CAISSE',
              montant: montantVerse,
              source: 'SALE',
              saleId: createdSale.id,
              note: `Vente #${receiptCode}`,
              createdBy: sellerId,
              createdAt: saleDate,
            },
          });
        }

        monthCA += saleTotal;
        totalVentesGenerees++;
      }

      totalCAGenere += monthCA;
      console.log(`  ✅ ${m.name} : ${m.count} ventes générées (CA : ${monthCA.toLocaleString('fr-FR')} FCFA)`);
    }, { timeout: 60_000, maxWait: 15_000 });
  }

  // 5. Mise à jour finale des stocks
  console.log('\n--- 4. SYNCHRONISATION FINALE DU STOCK DISPONIBLE ---');
  await withTenant(TENANT_ID, async (tx) => {
    for (const p of createdProducts) {
      await tx.product.update({
        where: { id: p.id },
        data: { stock: p.stock },
      });
      await tx.productStock.updateMany({
        where: { tenantId: TENANT_ID, productId: p.id, etablissementId: ETAB_PRINCIPAL_ID },
        data: { quantite: p.stock },
      });
    }
  }, { timeout: 30_000, maxWait: 10_000 });

  console.log('  ✅ Niveaux de stocks synchronisés.');
  console.log('\n🎉 SEED DÉMO SHOWCASE TERMINÉ AVEC SUCCÈS ! 🎉');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 BILAN COMMERCIAL SUR 7 MOIS :`);
  console.log(`  • Ventes totales      : ${totalVentesGenerees}`);
  console.log(`  • Chiffre d'Affaires  : ${totalCAGenere.toLocaleString('fr-FR')} FCFA`);
  console.log(`  • Factures émises     : ${totalVentesGenerees}`);
  console.log(`  • Clients enregistrés : ${createdClients.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('IDENTIFIANTS DE CONNEXION POUR LA DÉMO :');
  console.log(`  🌐 Boutique      : Prestige Concept Store (Cotonou)`);
  console.log(`  👤 Propriétaire  : ${OWNER_EMAIL}`);
  console.log(`  🔑 Mot de passe  : ${OWNER_PASSWORD}`);
  console.log(`  🔢 Code PIN      : ${OWNER_PIN}`);
  console.log('────────────────────────────────────────────────────────────');
  console.log(`  👩‍💼 Caissière   : ${CASHIER_EMAIL}`);
  console.log(`  🔑 Mot de passe  : ${CASHIER_PASSWORD}`);
  console.log(`  🔢 Code PIN      : ${CASHIER_PIN}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Erreur lors du seed demo showcase :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaDirect.$disconnect();
  });
