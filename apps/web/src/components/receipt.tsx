'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Reçu de caisse imprimable (thermique 80mm) + QR → WhatsApp
 */

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, FileDown } from 'lucide-react';
import Image from 'next/image';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@wilinwi/types';
import { Button, formatFCFA } from '@wilinwi/ui';
import { useAuth } from '@/lib/auth-context';
import { generateSaleInvoicePdf } from '@/lib/invoice-pdf';

export interface ReceiptSale {
  id: string;
  total: number;
  montantVerse: number;
  paymentMethod: PaymentMethod;
  momoOperator?: string | null;
  momoReference?: string | null;
  createdAt: string;
  /** Code du reçu public → QR vers la page Wilinwi /r/<code>. */
  receiptCode?: string | null;
  items: { id: string; quantite: number; prixReel: number; product?: { nom: string } | null }[];
  client?: { nom: string; telephone?: string | null } | null;
}


/** Construit le texte du reçu (utilisé pour le QR → WhatsApp). */
function _receiptText(sale: ReceiptSale): string {
  const lignes = sale.items
    .map((it) => `${it.quantite}x ${it.product?.nom ?? 'Article'} = ${formatFCFA(it.prixReel * it.quantite)}`)
    .join('\n');
  const detailsMoMo = sale.paymentMethod === 'MOBILE_MONEY' && sale.momoOperator
    ? ` (${sale.momoOperator}${sale.momoReference ? ` - Réf: ${sale.momoReference}` : ''})`
    : '';
  return [
    '🧾 Reçu Wilinwi',
    `N° ${sale.id.slice(0, 8).toUpperCase()}`,
    new Date(sale.createdAt).toLocaleString('fr-FR'),
    '',
    lignes,
    '',
    `TOTAL : ${formatFCFA(sale.total)}`,
    `Payé : ${formatFCFA(sale.montantVerse)} (${PAYMENT_METHOD_LABELS[sale.paymentMethod]}${detailsMoMo})`,
    'Merci de votre achat ! — Wilinwi',
  ].join('\n');
}

export function ReceiptModal({ sale, onClose }: { sale: ReceiptSale; onClose: () => void }) {
  const { user } = useAuth();
  const entreprise = user?.boutiqueNom ?? 'Wilinwi';
  const shortCode = sale.receiptCode || sale.id.slice(0, 8).toUpperCase();
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // URL publique exacte pour le reçu numérique
  const receiptId = sale.receiptCode || sale.id;
  const publicReceiptUrl = `https://wilinwi.nexus-partners.xyz/${receiptId}`;
  const reste = sale.total - sale.montantVerse;

  const handleDownloadInvoicePdf = async () => {
    setGeneratingPdf(true);
    try {
      await generateSaleInvoicePdf(sale, entreprise);
    } catch {
      alert('Erreur lors de la génération de la facture PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #receipt-print, #receipt-print * { visibility: visible !important; }
        #receipt-print { position: absolute; left: 0; top: 0; width: 80mm; padding: 4mm; box-shadow: none !important; margin: 0; page-break-inside: avoid; }
        .no-print { display: none !important; }
        @page { size: auto; margin: 0mm; }
      }`}</style>

      <div
        className="w-[320px] max-w-full rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-4 py-2">
          <span className="text-sm font-medium text-slate-500">Reçu de caisse</span>
          <button onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {/* Zone imprimable 80mm */}
        <div id="receipt-print" className="px-5 py-4 font-mono text-[12px] text-slate-900">
          <div className="text-center space-y-1">
            {/* Logo Wilinwi EN HAUT du nom de la boutique */}
            <div className="flex justify-center mb-1">
              <Image src="/logo.png" alt="Wilinwi Logo" width={32} height={32} className="object-contain" />
            </div>
            {/* Nom de la boutique à taille diminuée */}
            <div className="font-display text-[13px] font-black tracking-tight text-slate-900 leading-tight">
              {entreprise}
            </div>
            <div className="text-[11px] text-slate-500">Reçu de caisse</div>
            <div className="mt-0.5 tabular text-[11px] font-bold text-slate-800">
              N° {shortCode}
            </div>
            <div className="tabular text-[10.5px] text-slate-400">
              {new Date(sale.createdAt).toLocaleString('fr-FR')}
            </div>
          </div>

          <div className="my-2 border-t border-dashed border-slate-300" />

          {sale.items.map((it) => (
            <div key={it.id} className="flex justify-between">
              <span>
                {it.quantite}× {it.product?.nom ?? 'Article'}
              </span>
              <span className="tabular">{formatFCFA(it.prixReel * it.quantite)}</span>
            </div>
          ))}

          <div className="my-2 border-t border-dashed border-slate-300" />

          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span className="tabular">{formatFCFA(sale.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Payé ({PAYMENT_METHOD_LABELS[sale.paymentMethod]})</span>
            <span className="tabular">{formatFCFA(sale.montantVerse)}</span>
          </div>
          {sale.paymentMethod === 'MOBILE_MONEY' && sale.momoOperator && (
            <div className="text-[11px] text-slate-600 mt-0.5">
              Opérateur : {sale.momoOperator} {sale.momoReference ? `(Réf: ${sale.momoReference})` : ''}
            </div>
          )}
          {reste > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Reste dû</span>
              <span className="tabular">{formatFCFA(reste)}</span>
            </div>
          )}
          {sale.client && <div className="mt-1 text-[11px]">Client : {sale.client.nom}</div>}

          {/* Bloc QR Code & Message en 1 ligne / 2 colonnes */}
          <div className="mt-3.5 flex items-center gap-3 pt-3 border-t border-dashed border-slate-300 print:page-break-inside-avoid">
            {/* Colonne 1 : QR Code Compact (68px) */}
            <div className="shrink-0 p-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <QRCodeSVG
                value={publicReceiptUrl}
                size={68}
                level="M"
                includeMargin={false}
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>

            {/* Colonne 2 : Lien + Message numérique + Remerciement */}
            <div className="flex-1 flex flex-col justify-center min-w-0 text-left space-y-0.5">
              <a
                href={publicReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[8.5px] font-bold text-blue-700 hover:underline break-all tracking-tight leading-tight line-clamp-2"
                title={publicReceiptUrl}
              >
                {publicReceiptUrl.replace(/^https?:\/\//, '')}
              </a>
              <p className="text-[9px] font-medium text-slate-500 leading-tight">
                Scannez pour votre reçu numérique
              </p>
              <p className="text-[10px] font-extrabold text-slate-900 pt-0.5 leading-tight">
                Merci de votre achat ! 🙏
              </p>
            </div>
          </div>
        </div>

        <div className="no-print flex items-center gap-1.5 border-t border-slate-200 p-3 bg-slate-50/50 rounded-b-2xl">
          <Button variant="outline" size="sm" className="px-3 text-xs" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs font-bold text-teal-700 border-teal-200 hover:bg-teal-50"
            onClick={() => void handleDownloadInvoicePdf()}
            disabled={generatingPdf}
          >
            <FileDown className="h-3.5 w-3.5 mr-1 text-teal-600" />
            {generatingPdf ? 'Génération…' : 'Facture PDF'}
          </Button>
          <Button size="sm" className="flex-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}
