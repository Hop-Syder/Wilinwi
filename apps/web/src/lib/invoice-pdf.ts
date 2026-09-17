/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Générateur PDF officiel pour les Factures de Vente Clients (jsPDF + autotable + QR code certifié).
 *   Design System : Trust & Authority / Enterprise B2B & Retail.
 *   Comprend :
 *     - Bandeau d'accent et en-tête institutionnel avec logo ou monogramme corporate
 *     - N° officiel de facture & horodatage certifié
 *     - Cartouches émetteur (boutique/société) et client
 *     - Tableau des articles haute lisibilité avec alignements stricts et totaux
 *     - Récapitulatif financier complet (Total TTC, mode de règlement, acomptes, solde)
 *     - Code QR miniature d'authentification (20x20 mm) vérifiable en ligne
 *     - Cadre signature / cachet commercial et pagination dynamique
 * @created 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@wilinwi/types';

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
  paymentMethod: PaymentMethod;
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

/** Formatage standard FCFA avec séparateur de milliers robuste. */
function fcfa(n: number): string {
  const rounded = Math.round(n || 0);
  return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

/** Charge le logo en dataURL si disponible. */
async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ── 1. BANDEAU SUPÉRIEUR ACCENT & ESTHÉTIQUE CORPORATE ──
  // Liseré haut Emerald / Teal
  doc.setFillColor(15, 118, 110); // #0f766e Teal 700
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // Liseré fin Slate
  doc.setFillColor(15, 23, 42); // #0f172a Slate 900
  doc.rect(0, 3.5, pageWidth, 0.8, 'F');

  // ── 2. EN-TÊTE OFFICIEL ──
  const logo = await loadLogo();
  const brandX = margin + 19;

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', margin, 10, 15, 15);
    } catch {
      drawBrandMonogram(doc, margin, 10, 15, 15, entrepriseNom);
    }
  } else {
    drawBrandMonogram(doc, margin, 10, 15, 15, entrepriseNom);
  }

  // Nom de l'entreprise émettrice
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(entrepriseNom || 'Wilinwi', brandX, 17);

  // Sous-titre
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  const subline = options?.adresseBoutique || 'COMMERCE GÉNÉRAL & DISTRIBUTION';
  doc.text(subline, brandX, 22.5);

  // Côté droit : Titre du document & Numéro de facture
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 118, 110); // Teal 700
  doc.text('FACTURE DE VENTE', pageWidth - margin, 16.5, { align: 'right' });

  // Numéro de référence de la facture
  const invoiceNumber = sale.receiptCode
    ? `FAC-${sale.receiptCode}`
    : `FAC-${sale.id.slice(0, 8).toUpperCase()}`;

  const refText = `N° ${invoiceNumber}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const refWidth = doc.getTextWidth(refText) + 8;
  const refX = pageWidth - margin - refWidth;
  const refY = 20;

  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.3);
  doc.roundedRect(refX, refY, refWidth, 6.5, 1.5, 1.5, 'FD');

  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(refText, refX + refWidth / 2, refY + 4.5, { align: 'center' });

  // Date et Heure
  const saleDate = new Date(sale.createdAt);
  const formattedDate = saleDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = saleDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date : ${formattedDate} à ${formattedTime}`, pageWidth - margin, 31, { align: 'right' });

  // Ligne de séparation
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.line(margin, 36, pageWidth - margin, 36);

  // ── 3. CARTOUCHES D'INFORMATIONS ÉMETTEUR & CLIENT ──
  const boxY = 40;
  const boxWidth = (contentWidth - 6) / 2;
  const boxHeight = 28;

  // Cartouche Gauche : Vendeur / Émetteur
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  // En-tête bandeau
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, boxY, boxWidth, 6.5, 2, 2, 'F');
  doc.rect(margin, boxY + 4, boxWidth, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('ÉMETTEUR & CAISSE', margin + 3.5, boxY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Établissement :', margin + 3.5, boxY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(entrepriseNom || 'Point de vente', margin + 27, boxY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Opérateur / Caisse :', margin + 3.5, boxY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sale.vendeur?.nom || 'Caissier Principal', margin + 32, boxY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Règlement :', margin + 3.5, boxY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  const payLabel = PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod;
  doc.text(payLabel, margin + 23, boxY + 24);

  // Cartouche Droit : Client Facturé
  const rightBoxX = margin + boxWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightBoxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(rightBoxX, boxY, boxWidth, 6.5, 2, 2, 'F');
  doc.rect(rightBoxX, boxY + 4, boxWidth, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CLIENT & FACTURATION', rightBoxX + 3.5, boxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const clientNom = sale.client?.nom || 'Client Comptoir';
  doc.text(clientNom, rightBoxX + 3.5, boxY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Téléphone :', rightBoxX + 3.5, boxY + 19);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.client?.telephone || 'Non renseigné', rightBoxX + 22, boxY + 19);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Type compte :', rightBoxX + 3.5, boxY + 24);
  doc.setTextColor(71, 85, 105);
  doc.text(sale.client ? 'Client Enregistré' : 'Vente directe au comptoir', rightBoxX + 24, boxY + 24);

  // ── 4. TABLEAU DES ARTICLES VENDUS (AUTOTABLE) ──
  autoTable(doc, {
    startY: 72,
    margin: { left: margin, right: margin, bottom: 25 },
    head: [['N°', 'DÉSIGNATION DU PRODUIT', 'QTÉ', 'PRIX UNITAIRE', 'MONTANT TOTAL']],
    body: sale.items.map((it, idx) => {
      const itemNom = it.nom || it.product?.nom || 'Article';
      const totalLigne = it.prixReel * it.quantite;
      return [
        String(idx + 1).padStart(2, '0'),
        itemNom,
        String(it.quantite),
        fcfa(it.prixReel),
        fcfa(totalLigne),
      ];
    }),
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3.5,
      lineWidth: 0,
    },
    styles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3.2,
      lineColor: [226, 232, 240], // Slate 200
      lineWidth: 0.2,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, textColor: [100, 116, 139], fontStyle: 'bold' },
      1: { halign: 'left', fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 20, textColor: [15, 23, 42] },
      3: { halign: 'right', cellWidth: 32, textColor: [71, 85, 105] },
      4: { halign: 'right', cellWidth: 36, textColor: [15, 23, 42], fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
  });

  // ── 5. CALCUL DE POSITION APRÈS TABLEAU & GESTION SAUTS DE PAGE ──
  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let currentY = afterTable + 6;

  // Si l'espace restant est inférieur à 65 mm, on crée une nouvelle page propre
  if (currentY + 65 > pageHeight - 22) {
    doc.addPage();
    currentY = 20;
  }

  // ── 6. CODE QR MINIATURE CERTIFIÉ & CARTOUCHE DES TOTAUX ──
  const leftColWidth = 96;
  const rightColWidth = contentWidth - leftColWidth - 6;
  const totalsBoxX = margin + leftColWidth + 6;

  // BLOC GAUCHE : QR Code Miniature (20x20 mm) & Mentions d'authenticité
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, leftColWidth, 34, 2, 2, 'FD');

  // Génération du QR Code miniature
  const shortCode = sale.receiptCode || sale.id.slice(0, 8).toUpperCase();
  const publicReceiptUrl = `https://wilinwi.nexus-partners.xyz/r/${shortCode}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(publicReceiptUrl, {
      margin: 1,
      width: 120,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    // QR Code compact : 20mm x 20mm
    const qrSize = 20;
    const qrX = margin + 4;
    const qrY = currentY + 4;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1, 1, 'FD');
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Textes d'accompagnement du QR
    const textStartX = qrX + qrSize + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('AUTHENTICITÉ & REÇU NUMÉRIQUE', textStartX, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Scannez ce code pour vérifier', textStartX, currentY + 12);
    doc.text('l\'authenticité de la facture en ligne.', textStartX, currentY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 118, 110);
    doc.text(`wilinwi.com/r/${shortCode}`, textStartX, currentY + 21);
  } catch {
    // Si la génération de QR échoue
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('VÉRIFICATION EN LIGNE', margin + 4, currentY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Consultez votre facture sur : wilinwi.com/r/${shortCode}`, margin + 4, currentY + 18);
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Facture délivrée conforme aux règles de caisse • Merci de votre confiance !', margin + 4, currentY + 30);

  // BLOC DROIT : Cartouche des Totaux
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsBoxX, currentY, rightColWidth, 34, 2, 2, 'FD');

  // Ligne 1 : Sous-total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sous-total HT :', totalsBoxX + 4, currentY + 6.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(fcfa(sale.total), pageWidth - margin - 4, currentY + 6.5, { align: 'right' });

  // Ligne 2 : TVA
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TVA (Taux légal) :', totalsBoxX + 4, currentY + 12.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('0% / Exonérée', pageWidth - margin - 4, currentY + 12.5, { align: 'right' });

  // Séparateur fin
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsBoxX + 4, currentY + 15.5, pageWidth - margin - 4, currentY + 15.5);

  // Ligne 3 : Grand Total Net TTC (Bandeau d'accentuation)
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.roundedRect(totalsBoxX + 2, currentY + 17, rightColWidth - 4, 8.5, 1.2, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 118, 110); // Teal 700
  doc.text('TOTAL NET TTC :', totalsBoxX + 4, currentY + 22.5);
  doc.setFontSize(10.5);
  doc.text(fcfa(sale.total), pageWidth - margin - 4, currentY + 22.5, { align: 'right' });

  // Ligne 4 : Montant Versé & Solde
  const reste = Math.max(0, sale.total - (sale.montantVerse || 0));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (reste > 0) {
    doc.setTextColor(15, 23, 42);
    doc.text(`Versé : ${fcfa(sale.montantVerse)}`, totalsBoxX + 4, currentY + 30);
    doc.setTextColor(190, 18, 60); // Rose 700
    doc.setFont('helvetica', 'bold');
    doc.text(`Reste dû : ${fcfa(reste)}`, pageWidth - margin - 4, currentY + 30, { align: 'right' });
  } else {
    doc.setTextColor(4, 120, 87); // Emerald 700
    doc.setFont('helvetica', 'bold');
    doc.text(`Payé intégralement : ${fcfa(sale.montantVerse)}`, totalsBoxX + 4, currentY + 30);
    if (sale.montantVerse > sale.total) {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Monnaie : ${fcfa(sale.montantVerse - sale.total)}`, pageWidth - margin - 4, currentY + 30, {
        align: 'right',
      });
    }
  }

  // ── 7. BLOC OFFICIEL CACHET & SIGNATURE COMMERCIALE ──
  let signY = currentY + 38;

  if (signY + 24 > pageHeight - 20) {
    doc.addPage();
    signY = 20;
  }

  const signBoxWidth = (contentWidth - 6) / 2;

  // Cadre Émetteur
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, signY, signBoxWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('POUR L\'ÉTABLISSEMENT VENDEUR', margin + 3.5, signY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Cachet commercial et visa du caissier :', margin + 3.5, signY + 9.5);

  // Cadre Client
  const signRightX = margin + signBoxWidth + 6;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(signRightX, signY, signBoxWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('RÉCEPTION & ACCORD CLIENT', signRightX + 3.5, signY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Signature du client :', signRightX + 3.5, signY + 9.5);

  // ── 8. PIED DE PAGE & PAGINATION DYNAMIQUE SUR TOUTES LES PAGES ──
  const totalPages = doc.getNumberOfPages();
  const generationTimestamp = `${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Ligne fine séparatrice
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    // Mentions légales & traçabilité
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Facture certifiée Wilinwi ERP • Vente traçable en ligne • Émise le ${generationTimestamp}`,
      margin,
      pageHeight - 8.5,
    );

    // Pagination
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Page ${i} / ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8.5,
      { align: 'right' },
    );
  }

  // Sauvegarde et téléchargement immédiat
  doc.save(`facture-${invoiceNumber}.pdf`);
}

/**
 * Dessine un monogramme stylisé lorsque le logo PNG n'est pas fourni.
 */
function drawBrandMonogram(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  name: string,
) {
  doc.setFillColor(15, 118, 110); // Teal 700
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'F');

  const initial = (name && name.length > 0 ? name[0] : 'W').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(initial, x + w / 2, y + h / 2 + 1.5, { align: 'center' });
}
