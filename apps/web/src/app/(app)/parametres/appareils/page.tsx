'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Paramètres → Appareils : registre des navigateurs/postes de
 *   l'entreprise (limite maxDevices du plan). Renommer, révoquer (blocage au
 *   prochain chargement de session), réactiver. Un appareil inactif depuis
 *   30 jours libère automatiquement son emplacement.
 * @created 2026-07-06
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MonitorSmartphone, Ban, RotateCcw, Pencil } from 'lucide-react';
import { Button, Card, Badge } from '@wilinwi/ui';
import { DEVICE_ACTIVE_DAYS, type DeviceDto } from '@wilinwi/types';
import { apiGet, apiPatch, getDeviceId, ApiError } from '@/lib/api';

function resumeUserAgent(ua: string | null): string {
  if (!ua) return 'Appareil inconnu';
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/chrome/i.test(ua)) return 'Chrome (ordinateur)';
  if (/firefox/i.test(ua)) return 'Firefox (ordinateur)';
  if (/safari/i.test(ua)) return 'Safari (ordinateur)';
  return 'Navigateur';
}

function relative(value: Date | string): string {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export default function AppareilsPage() {
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const monId = getDeviceId();

  async function load() {
    try {
      setDevices(await apiGet<DeviceDto[]>('/api/auth/devices'));
    } catch (e) {
      setError((e as ApiError).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function patch(id: string, data: { label?: string | null; revoked?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/auth/devices/${id}`, data);
      await load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  function renommer(d: DeviceDto) {
    const label = window.prompt('Nom de cet appareil (ex. « Caisse comptoir ») :', d.label ?? '');
    if (label !== null) void patch(d.id, { label: label.trim() || null });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Link href="/parametres" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-black tracking-tight text-slate-900">Appareils</h1>
          <p className="text-sm text-slate-500">
            Navigateurs et postes connectés à votre entreprise. La limite dépend de votre plan ;
            un appareil inactif depuis {DEVICE_ACTIVE_DAYS} jours libère sa place automatiquement.
          </p>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {devices.map((d) => {
          const cetAppareil = d.deviceId === monId;
          const revoque = !!d.revokedAt;
          return (
            <Card key={d.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`rounded-xl p-2.5 ${revoque ? 'bg-red-50 text-red-500' : 'bg-brand/10 text-brand'}`}>
                  <MonitorSmartphone className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-slate-800">
                      {d.label ?? resumeUserAgent(d.userAgent)}
                    </span>
                    {cetAppareil && <Badge tone="success">Cet appareil</Badge>}
                    {revoque && <Badge tone="danger">Révoqué</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {d.lastUserNom ? `${d.lastUserNom} · ` : ''}vu {relative(d.lastSeenAt)}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => renommer(d)}
                  disabled={busy}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  title="Renommer"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {revoque ? (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void patch(d.id, { revoked: false })}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Réactiver
                  </Button>
                ) : (
                  <button
                    onClick={() => void patch(d.id, { revoked: true })}
                    disabled={busy || cetAppareil}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    title={cetAppareil ? 'Impossible de révoquer l’appareil en cours d’utilisation' : 'Révoquer (bloqué au prochain chargement)'}
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
        {devices.length === 0 && !error && (
          <Card className="p-8 text-center text-sm text-slate-400">Aucun appareil enregistré.</Card>
        )}
      </div>
    </div>
  );
}
