/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Lecteur de Code-Barres par Caméra Mobile/PWA & Bouton Flottant (Axe 5)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Scan, AlertCircle } from 'lucide-react';

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

interface BarcodeScannerModalProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ onScan, onClose }: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const completeScan = (barcode: string) => {
    setScanning(false);
    onScan(barcode);
    onClose();
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('La caméra n’est pas disponible sur cet appareil.');
        setScanning(false);
        return;
      }
      if (!window.BarcodeDetector) {
        setCameraError('Le scan caméra n’est pas pris en charge par ce navigateur. Utilisez la douchette ou la saisie manuelle.');
        setScanning(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
        });
        timer = setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
          void detector.detect(video).then((codes) => {
            const code = codes[0]?.rawValue?.trim();
            if (code) completeScan(code);
          }).catch(() => undefined);
        }, 350);
      } catch {
        setCameraError('Impossible d’accéder à la caméra. Vérifiez les autorisations de cet appareil.');
        setScanning(false);
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      completeScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-400" />
            <span>Scanner Code-Barres Caméra</span>
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Flux caméra et viseur de scan */}
        <div className="relative h-48 w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
          <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <div className="h-32 w-32 border-2 border-dashed border-emerald-400 rounded-lg animate-pulse" />
          </div>

          {!cameraError && (
            <div className="z-10 text-center space-y-2 p-4 rounded-lg bg-slate-950/60">
              <Scan className={`mx-auto h-10 w-10 text-emerald-400 ${scanning ? 'animate-bounce' : ''}`} />
              <p className="text-xs font-semibold text-slate-100">Pointez la caméra vers le code-barres de l'article</p>
            </div>
          )}
          {cameraError && (
            <div className="z-10 flex items-start gap-2 p-4 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* Saisie manuelle de secours */}
        <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-slate-800">
          <label className="block text-[11px] font-semibold text-slate-400">
            Ou saisissez le code-barres / SKU à la douchette :
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Ex: 3700123456789"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FloatingScanButtonProps {
  onClick: () => void;
}

export function FloatingScanButton({ onClick }: FloatingScanButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="md:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 text-xs font-bold text-white shadow-xl border border-slate-700 hover:bg-slate-800 active:scale-95 transition-all"
    >
      <Camera className="h-4 w-4 text-emerald-400" />
      <span>📷 Scanner</span>
    </button>
  );
}
