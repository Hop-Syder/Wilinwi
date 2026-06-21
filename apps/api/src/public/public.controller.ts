import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

/**
 * Reçu public : lecture par code opaque, SANS authentification.
 * Lit la table dénormalisée `public_receipts` (aucune donnée sensible, pas de RLS).
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
  }> {
    const receipt = await this.prisma.client.publicReceipt.findUnique({ where: { code } });
    if (!receipt) throw new NotFoundException('Reçu introuvable');
    return {
      code: receipt.code,
      boutique: receipt.boutiqueNom,
      total: receipt.total,
      montantVerse: receipt.montantVerse,
      items: receipt.items,
      date: receipt.saleDate,
    };
  }
}
