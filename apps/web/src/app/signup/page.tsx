'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend (Route: signup) - Redesign Premium (No-Scroll)
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
import { apiPost } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { Mail, Lock, Store, User, ArrowRight, ShieldCheck, Box, Zap } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nomBoutique: '', nomComplet: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulation dynamique
  const [stockCount, setStockCount] = useState(412);
  const [riceStock, setRiceStock] = useState(84);
  const [oilStock, setOilStock] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setRiceStock((r) => {
        const diff = Math.random() > 0.55 ? -1 : 1;
        return Math.max(70, Math.min(100, r + diff));
      });
      setOilStock((o) => {
        const diff = Math.random() > 0.65 ? -1 : 1;
        return Math.max(5, Math.min(25, o + diff));
      });
      setStockCount((s) => s + (Math.random() > 0.5 ? 1 : -1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiPost('/api/auth/signup', form);
      // Connexion immédiate après création.
      const { error } = await getSupabase().auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible');
    } finally {
      setLoading(false);
    }
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
          <Image src="/logo.png" alt="Wilinwi Logo" width={220} height={70} className="object-contain brightness-0 invert" style={{ height: 'auto', maxHeight: '65px' }} />
        </div>

        {/* Centre - Mockup Stock CSS Premium */}
        <div className="relative z-10 my-auto py-4 flex flex-col items-center">
          <div className="w-full max-w-sm bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
            {/* Effet lumineux de reflet */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
            
            {/* Header de la carte factice */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Gestion des Stocks</p>
                <h4 className="text-xs font-semibold text-slate-200">Suivi des Articles</h4>
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00A86B] animate-pulse" />
            </div>

            {/* Articles simulés */}
            <div className="space-y-0.5 mb-4">
              <p className="text-[10px] text-slate-400">Total Articles Renseignés</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-white transition-all duration-300">
                  {stockCount} articles
                </span>
                <span className="text-[10px] font-semibold text-[#00A86B] bg-[#00A86B]/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Box className="w-3 h-3" /> En sécurité
                </span>
              </div>
            </div>

            {/* Liste de stock simulée */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-[11px] p-2 bg-white/[0.02] border border-white/[0.05] rounded-xl transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00A86B]" />
                  <span className="text-slate-300 font-medium">Sac de riz 50kg</span>
                </div>
                <span className="font-mono text-slate-400 transition-all duration-300">{riceStock} en stock</span>
              </div>
              <div className="flex items-center justify-between text-[11px] p-2 bg-white/[0.02] border border-white/[0.05] rounded-xl transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFB300] animate-pulse" />
                  <span className="text-slate-300 font-medium">Huile de Palme 1L</span>
                </div>
                <span className="font-mono text-slate-400 transition-all duration-300">{oilStock} en stock</span>
              </div>
            </div>

            {/* Pied de la carte */}
            <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-[#00A86B]" /> Stock intelligent</span>
              <span className="font-mono">Auto-Alertes</span>
            </div>
          </div>

          <div className="mt-6 text-center max-w-xs space-y-2">
            <h3 className="font-display text-lg font-bold text-white">Prêt pour la croissance</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configurez vos articles, suivez les variations de prix d'achat et sécurisez votre marge brute en un clin d'œil.
            </p>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 relative z-10 border-t border-white/[0.05] pt-4">
          <span>© {new Date().getFullYear()} Wilinwi by Nexus Partners.</span>
          <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-[#FFB300]" /> MVP1</span>
        </div>
      </div>

      {/* Colonne d'inscription droite */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 h-screen max-h-screen bg-slate-50/50 overflow-hidden">
        <div className="lg:hidden flex items-center gap-2 mb-4">
          <Image src="/logo.png" alt="Wilinwi Logo" width={90} height={30} className="object-contain" style={{ height: 'auto', maxHeight: '30px' }} />
        </div>

        <div className="w-full max-w-sm mx-auto my-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col">
            {/* Header de la carte fixe */}
            <div className="p-6 pb-2 border-b border-slate-100">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">Créer une boutique</h1>
            </div>

            {/* Corps de la carte (Sans scroll) */}
            <div className="p-6 pt-4 space-y-4 select-none">
              <form onSubmit={onSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-slate-400" /> Nom de la boutique
                  </label>
                  <Input 
                    type="text" 
                    value={form.nomBoutique} 
                    onChange={(e) => set('nomBoutique')(e.target.value)} 
                    placeholder="ex. Épicerie du Centre" 
                    required 
                    className="w-full h-9 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Votre nom complet
                  </label>
                  <Input 
                    type="text" 
                    value={form.nomComplet} 
                    onChange={(e) => set('nomComplet')(e.target.value)} 
                    placeholder="ex. Jean Kouassi" 
                    required 
                    className="w-full h-9 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Adresse email
                  </label>
                  <Input 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => set('email')(e.target.value)} 
                    placeholder="nom@boutique.com" 
                    required 
                    className="w-full h-9 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Mot de passe
                  </label>
                  <Input 
                    type="password" 
                    value={form.password} 
                    onChange={(e) => set('password')(e.target.value)} 
                    placeholder="••••••••" 
                    required 
                    className="w-full h-9 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                {error && (
                  <div className="p-2 bg-danger/5 border border-danger/20 rounded-xl">
                    <p className="text-xs font-semibold text-danger">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full justify-center h-10 text-sm font-semibold group rounded-xl shadow-md shadow-primary/5 hover:shadow-primary/10 transition-all mt-4" disabled={loading}>
                  {loading ? 'Création en cours…' : (
                    <span className="flex items-center gap-1.5">
                      Créer ma boutique <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-medium">Déjà un compte ?</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <div className="text-center">
                <Link href="/login" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark transition-colors">
                  Se connecter à mon espace <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges bottom */}
        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
            Propulsé par Nexus Partners — Solution sécurisée multi-tenant
          </p>
        </div>
      </div>
    </main>
  );
}
