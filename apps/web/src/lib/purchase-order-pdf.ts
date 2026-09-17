/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Générateur PDF exécutif pour les Bons de Commande Fournisseurs (jsPDF + autotable).
 *   Design System : Trust & Authority / Enterprise B2B.
 *   Comprend :
 *     - Bandeau d'accent et en-tête institutionnel avec logo ou monogramme corporate
 *     - Badge de statut dynamique avec palette harmonieuse
 *     - Cartouches d'informations émetteur / livraison et fournisseur
 *     - Tableau des articles haute lisibilité avec zébrures douces et alignements stricts
 *     - Récapitulatif financier complet (Total TTC, Acomptes, Reste à payer)
 *     - Bloc officiel de double signature (Acheteur & Fournisseur) avec mentions d'accord
 *     - Pied de page contractuel avec pagination dynamique multi-pages
 * @created 2026-07-01
 * @updated 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseOrderDto } from '@wilinwi/types';

interface StatusStyle {
  label: string;
  bg: [number, number, number];
  border: [number, number, number];
  text: [number, number, number];
}

const STATUS_CONFIG: Record<string, StatusStyle> = {
  DRAFT: {
    label: 'BROUILLON',
    bg: [241, 245, 249],
    border: [203, 213, 225],
    text: [71, 85, 105],
  },
  ORDERED: {
    label: 'COMMANDÉ',
    bg: [240, 249, 255],
    border: [186, 230, 253],
    text: [3, 105, 161],
  },
  PARTIAL: {
    label: 'RÉCEPTION PARTIELLE',
    bg: [254, 243, 199],
    border: [253, 230, 138],
    text: [180, 83, 9],
  },
  RECEIVED: {
    label: 'REÇU TOTAL',
    bg: [236, 253, 245],
    border: [167, 243, 208],
    text: [4, 120, 87],
  },
  CANCELLED: {
    label: 'ANNULÉ',
    bg: [255, 241, 242],
    border: [254, 205, 211],
    text: [190, 18, 60],
  },
};

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
 * Génère et télécharge le Bon de Commande officiel au format PDF (A4).
 */
