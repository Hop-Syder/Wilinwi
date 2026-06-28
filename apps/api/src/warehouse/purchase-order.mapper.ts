import type { PurchaseOrder, PurchaseOrderItem, Etablissement, Supplier } from '@wilinwi/db';
import type { PurchaseOrderDto, PurchaseOrderItemDto } from '@wilinwi/types';

export function toPurchaseOrderItemDto(
  item: PurchaseOrderItem & { product: { nom: string } },
): PurchaseOrderItemDto {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productNom: item.product.nom,
    quantiteCommandee: item.quantiteCommandee,
    quantiteRecue: item.quantiteRecue,
    prixUnitaire: item.prixUnitaire,
  };
}

export function toPurchaseOrderDto(
  po: PurchaseOrder & {
    fournisseur: Supplier;
    etablissement: Etablissement;
    items: (PurchaseOrderItem & { product: { nom: string } })[];
  },
): PurchaseOrderDto {
  return {
    id: po.id,
    reference: po.reference,
    etablissementId: po.etablissementId,
    etablissementNom: po.etablissement.nom,
    fournisseurId: po.fournisseurId,
    fournisseurNom: po.fournisseur.nom,
    statut: po.statut,
    montantTotal: po.montantTotal,
    montantRecu: po.montantRecu,
    montantPaye: po.montantPaye,
    notes: po.notes,
    createdAt: po.createdAt.toISOString(),
    items: po.items.map(toPurchaseOrderItemDto),
  };
}
