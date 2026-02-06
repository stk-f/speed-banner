const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('🚀 Starting Interactive Verification...');

    // Launch in HEADFUL mode so user can see and interact
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    // URL to check (Use the CLI redirect URL or the base URL)
    // We'll start with the base URL and let the user navigate/login if needed
    const targetUrl = 'https://speed-banner-dev-clean.myshopify.com/?agx_debug=1';

    console.log(`\n🌐 Opening ${targetUrl}`);
    console.log('⚠️  ACTION REQUIRED: Check the browser window.');
    console.log('   If you see a password page, please enter the store password manually.');
    console.log('   Wait until the Home Page is fully loaded with the Banner visible.');

    await page.goto(targetUrl);

    // Wait for user to bypass authentication
    // We'll wait until the banner root element is present in DOM
    console.log('⏳ Waiting for banner element ([data-agx-banner-root]) to appear...');
    try {
        await page.waitForSelector('[data-agx-banner-root="1"]', { timeout: 60000 });
    } catch (e) {
        console.log('❌ Banner not detected after 60 seconds. Please ensure you are logged in and the banner is enabled.');
        // Keep browser open for debugging
        // await browser.close(); 
        return;
    }

    console.log('✅ Banner detected! Starting verification checks...');

    // Helper to capture state
    async function captureState(label) {
        console.log(`\n📸 Capturing: ${label}`);
        const timestamp = Date.now();
        const screenshotPath = `verify_${label}_${timestamp}.png`;

        // Get Logs
        const offsetLog = await page.evaluate(() => {
            // Find the last log with "Applied ... Offset"
            // Since we can't easily grab console history from here without listeners, we'll check the DOM state mainly
            // but let's try to extract info from the banner element itself if we added debug attributes?
            // No, we rely on console. However, Puppeteer handles console message event.
            return document.querySelector('[data-agx-banner-root="1"]')?.style.cssText;
        });

        // Take screenshot
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`   Saved screenshot: ${screenshotPath}`);
        console.log(`   Styles: ${offsetLog}`);

        // Get Debug info from page context if possible
        // We can inject a script to return the last debug log?
        // For now, let's just inspect the DOM position
        const rect = await page.evaluate(() => {
            const el = document.querySelector('[data-agx-banner-root="1"]');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, height: r.height, innerHeight: window.innerHeight };
        });
        console.log(`   Rect: ${JSON.stringify(rect)}`);
    }

    // 1. Check Initial State (likely BOTTOM or TOP depending on last setting)
    await new Promise(r => setTimeout(r, 2000)); // Wait for animations
    await captureState('initial_state');

    console.log('\n✨ Verification Complete!');
    console.log('   Please review the generated .png images and the logs above.');
    console.log('   You can close the browser window now.');

})();
