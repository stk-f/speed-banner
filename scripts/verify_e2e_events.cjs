const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration
const SHOP_DOMAIN = 'speed-banner-dev-clean.myshopify.com';
const STORE_URL = `https://${SHOP_DOMAIN}`;
// const PROXY_URL = `https://${SHOP_DOMAIN}/apps/speed-banner/event`; // Direct Proxy
const PASSWORD = 'nawkru';

async function run() {
    console.log('--- Step 2: Storefront Access (Password Bypass) ---');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen for Proxy requests
    page.on('request', request => {
        if (request.url().includes('/apps/speed-banner/event')) {
            console.log(`[Network] Request: ${request.method()} ${request.url()}`);
            if (request.method() === 'POST') {
                console.log(`[Network] Payload: ${JSON.stringify(request.postDataJSON(), null, 2)}`);
            }
        }
    });

    page.on('response', async response => {
        if (response.url().includes('/apps/speed-banner/event')) {
            console.log(`[Network] Response Status: ${response.status()}`);
        }
    });

    try {
        // 1. Enter Password
        console.log(`Visiting ${STORE_URL}/password ...`);
        await page.goto(`${STORE_URL}/password`);

        const passwordInput = page.locator('input[type="password"]');
        if (await passwordInput.count() > 0) {
            console.log(`Filling password: ${PASSWORD}`);
            await passwordInput.fill(PASSWORD);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000); // Wait for unlock
        } else {
            console.log('Password input not found (Maybe already unlocked?)');
        }

        // 2. Check Banner
        console.log(`Visiting ${STORE_URL} ...`);
        await page.goto(STORE_URL);
        await page.waitForTimeout(3000);

        // Verify unlocking
        if (await page.locator('input[type="password"]').count() > 0) {
            console.error('[Error] Still on password page. Password "nawkru" might be wrong.');
            // If wrong, we stop here (cannot verify E2E).
        } else {
            console.log('[Success] Storefront unlocked.');

            // Verify Banner
            const banner = page.locator('.agx-speed-banner');
            if (await banner.count() > 0) {
                console.log('[UI] Banner found. Checking events...');
                // Impression should fire automatically

                // Click CTA
                const cta = page.locator('[data-agx-cta="1"]');
                if (await cta.count() > 0) {
                    console.log('[UI] Clicking CTA...');
                    await cta.click();
                    await page.waitForTimeout(2000); // Wait for click event
                }
            } else {
                console.log('[UI] Banner not found. (Check enabled/campaign status)');
            }
        }

    } catch (e) {
        console.error('[Error] Automation failed:', e.message);
    } finally {
        await browser.close();
    }

    console.log('\n--- Step 3: DB Verification ---');
    try {
        const count = await prisma.event.count();
        console.log(`Total Events in DB: ${count}`);

        const recentEvents = await prisma.event.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { campaign: true }
        });

        console.log('Recent Events:');
        recentEvents.forEach(e => {
            console.log(`- [${e.type}] Campaign: ${e.campaign?.title} (ID: ${e.campaignId}) at ${e.createdAt}`);
        });

    } catch (e) {
        console.error('[Error] DB Verification failed:', e);
    }
}

run();
