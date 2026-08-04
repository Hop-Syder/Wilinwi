/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Lecteur de Code-Barres par Caméra Mobile/PWA & Bouton Flottant (Axe 5)
 * @created 2026-08-03
 * @updated 2026-08-04
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
  const [_scanning, setScanning] = useState<boolean>(true);
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

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("L'accès à la caméra n'est pas supporté sur cet appareil.");
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (cancelled) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (window.BarcodeDetector) {
          const detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'upc_a'],
          });

          timer = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  if (timer) clearInterval(timer);
                  completeScan(barcodes[0].rawValue);
                }
              } catch {
                // Erreur de détection ignorée silencieusement dans la boucle
              }
            }
          }, 300);
        } else {
          setCameraError("L'API native BarcodeDetector n'est pas disponible. Utilisez la saisie manuelle.");
        }
      } catch (err: any) {
        if (!cancelled) {
          setCameraError(err.message || 'Impossible d\'accéder à la caméra.');
        }
      }
    }

    void initCamera();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      completeScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-white space-y-4">
        {/* En-tête Modale */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Scan className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold">Scanner Code-barres</h3>
              <p className="text-[11px] text-slate-400 font-medium">Visez le code-barres avec la caméra</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport Caméra */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-slate-800 flex items-center justify-center">
          {cameraError ? (
            <div className="p-4 text-center space-y-2 text-amber-400">
              <AlertCircle className="mx-auto h-8 w-8" />
              <p className="text-xs font-semibold">{cameraError}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              {/* Viseur animé */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 border-2 border-emerald-400/80 rounded-xl shadow-[0_0_15px_rgba(52,211,153,0.5)] animate-pulse flex items-center justify-center">
                <div className="w-full h-0.5 bg-emerald-400 animate-ping opacity-75" />
              </div>
            </>
          )}
        </div>

        {/* Formulaire de secours Saisie Manuelle */}
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Ou Saisie Manuelle Code-Barres / SKU
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: 60400012938..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors"
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
      className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 bg-slate-900 text-emerald-400 rounded-full shadow-2xl border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-transform active:scale-95 shrink-0"
      title="Scanner un code-barres"
      aria-label="Scanner un code-barres"
    >
      <Camera className="w-5 h-5" />
    </button>
  );
}
