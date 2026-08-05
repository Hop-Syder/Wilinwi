import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReceiptPublicView } from '@/components/receipt-public-view';
import type { PublicReceiptData } from '@/components/receipt-client-actions';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Server Component (RSC) du reçu public (Route: /r/[code])
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function fetchReceiptData(code: string): Promise<PublicReceiptData | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/receipt/${encodeURIComponent(code)}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data: PublicReceiptData = await res.json();
    return data;
  } catch {
    return null;
  }
}

/** Génération dynamique des métadonnées SEO/OpenGraph */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const receipt = await fetchReceiptData(code);

  if (!receipt) {
    return {
      title: 'Reçu Introuvable — Wilinwi',
      description: "Le reçu demandé n'existe pas ou a expiré.",
    };
  }

  return {
    title: `Reçu ${receipt.code} — ${receipt.boutique}`,
    description: `Reçu d'achat original de ${receipt.total} FCFA chez ${receipt.boutique}.`,
    openGraph: {
      title: `Reçu ${receipt.code} — ${receipt.boutique}`,
      description: `Reçu de caisse certifié Wilinwi — ${receipt.total} FCFA`,
    },
  };
}

export default async function PublicReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ download?: string }>;
}) {
  const { code } = await params;
  const { download } = await searchParams;

  const receipt = await fetchReceiptData(code);

  if (!receipt) {
    notFound();
  }

  const autoPrint = download === 'true';

  return <ReceiptPublicView receipt={receipt} autoPrint={autoPrint} />;
}
