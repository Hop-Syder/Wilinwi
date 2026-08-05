import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

/**
 * Reçu public : lecture par code opaque ou UUID de vente, SANS authentification.
 * Lit la table dénormalisée `public_receipts` avec repli dynamique sur `sales`.
 */
@Controller('public/receipt')
export class PublicReceiptController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':code')
  async get(@Param('code') code: string): Promise<{
    code: string;
    boutique: string;
    total: number;
    montantVerse: number;
    items: unknown;
    date: Date;
    cancelled: boolean;
  }> {
    const rawCode = (code || '').trim();
    const upperCode = rawCode.toUpperCase();

    // 1. Recherche directe dans la table dénormalisée public_receipts (code court ou majuscule)
    const receipt = await this.prisma.client.publicReceipt.findFirst({
      where: {
        OR: [{ code: rawCode }, { code: upperCode }],
      },
    });

    if (receipt) {
      return {
        code: receipt.code,
        boutique: receipt.boutiqueNom,
        total: receipt.total,
        montantVerse: receipt.montantVerse,
        items: receipt.items,
        date: receipt.saleDate,
        cancelled: receipt.cancelledAt !== null,
      };
    }

    // 2. Repli dynamique : recherche par UUID (id) ou receiptCode dans la table Sale
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawCode);

    const sale = await this.prisma.client.sale.findFirst({
      where: isUuid
        ? { id: rawCode }
        : {
            OR: [{ receiptCode: rawCode }, { receiptCode: upperCode }, { id: rawCode }],
          },
      include: {
        etablissement: { select: { nom: true } },
        items: { include: { product: { select: { nom: true } } } },
      },
    });

    if (!sale) {
      throw new NotFoundException('Reçu introuvable ou expiré.');
    }

    const itemsFormatted = sale.items.map((it) => ({
      nom: it.unitLabel
        ? `${it.product?.nom ?? 'Article'} — ${it.unitLabel}`
        : (it.product?.nom ?? 'Article'),
      quantite: it.quantite,
      prixReel: it.prixReel,
    }));

    return {
      code: sale.receiptCode || sale.id.slice(0, 8).toUpperCase(),
      boutique: sale.etablissement?.nom ?? 'Wilinwi',
      total: sale.total,
      montantVerse: sale.montantVerse,
      items: itemsFormatted,
      date: sale.createdAt,
      cancelled: sale.status === 'CANCELLED',
    };
  }
}
