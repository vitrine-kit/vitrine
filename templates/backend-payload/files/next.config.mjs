// backend-payload: wrap the Next config in withPayload (mounts the Payload admin and
// API into Next). output: 'standalone' — for the Docker image (VPS).
import { withPayload } from '@payloadcms/next/withPayload';

// Baseline security headers (OWASP A05: Security Misconfiguration) applied to every route.
// The CSP below is a conservative starting point — payment providers with client-side widgets
// (e.g. embedded Stripe Elements) may need their domains added to script-src/connect-src/frame-src.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Registry/template sources use TypeScript ESM-style relative imports (`.js` → `.ts`/`.tsx`).
  // Webpack needs an explicit extensionAlias; without it, `pnpm dev` fails to resolve components.
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withPayload(nextConfig);
