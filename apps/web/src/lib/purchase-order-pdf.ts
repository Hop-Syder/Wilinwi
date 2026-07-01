/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Génération client-side de la facture PDF d'un bon de commande
 *   fournisseur (jsPDF + autotable). Téléchargée sous `bon-commande-<ref>.pdf`.
 * @created 2026-07-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseOrderDto } from '@wilinwi/types';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ORDERED: 'Commandé',
  PARTIAL: 'Réception partielle',
  RECEIVED: 'Reçu entièrement',
  CANCELLED: 'Annulé',
};

/** FCFA avec espaces classiques : les espaces fines de `toLocaleString` sortent
 *  en caractères illisibles avec les polices de base de jsPDF. */
function fcfa(n: number): string {
  return `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

/** Charge le logo en dataURL (null si indisponible — le PDF reste généré). */
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

/** Génère et télécharge la facture PDF (A4) du bon de commande. */
export async function generatePurchaseOrderPdf(
  order: PurchaseOrderDto,
  entrepriseNom: string,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // En-tête : logo + nom de l'entreprise sur la même ligne.
  const logo = await loadLogo();
  let headerX = margin;
  if (logo) {
    doc.addImage(logo, 'PNG', margin, 10, 14, 14);
    headerX = margin + 18;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 5, 234); // bleu Wilinwi
  doc.text(entrepriseNom, headerX, 19);

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('BON DE COMMANDE', pageWidth - margin, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(order.reference, pageWidth - margin, 21, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 28, pageWidth - margin, 28);

  // Bloc infos (gauche) / fournisseur (droite).
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('INFORMATIONS', margin, 36);
  doc.text('FOURNISSEUR', pageWidth / 2 + 6, 36);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  const infos = [
    `Date : ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`,
    `Statut : ${STATUS_LABELS[order.statut] ?? order.statut}`,
    `Destination : ${order.etablissementNom ?? 'Toutes'}`,
  ];
  infos.forEach((line, i) => doc.text(line, margin, 42 + i * 5.5));
  doc.setFont('helvetica', 'bold');
  doc.text(order.fournisseurNom ?? '—', pageWidth / 2 + 6, 42);
  doc.setFont('helvetica', 'normal');

  // Tableau des lignes de commande.
  autoTable(doc, {
    startY: 62,
    margin: { left: margin, right: margin },
    head: [['Produit', 'Quantité', 'Prix unitaire', 'Total']],
    body: order.items.map((it) => [
      it.productNom,
      String(it.quantiteCommandee),
      fcfa(it.prixUnitaire),
      fcfa(it.quantiteCommandee * it.prixUnitaire),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [0, 5, 234], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Totaux sous le tableau, alignés à droite.
  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y = afterTable + 8;
  const totals: Array<[string, string, boolean]> = [
    ['Total TTC', fcfa(order.montantTotal), true],
    ['Déjà payé', fcfa(order.montantPaye), false],
    ['Reste à payer', fcfa(Math.max(0, order.montantTotal - order.montantPaye)), false],
  ];
  doc.setFontSize(10);
  for (const [label, value, strong] of totals) {
    doc.setFont('helvetica', strong ? 'bold' : 'normal');
    doc.setTextColor(strong ? 0 : 100, strong ? 5 : 116, strong ? 234 : 139);
    doc.text(label, pageWidth - margin - 60, y);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 6;
  }

  // Notes éventuelles.
  if (order.notes) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Notes :', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const lines = doc.splitTextToSize(order.notes, pageWidth - margin * 2);
    doc.text(lines, margin, y + 5);
  }

  // Pied de page.
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Généré par Wilinwi — ${new Date().toLocaleString('fr-FR')}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' },
  );

  doc.save(`bon-commande-${order.reference}.pdf`);
}
