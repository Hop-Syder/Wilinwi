/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur HTTP — Établissements.
 *   GET /etablissements          → liste accessible (sélecteur, tous rôles).
 *   GET /etablissements/manage   → toute l'entreprise (OWNER/MANAGER).
 *   POST/PATCH/DELETE            → gestion (OWNER/MANAGER, capacité users:manage).
 * @created 2026-06-27
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateEtablissementSchema,
  UpdateEtablissementSchema,
  type AuthContext,
  type CreateEtablissementInput,
  type UpdateEtablissementInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EtablissementService } from './etablissement.service';

@Controller('etablissements')
export class EtablissementController {
  constructor(private readonly etablissements: EtablissementService) {}

  /** Liste accessible à l'utilisateur courant (sélecteur du header). */
  @Get()
  listAccessible(@CurrentUser() user: AuthContext) {
    return this.etablissements.listAccessible(user);
  }

  /** Tous les établissements de l'entreprise (page de gestion). */
  @RequireCapabilities('users:manage')
  @Get('manage')
  list(@CurrentUser() user: AuthContext) {
    return this.etablissements.list(user);
  }

  @RequireCapabilities('users:manage')
  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateEtablissementSchema)) dto: CreateEtablissementInput,
  ) {
    return this.etablissements.create(user, dto);
  }

  @RequireCapabilities('users:manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEtablissementSchema)) dto: UpdateEtablissementInput,
  ) {
    return this.etablissements.update(user, id, dto);
  }

  @RequireCapabilities('users:manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.etablissements.remove(user, id);
  }
}
