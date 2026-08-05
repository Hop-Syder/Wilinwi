'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Cloche de notifications temps réel (header). Réservée OWNER/MANAGER.
 *   Polling 30s, navigation au clic, cache offline LocalStorage et Web Push.
 * @created 2026-06-29
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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

const CACHE_KEY = 'wilinwi_notifications_cache';

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef(0);

  // Charger le cache offline au montage
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: NotificationDto[] = JSON.parse(cached);
        setItems(parsed);
        setCount(parsed.filter((n) => !n.read).length);
      }
    } catch {
      /* silencieux */
    }
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const { count: newCount } = await apiGet<{ count: number }>('/api/notifications/count');
      setCount(newCount);

      // Notification Push Système / Navigateur si le nombre augmente
      if (
        newCount > previousCountRef.current &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification('Wilinwi — Nouvelle alerte', {
          body: `Vous avez ${newCount} notification(s) non lue(s).`,
          icon: '/logo.png',
        });
      }
      previousCountRef.current = newCount;
    } catch {
      /* silencieux (mode offline) */
    }
  }, []);

  // Polling temps réel toutes les 30s + au retour au premier plan
  useEffect(() => {
    if (!isAdmin) return;
    void refreshCount();
    const interval = setInterval(() => void refreshCount(), 30_000);

    const onFocus = () => void refreshCount();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAdmin, refreshCount, user?.etablissementId]);

  // Demander la permission Web Push au premier survol
  const requestPushPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  };

  // Fermeture au clic extérieur
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
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        } catch {
          /* silencieux */
        }
      } catch {
        // Mode offline : conserver la liste issue du localStorage
      }
    }
  }

  async function markAll() {
    await apiPost('/api/notifications/read-all', {}).catch(() => undefined);
    const updated = items.map((n) => ({ ...n, read: true }));
    setItems(updated);
    setCount(0);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    } catch {
      /* silencieux */
    }
  }

  async function markOne(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    await apiPost(`/api/notifications/${id}/read`, {}).catch(() => undefined);
    const updated = items.map((n) => (n.id === id ? { ...n, read: true } : n));
    setItems(updated);
    setCount((c) => Math.max(0, c - 1));
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    } catch {
      /* silencieux */
    }
  }

  // Redirection au clic vers la page métier associée
  const handleNotificationClick = (n: NotificationDto) => {
    void markOne(n.id);
    setOpen(false);

    switch (n.type) {
      case 'STOCK_LOW':
        router.push('/stock');
        break;
      case 'SUPPLIER_DEBT':
        router.push('/entrepot');
        break;
      case 'PAST_DUE':
        router.push('/dashboard');
        break;
      case 'INFO':
      default:
        router.push('/ventes');
        break;
    }
  };

  if (!isAdmin) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => void toggle()}
        onMouseEnter={requestPushPermission}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-2xs animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">Notifications</span>
              {count > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  {count} non lue{count > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {items.some((n) => !n.read) && (
              <button
                onClick={() => void markAll()}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400 font-medium">
                Aucune notification enregistrée.
              </li>
            )}
            {items.map((n) => {
              const Icon = ICONS[n.type] ?? Info;
              return (
                <li
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-slate-50 ${
                    n.read ? 'opacity-65 bg-white' : 'bg-indigo-50/40'
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${
                      n.type === 'PAST_DUE'
                        ? 'bg-rose-100 text-rose-600'
                        : n.type === 'STOCK_LOW'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-indigo-100 text-indigo-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {n.titre}
                    </p>
                    <p className="text-xs text-slate-600 leading-snug mt-0.5">{n.message}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">
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
                      onClick={(e) => void markOne(n.id, e)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                      title="Marquer comme lu"
                    >
                      <Check className="h-4 w-4" />
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
