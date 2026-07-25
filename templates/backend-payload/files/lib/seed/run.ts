// Demo seed (§18.2): runs from Payload's onInit. Idempotent (guarded by
// shouldRunDevTask: dev only + empty collection). Images are local
// placeholders from seed-assets/ (no network).
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
    const doc = await payload.create({
      collection: 'categories',
      data: { slug: c.slug, title: c.title, description: c.description },
      overrideAccess: true,
    });
    categoryId.set(c.slug, doc.id);
  }

  for (const p of demoProducts) {
    const mediaIds: Array<string | number> = [];
    for (const [index, image] of p.images.entries()) {
      const media = await payload.create({
        collection: 'media',
        data: { alt: index === 0 ? p.title : `${p.title} — detail` },
        filePath: path.join(seedAssets, image),
        overrideAccess: true,
      });
      mediaIds.push(media.id);
    }
    const coverId = mediaIds[0];
    const catId = categoryId.get(p.category);
    const product = await payload.create({
      collection: 'products',
      data: {
        slug: p.slug,
        title: p.title,
        description: plainToRichText(p.description),
        categories: catId ? [catId] : [],
        images: mediaIds,
        seo: {
          title: p.seo.title,
          description: p.seo.description,
          image: coverId,
        },
      },
      overrideAccess: true,
    });
    for (const v of p.variants) {
      await payload.create({
        collection: 'variants',
        data: {
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          product: product.id,
          ...(v.options ? { options: v.options } : {}),
        },
        overrideAccess: true,
      });
    }
  }

  const variantCount = demoProducts.reduce((n, p) => n + p.variants.length, 0);
  payload.logger.info(
    `[vitrine] demo seed: ${demoProducts.length} products, ${demoCategories.length} categories, ${variantCount} variants — browse / then try Add to cart`,
  );
}
