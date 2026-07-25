// Demo seed (§18.2): runs from Payload's onInit. Idempotent (empty collection +
// dev, or SEED_ON_BOOT=1 in production). Images are local placeholders from
// seed-assets/ (no network). Optional RU copy is applied when localization is on.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Payload } from 'payload';
import { demoCategories, demoProducts } from './demo.js';
import { seedOnBootEnabled, shouldRunDevTask } from './guards.js';
import { demoLocales } from './locales.js';
import { plainToRichText } from './richtext.js';

// Prefer cwd/seed-assets so Docker runtime (standalone) can ship the folder next to server.js.
const seedAssets = [
  path.resolve(process.cwd(), 'seed-assets'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../seed-assets'),
].find((p) => existsSync(p));

export async function seedDemo(payload: Payload): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const { totalDocs } = await payload.count({ collection: 'products' });
  if (!shouldRunDevTask({ isProd, existingCount: totalDocs, seedOnBoot: seedOnBootEnabled() })) {
    return;
  }
  if (!seedAssets) {
    payload.logger.warn('[vitrine] demo seed skipped — seed-assets/ not found');
    return;
  }

  const localization = payload.config.localization;
  const defaultLocale = localization?.defaultLocale ?? 'en';
  const enabledLocales = new Set(
    (localization?.locales ?? []).map((l) => (typeof l === 'string' ? l : l.code)),
  );
  const createOpts = localization ? { locale: defaultLocale as 'en' } : {};

  const categoryId = new Map<string, string | number>();
  for (const c of demoCategories) {
    const doc = await payload.create({
      collection: 'categories',
      data: { slug: c.slug, title: c.title, description: c.description },
      ...createOpts,
      overrideAccess: true,
    });
    categoryId.set(c.slug, doc.id);
    const localized = demoLocales.categories[c.slug];
    if (localized && localization) {
      for (const [locale, copy] of Object.entries(localized)) {
        if (locale === defaultLocale || !enabledLocales.has(locale)) continue;
        await payload.update({
          collection: 'categories',
          id: doc.id,
          data: { title: copy.title, description: copy.description },
          locale: locale as 'en',
          overrideAccess: true,
        });
      }
    }
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
      ...createOpts,
      overrideAccess: true,
    });
    const localized = demoLocales.products[p.slug];
    if (localized && localization) {
      for (const [locale, copy] of Object.entries(localized)) {
        if (locale === defaultLocale || !enabledLocales.has(locale)) continue;
        await payload.update({
          collection: 'products',
          id: product.id,
          data: {
            title: copy.title,
            description: plainToRichText(copy.description),
            seo: { title: copy.seo.title, description: copy.seo.description },
          },
          locale: locale as 'en',
          overrideAccess: true,
        });
      }
    }
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
