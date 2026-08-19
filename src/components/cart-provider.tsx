'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CartLine, Product } from '@/lib/types';

const STORAGE_KEY = 'mls_cart_v1';

interface CartContextValue {
  lines: CartLine[];
  /** Product records for the lines, hydrated from the API. */
  products: Product[];
  count: number;
  subtotal: number;
  ready: boolean;
  /**
   * True once the bag is safe to render a verdict on. `ready` alone only means
   * localStorage was read — prices arrive later, so a page that branches on
   * `ready` flashes "your bag is empty" on every reload before the fetch lands.
   */
  priced: boolean;
  isOpen: boolean;
  lastAdded: string | null;
  add: (slug: string, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => typeof l?.slug === 'string' && Number.isFinite(l?.quantity))
      .map((l) => ({ slug: l.slug as string, quantity: Math.max(1, Math.min(99, l.quantity)) }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  // Hydrate from localStorage after mount so server and client markup match.
  useEffect(() => {
    setLines(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  // Prices always come from the server — a tampered localStorage cannot
  // discount anything, and the checkout API re-prices independently.
  useEffect(() => {
    if (!ready) return;
    const slugs = lines.map((l) => l.slug);
    if (slugs.length === 0) {
      setProducts([]);
      setProductsLoading(false);
      return;
    }

    const controller = new AbortController();
    setProductsLoading(true);

    fetch(`/api/products?slugs=${encodeURIComponent(slugs.join(','))}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad response'))))
      .then((data: { products: Product[] }) => {
        const found = data.products ?? [];
        setProducts(found);
        setProductsLoading(false);

        // Drop lines for products that no longer exist, so a discontinued item
        // cannot sit in the bag forever inflating the header count. Only ever
        // done on a successful response — a failed fetch must not empty a cart.
        const live = new Set(found.map((p) => p.slug));
        setLines((prev) =>
          prev.some((l) => !live.has(l.slug)) ? prev.filter((l) => live.has(l.slug)) : prev,
        );
      })
      .catch((error) => {
        // Aborts are the effect re-running, not a failure; leave the loading
        // flag to the run that replaces this one.
        if (error?.name !== 'AbortError') setProductsLoading(false);
      });

    return () => controller.abort();
  }, [lines, ready]);

  // Keep tabs in sync.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setLines(readStorage());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((slug: string, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === slug);
      if (existing) {
        return prev.map((l) =>
          l.slug === slug ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l,
        );
      }
      return [...prev, { slug, quantity: Math.min(99, Math.max(1, quantity)) }];
    });
    setLastAdded(slug);
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.slug !== slug)
        : prev.map((l) => (l.slug === slug ? { ...l, quantity: Math.min(99, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    setLines((prev) => prev.filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const { count, subtotal } = useMemo(() => {
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    return lines.reduce(
      (acc, line) => {
        const product = bySlug.get(line.slug);
        acc.count += line.quantity;
        if (product) acc.subtotal += product.price * line.quantity;
        return acc;
      },
      { count: 0, subtotal: 0 },
    );
  }, [lines, products]);

  // Empty bag: nothing to price. Otherwise wait for the first response — but do
  // not hang forever if every product 404s, hence the !productsLoading escape.
  const priced = ready && (lines.length === 0 || products.length > 0 || !productsLoading);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      products,
      count,
      subtotal,
      ready,
      priced,
      isOpen,
      lastAdded,
      add,
      setQuantity,
      remove,
      clear,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [lines, products, count, subtotal, ready, priced, isOpen, lastAdded, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}

/** Cart lines joined to their product records, in cart order. */
export function useCartDetails() {
  const { lines, products } = useCart();
  return useMemo(() => {
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    return lines
      .map((line) => {
        const product = bySlug.get(line.slug);
        if (!product) return null;
        return { ...line, product, lineTotal: product.price * line.quantity };
      })
      .filter((x): x is { slug: string; quantity: number; product: Product; lineTotal: number } =>
        Boolean(x),
      );
  }, [lines, products]);
}
