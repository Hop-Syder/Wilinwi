/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Seed de test complet "Groupe Prestige Bénin" (Cycle de vie 3 Mois)
 *   - Nettoyage intégral de l'ancien tenant Groupe Prestige
 *   - Création du Tenant "Groupe Prestige" (Bénin, Cotonou)
 *   - 3 Établissements : Boutique Ganhi, Boutique Agblangandan, Dépôt Central Calavi
 *   - Équipe complète (OWNER, MANAGERS, CASHIERS, DELIVERY) avec Supabase Auth & PINs
 *   - 36 Produits réels avec prix achat, prix plancher et prix catalogue en FCFA
 *   - 10 Clients réels béninois (Carnet de dettes & crédits)
 *   - 3 Mois de ventes journalières du Lundi au Vendredi (Mai 2026 ➔ Août 2026)
 *   - Clôtures de caisse journalières (CashClose) avec fonds de caisse & écarts
 *   - Livraisons coursiers COD avec règlement de fin de tournée
 *   - Dépenses OPEX (Loyers boutiques, Factures SBEE/SONEB, Salaires employés)
 *   - Retraits personnels & Primes du DG (Daouda Christian)
 * @created 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma, withTenant } from '../src/index.js';
import { ensureAuthUser, hasSupabaseEnv } from './seed-auth.js';

// Identifiants stables pour le seed
const TENANT_ID = '00000000-0000-0000-0000-0000000000a2';
const ETAB_GANHI_ID = '00000000-0000-0000-0000-0000000000c2';
const ETAB_AGBLANGANDAN_ID = '00000000-0000-0000-0000-0000000000c3';
const ETAB_CALAVI_ID = '00000000-0000-0000-0000-0000000000c6';

// Comptes Utilisateurs
const OWNER_EMAIL = 'christian@prestige.bj';
const OWNER_NOM = 'Daouda Christian (DG)';
const OWNER_PASSWORD = 'password123';

const KOFFI_EMAIL = 'koffi@prestige.bj';
const YVETTE_EMAIL = 'yvette@prestige.bj';
const ANICET_EMAIL = 'anicet@prestige.bj';
const MARCEL_EMAIL = 'marcel@prestige.bj';
const ISMAEL_EMAIL = 'ismael@prestige.bj';

