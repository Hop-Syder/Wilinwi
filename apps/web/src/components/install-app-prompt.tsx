'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Invitation à installer Wilinwi comme application (PWA) :
 *   - Android / Chrome / Edge : bouton « Installer » qui déclenche la boîte native
 *     (événement `beforeinstallprompt`, capturé dès le chargement du module) ;
 *   - iPhone / iPad (Safari) : mini-guide « Partager › Sur l'écran d'accueil »
 *     (iOS n'offre pas d'installation programmable) ;
 *   - masquée une fois l'app installée (mode standalone) ou après « Plus tard »
 *     (réaffichée au bout de 7 jours).
 * @created 2026-10-06
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, Share, SquarePlus, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'wilinwi_install_dismissed_at';
const DISMISS_DAYS = 7;

// Capture au niveau module : l'événement peut partir avant le montage du composant.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('wilinwi:installable'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event('wilinwi:installed'));
  });
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ se présente comme un Mac tactile.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function InstallAppPrompt({ className = '' }: { className?: string }) {
  const [mode, setMode] = useState<'hidden' | 'native' | 'ios'>('hidden');
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    if (deferredPrompt) setMode('native');
    else if (isIos()) setMode('ios');

    const onInstallable = () => setMode('native');
    const onInstalled = () => setMode('hidden');
    window.addEventListener('wilinwi:installable', onInstallable);
    window.addEventListener('wilinwi:installed', onInstalled);
    return () => {
      window.removeEventListener('wilinwi:installable', onInstallable);
      window.removeEventListener('wilinwi:installed', onInstalled);
    };
  }, []);

  if (mode === 'hidden') return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* stockage indisponible : masquage pour la session seulement */
    }
    setMode('hidden');
  };

  const install = async () => {
    if (mode === 'ios') {
      setShowIosGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    deferredPrompt = null;
    if (outcome === 'accepted') setMode('hidden');
  };

  return (
    <>
      <div
        role="dialog"
        aria-label="Installer l'application Wilinwi"
        className={`fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:bottom-6 sm:right-6 sm:left-auto sm:mx-0 ${className}`}
      >
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl border border-slate-100"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-slate-900">Installer Wilinwi</p>
          <p className="text-xs text-slate-500">
            Ouvrez la caisse en un geste depuis l&apos;écran d&apos;accueil, même hors ligne.
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#001d5a] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0005ea]"
        >
          <Download className="h-3.5 w-3.5" /> Installer
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Plus tard"
          title="Plus tard"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-base font-extrabold text-slate-900">Installer sur iPhone / iPad</p>
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <Share className="h-4 w-4" />
                </span>
                <span>
                  Dans Safari, touchez <b>Partager</b> (le carré avec une flèche, en bas de l&apos;écran).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <SquarePlus className="h-4 w-4" />
                </span>
                <span>
                  Choisissez <b>Sur l&apos;écran d&apos;accueil</b>, puis <b>Ajouter</b>.
                </span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-slate-400">L&apos;icône Wilinwi apparaît alors sur votre écran d&apos;accueil.</p>
            <button
              type="button"
              onClick={() => {
                setShowIosGuide(false);
                dismiss();
              }}
              className="mt-4 w-full rounded-2xl bg-[#001d5a] py-3 text-sm font-extrabold text-white"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
