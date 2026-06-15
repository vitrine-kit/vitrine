// Демо-сид (§18.2): запускается из onInit Payload. Идемпотентен (гард по
// shouldRunDevTask: только dev + пустая коллекция). Картинки — локальные
// placeholder из seed-assets/ (без сети).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Payload } from 'payload';
import { demoCategories, demoProducts } from './demo.js';
import { shouldRunDevTask } from './guards.js';
import { plainToRichText } from './richtext.js';

const seedAssets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../seed-assets');

export async function seedDemo(payload: Payload): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const { totalDocs } = await payload.count({ collection: 'products' });
  if (!shouldRunDevTask({ isProd, existingCount: totalDocs })) return;

  const categoryId = new Map<string, string | number>();
  for (const c of demoCategories) {
    const doc = await payload.create({ collection: 'categories', data: { slug: c.slug, title: c.title } });
    categoryId.set(c.slug, doc.id);
  }

  for (const p of demoProducts) {
    const media = await payload.create({
      collection: 'media',
      data: { alt: p.title },
      filePath: path.join(seedAssets, p.image),
    });
    const catId = categoryId.get(p.category);
    const product = await payload.create({
      collection: 'products',
      data: {
        slug: p.slug,
        title: p.title,
        description: plainToRichText(p.description),
        categories: catId ? [catId] : [],
        images: [media.id],
        seo: { title: p.seo.title, description: p.seo.description, image: media.id },
      },
    });
    for (const v of p.variants) {
      await payload.create({
        collection: 'variants',
        data: { sku: v.sku, price: v.price, stock: v.stock, product: product.id },
      });
    }
  }

  payload.logger.info('[vitrine] demo seed: создано 5 товаров');
}
