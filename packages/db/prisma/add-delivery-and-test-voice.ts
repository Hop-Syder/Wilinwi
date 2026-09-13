/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Création du compte Livreur (DELIVERY) avec assignations de livraisons
 *   et activation du module vocal AI pour tester l'assistant micro.
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

const TENANT_ID = '00000000-0000-0000-0000-0000000000a2';
const ETAB_PRINCIPAL_ID = '00000000-0000-0000-0000-0000000000c2';

const LIVREUR_EMAIL = 'livreur@prestige.bj';
const LIVREUR_PASSWORD = '12345678';
const LIVREUR_NOM = 'Kofi le Livreur';
const LIVREUR_PIN = '1234';

async function main() {
  console.log('🚚 1. CRÉATION DU COMPTE LIVREUR ET ACTIVATION DU MODULE VOCAL IA...\n');

  // 1. Activer le module AI sur le tenant
  console.log('--- Activation du module AI sur le tenant ---');
  await prismaDirect.$executeRawUnsafe(`
    UPDATE public.tenants 
    SET module_addons = ARRAY['AI', 'MARKET', 'DELIVERY']
    WHERE id = '${TENANT_ID}';
  `);
  console.log('  ✅ Modules premium [AI, MARKET, DELIVERY] activés pour Prestige Concept Store.');

  // 2. Créer le livreur dans Supabase Auth
  console.log('\n--- Création du compte Livreur dans Supabase Auth ---');
  const livreurId = await ensureAuthUser(LIVREUR_EMAIL, LIVREUR_PASSWORD, {
    tenantId: TENANT_ID,
    role: 'DELIVERY',
    plan: 'BUSINESS',
  });
  console.log(`  ✅ Compte Supabase Auth livreur créé : ${LIVREUR_EMAIL} (${livreurId})`);

  // 3. Insérer/mettre à jour dans la table users et user_etablissements
  await withTenant(TENANT_ID, async (tx) => {
    const pinHash = await bcrypt.hash(LIVREUR_PIN, 10);
    await tx.user.upsert({
      where: { id: livreurId },
      update: {
        nom: LIVREUR_NOM,
        role: 'DELIVERY',
        poste: 'Livreur Express Prestige',
        actif: true,
        pinCode: pinHash,
      },
      create: {
        id: livreurId,
        tenantId: TENANT_ID,
        nom: LIVREUR_NOM,
        email: LIVREUR_EMAIL,
        role: 'DELIVERY',
        poste: 'Livreur Express Prestige',
        actif: true,
        pinCode: pinHash,
      },
    });

    await tx.userEtablissement.upsert({
      where: { userId_etablissementId: { userId: livreurId, etablissementId: ETAB_PRINCIPAL_ID } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        userId: livreurId,
        etablissementId: ETAB_PRINCIPAL_ID,
      },
    });
    console.log('  ✅ Livreur rattaché à l’établissement principal.');

    // 4. Assigner des livraisons réelles au livreur
    const recentSales = await tx.sale.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    if (recentSales.length >= 4) {
      // 2 livraisons en attente (à livrer)
      await tx.sale.update({
        where: { id: recentSales[0].id },
        data: {
          aLivrer: true,
          livreurId: livreurId,
          adresseLivraison: 'Haie Vive, Rue 12, Villa Étoile (près du Glacier)',
          livreLe: null,
        },
      });

      await tx.sale.update({
        where: { id: recentSales[1].id },
        data: {
          aLivrer: true,
          livreurId: livreurId,
          adresseLivraison: 'Cocotiers, Immeuble Horizon 3e étage, Porte 302',
          livreLe: null,
        },
      });

      // 2 livraisons déjà livrées
      await tx.sale.update({
        where: { id: recentSales[2].id },
        data: {
          aLivrer: true,
          livreurId: livreurId,
          adresseLivraison: 'Zone Résidentielle Cotonou, Rue des Palmiers',
          livreLe: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      await tx.sale.update({
        where: { id: recentSales[3].id },
        data: {
          aLivrer: true,
          livreurId: livreurId,
          adresseLivraison: 'Akpakpa Dodomè, Carrefour Agbato',
          livreLe: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      });
      console.log('  ✅ 4 ventes configurées en livraisons (2 en cours, 2 livrées).');
    }
  });

  console.log('\n🎉 LIVREUR CRÉÉ ET CONFIGURÉ AVEC SUCCÈS ! 🎉');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('IDENTIFIANTS DU LIVREUR :');
  console.log(`  👤 Rôle         : LIVREUR (DELIVERY)`);
  console.log(`  📧 Email        : ${LIVREUR_EMAIL}`);
  console.log(`  🔑 Mot de passe : ${LIVREUR_PASSWORD}`);
  console.log(`  🔢 Code PIN     : ${LIVREUR_PIN}`);
  console.log(`  📱 Espace       : http://localhost:3000/livraisons`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('Erreur :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaDirect.$disconnect();
  });
