export type Accent = 'clay' | 'sage' | 'sand' | 'slate' | 'copper' | 'ink';

export type CategoryId =
  | 'cookware'
  | 'tableware'
  | 'glassware'
  | 'knives'
  | 'storage'
  | 'appliances'
  | 'textiles';

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: CategoryId;
  /** Dominant material — the homeware equivalent of a fragrance family. */
  family: string;
  description: string;
  /** Bullet specs shown on the product page: dimensions, material, care. */
  specs: string[];
  care: string[];
  inBox: string[];
  sizeLabel: string | null;
  price: number;
  compareAt: number | null;
  stock: number;
  imageUrl: string | null;
  accent: Accent;
  featured: boolean;
  bestseller: boolean;
  rating: number;
  reviewCount: number;
}

export interface CartLine {
  slug: string;
  quantity: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItemDTO {
  name: string;
  slug: string;
  price: number;
  quantity: number;
}

export interface OrderDTO {
  id: string;
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  note: string | null;
  deliveryFee: number;
  subtotal: number;
  total: number;
  paymentMethod: 'whatsapp' | 'paystack';
  status: OrderStatus;
  createdAt: string;
  items: OrderItemDTO[];
}

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  blurb: string;
  group: 'kitchen' | 'home';
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'cookware',
    label: 'Cookware',
    blurb: 'Pots and pans heavy enough to hold heat evenly.',
    group: 'kitchen',
  },
  {
    id: 'knives',
    label: 'Knives & Boards',
    blurb: 'Sharp steel and end-grain boards that last decades.',
    group: 'kitchen',
  },
  {
    id: 'appliances',
    label: 'Small Appliances',
    blurb: 'Kettles, blenders and toasters built for daily use.',
    group: 'kitchen',
  },
  {
    id: 'storage',
    label: 'Storage & Prep',
    blurb: 'Airtight jars and prep bowls that stack properly.',
    group: 'kitchen',
  },
  {
    id: 'tableware',
    label: 'Tableware',
    blurb: 'Stoneware plates and bowls, chip-resistant and warm.',
    group: 'home',
  },
  {
    id: 'glassware',
    label: 'Glassware',
    blurb: 'Tumblers, stems and carafes with real weight.',
    group: 'home',
  },
  {
    id: 'textiles',
    label: 'Kitchen Textiles',
    blurb: 'Linen aprons, towels and mitts that get softer.',
    group: 'home',
  },
];

export const CATEGORY_LABEL: Record<CategoryId, string> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c.label }),
  {} as Record<CategoryId, string>,
);
