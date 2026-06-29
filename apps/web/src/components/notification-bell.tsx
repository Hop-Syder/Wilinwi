'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Cloche de notifications (header). Réservée OWNER/MANAGER.
 *   Affiche le nombre de non-lus (poll) + un menu déroulant des alertes
 *   (stock bas, impayé…), avec « marquer comme lu » individuel et global.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, AlertTriangle, CreditCard, PackageX, Info, Check } from 'lucide-react';
import type { NotificationDto, NotificationType } from '@wilinwi/types';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const ICONS: Record<NotificationType, typeof Bell> = {
  STOCK_LOW: PackageX,
  PAST_DUE: CreditCard,
  SUPPLIER_DEBT: AlertTriangle,
  INFO: Info,
};

export function NotificationBell() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const { count } = await apiGet<{ count: number }>('/api/notifications/count');
      setCount(count);
    } catch {
      /* silencieux */
    }
  }, []);

  // Polling du compteur (toutes les 60 s) — réservé aux admins.
  useEffect(() => {
    if (!isAdmin) return;
    void refreshCount();
    const t = setInterval(() => void refreshCount(), 60_000);
    return () => clearInterval(t);
  }, [isAdmin, refreshCount, user?.etablissementId]);

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const list = await apiGet<NotificationDto[]>('/api/notifications');
        setItems(list);
        setCount(list.filter((n) => !n.read).length);
      } catch {
        setItems([]);
      }
    }
  }

  async function markAll() {
    await apiPost('/api/notifications/read-all', {}).catch(() => undefined);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setCount(0);
  }

  async function markOne(id: string) {
    await apiPost(`/api/notifications/${id}/read`, {}).catch(() => undefined);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setCount((c) => Math.max(0, c - 1));
  }

  if (!isAdmin) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => void toggle()}
        className="relative flex h-9 w-9 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-bold text-text-primary">Notifications</span>
            {items.some((n) => !n.read) && (
              <button onClick={() => void markAll()} className="text-xs font-medium text-primary hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-text-secondary">Aucune notification.</li>
            )}
            {items.map((n) => {
              const Icon = ICONS[n.type] ?? Info;
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-2.5 border-b border-border/50 px-3 py-2.5 last:border-0 ${
                    n.read ? 'opacity-60' : 'bg-primary/[0.03]'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 ${n.type === 'PAST_DUE' ? 'text-danger' : 'text-warning'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">{n.titre}</p>
                    <p className="text-xs text-text-secondary">{n.message}</p>
                    <p className="mt-0.5 text-[10px] text-text-secondary/60">
                      {new Date(n.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => void markOne(n.id)}
                      className="shrink-0 rounded p-1 text-text-secondary/60 hover:bg-surface-hover hover:text-emerald"
                      title="Marquer comme lu"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
