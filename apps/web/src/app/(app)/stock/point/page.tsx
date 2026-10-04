/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page dédiée Point de Stock & Récolement (Accès mobile plein écran)
 * @created 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */

'use client';

import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';
import { useAuth } from '@/lib/auth-context';
import type { ProductDto } from '@wilinwi/types';
import { PointDeStockModal } from '@/components/stock/point-de-stock-modal';
import { Preloader } from '@/components/preloader';

export default function PointDeStockPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canReadStock =
    user?.role === 'OWNER' ||
    user?.role === 'MANAGER' ||
    user?.role === 'SELLER' ||
    (user?.modules?.includes('STOCK') ?? false);

  const { data, refetch, loading } = useCachedQuery<ProductDto[]>(
    canReadStock ? 'stock/products-global' : null,
    () => apiGet<ProductDto[]>('/api/stock/products?global=true'),
  );

  const products = data ?? [];

  if (loading && products.length === 0) {
    return <Preloader />;
  }

  return (
    <PointDeStockModal
      isOpen={true}
      onClose={() => router.push('/stock')}
      products={products}
      onStockUpdated={() => void refetch()}
    />
  );
}
