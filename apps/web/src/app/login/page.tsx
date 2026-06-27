'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend (Route: login) - Redesign Premium (No-Scroll)
 * @created 2026-06-20
 * @updated 2026-06-26
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Input } from '@wilinwi/ui';
import { getSupabase } from '@/lib/supabase';
import { Mail, Lock, ArrowRight, ShieldCheck, TrendingUp, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulation dynamique
  const [sales, setSales] = useState(148500);
  const [barHeights, setBarHeights] = useState([40, 60, 50, 75, 95]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSales((s) => s + Math.floor(Math.random() * 800) + 200);
      setBarHeights((prev) =>
        prev.map((h, i) => {
          if (i === 4) return 95; // Le pic récent reste élevé
          const diff = Math.floor(Math.random() * 15) - 7;
          return Math.max(30, Math.min(90, h + diff));
        })
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push('/');
  }

  return (
    <main className="flex h-screen max-h-screen bg-background text-text-primary font-sans antialiased overflow-hidden">
      {/* Colonne de branding gauche (Stripe / Linear style premium) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B1224] relative flex-col justify-between p-10 text-white overflow-hidden border-r border-slate-800/40">
        {/* Motifs géométriques sophistiqués en arrière-plan */}
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-primary/15 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-[#00A86B]/10 blur-[100px] pointer-events-none" />

        {/* Header Branding */}
        <div className="flex items-center justify-center relative z-10 w-full">
          <Image src="/logo.png" alt="Wilinwi Logo" width={220} height={70} className="object-contain brightness-0 invert" style={{ height: 'auto', maxHeight: '65px' }} priority />
        </div>

        {/* Centre - Mockup Graphique & Transactions CSS Premium */}
        <div className="relative z-10 my-auto py-4 flex flex-col items-center">
          <div className="w-full max-w-sm bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
            {/* Effet lumineux de reflet */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />

            {/* Header de la carte factice */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Terminal Actif</p>
                <h4 className="text-xs font-semibold text-slate-200">Caisse Principale</h4>
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00A86B] animate-pulse" />
            </div>

            {/* Chiffre d'affaires simulé */}
            <div className="space-y-0.5 mb-4">
              <p className="text-[10px] text-slate-400">Ventes du jour</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-white transition-all duration-300">
                  {sales.toLocaleString()} FCFA
                </span>
                <span className="text-[10px] font-semibold text-[#00A86B] bg-[#00A86B]/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> +14.2%
                </span>
              </div>
            </div>

            {/* Mini Graphique en barres simulé */}
            <div className="flex items-end justify-between gap-1.5 h-16 mb-3 px-1">
              <div className="w-full bg-slate-800/60 rounded-t transition-all duration-700 ease-in-out group-hover:bg-primary/45" style={{ height: `${barHeights[0]}%` }} />
              <div className="w-full bg-slate-800/60 rounded-t transition-all duration-700 ease-in-out group-hover:bg-primary/55" style={{ height: `${barHeights[1]}%` }} />
              <div className="w-full bg-slate-800/60 rounded-t transition-all duration-700 ease-in-out group-hover:bg-primary/65" style={{ height: `${barHeights[2]}%` }} />
              <div className="w-full bg-slate-800/60 rounded-t transition-all duration-700 ease-in-out group-hover:bg-primary/75" style={{ height: `${barHeights[3]}%` }} />
              <div className="w-full bg-[#0005ea] rounded-t transition-all duration-700 ease-in-out shadow-[0_0_15px_rgba(0,5,234,0.5)]" style={{ height: `${barHeights[4]}%` }} />
            </div>

            {/* Pied de la carte */}
            <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-primary" /> Sécurisé par RLS</span>
              <span className="font-mono">Sync: OK</span>
            </div>
          </div>

          <div className="mt-6 text-center max-w-xs space-y-2">
            <h3 className="font-display text-lg font-bold text-white">Le système d'exploitation du commerce</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Encaissez, gérez vos stocks et suivez vos performances en direct avec une simplicité redoutable.
            </p>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 relative z-10 border-t border-white/[0.05] pt-4">
          <span>© {new Date().getFullYear()} Wilinwi by Nexus Partners.</span>
          <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-[#F59E0B]" /> MVP1</span>
        </div>
      </div>

      {/* Colonne de connexion droite */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 h-screen max-h-screen bg-slate-50/50 overflow-hidden">
        <div className="lg:hidden flex items-center justify-center w-full mb-2">
          <Image src="/logo.png" alt="Wilinwi Logo" width={150} height={50} className="object-contain" style={{ height: 'auto', maxHeight: '42px' }} priority />
        </div>

        <div className="w-full max-w-sm mx-auto my-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col">
            {/* Header de la carte fixe */}
            <div className="p-6 pb-2 border-b border-slate-100">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">Ravi de vous revoir</h1>
            </div>

            {/* Corps de la carte (Sans scroll car seulement 2 champs) */}
            <div className="p-6 pt-4 space-y-5 select-none">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Adresse email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@entreprise.com"
                    required
                    className="w-full h-10 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Mot de passe
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-10 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="p-2.5 bg-danger/5 border border-danger/20 rounded-xl">
                    <p className="text-xs font-semibold text-danger">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full justify-center h-11 text-sm font-semibold group rounded-xl bg-gradient-to-b from-[#0005ea] to-[#0004c8] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,5,234,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#2e31ff] hover:to-[#0005ea] active:scale-[0.98] active:shadow-inner transition-all duration-200 mt-4 border-0" disabled={loading}>
                  {loading ? 'Connexion en cours…' : (
                    <span className="flex items-center gap-1.5">
                      Ouvrir la caisse <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-medium">Nouveau sur Wilinwi ?</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <div className="text-center">
                <Link href="/signup" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark transition-colors pb-2">
                  Créer une boutique gratuitement <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
