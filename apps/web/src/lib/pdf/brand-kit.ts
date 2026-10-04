/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Kit de marque partagé des documents PDF Wilinwi (jsPDF) : palette de la
 *   charte, chargement du logo AVEC son ratio réel (plus de logo écrasé), en-tête,
 *   cartouches à hauteur dynamique, bloc de totaux, mention du montant en lettres et
 *   pied de page « Propulsé par Wilinwi » paginé. Toute facture / bon / reçu PDF doit
 *   passer par ces briques pour rester cohérent.
 * @created 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { jsPDF } from 'jspdf';
import { fcfaInWords } from '@wilinwi/types';

// ─────────────────────────── Palette (charte Wilinwi) ───────────────────────────

export type Rgb = [number, number, number];

export const BRAND = {
  /** Bleu nuit du logotype « Wilinwi » — titres et en-têtes de tableau. */
  navy: [0, 29, 90] as Rgb,
  /** Bleu de marque #0005ea — références, accents. */
  blue: [0, 5, 234] as Rgb,
  /** Vert #00A86B — payé / soldé. */
  green: [0, 168, 107] as Rgb,
  /** Orange #F59E0B — reste dû, en attente. */
  orange: [245, 158, 11] as Rgb,
  red: [190, 18, 60] as Rgb,
  ink: [15, 23, 42] as Rgb,
  text: [51, 65, 85] as Rgb,
  muted: [100, 116, 139] as Rgb,
  faint: [148, 163, 184] as Rgb,
  line: [226, 232, 240] as Rgb,
  panel: [246, 248, 252] as Rgb,
  white: [255, 255, 255] as Rgb,
};

export const PAGE = {
  margin: 15,
  footerHeight: 16,
  /** Haut de contenu des pages de suite (sous le rappel du document). */
  continuationTop: 22,
};

// ─────────────────────────────── Logo & images ───────────────────────────────

export interface PdfImage {
  data: Uint8Array;
  /** Ratio largeur / hauteur réel — garantit un logo jamais déformé. */
  ratio: number;
  alias: string;
}

export interface BrandAssets {
  /** Logo horizontal complet (symbole + « Wilinwi » + signature). */
  logo: PdfImage | null;
  /** Symbole seul (le « W » flèche) — pied de page. */
  mark: PdfImage | null;
}

/** Dimensions d'un PNG lues dans son en-tête IHDR (octets 16–23). */
function pngRatio(bytes: Uint8Array): number | null {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPng || bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const w = view.getUint32(16);
  const h = view.getUint32(20);
  return w > 0 && h > 0 ? w / h : null;
}

async function loadPng(url: string, alias: string): Promise<PdfImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = new Uint8Array(await res.arrayBuffer());
    const ratio = pngRatio(data);
    return ratio ? { data, ratio, alias } : null;
  } catch {
    return null;
  }
}

let assetsPromise: Promise<BrandAssets> | null = null;

/** Logos optimisés pour l'impression (recadrés, ~30 Ko au total), mis en cache. */
export function loadBrandAssets(): Promise<BrandAssets> {
  assetsPromise ??= Promise.all([
    loadPng('/brand/wilinwi-logo-print.png', 'wilinwi-logo'),
    loadPng('/brand/wilinwi-mark-print.png', 'wilinwi-mark'),
  ]).then(([logo, mark]) => ({ logo, mark }));
  return assetsPromise;
}

/** Dessine une image à hauteur fixe en respectant son ratio. Retourne la largeur. */
export function drawImageByHeight(doc: jsPDF, img: PdfImage, x: number, y: number, h: number): number {
  const w = h * img.ratio;
  doc.addImage(img.data, 'PNG', x, y, w, h, img.alias, 'FAST');
  return w;
}

// ─────────────────────────────── Texte & format ───────────────────────────────

