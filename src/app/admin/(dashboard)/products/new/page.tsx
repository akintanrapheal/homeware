import Link from 'next/link';
import { AdminProductForm } from '@/components/admin-product-form';

export const dynamic = 'force-dynamic';

export default function NewProductPage() {
  return (
    <>
      <header className="mb-6">
        <Link href="/admin/products" className="text-xs" style={{ color: 'var(--admin-accent)' }}>
          ← Products
        </Link>
        <h1 className="mt-2 text-2xl">New product</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
          It goes live on the storefront as soon as you save.
        </p>
      </header>
      <AdminProductForm />
    </>
  );
}
