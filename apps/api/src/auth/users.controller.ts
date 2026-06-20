import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateUserSchema,
  SetPinSchema,
  UpdateUserSchema,
  type AuthContext,
  type CreateUserInput,
  type SetPinInput,
  type UpdateUserInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Liste pour l'écran de login PIN (poste partagé) — tout membre pouvant vendre.
  @RequireCapabilities('sale:create')
  @Get('pos')
  listForPos(@CurrentUser() user: AuthContext) {
    return this.users.listForPos(user);
  }

  @RequireCapabilities('users:manage')
  @Get()
  list(@CurrentUser() user: AuthContext) {
    return this.users.list(user);
  }

  @RequireCapabilities('users:manage')
  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserInput,
  ) {
    return this.users.create(user, dto);
  }

  @RequireCapabilities('users:manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserInput,
  ) {
    return this.users.update(user, id, dto);
  }

  @RequireCapabilities('users:manage')
  @Post(':id/pin')
  setPin(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetPinSchema)) dto: SetPinInput,
  ) {
    return this.users.setPin(user, id, dto.pin);
  }
}