async function main() {
  console.log('🚀 Démarrage du seed complet "Groupe Prestige Bénin" (3 Mois de Cycle de Vie)...');

  // Accès Auth Supabase
  let ownerAuthId = TENANT_ID;
  if (hasSupabaseEnv()) {
    ownerAuthId = await ensureAuthUser(OWNER_EMAIL, OWNER_PASSWORD, {
      tenantId: TENANT_ID,
      role: 'OWNER',
      plan: 'BUSINESS',
    });
    console.log(`   Compte auth Supabase propriétaire: ${OWNER_EMAIL} (${ownerAuthId})`);
  }

  // ====================================================================
  // ÉTAPE 1 : SETUP INITIAL (TENANT, ETABS, USER, PRODUCTS, CLIENTS)
  // ====================================================================
  const setupResult = await withTenant(TENANT_ID, async (db) => {
    console.log('🧹 Nettoyage de l’ancien tenant Groupe Prestige...');
    await db.saleItem.deleteMany({ where: { sale: { tenantId: TENANT_ID } } });
    await db.saleInstallment.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.sale.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.stockMovement.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.productStock.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.productBatch.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.productVariant.deleteMany({ where: { product: { tenantId: TENANT_ID } } });
    await db.recipeItem.deleteMany({ where: { recipe: { tenantId: TENANT_ID } } });
    await db.productRecipe.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { tenantId: TENANT_ID } } });
    await db.purchaseOrder.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.supplierPayment.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.supplier.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.dispatchOrderItem.deleteMany({ where: { dispatchOrder: { tenantId: TENANT_ID } } });
    await db.dispatchOrder.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.product.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.clientPayment.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.client.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.cashMovement.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.cashClose.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.posSession.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.notification.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.auditAlert.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.activityLog.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.userEtablissement.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.etablissement.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.user.deleteMany({ where: { tenantId: TENANT_ID } });
    await db.tenant.deleteMany({ where: { id: TENANT_ID } });
    console.log('✅ Ancien tenant entièrement purgé.');

    console.log('🏢 Création du nouveau Tenant "Groupe Prestige"...');
    const tenant = await db.tenant.create({
      data: {
        id: TENANT_ID,
        nom: 'Groupe Prestige',
        pays: 'Bénin',
        ville: 'Cotonou',
        plan: 'BUSINESS',
        subscriptionStatus: 'ACTIVE',
        moduleAddons: ['POS', 'STOCK', 'PAY', 'CRM', 'DELIVERY', 'ANALYTICS'],
      },
    });

    console.log('🏬 Création des 3 Établissements (Ganhi, Agblangandan, Calavi)...');
    const etabGanhi = await db.etablissement.create({
      data: {
        id: ETAB_GANHI_ID,
        tenantId: tenant.id,
        nom: 'Boutique Prestige - Ganhi',
        type: 'BOUTIQUE',
        infrastructure: 'RETAIL',
        ville: 'Cotonou',
        adresse: 'Rue du Commerce, Quartier Ganhi',
        telephone: '+229 97 20 10 01',
        devise: 'XOF',
      },
    });

    const etabAgblangandan = await db.etablissement.create({
      data: {
        id: ETAB_AGBLANGANDAN_ID,
        tenantId: tenant.id,
        nom: 'Boutique Prestige - Agblangandan',
        type: 'BOUTIQUE',
        infrastructure: 'RETAIL',
        ville: 'Sèmè-Kpodji',
        adresse: 'Carrefour Agblangandan, Rue des Artisans',
        telephone: '+229 96 30 20 02',
        devise: 'XOF',
      },
    });

    const etabCalavi = await db.etablissement.create({
      data: {
        id: ETAB_CALAVI_ID,
        tenantId: tenant.id,
        nom: 'Dépôt Central Prestige - Calavi',
        type: 'ENTREPOT',
        infrastructure: 'WHOLESALE',
        ville: 'Abomey-Calavi',
        adresse: 'Zone Industrielle Kpota, Abomey-Calavi',
        telephone: '+229 95 40 30 03',
        devise: 'XOF',
      },
    });

    console.log('👥 Création de l’Équipe (Owner, Caissiers, Livreur)...');
    const pinHash = await bcrypt.hash('1234', 10);
    const pin0000 = await bcrypt.hash('0000', 10);
    const pin5678 = await bcrypt.hash('5678', 10);
    const pin1111 = await bcrypt.hash('1111', 10);
    const pin2222 = await bcrypt.hash('2222', 10);
    const pin3333 = await bcrypt.hash('3333', 10);

    const ownerUser = await db.user.create({
      data: {
        id: ownerAuthId,
        tenantId: tenant.id,
        email: OWNER_EMAIL,
        nom: OWNER_NOM,
        role: 'OWNER',
        pinCode: pin0000,
      },
    });

    const koffiAuthId = hasSupabaseEnv()
      ? await ensureAuthUser(KOFFI_EMAIL, OWNER_PASSWORD, { tenantId: tenant.id, role: 'MANAGER', plan: 'BUSINESS' })
      : crypto.randomUUID();

    const koffi = await db.user.create({
      data: {
        id: koffiAuthId,
        tenantId: tenant.id,
        email: KOFFI_EMAIL,
        nom: 'Koffi Christian (Gérant Ganhi)',
        role: 'MANAGER',
        pinCode: pinHash,
      },
    });

    const yvetteAuthId = hasSupabaseEnv()
      ? await ensureAuthUser(YVETTE_EMAIL, OWNER_PASSWORD, { tenantId: tenant.id, role: 'CASHIER', plan: 'BUSINESS' })
      : crypto.randomUUID();

    const yvette = await db.user.create({
      data: {
        id: yvetteAuthId,
        tenantId: tenant.id,
        email: YVETTE_EMAIL,
        nom: 'Yvette Akpovi (Caissière Ganhi)',
        role: 'CASHIER',
        pinCode: pin5678,
      },
    });

    const anicetAuthId = hasSupabaseEnv()
      ? await ensureAuthUser(ANICET_EMAIL, OWNER_PASSWORD, { tenantId: tenant.id, role: 'MANAGER', plan: 'BUSINESS' })
      : crypto.randomUUID();

    const anicet = await db.user.create({
      data: {
        id: anicetAuthId,
        tenantId: tenant.id,
        email: ANICET_EMAIL,
        nom: 'Anicet Dossou (Gérant Agblangandan)',
        role: 'MANAGER',
        pinCode: pin1111,
      },
    });

    const marcelAuthId = hasSupabaseEnv()
      ? await ensureAuthUser(MARCEL_EMAIL, OWNER_PASSWORD, { tenantId: tenant.id, role: 'CASHIER', plan: 'BUSINESS' })
      : crypto.randomUUID();

    const marcel = await db.user.create({
      data: {
        id: marcelAuthId,
        tenantId: tenant.id,
        email: MARCEL_EMAIL,
        nom: 'Marcel Mensah (Caissier Agblangandan)',
        role: 'CASHIER',
        pinCode: pin2222,
      },
    });

    const ismaelAuthId = hasSupabaseEnv()
      ? await ensureAuthUser(ISMAEL_EMAIL, OWNER_PASSWORD, { tenantId: tenant.id, role: 'DELIVERY', plan: 'BUSINESS' })
      : crypto.randomUUID();

    const ismael = await db.user.create({
      data: {
        id: ismaelAuthId,
        tenantId: tenant.id,
        email: ISMAEL_EMAIL,
        nom: 'Ismaël Bio (Livreur Groupe)',
        role: 'DELIVERY',
        pinCode: pin3333,
      },
    });

    await db.userEtablissement.createMany({
      data: [
        { tenantId: tenant.id, userId: ownerUser.id, etablissementId: etabGanhi.id },
        { tenantId: tenant.id, userId: ownerUser.id, etablissementId: etabAgblangandan.id },
        { tenantId: tenant.id, userId: ownerUser.id, etablissementId: etabCalavi.id },
        { tenantId: tenant.id, userId: koffi.id, etablissementId: etabGanhi.id },
        { tenantId: tenant.id, userId: yvette.id, etablissementId: etabGanhi.id },
        { tenantId: tenant.id, userId: anicet.id, etablissementId: etabAgblangandan.id },
        { tenantId: tenant.id, userId: marcel.id, etablissementId: etabAgblangandan.id },
        { tenantId: tenant.id, userId: ismael.id, etablissementId: etabGanhi.id },
        { tenantId: tenant.id, userId: ismael.id, etablissementId: etabAgblangandan.id },
      ],
    });

    console.log('📦 Création des Produits et du Stock Initial...');
    const produitsGanhi = [
      { nom: 'Robe Kabas en Wax Hollandais', sku: 'GAN-ROB-WAX', categorie: 'Robes', prixAchat: 8000, prixPlancher: 11000, prixCatalogue: 15000, stock: 50 },
      { nom: 'Chemise Coton Local Bénin', sku: 'GAN-CHM-COT', categorie: 'Chemises', prixAchat: 5000, prixPlancher: 7500, prixCatalogue: 10000, stock: 80 },
      { nom: 'Boubou Brodé VIP Traditionnel', sku: 'GAN-BOU-BRO', categorie: 'Traditionnel', prixAchat: 35000, prixPlancher: 50000, prixCatalogue: 75000, stock: 25 },
      { nom: 'Pantalon Chino Homme', sku: 'GAN-PAN-CHI', categorie: 'Pantalons', prixAchat: 9000, prixPlancher: 13000, prixCatalogue: 18000, stock: 40 },
      { nom: 'Veste Blazer Croisée Luxe', sku: 'GAN-VES-BLZ', categorie: 'Vestes', prixAchat: 22000, prixPlancher: 30000, prixCatalogue: 45000, stock: 20 },
      { nom: 'Jupe Plissée en Wax', sku: 'GAN-JUP-PLI', categorie: 'Jupes', prixAchat: 4500, prixPlancher: 6000, prixCatalogue: 8500, stock: 60 },
      { nom: 'Sac à Main Cuir Artisanal', sku: 'GAN-SAC-CUI', categorie: 'Maroquinerie', prixAchat: 12000, prixPlancher: 18000, prixCatalogue: 25000, stock: 35 },
      { nom: 'Chaussures Sandales Cuir', sku: 'GAN-CHA-SAN', categorie: 'Chaussures', prixAchat: 7000, prixPlancher: 10000, prixCatalogue: 14000, stock: 45 },
      { nom: 'Ceinture Cuir Véritable', sku: 'GAN-CEI-CUI', categorie: 'Accessoires', prixAchat: 3000, prixPlancher: 5000, prixCatalogue: 8000, stock: 70 },
      { nom: 'Foulard Soie Imprimée', sku: 'GAN-FOU-SOI', categorie: 'Accessoires', prixAchat: 2500, prixPlancher: 4000, prixCatalogue: 6000, stock: 90 },
      { nom: 'Ensemble Scolaire Kaki', sku: 'GAN-ENS-KAK', categorie: 'Scolaire', prixAchat: 6000, prixPlancher: 8500, prixCatalogue: 12000, stock: 100 },
      { nom: 'Robe de Soirée Satin Luxe', sku: 'GAN-ROB-SAT', categorie: 'Robes', prixAchat: 28000, prixPlancher: 38000, prixCatalogue: 55000, stock: 15 },
    ];

    const produitsAgblangandan = [
      { nom: 'Eau de Parfum Oud Impérial 100ml', sku: 'AGB-PRF-OUD', categorie: 'Parfums', prixAchat: 25000, prixPlancher: 35000, prixCatalogue: 50000, stock: 30 },
      { nom: 'Brume Parfumée Vanille Sauvage', sku: 'AGB-BRU-VAN', categorie: 'Brumes', prixAchat: 4000, prixPlancher: 6000, prixCatalogue: 9000, stock: 90 },
      { nom: 'Encens Tiouraye Artisanal', sku: 'AGB-ENC-TIO', categorie: 'Encens', prixAchat: 1500, prixPlancher: 2200, prixCatalogue: 3500, stock: 150 },
      { nom: 'Huile Parfumée Musc Blanc', sku: 'AGB-HUI-MUS', categorie: 'Huiles', prixAchat: 2000, prixPlancher: 3000, prixCatalogue: 5000, stock: 120 },
      { nom: 'Coffret Cadeau Prestige Luxe', sku: 'AGB-COF-PRE', categorie: 'Coffrets', prixAchat: 30000, prixPlancher: 45000, prixCatalogue: 65000, stock: 20 },
      { nom: 'Cologne Citronnelle d’Afrique', sku: 'AGB-COL-CIT', categorie: 'Colognes', prixAchat: 3000, prixPlancher: 4500, prixCatalogue: 7000, stock: 60 },
      { nom: 'Montre Acier Inoxydable Homme', sku: 'AGB-MON-ACI', categorie: 'Bijoux', prixAchat: 15000, prixPlancher: 22000, prixCatalogue: 30000, stock: 25 },
      { nom: 'Bracelet Perles Africaines', sku: 'AGB-BRA-PER', categorie: 'Bijoux', prixAchat: 2000, prixPlancher: 3500, prixCatalogue: 5000, stock: 100 },
      { nom: 'Lunettes de Soleil Tendance', sku: 'AGB-LUN-SOL', categorie: 'Accessoires', prixAchat: 5000, prixPlancher: 8000, prixCatalogue: 12000, stock: 40 },
      { nom: 'Sac Pochette Satin Soirée', sku: 'AGB-SAC-SAT', categorie: 'Sacs', prixAchat: 6000, prixPlancher: 9000, prixCatalogue: 13000, stock: 35 },
      { nom: 'Parfum Solide Ambre Céleste', sku: 'AGB-SOL-AMB', categorie: 'Parfums', prixAchat: 2500, prixPlancher: 4000, prixCatalogue: 6000, stock: 75 },
      { nom: 'Pochette Ordinateur Pagne Wax', sku: 'AGB-POC-ORD', categorie: 'Accessoires', prixAchat: 4500, prixPlancher: 7000, prixCatalogue: 10000, stock: 50 },
    ];

    const produitsCalavi = [
      { nom: 'Rouleau Pagne Wax Hollandais (6 yards)', sku: 'CAL-ROU-WAX', categorie: 'Tissus Gros', prixAchat: 18000, prixPlancher: 24000, prixCatalogue: 32000, stock: 150 },
      { nom: 'Bazin Riche Gagnagna (3 yards)', sku: 'CAL-BAZ-RIC', categorie: 'Tissus Gros', prixAchat: 22000, prixPlancher: 30000, prixCatalogue: 40000, stock: 100 },
      { nom: 'Carton T-shirts Coton Vierge (24 pcs)', sku: 'CAL-CAR-TSH', categorie: 'Lots Vêtements', prixAchat: 36000, prixPlancher: 48000, prixCatalogue: 65000, stock: 40 },
      { nom: 'Lot Fil à Coudre Assorti (12 bobines)', sku: 'CAL-LOT-FIL', categorie: 'Mercerie Gros', prixAchat: 4000, prixPlancher: 6000, prixCatalogue: 9000, stock: 200 },
      { nom: 'Rouleau Tissu Dentelle Broderie', sku: 'CAL-ROU-DEN', categorie: 'Tissus Gros', prixAchat: 25000, prixPlancher: 35000, prixCatalogue: 48000, stock: 80 },
      { nom: 'Carton Boutons Nacre (500 pcs)', sku: 'CAL-CAR-BOU', categorie: 'Mercerie Gros', prixAchat: 8000, prixPlancher: 12000, prixCatalogue: 16000, stock: 60 },
      { nom: 'Fermetures Éclair Assorties (50 pcs)', sku: 'CAL-FER-ECL', categorie: 'Mercerie Gros', prixAchat: 5000, prixPlancher: 8000, prixCatalogue: 11000, stock: 90 },
      { nom: 'Rouleau Tissu Lin Pur', sku: 'CAL-ROU-LIN', categorie: 'Tissus Gros', prixAchat: 30000, prixPlancher: 40000, prixCatalogue: 55000, stock: 50 },
      { nom: 'Mannequin d’Exposition Bois', sku: 'CAL-MAN-BOI', categorie: 'Équipement', prixAchat: 12000, prixPlancher: 18000, prixCatalogue: 25000, stock: 30 },
      { nom: 'Ciseaux Couturier Professionnel', sku: 'CAL-CIS-PRO', categorie: 'Outillage', prixAchat: 3500, prixPlancher: 5000, prixCatalogue: 7500, stock: 120 },
    ];

    const createdProducts: Array<{ id: string; etabId: string; prixCatalogue: number; prixAchat: number; nom: string }> = [];

    const createBatchProducts = async (etabId: string, items: typeof produitsGanhi) => {
      for (const p of items) {
        const prod = await db.product.create({
          data: {
            tenantId: tenant.id,
            nom: p.nom,
            sku: p.sku,
            categorie: p.categorie,
            prixAchat: p.prixAchat,
            prixPlancher: p.prixPlancher,
            prixCatalogue: p.prixCatalogue,
            stock: p.stock,
            seuilAlerte: 5,
          },
        });

        await db.productStock.create({
          data: {
            tenantId: tenant.id,
            etablissementId: etabId,
            productId: prod.id,
            quantite: p.stock,
            quantiteMin: 5,
          },
        });

        await db.stockMovement.create({
          data: {
            tenantId: tenant.id,
            etablissementId: etabId,
            productId: prod.id,
            type: 'IN',
            quantite: p.stock,
            motif: 'Stock Initial Seed Prestige',
          },
        });

        createdProducts.push({ id: prod.id, etabId, prixCatalogue: p.prixCatalogue, prixAchat: p.prixAchat, nom: p.nom });
      }
    };

    await createBatchProducts(etabGanhi.id, produitsGanhi);
    await createBatchProducts(etabAgblangandan.id, produitsAgblangandan);
    await createBatchProducts(etabCalavi.id, produitsCalavi);

    console.log('👥 Création des 10 Clients Béninois (Carnet de Dettes)...');
    const clientsData = [
      { nom: 'Mme Clarisse Akpovi', telephone: '+229 97 11 22 33', adresse: 'Agblangandan Carrefour', plafondCredit: 200000 },
      { nom: 'M. Euloge Soglo', telephone: '+229 96 44 55 66', adresse: 'Cotonou Ganhi Rue 4', plafondCredit: 150000 },
      { nom: 'Mme Fernande Houndéton', telephone: '+229 95 77 88 99', adresse: 'Abomey-Calavi Kpota', plafondCredit: 300000 },
      { nom: 'M. Hippolyte Kpodékon', telephone: '+229 97 00 11 22', adresse: 'Akpakpa Cotonou', plafondCredit: 100000 },
      { nom: 'Mme Rose Adjanohoun', telephone: '+229 96 33 44 55', adresse: 'Cadjehoun Cotonou', plafondCredit: 250000 },
      { nom: 'M. Blaise Agbossou', telephone: '+229 95 66 77 88', adresse: 'Fidjrossè Cotonou', plafondCredit: 180000 },
      { nom: 'Mme Chantal Degboé', telephone: '+229 97 99 00 11', adresse: 'Porto-Novo Ouando', plafondCredit: 120000 },
      { nom: 'M. Donald Houessou', telephone: '+229 96 22 33 44', adresse: 'Godomey Togoudo', plafondCredit: 220000 },
      { nom: 'Mme Estelle Lawson', telephone: '+229 95 55 66 77', adresse: 'Haie Vive Cotonou', plafondCredit: 400000 },
      { nom: 'M. Gilles Tossou', telephone: '+229 97 88 99 00', adresse: 'Sèmè-Kpodji PK10', plafondCredit: 150000 },
    ];

    const createdClients = [];
    for (const c of clientsData) {
      const cli = await db.client.create({
        data: {
          tenantId: tenant.id,
          nom: c.nom,
          telephone: c.telephone,
          notes: c.adresse,
          plafondCredit: c.plafondCredit,
          soldeCredit: 0,
        },
      });
      createdClients.push({ ...cli, adresse: c.adresse });
    }

    return {
      tenantId: tenant.id,
      etabGanhiId: etabGanhi.id,
      etabAgblangandanId: etabAgblangandan.id,
      etabCalaviId: etabCalavi.id,
      ownerId: ownerUser.id,
      koffiId: koffi.id,
      yvetteId: yvette.id,
      anicetId: anicet.id,
      marcelId: marcel.id,
      ismaelId: ismael.id,
      createdProducts,
      createdClients,
    };
  });

  // ====================================================================
  // ÉTAPE 2 : GÉNÉRATION DE LA VIE DU COMMERCE SUR 3 MOIS (JOUR PAR JOUR)
  // ====================================================================
  console.log('📅 Génération des Ventes, Clôtures, OPEX et Règlements sur 3 Mois (Mai ➔ Août 2026)...');

  const startDate = new Date('2026-05-05');
  const endDate = new Date('2026-08-05');
  let saleCounter = 1000;

  const etabs = [
    { id: setupResult.etabGanhiId, sellerId: setupResult.yvetteId, managerId: setupResult.koffiId },
    { id: setupResult.etabAgblangandanId, sellerId: setupResult.marcelId, managerId: setupResult.anicetId },
  ];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0 = Dimanche, 6 = Samedi
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Du Lundi au Vendredi

    // Chaque jour s'exécute dans son propre bloc withTenant (rapide, sans timeout)
    await withTenant(TENANT_ID, async (db) => {
      const isFirstOfMonth = d.getDate() === 1;
      const isMidMonth = d.getDate() === 15;
      const isPayDay = d.getDate() === 28;
      const isDgWithdrawalDay = d.getDate() === 12 || d.getDate() === 25;

      // --- 1. DÉPENSES OPEX EN DÉBUT ET MILIEU DE MOIS ---
      if (isFirstOfMonth) {
        await db.cashMovement.createMany({
          data: [
            { tenantId: TENANT_ID, etablissementId: setupResult.etabGanhiId, type: 'OUT', compte: 'CAISSE', montant: 150000, note: 'Loyer Mensuel Boutique Ganhi', categorie: 'OPEX_RENT', source: 'EXPENSE', createdBy: setupResult.koffiId, createdAt: d },
            { tenantId: TENANT_ID, etablissementId: setupResult.etabAgblangandanId, type: 'OUT', compte: 'CAISSE', montant: 100000, note: 'Loyer Mensuel Boutique Agblangandan', categorie: 'OPEX_RENT', source: 'EXPENSE', createdBy: setupResult.anicetId, createdAt: d },
            { tenantId: TENANT_ID, etablissementId: setupResult.etabCalaviId, type: 'OUT', compte: 'CAISSE', montant: 80000, note: 'Loyer Mensuel Dépôt Calavi', categorie: 'OPEX_RENT', source: 'EXPENSE', createdBy: setupResult.ownerId, createdAt: d },
          ],
        });
      }

      if (isMidMonth) {
        await db.cashMovement.createMany({
          data: [
            { tenantId: TENANT_ID, etablissementId: setupResult.etabGanhiId, type: 'OUT', compte: 'CAISSE', montant: 25000, note: 'Facture Électricité SBEE Ganhi', categorie: 'OPEX_UTILITIES', source: 'EXPENSE', createdBy: setupResult.koffiId, createdAt: d },
            { tenantId: TENANT_ID, etablissementId: setupResult.etabAgblangandanId, type: 'OUT', compte: 'CAISSE', montant: 18000, note: 'Facture Électricité SBEE Agblangandan', categorie: 'OPEX_UTILITIES', source: 'EXPENSE', createdBy: setupResult.anicetId, createdAt: d },
            { tenantId: TENANT_ID, etablissementId: setupResult.etabGanhiId, type: 'OUT', compte: 'CAISSE', montant: 8000, note: 'Facture Eau SONEB Ganhi', categorie: 'OPEX_UTILITIES', source: 'EXPENSE', createdBy: setupResult.yvetteId, createdAt: d },
          ],
        });
      }

      if (isPayDay) {
        await db.cashMovement.createMany({
          data: [
            { tenantId: TENANT_ID, etablissementId: setupResult.etabGanhiId, type: 'OUT', compte: 'CAISSE', montant: 120000, note: 'Salaire Mensuel Koffi (Gérant)', categorie: 'OPEX_SALARY', source: 'EXPENSE', createdBy: setupResult.ownerId, createdAt: d },
            { tenantId: TENANT_ID, etablissementId: setupResult.etabGanhiId, type: 'OUT', compte: 'CAISSE', montant: 80000, note: 'Salaire Mensuel Yvette (Caissière)', categorie: 'OPEX_SALARY', source: 'EXPENSE', createdBy: setupResult.koffiId, createdAt: d },
            { tenantId: TENANT_ID, etablissementId: setupResult.etabAgblangandanId, type: 'OUT', compte: 'CAISSE', montant: 110000, note: 'Salaire Mensuel Anicet (Gérant)', categorie: 'OPEX_SALARY', source: 'EXPENSE', createdBy: setupResult.ownerId, createdAt: d },
            { tenantId: TENANT_ID, etablissementId: setupResult.etabAgblangandanId, type: 'OUT', compte: 'CAISSE', montant: 80000, note: 'Salaire Mensuel Marcel (Caissier)', categorie: 'OPEX_SALARY', source: 'EXPENSE', createdBy: setupResult.anicetId, createdAt: d },
            { tenantId: TENANT_ID, etablissementId: setupResult.etabGanhiId, type: 'OUT', compte: 'CAISSE', montant: 90000, note: 'Salaire Mensuel Ismaël (Livreur)', categorie: 'OPEX_SALARY', source: 'EXPENSE', createdBy: setupResult.ownerId, createdAt: d },
          ],
        });
      }

      if (isDgWithdrawalDay) {
        await db.cashMovement.create({
          data: {
            tenantId: TENANT_ID,
            etablissementId: setupResult.etabGanhiId,
            type: 'OUT',
            compte: 'CAISSE',
            montant: 150000,
            note: 'Prélèvement / Retrait DG Daouda Christian (Loyer personnel & Prime)',
            categorie: 'OWNER_WITHDRAWAL',
            source: 'EXPENSE',
            createdBy: setupResult.ownerId,
            createdAt: d,
          },
        });
      }

      // --- 2. VENTES PAR BOUTIQUE ---
      for (const etab of etabs) {
        const sellerId = etab.sellerId;
        const prodsOfEtab = setupResult.createdProducts.filter((p) => p.etabId === etab.id);
        if (prodsOfEtab.length === 0) continue;

        const numSales = 2 + Math.floor(Math.random() * 3);
        let dailyCashTotal = 0;

        for (let s = 0; s < numSales; s++) {
          saleCounter++;
          const prod = prodsOfEtab[Math.floor(Math.random() * prodsOfEtab.length)];
          const client = setupResult.createdClients[Math.floor(Math.random() * setupResult.createdClients.length)];
          const qty = 1 + Math.floor(Math.random() * 2);
          const lineTotal = prod.prixCatalogue * qty;

          const rand = Math.random();
          let paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'INSTALLMENT' = 'CASH';
          let montantPaye = lineTotal;
          let saleStatus: 'COMPLETED' | 'PENDING_PAYMENT' = 'COMPLETED';

          if (rand < 0.45) {
            paymentMethod = 'CASH';
            dailyCashTotal += lineTotal;
          } else if (rand < 0.80) {
            paymentMethod = 'MOBILE_MONEY';
          } else {
            paymentMethod = 'INSTALLMENT';
            montantPaye = Math.floor(lineTotal * 0.4);
            dailyCashTotal += montantPaye;
            saleStatus = 'PENDING_PAYMENT';
          }

          const saleTime = new Date(d);
          saleTime.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));

          const sale = await db.sale.create({
            data: {
              tenantId: TENANT_ID,
              etablissementId: etab.id,
              vendeurId: sellerId,
              clientId: client.id,
              total: lineTotal,
              montantVerse: montantPaye,
              paymentMethod: paymentMethod === 'MOBILE_MONEY' ? 'MOBILE_MONEY' : paymentMethod === 'INSTALLMENT' ? 'INSTALLMENT' : 'CASH',
              status: saleStatus,
              receiptCode: `REC-PRESTIGE-${saleCounter}`,
              createdAt: saleTime,
            },
          });

          await db.saleItem.create({
            data: {
              tenantId: TENANT_ID,
              saleId: sale.id,
              productId: prod.id,
              quantite: qty,
              prixReel: prod.prixCatalogue,
              coutUnitaire: prod.prixAchat,
            },
          });

          await db.stockMovement.create({
            data: {
              tenantId: TENANT_ID,
              etablissementId: etab.id,
              productId: prod.id,
              type: 'OUT',
              quantite: qty,
              motif: `Vente ${sale.receiptCode}`,
              createdAt: saleTime,
            },
          });

          await db.productStock.updateMany({
            where: { etablissementId: etab.id, productId: prod.id },
            data: { quantite: { decrement: qty } },
          });

          if (paymentMethod === 'INSTALLMENT') {
            const resteAPayer = lineTotal - montantPaye;
            await db.saleInstallment.create({
              data: {
                tenantId: TENANT_ID,
                saleId: sale.id,
                montantTotal: lineTotal,
                montantVerse: montantPaye,
                soldeRestant: resteAPayer,
                status: 'PARTIAL',
                echeance: new Date(d.getTime() + 14 * 86400000),
              },
            });

            await db.client.update({
              where: { id: client.id },
              data: { soldeCredit: { increment: resteAPayer } },
            });
          }

          if (Math.random() < 0.25) {
            const isDelivered = Math.random() < 0.90;
            await db.sale.update({
              where: { id: sale.id },
              data: {
                aLivrer: true,
                livreur: { connect: { id: setupResult.ismaelId } },
                adresseLivraison: client.adresse || 'Agblangandan Cotonou',
                livreLe: isDelivered ? saleTime : null,
              },
            });
          }
        }

        // --- 3. CLÔTURE DE CAISSE EN FIN DE JOURNÉE ---
        const closeTime = new Date(d);
        closeTime.setHours(18, 30, 0);

        const floatInitial = 20000;
        const ecart = Math.random() < 0.2 ? -500 : 0;
        const soldeReel = floatInitial + dailyCashTotal + ecart;

        await db.cashClose.create({
          data: {
            tenantId: TENANT_ID,
            etablissementId: etab.id,
            closedBy: sellerId,
            compte: 'CAISSE',
            soldeTheorique: floatInitial + dailyCashTotal,
            soldeReel: soldeReel,
            ecart: ecart,
            note: ecart !== 0 ? 'Petit écart de rendu de monnaie' : 'Caisse parfaitement équilibrée',
            createdAt: closeTime,
          },
        });
      }

      // --- 4. REMBOURSEMENTS DE DETTES CLIENTS ---
      if (d.getDate() === 10 || d.getDate() === 24) {
        const debtorClients = await db.client.findMany({
          where: { tenantId: TENANT_ID, soldeCredit: { gt: 0 } },
          take: 3,
        });

        for (const cli of debtorClients) {
          const payAmount = Math.min(cli.soldeCredit, 25000);
          if (payAmount <= 0) continue;

          await db.clientPayment.create({
            data: {
              tenantId: TENANT_ID,
              clientId: cli.id,
              montant: payAmount,
              methode: 'CASH',
              note: 'Règlement d’acompte crédit mensuel',
              createdBy: setupResult.koffiId,
              createdAt: d,
            },
          });

          await db.client.update({
            where: { id: cli.id },
            data: { soldeCredit: { decrement: payAmount } },
          });

          await db.cashMovement.create({
            data: {
              tenantId: TENANT_ID,
              etablissementId: setupResult.etabGanhiId,
              type: 'IN',
              compte: 'CAISSE',
              montant: payAmount,
              note: `Règlement Dette Client : ${cli.nom}`,
              categorie: 'DEBT_REIMBURSEMENT',
              source: 'REPAYMENT',
              createdBy: setupResult.koffiId,
              createdAt: d,
            },
          });
        }
      }
    });
  }

  console.log('✅ SEED "GROUPE PRESTIGE BÉNIN" EXÉCUTÉ AVEC SUCCÈS !');
  console.log(`
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏢 Tenant            : Groupe Prestige (Bénin, Cotonou)                │
│ 🏬 Établissements   : 3 (Ganhi, Agblangandan, Dépôt Calavi)            │
│ 👥 Utilisateurs      : DG Daouda, Koffi, Yvette, Anicet, Marcel, Ismaël  │
│ 🔐 Accès Owner       : christian@prestige.bj / password123 (PIN: 0000) │
│ 📦 Produits Stockés  : 36 Articles Réels Béninois                       │
│ 👥 Clients CRM       : 10 Clients Béninois avec carnets de dettes       │
│ 📅 Cycle de vie      : 3 Mois complets de Ventes, Clôtures & OPEX      │
└─────────────────────────────────────────────────────────────────────────┘
  `);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed Groupe Prestige :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
