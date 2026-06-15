// Демо-данные для zero-config dev (§18.2): 5 товаров + 2 категории + локальные
// placeholder-картинки (seed-assets/). Цены — в минимальных единицах (копейки):
// 199000 = 1990.00. Чистые данные — покрыты тестом на инварианты.

export interface DemoCategory {
  slug: string;
  title: string;
}

export interface DemoVariant {
  sku: string;
  /** Минимальные единицы (копейки). */
  price: number;
  stock: number;
}

export interface DemoProduct {
  slug: string;
  title: string;
  category: string;
  description: string;
  /** Имя файла в seed-assets/. */
  image: string;
  seo: { title: string; description: string };
  variants: DemoVariant[];
}

export const demoCategories: DemoCategory[] = [
  { slug: 'apparel', title: 'Одежда' },
  { slug: 'accessories', title: 'Аксессуары' },
];

export const demoProducts: DemoProduct[] = [
  {
    slug: 'classic-tee',
    title: 'Классическая футболка',
    category: 'apparel',
    description: 'Хлопковая футболка прямого кроя.',
    image: 'placeholder-1.svg',
    seo: { title: 'Классическая футболка', description: 'Базовая хлопковая футболка.' },
    variants: [{ sku: 'TEE-001', price: 199000, stock: 25 }],
  },
  {
    slug: 'zip-hoodie',
    title: 'Худи на молнии',
    category: 'apparel',
    description: 'Тёплое худи с капюшоном.',
    image: 'placeholder-2.svg',
    seo: { title: 'Худи на молнии', description: 'Утеплённое худи.' },
    variants: [{ sku: 'HOD-001', price: 459000, stock: 12 }],
  },
  {
    slug: 'logo-cap',
    title: 'Кепка с логотипом',
    category: 'accessories',
    description: 'Регулируемая кепка.',
    image: 'placeholder-3.svg',
    seo: { title: 'Кепка', description: 'Кепка с логотипом.' },
    variants: [{ sku: 'CAP-001', price: 129000, stock: 40 }],
  },
  {
    slug: 'tote-bag',
    title: 'Сумка-шопер',
    category: 'accessories',
    description: 'Плотный хлопковый шопер.',
    image: 'placeholder-4.svg',
    seo: { title: 'Шопер', description: 'Хлопковая сумка-шопер.' },
    variants: [{ sku: 'TOT-001', price: 99000, stock: 60 }],
  },
  {
    slug: 'crew-socks',
    title: 'Носки, 3 пары',
    category: 'apparel',
    description: 'Комплект из трёх пар.',
    image: 'placeholder-5.svg',
    seo: { title: 'Носки', description: 'Набор носков, 3 пары.' },
    variants: [{ sku: 'SOC-001', price: 79000, stock: 100 }],
  },
];
