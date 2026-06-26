'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend (Route: signup) - Redesign Premium
 * @created 2026-06-20
 * @updated 2026-06-26
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState } from 'react';
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
    <main className="flex min-h-screen bg-background text-text-primary font-sans antialiased overflow-hidden">
      {/* Colonne de branding gauche (Stripe / Linear style premium) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B1224] relative flex-col justify-between p-16 text-white overflow-hidden border-r border-slate-800/40">
        {/* Motifs géométriques sophistiqués en arrière-plan */}
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#00A86B]/10 blur-[120px] pointer-events-none" />

        {/* Header Branding */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 backdrop-blur-md">
            <Image src="/logo-wilinwi.png" alt="Wilinwi Logo" width={32} height={32} className="object-contain filter brightness-0 invert" />
          </div>
          <span className="font-display text-2xl font-black tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Wilinwi</span>
        </div>

        {/* Centre - Mockup Stock CSS Premium */}
        <div className="relative z-10 my-auto py-12 flex flex-col items-center">
          <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            {/* Effet lumineux de reflet */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
            
            {/* Header de la carte factice */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Gestion des Stocks</p>
                <h4 className="text-sm font-semibold text-slate-200">Suivi des Articles</h4>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#00A86B] animate-pulse" />
            </div>

            {/* Articles simulés */}
            <div className="space-y-1 mb-6">
              <p className="text-xs text-slate-400">Total Articles Renseignés</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono tracking-tight text-white">412 articles</span>
                <span className="text-xs font-semibold text-[#00A86B] bg-[#00A86B]/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Box className="w-3.5 h-3.5" /> En sécurité
                </span>
              </div>
            </div>

            {/* Liste de stock simulée */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-xs p-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00A86B]" />
                  <span className="text-slate-300 font-medium">Sac de riz 50kg</span>
                </div>
                <span className="font-mono text-slate-400">84 en stock</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FFB300]" />
                  <span className="text-slate-300 font-medium">Huile de Palme 1L</span>
                </div>
                <span className="font-mono text-slate-400">12 en stock (Alerte)</span>
              </div>
            </div>

            {/* Pied de la carte */}
            <div className="border-t border-white/[0.06] pt-4 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#00A86B]" /> Stock intelligent</span>
              <span className="font-mono">Auto-Alertes</span>
            </div>
          </div>

          <div className="mt-8 text-center max-w-sm space-y-3">
            <h3 className="font-display text-xl font-bold text-white">Prêt pour la croissance</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Configurez vos articles, suivez les variations de prix d'achat et sécurisez votre marge brute en un clin d'œil.
            </p>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="flex justify-between items-center text-xs text-slate-500 relative z-10 border-t border-white/[0.05] pt-6">
          <span>© {new Date().getFullYear()} Wilinwi by Nexus Partners.</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#FFB300]" /> MVP1</span>
        </div>
      </div>

      {/* Colonne d'inscription droite */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-16 min-h-screen bg-slate-50/50 overflow-y-auto">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Image src="/logo-wilinwi.png" alt="Wilinwi Logo" width={32} height={32} className="object-contain" />
          <span className="font-display text-xl font-black text-primary">Wilinwi</span>
        </div>

        <div className="w-full max-w-md mx-auto my-auto space-y-8 py-8">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Créer une boutique</h1>
            <p className="text-sm text-slate-500">Démarrez gratuitement et propulsez votre commerce aujourd'hui.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-slate-400" /> Nom de la boutique
                </label>
                <Input 
                  type="text" 
                  value={form.nomBoutique} 
                  onChange={(e) => set('nomBoutique')(e.target.value)} 
                  placeholder="ex. Épicerie du Centre" 
                  required 
                  className="w-full focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Votre nom complet
                </label>
                <Input 
                  type="text" 
                  value={form.nomComplet} 
                  onChange={(e) => set('nomComplet')(e.target.value)} 
                  placeholder="ex. Jean Kouassi" 
                  required 
                  className="w-full focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Adresse email
                </label>
                <Input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => set('email')(e.target.value)} 
                  placeholder="nom@boutique.com" 
                  required 
                  className="w-full focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Mot de passe (8+ caractères)
                </label>
                <Input 
                  type="password" 
                  value={form.password} 
                  onChange={(e) => set('password')(e.target.value)} 
                  placeholder="••••••••" 
                  required 
                  className="w-full focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl">
                  <p className="text-xs font-semibold text-danger">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full justify-center h-11 font-semibold group rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all mt-6" disabled={loading}>
                {loading ? 'Création en cours…' : (
                  <span className="flex items-center gap-2">
                    Créer ma boutique <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </Button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-400 font-medium">Déjà un compte ?</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-dark transition-colors">
                Se connecter à mon espace <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Trust Badges bottom */}
        <div className="text-center pt-8 border-t border-slate-100">
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Propulsé par Nexus Partners — Solution sécurisée multi-tenant
          </p>
        </div>
      </div>
    </main>
  );
}
