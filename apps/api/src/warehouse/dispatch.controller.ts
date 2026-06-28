/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur HTTP — Dispatch (transfert entrepôt → boutique).
 *   Réservé OWNER/MANAGER (capacité supplier:manage, comme le reste de l'entrepôt).
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  CreateDispatchSchema,
  type AuthContext,
  type CreateDispatchInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DispatchService } from './dispatch.service';

@Controller('dispatches')
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @RequireCapabilities('supplier:manage')
  @Get()
  list(@CurrentUser() user: AuthContext, @Query('status') status?: string) {
    return this.dispatch.list(user, status);
  }

  @RequireCapabilities('supplier:manage')
  @Get(':id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.dispatch.get(user, id);
  }

  @RequireCapabilities('supplier:manage')
  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateDispatchSchema)) dto: CreateDispatchInput,
  ) {
    return this.dispatch.create(user, dto);
  }

  @RequireCapabilities('supplier:manage')
  @Post(':id/validate')
  validate(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.dispatch.validate(user, id);
  }

  @RequireCapabilities('supplier:manage')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.dispatch.cancel(user, id);
  }
}
