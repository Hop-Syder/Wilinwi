import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  StartInventorySchema,
  SubmitCountSchema,
  ValidateInventorySchema,
  type AuthContext,
  type StartInventoryInput,
  type SubmitCountInput,
  type ValidateInventoryInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @RequireCapabilities('inventory:count')
  @Post()
  start(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(StartInventorySchema)) dto: StartInventoryInput,
  ) {
    return this.inventory.start(user, dto);
  }

  @RequireCapabilities('inventory:count')
  @Get(':id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.inventory.get(user, id);
  }

  @RequireCapabilities('inventory:count')
  @Post(':id/count')
  count(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SubmitCountSchema)) dto: SubmitCountInput,
  ) {
    return this.inventory.submitCount(user, id, dto);
  }

  // La validation corrige le stock réel → réservée au gérant (inventory:validate).
  @RequireCapabilities('inventory:validate')
  @Post(':id/validate')
  validate(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ValidateInventorySchema)) dto: ValidateInventoryInput,
  ) {
    return this.inventory.validate(user, id, dto);
  }
}
