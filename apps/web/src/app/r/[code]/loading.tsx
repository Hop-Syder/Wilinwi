/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description État de chargement natif Next.js Suspense (Route: /r/[code])
 * @created 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

export default function ReceiptLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Chargement du reçu sécurisé…
        </p>
      </div>
    </main>
  );
}
