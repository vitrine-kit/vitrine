// Demo data for zero-config dev (§18.2): a small but realistic catalog so a
// freshly scaffolded shop has browseable examples (categories, variants,
// gallery images, SEO). Prices are integer minor units (cents): 2490 = $24.90.
// Pure data — covered by invariants tests in sandbox.

export interface DemoCategory {
  slug: string;
  title: string;
  description: string;
}

export interface DemoVariant {
  sku: string;
  /** Minor units (e.g. cents). */
  price: number;
  stock: number;
  /** e.g. { size: 'M', color: 'Black' }. */
  options?: Record<string, string>;
}

export interface DemoProduct {
  slug: string;
  title: string;
  category: string;
  description: string;
  /** File names in seed-assets/ (first = cover; extras feed the gallery). */
  images: string[];
  seo: { title: string; description: string };
  variants: DemoVariant[];
}

export const demoCategories: DemoCategory[] = [
  {
    slug: 'apparel',
    title: 'Apparel',
    description: 'Everyday layers — tees, hoodies, and socks with size options you can add to the cart.',
  },
  {
    slug: 'accessories',
    title: 'Accessories',
    description: 'Caps and bags that round out a simple merch assortment.',
  },
];

export const demoProducts: DemoProduct[] = [
  {
    slug: 'classic-tee',
    title: 'Classic T-Shirt',
    category: 'apparel',
    description:
      'A straight-cut midweight cotton tee for daily wear. Soft hand-feel, reinforced shoulder seams, and a slightly longer hem that stays tucked. Pick a size below, add it to your cart, then open /cart to try checkout.',
    images: ['placeholder-1.svg', 'placeholder-1b.svg'],
    seo: {
      title: 'Classic T-Shirt — midweight cotton',
      description: 'Demo apparel product with multiple sizes. Midweight cotton, straight cut.',
    },
    variants: [
      { sku: 'TEE-S', price: 2490, stock: 18, options: { size: 'S' } },
      { sku: 'TEE-M', price: 2490, stock: 32, options: { size: 'M' } },
      { sku: 'TEE-L', price: 2490, stock: 21, options: { size: 'L' } },
      { sku: 'TEE-XL', price: 2690, stock: 9, options: { size: 'XL' } },
    ],
  },
  {
    slug: 'zip-hoodie',
    title: 'Zip Hoodie',
    category: 'apparel',
    description:
      'A brushed-fleece zip hoodie with a roomy hood and metal zipper. Wear it open over the Classic Tee or zipped for cooler evenings. Sizes share the same cut; XL is a touch longer in the body.',
    images: ['placeholder-2.svg', 'placeholder-2b.svg'],
    seo: {
      title: 'Zip Hoodie — brushed fleece',
      description: 'Demo hoodie with size variants and a two-image gallery.',
    },
    variants: [
      { sku: 'HOD-S', price: 6900, stock: 8, options: { size: 'S' } },
      { sku: 'HOD-M', price: 6900, stock: 14, options: { size: 'M' } },
      { sku: 'HOD-L', price: 6900, stock: 11, options: { size: 'L' } },
      { sku: 'HOD-XL', price: 7200, stock: 4, options: { size: 'XL' } },
    ],
  },
  {
    slug: 'logo-cap',
    title: 'Logo Cap',
    category: 'accessories',
    description:
      'A structured six-panel cap with an adjustable strap. One size fits most; choose color to see how option-based variants appear on accessories.',
    images: ['placeholder-3.svg'],
    seo: {
      title: 'Logo Cap — adjustable',
      description: 'Demo accessory with color options.',
    },
    variants: [
      { sku: 'CAP-BLK', price: 2900, stock: 24, options: { color: 'Black' } },
      { sku: 'CAP-NAV', price: 2900, stock: 16, options: { color: 'Navy' } },
      { sku: 'CAP-SND', price: 2900, stock: 12, options: { color: 'Sand' } },
    ],
  },
  {
    slug: 'tote-bag',
    title: 'Tote Bag',
    category: 'accessories',
    description:
      'A heavyweight canvas tote with an interior pocket. Single SKU — useful for comparing a simple product against multi-variant apparel on the product page.',
    images: ['placeholder-4.svg'],
    seo: {
      title: 'Tote Bag — heavyweight canvas',
      description: 'Demo single-variant accessory for a simple add-to-cart path.',
    },
    variants: [{ sku: 'TOT-001', price: 1800, stock: 60 }],
  },
  {
    slug: 'crew-socks',
    title: 'Crew Socks (3-Pack)',
    category: 'apparel',
    description:
      'A three-pair pack of ribbed crew socks. Soft cuff, reinforced heel and toe. Sold as one pack SKU so cart lines stay simple while you explore quantity updates on /cart.',
    images: ['placeholder-5.svg'],
    seo: {
      title: 'Crew Socks — 3-pack',
      description: 'Demo pack product with a single variant and high stock.',
    },
    variants: [{ sku: 'SOC-3PK', price: 1400, stock: 100 }],
  },
];