/** Montant FCFA avec espaces simples (les polices PDF standard ignorent U+202F). */
export function fcfa(n: number): string {
  const rounded = Math.round(n || 0);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

/** Quantité FR : 2 · 0,25 · 1,15 (3 décimales max, sans zéros inutiles). */
export function formatQty(q: number): string {
  const s = Number(q.toFixed(3)).toString();
  const [int, dec] = s.split('.');
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec ? `${grouped},${dec}` : grouped;
}

export function formatDateLong(date: string | Date): string {
  const d = new Date(date);
  const day = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return pdfSafe(`${day} à ${time}`);
}

// Caractères hors Latin-1 que les polices standard (WinAnsi) savent quand même rendre.
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

/**
 * Rend un texte affichable par les polices PDF standard : espaces insécables →
 * espace, guillemets/apostrophes typographiques conservés, emoji et symboles
 * inconnus retirés (sinon jsPDF imprime des caractères parasites).
 */
export function pdfSafe(text: string | null | undefined): string {
  if (!text) return '';
  return Array.from(text.replace(/[\u00a0\u202f\u2009]/g, ' '))
    .filter((c) => c.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.has(c))
    .join('')
    .trim();
}

function setText(doc: jsPDF, color: Rgb, size: number, style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal') {
  doc.setTextColor(...color);
  doc.setFontSize(size);
  doc.setFont('helvetica', style);
}

// ─────────────────────────────── En-tête ───────────────────────────────

export interface HeaderOptions {
  title: string;
  reference: string;
  dateLine: string;
  /** Identité de l'émetteur (boutique / entreprise). */
  issuerName: string;
  issuerLines?: (string | null | undefined)[];
  badge?: { label: string; color: Rgb } | null;
}

/** Liseré tricolore du logo (bleu · orange · vert) en haut de page. */
function drawBrandStrip(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = 1.8;
  doc.setFillColor(...BRAND.blue);
  doc.rect(0, 0, w * 0.5, h, 'F');
  doc.setFillColor(...BRAND.orange);
  doc.rect(w * 0.5, 0, w * 0.25, h, 'F');
  doc.setFillColor(...BRAND.green);
  doc.rect(w * 0.75, 0, w * 0.25, h, 'F');
}

/** Pastille de statut (PAYÉE, COMMANDÉ…) alignée à droite. Retourne sa hauteur. */
export function drawBadge(doc: jsPDF, label: string, color: Rgb, rightX: number, y: number): number {
  // Texte assombri : lisible même pour l'orange/vert clairs de la charte.
  setText(doc, color.map((c) => Math.round(c * 0.7)) as Rgb, 7.5, 'bold');
  const w = doc.getTextWidth(label) + 7;
  const h = 5.6;
  doc.setFillColor(...color.map((c) => Math.round(c + (255 - c) * 0.88)) as Rgb);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.25);
  doc.roundedRect(rightX - w, y, w, h, 2.8, 2.8, 'FD');
  doc.text(label, rightX - w / 2, y + 3.85, { align: 'center' });
  return h;
}

/**
 * En-tête officiel : logo Wilinwi (ratio réel, 46 mm) + identité de l'émetteur à
 * gauche ; titre, référence, date et statut à droite. Retourne le Y de départ du contenu.
 */
