// Demo data for zero-config dev (§18.2): 5 products + 2 categories + local
// placeholder images (seed-assets/). Prices are in minor units (e.g. cents):
// 199000 = 1990.00. Pure data — covered by an invariants test.

export interface DemoCategory {
  slug: string;
  title: string;
}

export interface DemoVariant {
  sku: string;
  /** Minor units (e.g. cents). */
  price: number;
  stock: number;
}

export interface DemoProduct {
  slug: string;
  title: string;
  category: string;
  description: string;
  /** File name in seed-assets/. */
  image: string;
  seo: { title: string; description: string };
  variants: DemoVariant[];
}

export const demoCategories: DemoCategory[] = [
  { slug: 'apparel', title: 'Apparel' },
  { slug: 'accessories', title: 'Accessories' },
];

export const demoProducts: DemoProduct[] = [
  {
    slug: 'classic-tee',
    title: 'Classic T-Shirt',
    category: 'apparel',
    description: 'A straight-cut cotton T-shirt.',
    image: 'placeholder-1.svg',
    seo: { title: 'Classic T-Shirt', description: 'A basic cotton T-shirt.' },
    variants: [{ sku: 'TEE-001', price: 199000, stock: 25 }],
  },
  {
    slug: 'zip-hoodie',
    title: 'Zip Hoodie',
    category: 'apparel',
    description: 'A warm hooded sweatshirt.',
    image: 'placeholder-2.svg',
    seo: { title: 'Zip Hoodie', description: 'An insulated hoodie.' },
    variants: [{ sku: 'HOD-001', price: 459000, stock: 12 }],
  },
  {
    slug: 'logo-cap',
    title: 'Logo Cap',
    category: 'accessories',
    description: 'An adjustable cap.',
    image: 'placeholder-3.svg',
    seo: { title: 'Cap', description: 'A cap with a logo.' },
    variants: [{ sku: 'CAP-001', price: 129000, stock: 40 }],
  },
  {
    slug: 'tote-bag',
    title: 'Tote Bag',
    category: 'accessories',
    description: 'A sturdy cotton tote.',
    image: 'placeholder-4.svg',
    seo: { title: 'Tote', description: 'A cotton tote bag.' },
    variants: [{ sku: 'TOT-001', price: 99000, stock: 60 }],
  },
  {
    slug: 'crew-socks',
    title: 'Socks, 3 Pairs',
    category: 'apparel',
    description: 'A set of three pairs.',
    image: 'placeholder-5.svg',
    seo: { title: 'Socks', description: 'A pack of socks, 3 pairs.' },
    variants: [{ sku: 'SOC-001', price: 79000, stock: 100 }],
  },
];
