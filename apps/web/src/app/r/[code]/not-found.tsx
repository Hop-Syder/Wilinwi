/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page 404 native Next.js quand un reçu n'existe pas ou est expiré (Route: /r/[code])
 * @created 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import Link from 'next/link';
import { FileX2, ArrowLeft } from 'lucide-react';

export default function ReceiptNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center font-sans">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <FileX2 className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Reçu introuvable ou expiré
        </h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Le numéro de reçu ou le code scanné n'existe pas dans le système Wilinwi ou a été archivé.
        </p>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </Link>
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-400 font-medium">◈ Wilinwi</p>
    </main>
  );
}
