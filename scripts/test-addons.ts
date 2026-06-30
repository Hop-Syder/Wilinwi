/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Script de test local pour valider le gating des modules premium et la persistance SQL.
 */

import { PrismaClient } from '@prisma/client';
import { effectiveModules } from '@wilinwi/types';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TEST 1 : Gating des modules ===');
  // 1) Gating pur : STARTER n'inclut pas PAY ; l'add-on ['PAY'] le débloque ; [] non.
  const base = effectiveModules('OWNER', 'STARTER', false, [], []);
  const withAddon = effectiveModules('OWNER', 'STARTER', false, [], ['PAY']);
  
  console.log(`STARTER de base inclut PAY ? ${base.includes('PAY')} (attendu : false)`);
  console.log(`STARTER + add-on ['PAY'] inclut PAY ? ${withAddon.includes('PAY')} (attendu : true)`);
  
  // Simulation de dunning downgrade : le plan effectif passe en STARTER, mais le gating
  // dunning doit neutraliser les add-ons si le compte est dégradé.
  // Dans effectiveModules, si le plan est STARTER et le dunning est dégradé,
  // voyons comment est géré le dunning downgrade.
  
  console.log('\n=== TEST 2 : Persistance SQL (SECURITY DEFINER) ===');
  const tenants = await prisma.$queryRaw<any[]>`
    SELECT id, nom, module_addons FROM app.platform_tenants_overview() LIMIT 1
  `;
  
  if (tenants.length === 0) {
    console.log('Aucun tenant trouvé en base.');
    return;
  }
  
  const { id, nom, module_addons } = tenants[0];
  console.log(`Boutique cible : ${nom} (ID: ${id})`);
  console.log(`Add-ons initiaux :`, module_addons);
  
  try {
    await prisma.$transaction(async (tx) => {
      console.log('Activation temporaire des add-ons [PAY, AI]...');
      await tx.$executeRaw`
        SELECT app.platform_set_tenant_modules(${id}::uuid, ARRAY['PAY','AI']::text[])
      `;
      
      const after = await tx.$queryRaw<any[]>`
        SELECT module_addons FROM app.platform_tenants_overview() WHERE id = ${id}::uuid
      `;
      console.log('Add-ons après modification (dans la transaction) :', after[0].module_addons);
      
      // Rollback forcé pour laisser la BDD propre
      throw new Error('ROLLBACK_FORCE');
    });
  } catch (err: any) {
    if (err.message !== 'ROLLBACK_FORCE') {
      throw err;
    }
    console.log('Transaction annulée avec succès (Rollback).');
  }
  
  const finalState = await prisma.$queryRaw<any[]>`
    SELECT module_addons FROM app.platform_tenants_overview() WHERE id = ${id}::uuid
  `;
  console.log('Add-ons après rollback (doit être égal aux initiaux) :', finalState[0].module_addons);
}

main()
  .catch((err) => {
    console.error('Erreur durant le test :', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
