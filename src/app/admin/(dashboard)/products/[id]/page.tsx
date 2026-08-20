import Link from 'next/link';
import { AdminProductForm } from '@/components/admin-product-form';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <header className="mb-6">
        <Link href="/admin/products" className="text-xs" style={{ color: 'var(--admin-accent)' }}>
          ← Products
        </Link>
        <h1 className="mt-2 text-2xl">Edit product</h1>
      </header>
      <AdminProductForm productId={id} />
    </>
  );
}
