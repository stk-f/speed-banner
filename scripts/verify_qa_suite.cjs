const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting Comprehensive QA Suite...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Base URL (User's dev store)
    const baseUrl = 'https://speed-banner-dev-clean.myshopify.com';

    console.log(`\n🌐 Opening ${baseUrl} for login check...`);
    console.log('⚠️  PLEASE LOG IN MANUALLY IF PROMPTED.');
    console.log('   The script will wait for the "Home" page or a logged-in state before proceeding.');

    await page.goto(baseUrl, { waitUntil: 'networkidle0' });

    // Wait up to 10 mins for user to login
    // Robust Login Wait Loop (polling)
    console.log('⏳ Waiting up to 30 minutes for login (Polling mode)...');
    const maxTime = Date.now() + 30 * 60 * 1000;

    while (Date.now() < maxTime) {
        try {
            if (page.isClosed()) throw new Error('Page closed');

            const url = page.url();
            const isPassword = await page.evaluate(() => !!document.querySelector('form[action*="password"]'));

            // We only consider login done if:
            // 1. We are ON the store domain (not accounts.shopify.com)
            // 2. AND there is no password form
            if (url.includes('speed-banner-dev-clean.myshopify.com') && !isPassword) {
                const hasBody = await page.evaluate(() => !!document.body);
                if (hasBody) {
                    console.log('🎉 Login detected on Storefront! Proceeding to tests...');
                    break;
                }
            }
        } catch (e) {
            // Ignore errors during navigation
        }
        await new Promise(r => setTimeout(r, 5000)); // Sleep 5s
    }

    if (Date.now() >= maxTime) {
        console.log('❌ Timeout: 30 minutes passed. Exiting.');
        // await browser.close(); // Keep open for debugging
        return;
    }

    if (Date.now() >= maxTime) {
        console.log('❌ Timeout: 30 minutes passed. Exiting.');
        await browser.close();
        return;
    }

    console.log('✅ Proceeding with Test Scenarios via Request Interception...');

    // Enable request interception to Mock Content
    await page.setRequestInterception(true);

    // Variable to control mock behavior
    let mockScenario = 'NONE'; // BOTTOM, TOP, SECURITY, NONE

    page.on('request', request => {
        if (request.url().includes('/apps/speed-banner/public-config')) {
            const headers = { 'Access-Control-Allow-Origin': '*' };

            let campaign = null;

            if (mockScenario === 'BOTTOM') {
                campaign = {
                    id: 'test-bottom', message: 'QA Bottom', placement: 'BOTTOM',
                    style: { backgroundColor: '#000000', textColor: '#ffffff' },
                    frequency: 'H24', buttonText: 'Test', buttonUrl: '/collections/all'
                };
            } else if (mockScenario === 'TOP') {
                campaign = {
                    id: 'test-top', message: 'QA Top', placement: 'TOP',
                    style: { backgroundColor: '#ff0000', textColor: '#ffffff' },
                    frequency: 'H24'
                };
            } else if (mockScenario === 'SECURITY') {
                campaign = {
                    id: 'test-sec', message: 'Security Check', placement: 'BOTTOM',
                    style: { backgroundColor: '#000000' },
                    buttonText: 'Click Me',
                    buttonUrl: 'javascript:alert("XSS")' // Malicious URL
                };
            }

            if (campaign) {
                request.respond({
                    status: 200, headers,
                    contentType: 'application/json',
                    body: JSON.stringify({ campaign })
                });
                return;
            }
        }
        request.continue();
    });

    // Capture Console Logs
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[AGX Debug]')) {
            console.log(`   📝 Page Log: ${text}`);
        }
    });


    // --- Helper Scenarios ---

    async function runScenario(name, scenarioType, debugMode = false) {
        console.log(`\n👉 Running Scenario: ${name} [Debug: ${debugMode}]`);
        mockScenario = scenarioType;

        // Clear storage for fresh test
        await page.evaluate(() => localStorage.clear());

        let url = baseUrl + (debugMode ? '?agx_debug=1' : '');
        try {
            console.log(`   Navigating to ${url}...`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log(`   ⚠️ Navigation error (ignoring if page works): ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 2000)); // Wait for render

        // Checks
        const result = await page.evaluate(() => {
            const root = document.querySelector('[data-agx-banner-root="1"]');
            if (!root) return { visible: false };

            const r = root.getBoundingClientRect();
            const style = window.getComputedStyle(root);
            const cta = root.querySelector('a');

            return {
                visible: true,
                rect: { top: r.top, bottom: r.bottom, height: r.height },
                style: { top: style.top, bottom: style.bottom },
                ctaHref: cta ? cta.getAttribute('href') : null
            };
        });

        console.log(`   Result:`, JSON.stringify(result));

        // Screenshot
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const artifactPath = `C:/Users/olivy/.gemini/antigravity/brain/12ea3540-6a84-4fde-8cf2-c6e784ab4a03/proof_${safeName}.png`;
        try {
            await page.screenshot({ path: artifactPath, fullPage: false });
            console.log(`   📸 Screenshot saved: ${artifactPath}`);
        } catch (e) {
            console.log(`   ⚠️ Screenshot failed: ${e.message}`);
        }

        return result;
    }

    // --- Execution ---

    // S1: BOTTOM Normal
    await runScenario('S1: BOTTOM (Normal)', 'BOTTOM', false);

    // S2: BOTTOM Debug
    await runScenario('S2: BOTTOM (Debug)', 'BOTTOM', true);

    // S3: Preview Mock (Simulated)
    console.log('\n👉 Running Scenario: S3 (Preview Bar Mock)');
    mockScenario = 'BOTTOM';
    await page.goto(baseUrl + '?agx_debug=1', { waitUntil: 'domcontentloaded' });
    // Inject Fake Preview Bar
    await page.evaluate(() => {
        localStorage.clear();
        const bar = document.createElement('div');
        bar.id = 'preview-bar-iframe'; // Recognized ID
        bar.style.position = 'fixed';
        bar.style.bottom = '0';
        bar.style.left = '0';
        bar.style.width = '100%';
        bar.style.height = '60px'; // 60px height
        bar.style.background = 'red';
        bar.style.zIndex = '999999';
        document.body.appendChild(bar);

        // Trigger reset logic if needed, or rely on polling (polling runs in debug)
    });
    await new Promise(r => setTimeout(r, 3000)); // Wait for polling
    const s3Res = await page.evaluate(() => {
        const root = document.querySelector('[data-agx-banner-root="1"]');
        return root ? window.getComputedStyle(root).bottom : 'not-found';
    });
    console.log(`   Preview Bar simulated (60px). Banner Bottom Style: ${s3Res}`);


    // S4: TOP
    await runScenario('S4: TOP', 'TOP', true);

    // S5: Security
    console.log('\n👉 Running Scenario: S5 (Security)');
    const s5Res = await runScenario('S5 security check', 'SECURITY', true);
    if (s5Res.ctaHref === '#' || !s5Res.ctaHref) {
        console.log('   ✅ PASS: javascript: URL blocked (href is "#" or null)');
    } else {
        console.log(`   ❌ FAIL: href is ${s5Res.ctaHref}`);
    }

    console.log('\n🏁 QA Suite Complete. Please check the logs above for PASS/FAIL confirmation.');

    // await browser.close();

})();
