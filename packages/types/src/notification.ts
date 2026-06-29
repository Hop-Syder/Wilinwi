/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Types partagés — Notifications in-app (centre de pilotage).
 *   Alertes poussées au propriétaire/gérant (stock bas, impayé…).
 * @created 2026-06-29
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

export const NOTIFICATION_TYPES = ['STOCK_LOW', 'PAST_DUE', 'SUPPLIER_DEBT', 'INFO'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationDto {
  id: string;
  type: NotificationType;
  titre: string;
  message: string;
  etablissementId: string | null;
  entityId: string | null;
  /** true = déjà traité/lu par un administrateur (lecture au niveau entreprise). */
  read: boolean;
  createdAt: string;
}