export function drawDocumentHeader(doc: jsPDF, assets: BrandAssets, opts: HeaderOptions): number {
  const pageW = doc.internal.pageSize.getWidth();
  const m = PAGE.margin;
  const right = pageW - m;
  drawBrandStrip(doc);

  // ── Gauche : logo Wilinwi lisible, puis l'émetteur.
  const top = 11;
  let leftY: number;
  if (assets.logo) {
    drawImageByHeight(doc, assets.logo, m, top, 14);
    leftY = top + 14 + 6;
  } else {
    setText(doc, BRAND.navy, 22, 'bold');
    doc.text('Wilinwi', m, top + 9);
    leftY = top + 16;
  }

  const leftW = 100;
  setText(doc, BRAND.ink, 12.5, 'bold');
  const nameLines = doc.splitTextToSize(pdfSafe(opts.issuerName) || 'Wilinwi', leftW) as string[];
  doc.text(nameLines, m, leftY);
  leftY += nameLines.length * 5.2;
  setText(doc, BRAND.muted, 8.5);
  for (const line of opts.issuerLines ?? []) {
    const safe = pdfSafe(line);
    if (!safe) continue;
    const wrapped = doc.splitTextToSize(safe, leftW) as string[];
    doc.text(wrapped, m, leftY);
    leftY += wrapped.length * 4;
  }

  // ── Droite : nature du document, n°, date, statut.
  let rightY = top + 7;
  setText(doc, BRAND.navy, 19, 'bold');
  doc.text(opts.title, right, rightY, { align: 'right' });
  rightY += 7;
  setText(doc, BRAND.blue, 10.5, 'bold');
  doc.text(pdfSafe(opts.reference), right, rightY, { align: 'right' });
  rightY += 5.2;
  setText(doc, BRAND.muted, 8.5);
  doc.text(opts.dateLine, right, rightY, { align: 'right' });
  rightY += 3;
  if (opts.badge) {
    rightY += 2;
    rightY += drawBadge(doc, opts.badge.label, opts.badge.color, right, rightY);
  }

  const bottom = Math.max(leftY, rightY) + 3;
  doc.setDrawColor(...BRAND.line);
  doc.setLineWidth(0.35);
  doc.line(m, bottom, right, bottom);
  return bottom + 6;
}

// ─────────────────────────────── Cartouches ───────────────────────────────

export interface CardRow {
  label: string;
  value: string | null | undefined;
  color?: Rgb;
  bold?: boolean;
}

export interface CardSpec {
  title: string;
  /** Ligne mise en avant (nom du client, du fournisseur…). */
  headline?: string | null;
  rows: CardRow[];
}

const CARD_PAD = 4;
const LABEL_W = 25;

function cardLayout(doc: jsPDF, spec: CardSpec, w: number) {
  const valueW = w - CARD_PAD * 2 - LABEL_W;
  setText(doc, BRAND.ink, 10.5, 'bold');
  const headline = spec.headline ? (doc.splitTextToSize(pdfSafe(spec.headline), w - CARD_PAD * 2) as string[]) : [];
  setText(doc, BRAND.ink, 8.5, 'bold');
  const rows = spec.rows
    .filter((r) => pdfSafe(r.value))
    .map((r) => ({ ...r, lines: doc.splitTextToSize(pdfSafe(r.value), valueW) as string[] }));
  const height = 10 + headline.length * 5 + rows.reduce((h, r) => h + r.lines.length * 4 + 1.6, 0) + 2;
  return { headline, rows, height };
}

/** Hauteur qu'occuperait le cartouche (pour aligner deux cartouches côte à côte). */
export function measureCard(doc: jsPDF, spec: CardSpec, w: number): number {
  return cardLayout(doc, spec, w).height;
}

export function drawCard(doc: jsPDF, spec: CardSpec, x: number, y: number, w: number, h?: number) {
  const layout = cardLayout(doc, spec, w);
  const height = Math.max(h ?? 0, layout.height);
  doc.setFillColor(...BRAND.panel);
  doc.setDrawColor(...BRAND.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, height, 2, 2, 'FD');
  // Filet d'accent bleu à gauche du titre.
  doc.setFillColor(...BRAND.blue);
  doc.rect(x + CARD_PAD, y + 3.4, 0.9, 3.4, 'F');
  setText(doc, BRAND.navy, 7.5, 'bold');
  doc.text(spec.title.toUpperCase(), x + CARD_PAD + 2.4, y + 6.2);

  let cy = y + 12;
  if (layout.headline.length) {
    setText(doc, BRAND.ink, 10.5, 'bold');
    doc.text(layout.headline, x + CARD_PAD, cy);
    cy += layout.headline.length * 5;
  }
  for (const row of layout.rows) {
    setText(doc, BRAND.muted, 8);
    doc.text(row.label, x + CARD_PAD, cy);
    setText(doc, row.color ?? BRAND.ink, 8.5, row.bold === false ? 'normal' : 'bold');
    doc.text(row.lines, x + CARD_PAD + LABEL_W, cy);
    cy += row.lines.length * 4 + 1.6;
  }
}

