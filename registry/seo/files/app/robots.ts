import type { MetadataRoute } from 'next';
import { baseUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/cart', '/order/', '/account', '/wishlist'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
