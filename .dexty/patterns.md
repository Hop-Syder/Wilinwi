<!--
  @author @hopsyder
  @organization Nexus Partners
  @description DEXTY v2.2 — Solutions Validées et Patterns Réutilisables
  @created 2026-06-19
  @updated 2026-10-04
  🌐 nexus-partners.xyz
-->

# Patterns Architecturaux Validés — Wilinwi

Ce fichier consigne les solutions techniques éprouvées dans le code de Wilinwi pour éviter de réinventer la roue ou d'introduire des régressions.

---

## Pattern 1 : Isolation Transactionnelle Multi-Tenant (`forTenant`)
Toutes les requêtes de base de données dans NestJS doivent être enveloppées dans `forTenant` :

```typescript
await this.prisma.forTenant(ctx.tenantId, async (tx) => {
  // Les opérations ici s'exécutent avec app.current_tenant_id configuré
  const items = await tx.product.findMany({ where: { actif: true } });
  return items;
});
```
*Pourquoi* : Garantit que la Row-Level Security de PostgreSQL est active et étanche sur la connexion courante.

---

## Pattern 2 : Filtrage Strict des Données Sensibles (`Mapper DTO`)
Ne jamais renvoyer une entité Prisma brute au contrôleur web :

```typescript
export function toProductDto(product: Product, role: UserRole): ProductDto {
  const canSeeCost = role === 'OWNER' || role === 'MANAGER';
  return {
    id: product.id,
    nom: product.nom,
    sku: product.sku,
    prixCatalogue: product.prixCatalogue,
    prixAchat: canSeeCost ? product.prixAchat : undefined,
    prixPlancher: canSeeCost ? product.prixPlancher : undefined,
  };
}
```

---

## Pattern 3 : Débit Atomique de Stock avec Delta (`applyStockDelta`)
Ne jamais écraser la valeur de stock avec une valeur absolue calculée côté client. Toujours calculer un delta et l'appliquer de manière atomique :

```typescript
await applyStockDelta(tx, {
  tenantId: ctx.tenantId,
  etablissementId,
  productId,
  variantId: null,
  delta: -quantiteVendue, // Ex: -0.5
  quantiteMin: seuilAlerte,
});
```

---

## Pattern 4 : Auto-Génération de Code SKU Déterministe (`generateSmartSku`)
Quand un SKU n'est pas fourni dans un import ou une saisie rapide :
1. Nettoyer le nom du produit (suppression des accents et caractères non alphanumériques).
2. Extraire un préfixe lisible de 3 à 6 lettres (ex: `RIZ-PAR`).
3. Ajouter un identifiant séquentiel unique sur 3 chiffres (ex: `001`).
4. Vérifier l'absence de collision avec un `Set` en mémoire ou une contrainte unique.

---

## Pattern 5 : Idempotence de la Synchronisation Hors-Ligne (`clientGeneratedId`)
Chaque transaction générée hors-ligne porte un UUID client (`clientGeneratedId`). Le backend vérifie si cette référence existe déjà avant d'enregistrer la vente, empêchant les doubles débits en cas de réémission réseau.