/** Deux cartouches côte à côte, de même hauteur. Retourne le Y sous les cartouches. */
export function drawCardPair(doc: jsPDF, left: CardSpec, right: CardSpec, y: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const gap = 6;
  const w = (pageW - PAGE.margin * 2 - gap) / 2;
  const h = Math.max(measureCard(doc, left, w), measureCard(doc, right, w));
  drawCard(doc, left, PAGE.margin, y, w, h);
  drawCard(doc, right, PAGE.margin + w + gap, y, w, h);
  return y + h + 6;
}

// ─────────────────────────────── Tableau ───────────────────────────────

/** Styles autotable de la marque : en-tête bleu nuit, lignes fines, zébrage léger. */
export const TABLE_STYLES = {
  theme: 'plain' as const,
  headStyles: {
    fillColor: BRAND.navy,
    textColor: BRAND.white,
    fontSize: 7.8,
    fontStyle: 'bold' as const,
    cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
  },
  styles: {
    font: 'helvetica',
    fontSize: 8.8,
    textColor: BRAND.text,
    cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    lineColor: BRAND.line,
    lineWidth: { bottom: 0.25 },
    valign: 'middle' as const,
  },
  alternateRowStyles: { fillColor: BRAND.panel },
};

export function lastTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

/** Saut de page si `needed` mm ne tiennent plus avant le pied de page. */
export function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed <= pageH - PAGE.footerHeight - 4) return y;
  doc.addPage();
  return PAGE.continuationTop;
}

// ─────────────────────────────── Totaux ───────────────────────────────

export interface TotalRow {
  label: string;
  value: string;
  color?: Rgb;
  bold?: boolean;
}

/**
 * Bloc des totaux aligné à droite : lignes de détail puis bandeau « grand total »
 * bleu nuit. Retourne le Y sous le bloc.
 */
export function drawTotals(
  doc: jsPDF,
  y: number,
  opts: { width: number; rows: TotalRow[]; grandLabel: string; grandValue: string; footRows?: TotalRow[] },
): number {
  const right = doc.internal.pageSize.getWidth() - PAGE.margin;
  const x = right - opts.width;
  let cy = y + 4.5;
  for (const r of opts.rows) {
    setText(doc, BRAND.muted, 8.5);
    doc.text(r.label, x + 3, cy);
    setText(doc, r.color ?? BRAND.ink, 8.8, r.bold ? 'bold' : 'normal');
    doc.text(r.value, right - 3, cy, { align: 'right' });
    cy += 5.6;
  }
  // Bandeau grand total.
  const bandH = 10;
  doc.setFillColor(...BRAND.navy);
  doc.roundedRect(x, cy - 2.5, opts.width, bandH, 1.6, 1.6, 'F');
  setText(doc, BRAND.white, 9, 'bold');
  doc.text(opts.grandLabel, x + 3.5, cy + 3.8);
  setText(doc, BRAND.white, 12, 'bold');
  doc.text(opts.grandValue, right - 3.5, cy + 4, { align: 'right' });
  cy += bandH + 3.5;
  for (const r of opts.footRows ?? []) {
    setText(doc, BRAND.muted, 8.5);
    doc.text(r.label, x + 3, cy);
    setText(doc, r.color ?? BRAND.ink, 9, r.bold === false ? 'normal' : 'bold');
    doc.text(r.value, right - 3, cy, { align: 'right' });
    cy += 5.6;
  }
  return cy;
}

