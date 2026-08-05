/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur d'API Publique pour la consultation des reçus (Résolution unifiée UUID vs Référence courte).
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

export interface PublicReceiptDto {
  code: string;
  boutique: string;
  total: number;
  montantVerse: number;
  items: Array<{
    nom: string;
    quantite: number;
    prixReel: number;
  }>;
  date: Date;
  cancelled: boolean;
  isOriginal: boolean;
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Controller('public/receipt')
export class PublicReceiptController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':code')
  async get(@Param('code') code: string): Promise<PublicReceiptDto> {
    const rawCode = (code || '').trim();
    if (!rawCode) {
      throw new NotFoundException('Reçu introuvable ou expiré.');
    }

    const upperCode = rawCode.toUpperCase();
    const isUuid = UUID_REGEX.test(rawCode);

    // 1. Recherche dans la table dénormalisée public_receipts
    const OR_CONDITIONS: Array<{ code?: string; saleId?: string }> = [
      { code: rawCode },
      { code: upperCode },
    ];
    if (isUuid) {
      OR_CONDITIONS.push({ saleId: rawCode });
    }

    const receipt = await this.prisma.client.publicReceipt.findFirst({
      where: {
        OR: OR_CONDITIONS,
      },
    });

    if (receipt) {
      const parsedItems = Array.isArray(receipt.items)
        ? (receipt.items as Array<{ nom?: string; quantite?: number; prixReel?: number }>)
        : [];

      return {
        code: receipt.code,
        boutique: receipt.boutiqueNom,
        total: receipt.total,
        montantVerse: receipt.montantVerse,
        items: parsedItems.map((it) => ({
          nom: it.nom ?? 'Article',
          quantite: it.quantite ?? 1,
          prixReel: it.prixReel ?? 0,
        })),
        date: receipt.saleDate,
        cancelled: receipt.cancelledAt !== null,
        isOriginal: true,
      };
    }

    // 2. Repli dynamique : recherche par UUID (id) ou receiptCode dans la table Sale
    const sale = await this.prisma.client.sale.findFirst({
      where: isUuid
        ? { id: rawCode }
        : {
            OR: [{ receiptCode: rawCode }, { receiptCode: upperCode }],
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
      isOriginal: true,
    };
  }
}
