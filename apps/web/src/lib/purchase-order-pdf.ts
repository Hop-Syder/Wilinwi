/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Générateur PDF des Bons de Commande fournisseurs (A4, jsPDF + autotable).
 *   S'appuie sur le kit de marque `pdf/brand-kit` (logo Wilinwi à son ratio réel,
 *   palette de la charte, cartouches dynamiques, montant en lettres, signatures).
 *   La colonne « Reçu » apparaît dès qu'une réception a eu lieu.
 * @created 2026-09-17
 * @updated 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseOrderDto } from '@wilinwi/types';
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

const STATUS: Record<string, { label: string; color: Rgb }> = {
  DRAFT: { label: 'BROUILLON', color: BRAND.muted },
  ORDERED: { label: 'COMMANDÉ', color: BRAND.blue },
  PARTIAL: { label: 'RÉCEPTION PARTIELLE', color: BRAND.orange },
  RECEIVED: { label: 'REÇU EN TOTALITÉ', color: BRAND.green },
  CANCELLED: { label: 'ANNULÉ', color: BRAND.red },
};

/**
 * Génère et télécharge le Bon de Commande officiel au format PDF (A4).
 */
export async function generatePurchaseOrderPdf(
  order: PurchaseOrderDto,
  entrepriseNom: string,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const assets = await loadBrandAssets();
  const m = PAGE.margin;
  const showReceived = order.statut === 'PARTIAL' || order.statut === 'RECEIVED';
  const paye = order.montantPaye || 0;
  const reste = Math.max(0, order.montantTotal - paye);

  doc.setProperties({
    title: `Bon de commande ${order.reference}`,
    subject: `Bon de commande — ${entrepriseNom}`,
    creator: 'Wilinwi',
    author: entrepriseNom || 'Wilinwi',
  });

  // ── 1. En-tête : logo Wilinwi + donneur d'ordre | BON DE COMMANDE, réf., statut.
  let y = drawDocumentHeader(doc, assets, {
    title: 'BON DE COMMANDE',
    reference: `Réf. ${order.reference}`,
    dateLine: `Émis le ${formatDateLong(order.createdAt)}`,
    issuerName: entrepriseNom || 'Wilinwi',
    issuerLines: ['Service achats & approvisionnement'],
    badge: STATUS[order.statut] ?? STATUS.ORDERED,
  });

  // ── 2. Fournisseur / livraison.
  y = drawCardPair(
    doc,
    {
      title: 'Fournisseur',
      headline: order.fournisseurNom || 'Fournisseur',
      rows: [
        {
          label: 'Code',
          value: order.fournisseurId ? `FRN-${order.fournisseurId.slice(-6).toUpperCase()}` : null,
          bold: false,
        },
      ],
    },
    {
      title: 'Livraison',
      rows: [
        { label: 'Destination', value: order.etablissementNom || 'Entrepôt central' },
        { label: 'Contrôle', value: 'Réception contradictoire à la livraison', bold: false },
        { label: 'Articles', value: `${order.items.length} référence${order.items.length > 1 ? 's' : ''}`, bold: false },
      ],
    },
    y,
  );

  // ── 3. Articles commandés (+ reçus le cas échéant).
  const head = showReceived
    ? ['#', 'Article', 'Qté cmd.', 'Qté reçue', 'Prix unitaire', 'Montant']
    : ['#', 'Article', 'Qté cmd.', 'Prix unitaire', 'Montant'];
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: y,
    margin: { left: m, right: m, top: PAGE.continuationTop, bottom: PAGE.footerHeight + 6 },
    head: [head],
    body: order.items.map((it, idx) => {
      const row = [
        String(idx + 1),
        pdfSafe(it.productNom),
        formatQty(it.quantiteCommandee),
        fcfa(it.prixUnitaire),
        fcfa(Math.round(it.quantiteCommandee * it.prixUnitaire)),
      ];
      if (showReceived) row.splice(3, 0, formatQty(it.quantiteRecue));
      return row;
    }),
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, textColor: BRAND.faint },
      1: { halign: 'left', textColor: BRAND.ink, fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 20 },
      ...(showReceived
        ? {
            3: { halign: 'right', cellWidth: 20, textColor: BRAND.green, fontStyle: 'bold' },
            4: { halign: 'right', cellWidth: 30 },
            5: { halign: 'right', cellWidth: 32, textColor: BRAND.ink, fontStyle: 'bold' },
          }
        : {
            3: { halign: 'right', cellWidth: 32 },
            4: { halign: 'right', cellWidth: 34, textColor: BRAND.ink, fontStyle: 'bold' },
          }),
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 2) data.cell.styles.halign = 'right';
      if (data.section === 'head' && data.column.index === 0) data.cell.styles.halign = 'center';
    },
  });
  y = lastTableY(doc) + 6;

  // ── 4. Instructions (gauche) + totaux (droite).
  // Totaux + montant en lettres restent ensemble (jamais de mention orpheline).
  y = ensureSpace(doc, y, 60);
  const pageW = doc.internal.pageSize.getWidth();
  const totalsW = 82;
  const notesW = pageW - m * 2 - totalsW - 8;
  const notes = pdfSafe(order.notes);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const noteLines = doc.splitTextToSize(notes || 'Aucune instruction particulière.', notesW - 8) as string[];
  const notesH = 12 + noteLines.length * 4.2;
  doc.setFillColor(...BRAND.panel);
  doc.roundedRect(m, y, notesW, notesH, 2, 2, 'F');
  doc.setFillColor(...BRAND.blue);
  doc.rect(m + 4, y + 3.4, 0.9, 3.4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.navy);
  doc.text('INSTRUCTIONS DE LIVRAISON', m + 6.4, y + 6.2);
  doc.setFont('helvetica', notes ? 'normal' : 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...(notes ? BRAND.text : BRAND.faint));
  doc.text(noteLines, m + 4, y + 12);

  const totalsEnd = drawTotals(doc, y, {
    width: totalsW,
    rows: showReceived ? [{ label: 'Valeur reçue', value: fcfa(order.montantRecu), color: BRAND.green }] : [],
    grandLabel: 'TOTAL COMMANDE',
    grandValue: fcfa(order.montantTotal),
    footRows: [
      { label: 'Acompte versé', value: paye > 0 ? fcfa(paye) : 'Aucun', color: paye > 0 ? BRAND.green : BRAND.muted },
      reste > 0
        ? { label: 'Reste à payer', value: fcfa(reste), color: BRAND.orange }
        : { label: 'Solde', value: 'Soldé', color: BRAND.green },
    ],
  });
  y = Math.max(y + notesH, totalsEnd) + 4;

  // ── 5. Montant en lettres + signatures.
  y = ensureSpace(doc, y, 16);
  y = drawAmountInWords(doc, y, 'Arrêté le présent bon de commande à la somme de :', order.montantTotal);
  y = ensureSpace(doc, y, 30);
  drawSignatureBoxes(
    doc,
    y,
    {
      title: "Le donneur d'ordre",
      hint: "Signature autorisée et cachet de l'établissement",
      foot: `Fait le ${new Date().toLocaleDateString('fr-FR')}`,
    },
    {
      title: 'Le fournisseur',
      hint: '« Bon pour accord », date et signature',
      foot: 'Livraison prévue le : ____ / ____ / ________',
    },
  );

  drawFooters(doc, assets, `Bon de commande ${order.reference}`, `BON DE COMMANDE ${order.reference}`);
  doc.save(`bon-commande-${order.reference}.pdf`);
}