/**
 * Mention légale « Arrêté(e) … à la somme de : <montant en lettres> »
 * (usage OHADA / Afrique francophone). Retourne le Y sous la mention.
 */
export function drawAmountInWords(doc: jsPDF, y: number, lead: string, amount: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const w = pageW - PAGE.margin * 2;
  const words = fcfaInWords(amount);
  const sentence = `${lead} ${words.charAt(0).toUpperCase()}${words.slice(1)} (${fcfa(amount)}).`;
  setText(doc, BRAND.text, 8.5, 'italic');
  const lines = doc.splitTextToSize(sentence, w - 8) as string[];
  const h = lines.length * 4.2 + 5;
  doc.setFillColor(...BRAND.panel);
  doc.roundedRect(PAGE.margin, y, w, h, 1.6, 1.6, 'F');
  doc.setFillColor(...BRAND.orange);
  doc.rect(PAGE.margin, y, 1, h, 'F');
  doc.text(lines, PAGE.margin + 4, y + 5.4);
  return y + h + 6;
}

// ─────────────────────────────── Signatures ───────────────────────────────

export function drawSignatureBoxes(
  doc: jsPDF,
  y: number,
  left: { title: string; hint: string; foot?: string },
  right: { title: string; hint: string; foot?: string },
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const gap = 6;
  const w = (pageW - PAGE.margin * 2 - gap) / 2;
  const h = 26;
  for (const [i, box] of [left, right].entries()) {
    const x = PAGE.margin + i * (w + gap);
    doc.setDrawColor(...BRAND.faint);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1.2, 1], 0);
    doc.roundedRect(x, y, w, h, 1.6, 1.6, 'S');
    doc.setLineDashPattern([], 0);
    setText(doc, BRAND.navy, 7.5, 'bold');
    doc.text(box.title.toUpperCase(), x + 4, y + 5.5);
    setText(doc, BRAND.faint, 7.2, 'italic');
    doc.text(box.hint, x + 4, y + 9.8);
    if (box.foot) {
      setText(doc, BRAND.muted, 7.2);
      doc.text(box.foot, x + 4, y + h - 3.5);
    }
  }
  return y + h + 4;
}

// ─────────────────────────────── Pied de page ───────────────────────────────

/**
 * Habillage de TOUTES les pages, à appeler juste avant `doc.save()` :
 * - pages de suite : liseré + rappel du document (« FACTURE N° … · suite ») ;
 * - pied de page : symbole Wilinwi, signature, traçabilité et pagination.
 */
export function drawFooters(doc: jsPDF, assets: BrandAssets, note: string, continuation?: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = PAGE.margin;
  const total = doc.getNumberOfPages();
  const generated = formatDateLong(new Date());
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i > 1 && continuation) {
      drawBrandStrip(doc);
      setText(doc, BRAND.navy, 8, 'bold');
      doc.text(pdfSafe(continuation), pageW - m, 10, { align: 'right' });
      setText(doc, BRAND.faint, 7.5, 'italic');
      doc.text('suite', pageW - m, 14, { align: 'right' });
      if (assets.logo) drawImageByHeight(doc, assets.logo, m, 6.5, 8);
    }
    const lineY = pageH - PAGE.footerHeight + 2;
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.3);
    doc.line(m, lineY, pageW - m, lineY);

    let textX = m;
    if (assets.mark) {
      textX += drawImageByHeight(doc, assets.mark, m, lineY + 2.6, 6) + 2.5;
    }
    setText(doc, BRAND.navy, 7.5, 'bold');
    doc.text('Propulsé par Wilinwi', textX, lineY + 5.3);
    setText(doc, BRAND.faint, 6.8);
    doc.text(`${pdfSafe(note)} · Généré le ${generated}`, textX, lineY + 8.8);

    setText(doc, BRAND.muted, 7.5, 'bold');
    doc.text(`Page ${i} / ${total}`, pageW - m, lineY + 5.3, { align: 'right' });
  }
}
