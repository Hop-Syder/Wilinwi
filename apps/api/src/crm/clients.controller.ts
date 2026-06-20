import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateClientSchema,
  RecordClientPaymentSchema,
  UpdateClientSchema,
  type AuthContext,
  type CreateClientInput,
  type RecordClientPaymentInput,
  type UpdateClientInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ClientsService } from './clients.service';

@Controller('crm/clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @RequireCapabilities('client:read')
  @Get()
  list(@CurrentUser() user: AuthContext) {
    return this.clients.list(user);
  }

  @RequireCapabilities('client:write')
  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateClientSchema)) dto: CreateClientInput,
  ) {
    return this.clients.create(user, dto);
  }

  @RequireCapabilities('client:read')
  @Get('kpis')
  getKpis(@CurrentUser() user: AuthContext) {
    return this.clients.getKpis(user);
  }

  @RequireCapabilities('client:read')
  @Get(':id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.clients.get(user, id);
  }

  @RequireCapabilities('client:write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateClientSchema)) dto: UpdateClientInput,
  ) {
    return this.clients.update(user, id, dto);
  }

  // Encaissement d'un remboursement de dette.
  @RequireCapabilities('client:collect_payment')
  @Post(':id/payments')
  recordPayment(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecordClientPaymentSchema)) dto: RecordClientPaymentInput,
  ) {
    return this.clients.recordPayment(user, id, dto);
  }
}
