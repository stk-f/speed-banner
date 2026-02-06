const puppeteer = require('puppeteer');

(async () => {
    console.log('🔍 Starting Diagnosis...');
    const STORE_URL = 'https://speed-banner-dev-clean.myshopify.com';

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        userDataDir: './.puppeteer_data', // Re-use session
        args: ['--start-maximized']
    });

    const page = (await browser.pages())[0] || await browser.newPage();

    let consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
        if (msg.text().includes('[AGX Debug]')) console.log(`[Browser Log] ${msg.text()}`);
    });

    console.log(`🌐 Navigating to ${STORE_URL}/?agx_debug=1 ...`);
    // Capture network responses
    let configResponse = null;
    page.on('response', async res => {
        if (res.url().includes('/public-config')) {
            configResponse = {
                status: res.status(),
                body: await res.text().catch(e => 'Failed to read body'),
                url: res.url()
            };
        }
    });

    await page.goto(`${STORE_URL}/?agx_debug=1`, { waitUntil: 'networkidle2' });

    // 1. Check Banner Element
    const banner = await page.$('[data-agx-banner-root="1"]');
    console.log(`\n--- Element Check ---`);
    console.log(`Banner Element Found: ${!!banner}`);

    // 2. Check Network
    console.log(`\n--- Network Check ---`);
    if (configResponse) {
        console.log(`Config API Status: ${configResponse.status}`);
        console.log(`Config API Body: ${configResponse.body.substring(0, 300)}...`);
    } else {
        console.log(`⚠️  Config API request NOT FOUND! (Did the script run?)`);
    }

    // 3. Check App Embed Status (Heuristic)
    const scriptTag = await page.evaluate(() => {
        // Look for the script that looks like our app extension
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.some(s => s.src.includes('banner-block') || s.innerHTML.includes('agx-speed-banner'));
    });
    console.log(`App Embed Script Detected: ${scriptTag}`);

    // 4. Check LocalStorage (Frequency)
    const storageObj = await page.evaluate(() => {
        let items = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.includes('agx:')) items[k] = localStorage.getItem(k);
        }
        return items;
    });
    console.log(`\n--- Storage Check ---`);
    console.log(JSON.stringify(storageObj, null, 2));

    // 5. Console Errors
    console.log(`\n--- Console Errors ---`);
    if (consoleErrors.length > 0) {
        consoleErrors.forEach(e => console.log(`❌ ${e}`));
    } else {
        console.log('No console errors detected.');
    }

    console.log('\n--- Diagnosis Complete ---');
    // Keep open for user to see? No, close to avoid clutter, or let user decide?
    // We'll close to be clean, user sees terminal output.
    await browser.close();
})();
