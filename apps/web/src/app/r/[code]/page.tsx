'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page PUBLIQUE du reçu (après scan du QR) — choix du canal : WhatsApp / SMS / Email / PDF.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MessageCircle, Smartphone, Mail, Printer, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ReceiptItem {
  nom: string;
  quantite: number;
  prixReel: number;
}
interface PublicReceipt {
  code: string;
  boutique: string;
  total: number;
  montantVerse: number;
  items: ReceiptItem[];
  date: string;
}

const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} FCFA`;

export default function PublicReceiptPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code;
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'notfound'>('loading');

  useEffect(() => {
    if (!code) return;
    fetch(`${API_URL}/api/public/receipt/${code}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: PublicReceipt) => {
        setReceipt(d);
        setStatus('ok');
      })
      .catch(() => setStatus('notfound'));
  }, [code]);

  if (status === 'loading') {
    return <Centered>Chargement du reçu…</Centered>;
  }
  if (status === 'notfound' || !receipt) {
    return <Centered>Reçu introuvable ou expiré.</Centered>;
  }

  const text = [
    `🧾 Reçu ${receipt.boutique}`,
    new Date(receipt.date).toLocaleString('fr-FR'),
    '',
    ...receipt.items.map((it) => `${it.quantite}× ${it.nom} = ${fcfa(it.prixReel * it.quantite)}`),
    '',
    `TOTAL : ${fcfa(receipt.total)}`,
    'Merci de votre achat ! — via Wilinwi',
  ].join('\n');
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const smsUrl = `sms:?body=${encodeURIComponent(text)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent('Votre reçu ' + receipt.boutique)}&body=${encodeURIComponent(text)}`;

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-8">
      <style>{`@media print { .no-print { display:none !important; } body { background:#fff; } }`}</style>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm" id="recu">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-2 text-lg font-bold text-slate-900">Merci pour votre achat</h1>
          <p className="text-sm text-slate-500">{receipt.boutique}</p>
          <p className="mt-3 text-3xl font-bold" style={{ color: '#12355B' }}>
            {fcfa(receipt.total)}
          </p>
          <p className="text-xs text-slate-400">
            {new Date(receipt.date).toLocaleString('fr-FR')} · N° {receipt.code}
          </p>
        </div>

        <div className="my-4 border-t border-dashed border-slate-300" />
        <ul className="space-y-1 text-sm">
          {receipt.items.map((it, i) => (
            <li key={i} className="flex justify-between text-slate-700">
              <span>
                {it.quantite}× {it.nom}
              </span>
              <span>{fcfa(it.prixReel * it.quantite)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="no-print mt-6 w-full max-w-sm space-y-2">
        <p className="text-center text-sm font-medium text-slate-500">Recevoir mon reçu</p>
        <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-medium text-white">
          <MessageCircle className="h-5 w-5" /> WhatsApp
        </a>
        <a href={smsUrl} className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-slate-700 ring-1 ring-slate-200">
          <Smartphone className="h-5 w-5" /> SMS
        </a>
        <a href={mailUrl} className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-slate-700 ring-1 ring-slate-200">
          <Mail className="h-5 w-5" /> Email
        </a>
        <button onClick={() => window.print()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-slate-700 ring-1 ring-slate-200">
          <Printer className="h-5 w-5" /> Télécharger PDF / Imprimer
        </button>
        <p className="pt-3 text-center text-xs text-slate-400">Propulsé par ◈ Wilinwi</p>
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-slate-500">
      {children}
    </main>
  );
}
