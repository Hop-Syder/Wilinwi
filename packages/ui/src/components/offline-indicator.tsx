import * as React from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '../cn.js';

export type SyncState = 'online' | 'offline' | 'syncing';

export interface OfflineIndicatorProps {
  state: SyncState;
  /** Nombre d'opérations en attente de synchronisation. */
  pending?: number;
  className?: string;
}

/** Indicateur visuel clair de l'état hors-ligne / synchronisation (§11.1). */
export function OfflineIndicator({ state, pending = 0, className }: OfflineIndicatorProps) {
  const config = {
    online: { icon: Cloud, label: 'En ligne', tone: 'bg-emerald-50 text-emerald-700' },
    offline: { icon: CloudOff, label: 'Hors-ligne', tone: 'bg-gold-50 text-gold-700' },
    syncing: { icon: RefreshCw, label: 'Synchronisation…', tone: 'bg-brand-50 text-brand' },
  }[state];

  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        config.tone,
        className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', state === 'syncing' && 'animate-spin')} aria-hidden />
      {config.label}
      {pending > 0 && state !== 'online' && (
        <span className="tabular ml-0.5 rounded-full bg-white/70 px-1.5">{pending}</span>
      )}
    </span>
  );
}
