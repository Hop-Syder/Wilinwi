'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Client Component pour les actions interactives du reçu public (Impression, Partage WhatsApp/SMS/Email)
 * @created 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState } from 'react';
import { MessageCircle, Smartphone, Mail, Printer, FileDown } from 'lucide-react';
import { formatFCFA } from '@wilinwi/ui';
import { generateSaleInvoicePdf } from '@/lib/invoice-pdf';

export interface PublicReceiptItem {
  nom: string;
  quantite: number;
  prixReel: number;
}

export interface PublicReceiptData {
  code: string;
  boutique: string;
  total: number;
  montantVerse: number;
  items: PublicReceiptItem[];
  date: string | Date;
  cancelled?: boolean;
  isOriginal?: boolean;
}

export function ReceiptClientActions({
  receipt,
  autoPrint = false,
}: {
  receipt: PublicReceiptData;
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (autoPrint && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const formattedDate = new Date(receipt.date).toLocaleString('fr-FR');
  const textLignes = [
    `🧾 Reçu ${receipt.boutique}`,
    `Date : ${formattedDate}`,
    `Réf : ${receipt.code}`,
    '',
    ...receipt.items.map(
      (it) => `${it.quantite}× ${it.nom} = ${formatFCFA(it.prixReel * it.quantite)}`
    ),
    '',
    `TOTAL : ${formatFCFA(receipt.total)}`,
    'Merci de votre achat ! — via Wilinwi',
  ].join('\n');

  const waUrl = `https://wa.me/?text=${encodeURIComponent(textLignes)}`;
  const smsUrl = `sms:?body=${encodeURIComponent(textLignes)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(
    'Votre reçu ' + receipt.boutique
  )}&body=${encodeURIComponent(textLignes)}`;

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleDownloadInvoice = async () => {
    setGeneratingPdf(true);
    try {
      await generateSaleInvoicePdf(
        {
          id: receipt.code,
          receiptCode: receipt.code,
          total: receipt.total,
          montantVerse: receipt.montantVerse,
          paymentMethod: 'CASH',
          createdAt: receipt.date,
          items: receipt.items.map((it) => ({
            nom: it.nom,
            quantite: it.quantite,
            prixReel: it.prixReel,
          })),
        },
        receipt.boutique,
      );
    } catch {
      alert('Erreur lors de la génération de la facture PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="no-print mt-6 w-full max-w-sm space-y-2 select-none">
      <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        Partager mon reçu
      </p>

      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 rounded-2xl bg-[#00A86B] py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.99]"
      >
        <MessageCircle className="h-4 w-4" /> Partager sur WhatsApp
      </a>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={smsUrl}
          className="flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-slate-700 border border-slate-200 transition-colors hover:bg-slate-50"
        >
          <Smartphone className="h-4 w-4 text-slate-500" /> SMS
        </a>
        <a
          href={mailUrl}
          className="flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-slate-700 border border-slate-200 transition-colors hover:bg-slate-50"
        >
          <Mail className="h-4 w-4 text-slate-500" /> Email
        </a>
      </div>

      <button
        onClick={() => void handleDownloadInvoice()}
        disabled={generatingPdf}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-xs font-bold text-white shadow-md shadow-teal-700/20 transition-all hover:bg-teal-800 active:scale-[0.99] mt-2"
      >
        <FileDown className="h-4 w-4" /> {generatingPdf ? 'Génération de la facture…' : 'Télécharger la Facture PDF (A4)'}
      </button>

      <button
        onClick={() => window.print()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-slate-700 border border-slate-200 transition-colors hover:bg-slate-50"
      >
        <Printer className="h-4 w-4 text-slate-500" /> Imprimer le ticket
      </button>

      <p className="pt-3 text-center text-[11px] text-slate-400 font-medium">
        Propulsé par ◈ Wilinwi
      </p>
    </div>
  );
}
