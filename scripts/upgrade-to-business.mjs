/**
 * Script : Upgrade tous les tenants en plan BUSINESS + ACTIVE (pour tests).
 * Usage : node scripts/upgrade-all-to-business.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🔍 Récupération des tenants...\n');

  // Lister les tenants SANS RLS (connexion super-admin via DIRECT_URL)
  const tenants = await prisma.$queryRaw`SELECT id, nom, plan, subscription_status FROM tenants`;

  if (!Array.isArray(tenants) || tenants.length === 0) {
    console.log('Aucun tenant trouvé.');
    return;
  }

  console.log(`📋 ${tenants.length} tenant(s) trouvé(s) :`);
  for (const t of tenants) {
    console.log(`  - ${t.nom} (${t.id}) → Plan: ${t.plan}, Statut: ${t.subscription_status}`);
  }

  console.log('\n🚀 Upgrade vers BUSINESS + ACTIVE...\n');

  const result = await prisma.$executeRaw`
    UPDATE tenants
    SET plan = 'BUSINESS', subscription_status = 'ACTIVE'
    WHERE plan != 'BUSINESS' OR subscription_status != 'ACTIVE'
  `;

  console.log(`✅ ${result} tenant(s) mis à jour vers BUSINESS.\n`);

  // Vérification
  const after = await prisma.$queryRaw`SELECT id, nom, plan, subscription_status FROM tenants`;
  console.log('📊 État final :');
  for (const t of after) {
    const icon = t.plan === 'BUSINESS' && t.subscription_status === 'ACTIVE' ? '✅' : '❌';
    console.log(`  ${icon} ${t.nom} → Plan: ${t.plan}, Statut: ${t.subscription_status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