export async function generatePurchaseOrderPdf(
  order: PurchaseOrderDto,
  entrepriseNom: string,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ── 1. BANDEAU SUPÉRIEUR ACCENT & ESTHÉTIQUE CORPORATE ──
  // Liseré haut Deep Teal / Navy
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
      // Fallback au monogramme si l'image est corrompue
      drawBrandMonogram(doc, margin, 10, 15, 15, entrepriseNom);
    }
  } else {
    // Monogramme stylisé par défaut
    drawBrandMonogram(doc, margin, 10, 15, 15, entrepriseNom);
  }

  // Nom de l'entreprise émettrice
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(entrepriseNom || 'Wilinwi', brandX, 17);

  // Sous-titre légal / pôle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('DÉPARTEMENT ACHATS & APPROVISIONNEMENT', brandX, 22.5);

  // Côté droit : Titre du document & Référence
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 118, 110); // Teal 700
  doc.text('BON DE COMMANDE', pageWidth - margin, 16.5, { align: 'right' });

  // Badge Référence
  const refText = `RÉF : #${order.reference}`;
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

  // Badge Statut
  const statusConf = STATUS_CONFIG[order.statut] ?? STATUS_CONFIG.ORDERED;
  const statusWidth = 38;
  const statusX = pageWidth - margin - statusWidth;
  const statusY = 28.5;

  doc.setFillColor(...statusConf.bg);
  doc.setDrawColor(...statusConf.border);
  doc.roundedRect(statusX, statusY, statusWidth, 6, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...statusConf.text);
  doc.text(statusConf.label, statusX + statusWidth / 2, statusY + 4.2, { align: 'center' });

  // Ligne de séparation élégante
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.line(margin, 38, pageWidth - margin, 38);

  // ── 3. CARTOUCHES D'INFORMATIONS ÉMETTEUR / LIVRAISON & FOURNISSEUR ──
  const boxY = 42;
  const boxWidth = (contentWidth - 6) / 2;
  const boxHeight = 28;

  // Cartouche Gauche : Destination / Émetteur
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  // En-tête bandeau interne
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, boxY, boxWidth, 6.5, 2, 2, 'F');
  doc.rect(margin, boxY + 4, boxWidth, 2.5, 'F'); // Raccord rectangulaire bas

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('LIVRAISON & DESTINATION', margin + 3.5, boxY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Établissement :', margin + 3.5, boxY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(order.etablissementNom || 'Toutes les boutiques (Stock central)', margin + 28, boxY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Date d\'émission :', margin + 3.5, boxY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const formattedDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(formattedDate, margin + 28, boxY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Procédure :', margin + 3.5, boxY + 24);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Réception avec contrôle contradictoire', margin + 28, boxY + 24);

  // Cartouche Droit : Fournisseur
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
  doc.text('FOURNISSEUR ADJUGÉ', rightBoxX + 3.5, boxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(order.fournisseurNom || 'Fournisseur Agréé', rightBoxX + 3.5, boxY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Statut compte :', rightBoxX + 3.5, boxY + 19);
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.text('Fournisseur Référencé', rightBoxX + 28, boxY + 19);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Identifiant :', rightBoxX + 3.5, boxY + 24);
  doc.setFont('helvetica', 'mono');
  doc.setTextColor(71, 85, 105);
  const supplierRef = order.fournisseurId ? `FRN-${order.fournisseurId.slice(-6).toUpperCase()}` : 'FRN-DIR';
  doc.text(supplierRef, rightBoxX + 28, boxY + 24);

  // ── 4. TABLEAU DES ARTICLES COMMANDÉS (AUTOTABLE) ──
  autoTable(doc, {
    startY: 74,
    margin: { left: margin, right: margin, bottom: 25 },
    head: [['N°', 'DÉSIGNATION DES ARTICLES', 'QTÉ CMD.', 'PRIX UNITAIRE', 'MONTANT TOTAL']],
    body: order.items.map((it, idx) => [
      String(idx + 1).padStart(2, '0'),
      it.productNom,
      String(it.quantiteCommandee),
      fcfa(it.prixUnitaire),
      fcfa(it.quantiteCommandee * it.prixUnitaire),
    ]),
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
      2: { halign: 'right', cellWidth: 22, textColor: [15, 23, 42] },
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

  // ── 6. RÉCAPITULATIF FINANCIER & NOTES DE COMMANDE ──
  const leftColWidth = 96;
  const rightColWidth = contentWidth - leftColWidth - 6;
  const totalsBoxX = margin + leftColWidth + 6;

  // BLOC GAUCHE : Notes & Mentions légales
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, leftColWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CONDITIONS & INSTRUCTIONS DE LIVRAISON', margin + 3.5, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  if (order.notes && order.notes.trim().length > 0) {
    const splitNotes = doc.splitTextToSize(order.notes.trim(), leftColWidth - 8);
    doc.setTextColor(30, 41, 59);
    doc.text(splitNotes.slice(0, 3), margin + 3.5, currentY + 11.5);
  } else {
    doc.text('• Les marchandises voyagent aux risques et périls du transporteur.', margin + 3.5, currentY + 11);
    doc.text('• La facture finale doit obligatoirement mentionner ce numéro de bon.', margin + 3.5, currentY + 16);
    doc.text('• Tout litige ou écart de livraison fera l\'objet d\'un procès-verbal.', margin + 3.5, currentY + 21);
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Devise officielle : Franc CFA (XOF) • Paiement après réception conforme.', margin + 3.5, currentY + 29.5);

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
  doc.text(fcfa(order.montantTotal), pageWidth - margin - 4, currentY + 6.5, { align: 'right' });

  // Ligne 2 : TVA / Taxes
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TVA / Taxes :', totalsBoxX + 4, currentY + 12.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Incluses (0%)', pageWidth - margin - 4, currentY + 12.5, { align: 'right' });

  // Séparateur fin
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsBoxX + 4, currentY + 15.5, pageWidth - margin - 4, currentY + 15.5);

  // Ligne 3 : Grand Total TTC (Bandeau d'accentuation)
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.roundedRect(totalsBoxX + 2, currentY + 17, rightColWidth - 4, 8.5, 1.2, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 118, 110); // Teal 700
  doc.text('TOTAL COMMANDE :', totalsBoxX + 4, currentY + 22.5);
  doc.setFontSize(10.5);
  doc.text(fcfa(order.montantTotal), pageWidth - margin - 4, currentY + 22.5, { align: 'right' });

  // Ligne 4 : Acompte & Reste à payer
  const resteAPayer = Math.max(0, order.montantTotal - (order.montantPaye || 0));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (order.montantPaye && order.montantPaye > 0) {
    doc.setTextColor(4, 120, 87); // Emerald 700
    doc.text(`Acompte versé : ${fcfa(order.montantPaye)}`, totalsBoxX + 4, currentY + 30);
    doc.setTextColor(180, 83, 9); // Amber 700
    doc.text(`Reste dû : ${fcfa(resteAPayer)}`, pageWidth - margin - 4, currentY + 30, { align: 'right' });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text('Acompte : Aucun (Règlement à terme)', totalsBoxX + 4, currentY + 30);
  }

  // ── 7. CADRE DE DOUBLE SIGNATURE & CACHET OFFICIEL ──
  let signY = currentY + 38;

  if (signY + 26 > pageHeight - 20) {
    doc.addPage();
    signY = 20;
  }

  const signBoxWidth = (contentWidth - 6) / 2;

  // Cadre Signature Acheteur
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, signY, signBoxWidth, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('POUR LE DONNEUR D\'ORDRE (ACHETEUR)', margin + 3.5, signY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Signature autorisée et cachet de l\'établissement :', margin + 3.5, signY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, margin + 3.5, signY + 21);

  // Cadre Signature Fournisseur
  const signRightX = margin + signBoxWidth + 6;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(signRightX, signY, signBoxWidth, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('BON POUR ACCORD (FOURNISSEUR)', signRightX + 3.5, signY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Mention manuscrite "Bon pour accord" & date prévisionnelle :', signRightX + 3.5, signY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Date de livraison convenue : ____ / ____ / ________', signRightX + 3.5, signY + 21);

  // ── 8. PIED DE PAGE JURIDIQUE & PAGINATION DYNAMIQUE SUR TOUTES LES PAGES ──
  const totalPages = doc.getNumberOfPages();
  const generationTimestamp = `${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Ligne fine séparatrice de pied de page
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    // Mentions légales & traçabilité
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Document officiel généré électroniquement via Wilinwi ERP • Traçabilité système certifiée le ${generationTimestamp}`,
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
  doc.save(`bon-commande-${order.reference}.pdf`);
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
