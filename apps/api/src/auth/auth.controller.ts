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

import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import {
  InviteUserSchema,
  PinLoginSchema,
  SignUpSchema,
  type AuthContext,
  type InviteUserInput,
  type PinLoginInput,
  type SignUpInput,
  UpdateDeviceSchema,
  type UpdateDeviceInput,
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
  me(
    @CurrentUser() user: AuthContext,
    @Headers('x-device-id') deviceId?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.me(user, deviceId, userAgent);
  }

  /**
   * Login PIN sur poste partagé : nécessite une session tenant valide (l'appareil
   * est déjà authentifié) ; renvoie un JWT pour l'utilisateur cible.
   */
  @Post('pin-login')
  pinLogin(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(PinLoginSchema)) dto: PinLoginInput,
  ) {
    return this.auth.pinLogin(user, dto);
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

  // ───────────── Appareils (limite maxDevices des plans) ─────────────

  /** Appareils connus de l'entreprise (dernier vu, utilisateur, révocation). */
  @RequireCapabilities('users:manage')
  @Get('devices')
  listDevices(@CurrentUser() user: AuthContext) {
    return this.auth.listDevices(user);
  }

  /** Renomme / révoque / réactive un appareil. */
  @RequireCapabilities('users:manage')
  @Patch('devices/:id')
  updateDevice(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDeviceSchema)) dto: UpdateDeviceInput,
  ) {
    return this.auth.updateDevice(user, id, dto);
  }
}
