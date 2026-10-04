/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Générateur PDF des Factures de Vente clients (A4, jsPDF + autotable).
 *   S'appuie sur le kit de marque `pdf/brand-kit` : logo Wilinwi à son ratio réel,
 *   palette de la charte, cartouches à hauteur dynamique (textes longs repliés),
 *   statut de paiement, montant en toutes lettres et QR code de vérification.
 * @created 2026-09-17
 * @updated 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { saleLineAmount, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@wilinwi/types';
import {
  BRAND,
  PAGE,
  TABLE_STYLES,
  drawAmountInWords,
  drawCardPair,
  drawDocumentHeader,
  drawFooters,
  drawSignatureBoxes,
  drawTotals,
  ensureSpace,
  fcfa,
  formatDateLong,
  formatQty,
  lastTableY,
  loadBrandAssets,
  pdfSafe,
  type Rgb,
} from './pdf/brand-kit';
import { publicReceiptUrl } from './public-receipt-url';

export interface InvoiceSaleItem {
  id?: string;
  nom?: string;
  quantite: number;
  prixReel: number;
  product?: { nom: string } | null;
}

export interface InvoiceSaleData {
  id: string;
  total: number;
  montantVerse: number;
  /** Absent (reçu public) → la ligne « Règlement » n'est pas affichée. */
  paymentMethod?: PaymentMethod | null;
  momoOperator?: string | null;
  momoReference?: string | null;
  createdAt: string | Date;
  receiptCode?: string | null;
  items: InvoiceSaleItem[];
  client?: {
    nom: string;
    telephone?: string | null;
    adresse?: string | null;
  } | null;
  vendeur?: {
    nom: string;
  } | null;
}

/** Statut de paiement affiché en pastille dans l'en-tête. */
function paymentStatus(total: number, verse: number): { label: string; color: Rgb } {
  if (verse >= total) return { label: 'PAYÉE', color: BRAND.green };
  if (verse > 0) return { label: 'PARTIELLEMENT PAYÉE', color: BRAND.orange };
  return { label: 'À CRÉDIT', color: BRAND.red };
}

/**
 * Génère et télécharge la Facture de Vente officielle au format PDF (A4).
 */
export async function generateSaleInvoicePdf(
  sale: InvoiceSaleData,
  entrepriseNom: string,
  options?: {
    adresseBoutique?: string;
    telephoneBoutique?: string;
    emailBoutique?: string;
  },
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const assets = await loadBrandAssets();
  const pageW = doc.internal.pageSize.getWidth();
  const m = PAGE.margin;

  const code = sale.receiptCode || sale.id.slice(0, 8).toUpperCase();
  const invoiceNumber = `FAC-${code}`;
  const verse = sale.montantVerse || 0;
  const reste = Math.max(0, sale.total - verse);

  doc.setProperties({
    title: `Facture ${invoiceNumber}`,
    subject: `Facture de vente — ${entrepriseNom}`,
    creator: 'Wilinwi',
    author: entrepriseNom || 'Wilinwi',
  });

  // ── 1. En-tête : logo Wilinwi + émetteur | FACTURE, n°, date, statut.
  let y = drawDocumentHeader(doc, assets, {
    title: 'FACTURE',
    reference: `N° ${invoiceNumber}`,
    dateLine: `Émise le ${formatDateLong(sale.createdAt)}`,
    issuerName: entrepriseNom || 'Point de vente',
    issuerLines: [
      options?.adresseBoutique,
      [options?.telephoneBoutique && `Tél. ${options.telephoneBoutique}`, options?.emailBoutique]
        .filter(Boolean)
        .join('  ·  '),
    ],
    badge: paymentStatus(sale.total, verse),
  });

  // ── 2. Cartouches client / détails de la vente (hauteur selon le contenu).
  const payLabel = sale.paymentMethod ? PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod : null;
  const momo = [sale.momoOperator, sale.momoReference && `réf. ${sale.momoReference}`].filter(Boolean).join(' · ');
  y = drawCardPair(
    doc,
    {
      title: 'Facturé à',
      headline: sale.client?.nom || 'Client comptoir',
      rows: [
        { label: 'Téléphone', value: sale.client?.telephone },
        { label: 'Adresse', value: sale.client?.adresse, bold: false },
        { label: 'Compte', value: sale.client ? null : 'Vente directe au comptoir', bold: false },
      ],
    },
    {
      title: 'Détails de la vente',
      rows: [
        { label: 'Vendeur', value: sale.vendeur?.nom },
        { label: 'Règlement', value: payLabel, color: BRAND.blue },
        { label: 'Mobile Money', value: momo || null, bold: false },
        { label: 'Articles', value: `${sale.items.length} ligne${sale.items.length > 1 ? 's' : ''}`, bold: false },
      ],
    },
    y,
  );

  // ── 3. Lignes de la facture.
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: y,
    margin: { left: m, right: m, top: PAGE.continuationTop, bottom: PAGE.footerHeight + 6 },
    head: [['#', 'Désignation', 'Qté', 'Prix unitaire', 'Montant']],
    body: sale.items.map((it, idx) => [
      String(idx + 1),
      pdfSafe(it.nom || it.product?.nom || 'Article'),
      formatQty(it.quantite),
      fcfa(it.prixReel),
      fcfa(saleLineAmount(it.prixReel, it.quantite)),
    ]),
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, textColor: BRAND.faint },
      1: { halign: 'left', textColor: BRAND.ink, fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 34, textColor: BRAND.ink, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 2) data.cell.styles.halign = 'right';
      if (data.section === 'head' && data.column.index === 0) data.cell.styles.halign = 'center';
    },
  });
  y = lastTableY(doc) + 6;

  // ── 4. QR de vérification (gauche) + totaux (droite), toujours sur la même page.
  // Totaux + montant en lettres restent ensemble (jamais de mention orpheline).
  y = ensureSpace(doc, y, 62);
  const totalsW = 82;
  const qrBlockW = pageW - m * 2 - totalsW - 8;
  const qrSize = 24;
  const url = publicReceiptUrl(code);
  try {
    const qr = await QRCode.toDataURL(url, { margin: 0, width: 300, errorCorrectionLevel: 'M' });
    doc.setFillColor(...BRAND.panel);
    doc.roundedRect(m, y, qrBlockW, qrSize + 8, 2, 2, 'F');
    doc.addImage(qr, 'PNG', m + 4, y + 4, qrSize, qrSize, 'receipt-qr', 'FAST');
    const tx = m + qrSize + 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.navy);
    doc.text('Reçu numérique vérifiable', tx, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...BRAND.muted);
    doc.text(
      doc.splitTextToSize('Scannez ce code pour consulter et vérifier cette facture en ligne.', qrBlockW - qrSize - 13),
      tx,
      y + 13.5,
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.blue);
    doc.text(url.replace(/^https?:\/\//, ''), tx, y + qrSize + 3);
  } catch {
    // QR facultatif : la facture reste valable sans.
  }

  const totalsEnd = drawTotals(doc, y, {
    width: totalsW,
    rows: [],
    grandLabel: 'TOTAL À PAYER',
    grandValue: fcfa(sale.total),
    footRows: [
      { label: 'Montant versé', value: fcfa(verse), color: BRAND.green },
      reste > 0
        ? { label: 'Reste dû', value: fcfa(reste), color: BRAND.red }
        : verse > sale.total
          ? { label: 'Monnaie rendue', value: fcfa(verse - sale.total), color: BRAND.muted, bold: false }
          : { label: 'Solde', value: 'Soldé', color: BRAND.green },
    ],
  });
  y = Math.max(y + qrSize + 8, totalsEnd) + 4;

  // ── 5. Montant en lettres (mention d'usage OHADA) puis signatures.
  y = ensureSpace(doc, y, 16);
  y = drawAmountInWords(doc, y, 'Arrêtée la présente facture à la somme de :', sale.total);
  y = ensureSpace(doc, y, 30);
  drawSignatureBoxes(
    doc,
    y,
    { title: 'Pour le vendeur', hint: 'Cachet et signature' },
    { title: 'Le client', hint: 'Signature, précédée de « Reçu conforme »' },
  );

  drawFooters(doc, assets, `Facture ${invoiceNumber} · Merci de votre confiance`, `FACTURE N° ${invoiceNumber}`);
  doc.save(`facture-${invoiceNumber}.pdf`);
}
