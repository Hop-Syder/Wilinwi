/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur HTTP — Assistant vocal Wilinwi AI. Réservé à la
 *   capacité `ai:use` (module AI, plan ENTERPRISE ou add-on) ; la capacité
 *   propre à chaque intention est ensuite vérifiée dans AiService.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  VoiceInterpretRequestSchema,
  type AuthContext,
  type VoiceInterpretRequest,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @RequireCapabilities('ai:use')
  // Les appels Gemini coûtent plus cher qu'un CRUD classique — plafond dédié
  // sous le ThrottlerGuard global (budget latence/coût, plan Phase 5).
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('voice/interpret')
  interpret(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(VoiceInterpretRequestSchema)) dto: VoiceInterpretRequest,
  ) {
    return this.ai.interpret(user, dto);
  }
}
