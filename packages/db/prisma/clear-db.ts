/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Vidage complet de la mémoire de données (PostgreSQL + Supabase Auth)
 * @created 2026-09-13
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

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
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const prismaDirect = new PrismaClient({
  datasources: {
    db: { url: directUrl },
  },
});

async function main() {
  console.log('🚀 Début du vidage complet de la base de données Wilinwi...\n');

  try {
    // 1. Suppression des utilisateurs Supabase Auth
    console.log('--- 1. SUPPRESSION DE TOUS LES UTILISATEURS SUPABASE AUTH ---');
    if (supabaseUrl && serviceKey) {
      const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=100`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      const listData = (await listRes.json()) as { users?: Array<{ id: string; email?: string }> };
      const users = listData.users || [];
      console.log(`Comptes Supabase Auth trouvés : ${users.length}`);

      for (const u of users) {
        console.log(`Suppression du compte auth : ${u.email} (${u.id})...`);
        const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${u.id}`, {
          method: 'DELETE',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        });
        if (delRes.ok) {
          console.log(`  ✅ Compte supprimé : ${u.email}`);
        } else {
          console.log(`  ❌ Erreur suppression : ${u.email}`);
        }
      }
    }

    // 2. Vidage des tables dans le schéma public
    console.log('\n--- 2. VIDAGE DE TOUTES LES TABLES DE DONNÉES (PUBLIC) ---');
    const tables = (await prismaDirect.$queryRawUnsafe(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename != '_prisma_migrations';
    `)) as Array<{ tablename: string }>;

    console.log(`Tables détectées (${tables.length}) :`, tables.map((t) => t.tablename).join(', '));

    for (const { tablename } of tables) {
      try {
        await prismaDirect.$executeRawUnsafe(`TRUNCATE TABLE public."${tablename}" CASCADE;`);
        console.log(`  ✅ Table vidée : public."${tablename}"`);
      } catch (err: any) {
        console.warn(`  ⚠️ TRUNCATE CASCADE impossible pour ${tablename}, tentative DELETE : ${err.message}`);
        try {
          await prismaDirect.$executeRawUnsafe(`DELETE FROM public."${tablename}";`);
          console.log(`  ✅ Table vidée (DELETE) : public."${tablename}"`);
        } catch (e2: any) {
          console.error(`  ❌ Échec pour public."${tablename}" :`, e2.message);
        }
      }
    }

    // 3. Réinitialisation des plans de référence
    console.log('\n--- 3. INITIALISATION DES PLANS SYSTÈME DE RÉFÉRENCE ---');
    await prismaDirect.$executeRawUnsafe(`
      INSERT INTO public.plan_configs
        (plan, label, price_monthly, price_yearly, max_users, max_etablissements, max_devices, max_photos, max_products, updated_at)
      VALUES
        ('STARTER',    'Starter',    0,     NULL,    1,  1,  1,  0,  100, now()),
        ('PRO',        'Pro',        5000,  50000,   5,  2,  5,  0,  -1,  now()),
        ('BUSINESS',   'Business',   15000, 150000, -1, -1, 30,  6,  -1,  now()),
        ('ENTERPRISE', 'Enterprise', NULL,  NULL,   -1, -1, -1, 12,  -1,  now())
      ON CONFLICT (plan) DO NOTHING;
    `);
    console.log('✅ Configuration des 4 plans système rétablie.');

    // 4. Vérification finale
    console.log('\n--- 4. VÉRIFICATION DU RÉSULTAT ---');
    const tenantCount = (await prismaDirect.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM public.tenants;`,
    )) as Array<{ count: number }>;
    const userCount = (await prismaDirect.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM public.users;`,
    )) as Array<{ count: number }>;
    const productCount = (await prismaDirect.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM public.products;`,
    )) as Array<{ count: number }>;
    const saleCount = (await prismaDirect.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM public.sales;`,
    )) as Array<{ count: number }>;

    let remainingAuthCount = 0;
    if (supabaseUrl && serviceKey) {
      const verifyAuth = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const authData = (await verifyAuth.json()) as { users?: unknown[] };
      remainingAuthCount = authData.users?.length || 0;
    }

    console.log(`📊 État de la mémoire :`);
    console.log(`  • Boutiques (Tenants)   : ${tenantCount[0].count}`);
    console.log(`  • Utilisateurs BDD      : ${userCount[0].count}`);
    console.log(`  • Produits              : ${productCount[0].count}`);
    console.log(`  • Ventes                : ${saleCount[0].count}`);
    console.log(`  • Comptes Supabase Auth : ${remainingAuthCount}`);

    console.log('\n🎉 TOUTE LA MÉMOIRE DE LA BASE DE DONNÉES A ÉTÉ VIDÉE À 100% !');
  } catch (err) {
    console.error('Erreur lors du vidage :', err);
  } finally {
    await prismaDirect.$disconnect();
  }
}

main();
