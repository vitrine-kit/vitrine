import { test, expect } from '@playwright/test';

/**
 * Storefront smoke (@smoke). Requires a running client:
 *   DEMO_URL=http://localhost:3000 pnpm --filter sandbox test:e2e
 *
 * Runs with workers=1 — Payload SQLite does not like parallel writers.
 * Template CSP must allow 'unsafe-eval' in development or client handlers never hydrate.
 */
test.describe('@smoke storefront', () => {
  test('home shows catalog and search chrome', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('search')).toBeVisible();
    await expect(page.getByRole('link', { name: /Cart/i })).toBeVisible();
  });

  test('search finds seeded product', async ({ page }) => {
    await page.goto('/search?q=classic', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Classic T-Shirt/i })).toBeVisible({ timeout: 15_000 });
  });

  test('product → add to cart → cart qty controls', async ({ page }) => {
    await page.goto('/products/classic-tee', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Classic T-Shirt' })).toBeVisible();
    const add = page.getByRole('button', { name: 'Add to cart' });
    await expect(add).toBeEnabled();
    await add.click();
    await page.waitForURL(/\/cart/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: 'Cart' })).toBeVisible();
    await expect(page.getByText('Classic T-Shirt')).toBeVisible();
    await expect(page.getByLabel('Qty')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeVisible();
  });

  test('checkout without Stripe keys surfaces error', async ({ page }) => {
    await page.goto('/products/tote-bag', { waitUntil: 'networkidle' });
    const add = page.getByRole('button', { name: 'Add to cart' });
    await expect(add).toBeEnabled();
    await add.click();
    await page.waitForURL(/\/cart/, { timeout: 45_000 });
    await page.getByRole('button', { name: 'Checkout' }).click();
    // Prefer the checkout error node — Next.js also mounts a route announcer with role="alert".
    await expect(page.locator('.vt-checkout-error')).toContainText(/STRIPE_SECRET_KEY|not set|unavailable/i, {
      timeout: 15_000,
    });
  });

  test('order success and crawl files', async ({ page, request }) => {
    await page.goto('/order/success?session_id=cs_test');
    await expect(page.getByRole('heading', { name: /Thank you/i })).toBeVisible();

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain('classic-tee');

    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain('sitemap');
  });

  test('wishlist and account pages load', async ({ page }) => {
    await page.goto('/wishlist');
    await expect(page.getByRole('heading', { name: 'Wishlist' })).toBeVisible();
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: /Account/i })).toBeVisible();
  });

  test('wishlist toggle persists on wishlist page', async ({ page }) => {
    await page.goto('/products/classic-tee', { waitUntil: 'networkidle' });
    const wish = page.getByRole('button', { name: /wishlist/i });
    await expect(wish).toBeVisible();
    await wish.click();
    await page.goto('/wishlist');
    await expect(page.getByRole('link', { name: /Classic T-Shirt/i })).toBeVisible({ timeout: 10_000 });
  });

  test('product review can be submitted', async ({ page }) => {
    await page.goto('/products/tote-bag', { waitUntil: 'networkidle' });
    await page.getByRole('textbox', { name: 'Name' }).fill('Pat');
    await page.getByRole('textbox', { name: 'Review' }).fill('Sturdy tote for daily errands.');
    await page.getByRole('button', { name: 'Submit review' }).click();
    await expect(page.getByText('Sturdy tote for daily errands.')).toBeVisible({ timeout: 15_000 });
  });

  test('customer register then see account orders', async ({ page }) => {
    const email = `buyer-${Date.now()}@example.com`;
    await page.goto('/account/register', { waitUntil: 'networkidle' });
    const create = page.getByRole('button', { name: 'Create account' });
    await expect(create).toBeEnabled();
    await page.getByRole('textbox', { name: 'Name' }).fill('Test Buyer');
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.locator('input[name="password"]').fill('password123');
    await create.click();
    await page.waitForURL(/\/account\/orders/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /Your orders/i })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test('missing product shows not-found page', async ({ page }) => {
    await page.goto('/products/does-not-exist-sku', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Page not found/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('link', { name: /Back to catalog/i })).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/account/forgot-password', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Forgot password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send reset link/i })).toBeVisible();
  });

  test('mocked webhook endpoint rejects unsigned payload', async ({ request }) => {
    const wh = await request.post('/api/webhooks/stripe', {
      data: JSON.stringify({ type: 'checkout.session.completed' }),
      headers: { 'content-type': 'application/json' },
    });
    expect([400, 500]).toContain(wh.status());
  });
});
