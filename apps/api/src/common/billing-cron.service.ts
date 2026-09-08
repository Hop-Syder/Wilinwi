/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Cron de relance d'impayés — exécute billing_run_overdue toutes les heures.
 * @created 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformService } from '../platform/platform.service';

/**
 * Tâche planifiée : relève les impayés chaque heure en appelant la fonction
 * SQL `app.billing_run_overdue()` via PlatformService. Les tenants dont
 * l'échéance est dépassée passent en PAST_DUE (progressif : J+0, J+3, J+7, J+30).
 */
@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private readonly platform: PlatformService,
    private readonly config: ConfigService,
  ) {}
  /** Le cron n''est actif que si ENABLE_BILLING_CRON=true (défaut : false en dev). */
  private get enabled(): boolean {
    return this.config.get<string>('ENABLE_BILLING_CRON', 'false') === 'true';
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdue() {
    if (!this.enabled) return;
    try {
      const result = await this.platform.runOverdue();
      if (result.markedPastDue > 0) {
        this.logger.log(`${result.markedPastDue} entreprise(s) passée(s) en impayé.`);
      }
    } catch (err) {
      this.logger.error('Échec du cron billing_run_overdue', err as Error);
    }
  }
}
