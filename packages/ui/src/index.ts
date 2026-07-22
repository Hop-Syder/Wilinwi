/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : index.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

export { cn } from './cn.js';
export * from './format.js';
export { Button, buttonVariants, type ButtonProps } from './components/button.js';
export { Input, type InputProps } from './components/input.js';
export { Select, type SelectProps } from './components/select.js';
export { Card, CardTitle, CardHeader, CardContent } from './components/card.js';
export { StatCard, type StatCardProps } from './components/stat-card.js';
export { Badge, type BadgeProps } from './components/badge.js';
export {
  OfflineIndicator,
  type OfflineIndicatorProps,
  type SyncState,
} from './components/offline-indicator.js';
export { NumberTicker } from './components/number-ticker.js';
