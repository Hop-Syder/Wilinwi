/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module Food (Milestone 3) — tables minimalistes d'un établissement
 *   FOOD : une vente POS peut s'y rattacher (Sale.tableId). Gardé par la capacité
 *   d'infrastructure `food.tables` (l'API refuse hors FOOD — TDR §2.7).
 * @created 2026-07-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateFoodTableSchema,
  UpdateFoodTableSchema,
  type AuthContext,
  type CreateFoodTableInput,
  type FoodTableDto,
  type UpdateFoodTableInput,
} from '@wilinwi/types';
import { PrismaService } from '../common/prisma.service';
import { assertConcreteEtablissement } from '../common/scope';
import {
  CurrentUser,
  RequireCapabilities,
  RequireInfraCapability,
} from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Injectable()
class FoodTablesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tables actives de l'établissement courant (sélecteur du POS). */
  async list(ctx: AuthContext): Promise<FoodTableDto[]> {
    assertConcreteEtablissement(ctx);
    const rows = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.foodTable.findMany({
        where: { tenantId: ctx.tenantId, etablissementId: ctx.etablissementId!, actif: true },
        orderBy: { nom: 'asc' },
      }),
    );
    return rows.map(toDto);
  }

  async create(ctx: AuthContext, input: CreateFoodTableInput): Promise<FoodTableDto> {
    assertConcreteEtablissement(ctx);
    const row = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.foodTable.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId!,
          nom: input.nom.trim(),
        },
      }),
    );
    return toDto(row);
  }

  async update(ctx: AuthContext, id: string, input: UpdateFoodTableInput): Promise<FoodTableDto> {
    const row = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.foodTable.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw new NotFoundException('Table introuvable');
      return tx.foodTable.update({
        where: { id },
        data: { nom: input.nom?.trim(), actif: input.actif },
      });
    });
    return toDto(row);
  }
}

function toDto(row: {
  id: string;
  etablissementId: string;
  nom: string;
  actif: boolean;
}): FoodTableDto {
  return { id: row.id, etablissementId: row.etablissementId, nom: row.nom, actif: row.actif };
}

@Controller('food')
@RequireInfraCapability('food.tables')
class FoodTablesController {
  constructor(private readonly tables: FoodTablesService) {}

  /** Tables actives de la boutique courante — le POS en a besoin (vendeur/caissier). */
  @RequireCapabilities('sale:create')
  @Get('tables')
  list(@CurrentUser() user: AuthContext) {
    return this.tables.list(user);
  }

  @RequireCapabilities('tenant:configure')
  @Post('tables')
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateFoodTableSchema)) dto: CreateFoodTableInput,
  ) {
    return this.tables.create(user, dto);
  }

  @RequireCapabilities('tenant:configure')
  @Patch('tables/:id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFoodTableSchema)) dto: UpdateFoodTableInput,
  ) {
    return this.tables.update(user, id, dto);
  }
}

@Module({
  controllers: [FoodTablesController],
  providers: [FoodTablesService],
})
export class FoodModule {}
