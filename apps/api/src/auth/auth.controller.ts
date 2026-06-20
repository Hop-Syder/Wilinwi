/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur API pour auth
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  InviteUserSchema,
  SignUpSchema,
  type AuthContext,
  type InviteUserInput,
  type SignUpInput,
} from '@wilinwi/types';
import { CurrentUser, Public, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Inscription publique d'un propriétaire + création de sa boutique. */
  @Public()
  @Post('signup')
  signUp(@Body(new ZodValidationPipe(SignUpSchema)) dto: SignUpInput) {
    return this.auth.signUp(dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthContext) {
    return this.auth.me(user);
  }

  /** Invitation d'un membre (OWNER/MANAGER uniquement). */
  @RequireCapabilities('users:manage')
  @Post('invite')
  invite(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(InviteUserSchema)) dto: InviteUserInput,
  ) {
    return this.auth.inviteUser(user, dto);
  }
}
