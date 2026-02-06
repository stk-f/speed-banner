import type { Page, Route } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { extractBannerScript } from './helpers/extractBannerScript';

const TEST_ORIGIN = 'https://e2e.test';

test.describe('Banner Core Regression Tests', () => {
  let bannerScript: string;

  // --- 1. Global Setup ---
  test.beforeAll(() => {
    bannerScript = extractBannerScript();
    expect(bannerScript).toContain('window.__AGX_SPEED_BANNER__');
  });

  // --- 2. Per-Test Environment Reset ---
  test.beforeEach(async ({ page }) => {
    // P0: Strict Network Isolation (Catch-all 404)
    await page.route('**/**', async route => {
      const url = route.request().url();
      if (url.startsWith(TEST_ORIGIN)) {
        await route.fulfill({ status: 404, body: 'Not Mocked by E2E' });
      } else {
        await route.abort('blockedbyclient');
      }
    });

    // Force sendBeacon to undefined to ensure tests use fetch for events
    // Make it configurable to avoid potential errors if re-defined
    await page.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
      } catch (e) {
        // Ignore if already defined non-configurable (unlikely in test)
      }
    });
  });

  // --- Helper: Centralized Page & API Setup ---
  async function setupPage(options: {
    page: Page;
    htmlBody: string;
    urlPath?: string;
    campaignOverride?: any;
    onPublicConfig?: (route: Route) => Promise<void>;
    onEvent?: (route: Route) => Promise<void>;
    suppressLogs?: boolean;
  }) {
    const { page, htmlBody, urlPath = '/', campaignOverride, onPublicConfig, onEvent } = options;

    const defaultCampaign = {
      id: 'cmp_default',
      placement: 'BOTTOM',
      message: 'Default Banner',
      buttonText: 'Click Me',
      buttonUrl: '/pages/default',
      frequency: 'ALWAYS',
      suppressDays: 0,
      style: { backgroundColor: '#000000', textColor: '#ffffff' }
    };
    const campaign = { ...defaultCampaign, ...(campaignOverride || {}) };

    // 1. Mock Document (HTML) - P0: Robust Regex Matcher
    const escapedOrigin = TEST_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const docRegex = new RegExp(`^${escapedOrigin}/(\\?.*)?$`);

    await page.route(docRegex, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
            <!DOCTYPE html>
            <html>
            <head><style>body { margin:0; height:2000px; }</style></head>
            <body>
                ${htmlBody}
            </body>
            </html>
            `
      });
    });

    // 2. Mock Public Config API
    await page.route(`${TEST_ORIGIN}/apps/speed-banner/public-config*`, async route => {
      if (onPublicConfig) {
        await onPublicConfig(route);
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ campaign })
      });
    });

    // 3. Mock Event API
    await page.route(`${TEST_ORIGIN}/apps/speed-banner/event`, async route => {
      if (onEvent) {
        await onEvent(route);
        return;
      }
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    });

    // Logging
    if (!options.suppressLogs) {
      page.on('console', msg => {
        if (msg.type() === 'debug' || msg.text().includes('[AGX Debug]')) {
          // console.log(`[Browser] ${msg.text()}`);
        }
      });
    }

    // Navigate
    await page.goto(`${TEST_ORIGIN}${urlPath}`);
  }

  // --- Test Cases ---

  test('TC1: Overlay Rejection (Normal) - Should ignore giant overlay', async ({ page }) => {
    await setupPage({
      page,
      htmlBody: `
            <iframe id="PBarNextFrame" style="position:fixed; bottom:0; left:0; width:100vw; height:945px; z-index:9999;"></iframe>
            <div class="agx-speed-banner" data-block-id="test-block"></div>
        `
    });

    // Explicit manual clear AFTER navigation (Origin is now valid)
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    await page.addScriptTag({ content: bannerScript });

    const banner = page.locator('[data-agx-banner-root="1"]');
    await expect(banner).toBeVisible();

    await expect.poll(async () => {
      return await banner.evaluate((el) => window.getComputedStyle(el).bottom);
    }).toBe('0px');
  });

  test('TC2: Overlay Rejection (Debug Mode) - Should use X-Ray', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    await setupPage({
      page,
      urlPath: '/?agx_debug=1',
      htmlBody: `
            <div id="PBarNextFrameWrapper" style="position:fixed; bottom:0; left:0; width:100vw; height:68px; z-index:1;"></div>
            <iframe id="PBarNextFrame" style="position:fixed; bottom:0; left:0; width:100vw; height:945px; z-index:9999;"></iframe>
            <div class="agx-speed-banner" data-block-id="test-block"></div>
        `
    });

    // Explicit manual clear AFTER navigation
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    await page.addScriptTag({ content: bannerScript });

    const banner = page.locator('[data-agx-banner-root="1"]');
    await expect(banner).toBeVisible();

    // Expect ~68px
    await expect.poll(async () => {
      const bottom = parseInt(await banner.evaluate((el) => window.getComputedStyle(el).bottom), 10);
      return bottom;
    }).toBeGreaterThanOrEqual(66);

    await expect.poll(async () => logs.join('\n')).toContain('[AGX Debug] Candidate ignored as overlay');
  });

  test('TC3: Security - Should sanitize malicious URLs', async ({ page }) => {
    await setupPage({
      page,
      htmlBody: `<div class="agx-speed-banner" data-block-id="test-block"></div>`,
      campaignOverride: {
        id: 'cmp_hack',
        buttonUrl: 'javascript:alert(1)', // eslint-disable-line no-script-url
      }
    });

    // Explicit manual clear AFTER navigation
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    await page.addScriptTag({ content: bannerScript });

    const cta = page.locator('[data-agx-cta="1"]');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '#');
  });

  test('TC4: Singleton & Multiple Execution Guard', async ({ page }) => {
    let fetchCount = 0;

    await setupPage({
      page,
      htmlBody: `<div class="agx-speed-banner" data-block-id="test-block"></div>`,
      onPublicConfig: async (route) => {
        fetchCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({
            campaign: { id: 'cmp_singleton', message: 'Singleton', frequency: 'ALWAYS' }
          })
        });
      }
    });

    // Explicit manual clear AFTER navigation
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    await page.addScriptTag({ content: bannerScript });
    await expect(page.locator('[data-agx-banner-root="1"]')).toBeVisible();

    await page.addScriptTag({ content: bannerScript });
    await page.waitForTimeout(300);

    expect(fetchCount).toBe(1);
    expect(await page.locator('[data-agx-banner-root="1"]').count()).toBe(1);

    // Check global instances
    const instancesFn = await page.evaluate(() => Object.keys((window as any).__AGX_SPEED_BANNER__.instances).length);
    expect(instancesFn).toBe(1);
  });

  test('TC5: Close Suppression', async ({ page }) => {
    // NO manual clear here - we want to test persistence
    await setupPage({
      page,
      htmlBody: `<div class="agx-speed-banner" data-block-id="test-block"></div>`,
      campaignOverride: {
        id: 'cmp_close',
        suppressDays: 7,
        frequency: 'ALWAYS'
      }
    });

    await page.addScriptTag({ content: bannerScript });

    const banner = page.locator('[data-agx-banner-root="1"]');
    await expect(banner).toBeVisible();

    await page.locator('[data-agx-close="1"]').click();
    await expect(banner).toBeHidden();

    // Reload (Navigate makes a new request, mocking handles it)
    await page.goto(`${TEST_ORIGIN}/`);
    await page.addScriptTag({ content: bannerScript });

    // Expect BANNER NOT TO BE VISIBLE (Suppressed by LocalStorage)
    await expect(banner).not.toBeVisible();

    const closedVal = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.endsWith(':closedUntil'));
      return key ? localStorage.getItem(key) : null;
    });

    expect(closedVal).not.toBeNull();
    expect(parseInt(closedVal as string, 10)).toBeGreaterThan(Date.now());
  });

  test('TC6: Measurement - Impression Event', async ({ page }) => {
    const events: any[] = [];

    await setupPage({
      page,
      htmlBody: `<div class="agx-speed-banner" data-block-id="test-block"></div>`,
      campaignOverride: { id: 'cmp_imp' },
      onEvent: async (route) => {
        const payload = route.request().postDataJSON();
        events.push(payload);
        await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      }
    });

    // Explicit manual clear AFTER navigation
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    // The script injection will trigger render -> impression
    await page.addScriptTag({ content: bannerScript });

    await expect.poll(() => events.length).toBeGreaterThanOrEqual(1);
    expect(events.some(e => e.type === 'impression' && e.campaignId === 'cmp_imp')).toBe(true);
  });

  test('TC7: Measurement - Click Event', async ({ page }) => {
    const events: any[] = [];

    await setupPage({
      page,
      htmlBody: `<div class="agx-speed-banner" data-block-id="test-block"></div>`,
      campaignOverride: {
        id: 'cmp_click',
        buttonText: 'Track Me',
        buttonUrl: '#'
      },
      onEvent: async (route) => {
        const payload = route.request().postDataJSON();
        events.push(payload);
        await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      }
    });

    // Explicit manual clear AFTER navigation
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    await page.addScriptTag({ content: bannerScript });

    const cta = page.locator('[data-agx-cta="1"]');
    await expect(cta).toBeVisible();

    // Click CTA
    await cta.click();

    await expect.poll(() => events.length).toBeGreaterThanOrEqual(2);
    expect(events.some(e => e.type === 'impression' && e.campaignId === 'cmp_click')).toBe(true);
    expect(events.some(e => e.type === 'click' && e.campaignId === 'cmp_click')).toBe(true);
  });

  test('TC8: Shopify Preview Bar Detection - Should offset banner', async ({ page }) => {
    await setupPage({
      page,
      htmlBody: `
            <div id="ShopifyPreviewBar" style="position:fixed; bottom:0; left:0; width:100vw; height:60px; z-index:99999; background:black;"></div>
            <div class="agx-speed-banner" data-block-id="test-block"></div>
        `
    });

    // Explicit manual clear AFTER navigation
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    await page.addScriptTag({ content: bannerScript });

    const banner = page.locator('[data-agx-banner-root="1"]');
    await expect(banner).toBeVisible();

    // Expect ~60px offset (clampBarHeight logic applies)
    await expect.poll(async () => {
      const bottom = parseInt(await banner.evaluate((el) => window.getComputedStyle(el).bottom), 10);
      return bottom;
    }).toBeGreaterThanOrEqual(60);
  });
});
