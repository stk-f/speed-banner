const puppeteer = require('puppeteer');
const readline = require('readline');

// Config
const STORE_URL = 'https://speed-banner-dev-clean.myshopify.com';
const ADMIN_EMAIL = 'seo.analysis.jp@gmail.com';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => {
        rl.question(`\n🔷 ${question} (Press Enter to continue)`, () => resolve());
    });
}

(async () => {
    console.log('🚀 Starting Interactive QA Suite (S1-S6)...');

    /* removed duplicate */
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        userDataDir: './.puppeteer_data',
        args: ['--start-maximized']
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    // Store console logs
    let logs = [];
    page.on('console', msg => logs.push(msg.text()));

    const clearLogs = () => logs = [];

    try {
        // --- LOGIN PHASE ---
        console.log(`\n🌐 Navigating to ${STORE_URL}...`);
        await page.goto(STORE_URL);

        console.log('\n⚠️  ACTION REQUIRED:');
        console.log('1. Click "Are you the store owner? Log in here"');
        console.log(`2. Enter Email: ${ADMIN_EMAIL}`);
        console.log('3. Enter Password manually');
        console.log('4. Ensure you are on the Home Page and the Banner is visible (Placement: BOTTOM).');

        await ask('When you are successfully logged in and see the banner');

        // --- S1: BOTTOM (Production) ---
        console.log('\n🔍 Running S1: BOTTOM Display (Production Mode)...');
        // Reload to ensure clean logs
        clearLogs();
        await page.goto(STORE_URL, { waitUntil: 'networkidle0' });

        const s1_visible = await page.$('[data-agx-banner-root="1"]') !== null;
        const s1_heavy = logs.some(l => l.includes('Generic bottom iframe') || l.includes('Visual collision'));
        const s1_errors = logs.filter(l => l.toLowerCase().includes('error') && !l.includes('[AGX Debug]')); // Basic error filter

        console.log(`   Banner Visible: ${s1_visible}`);
        console.log(`   Heavy Logs Found: ${s1_heavy}`);
        if (s1_errors.length) console.log(`   Console Errors: ${s1_errors.length}`);

        const resultS1 = s1_visible && !s1_heavy && s1_errors.length === 0 ? 'PASS' : 'FAIL';
        console.log(`✅ S1 Result: ${resultS1}`);


        // --- S2: BOTTOM (Debug) ---
        console.log('\n🔍 Running S2: BOTTOM Display (Debug Mode)...');
        clearLogs();
        await page.goto(`${STORE_URL}/?agx_debug=1`, { waitUntil: 'networkidle0' });

        // Wait for potential async logs
        await new Promise(r => setTimeout(r, 2500));

        const s2_logs = logs.filter(l => l.includes('[AGX Debug]'));
        const s2_applied_offset = s2_logs.find(l => l.includes('Applied Bottom Offset'));
        const s2_rect = s2_logs.find(l => l.includes('Final Rect'));

        console.log(`   Debug Logs Found: ${s2_logs.length > 0}`);
        console.log(`   ${s2_applied_offset || 'No Offset Log'}`);
        console.log(`   ${s2_rect || 'No Rect Log'}`);

        const resultS2 = s2_logs.length > 0 && !!s2_rect ? 'PASS' : 'FAIL';
        console.log(`✅ S2 Result: ${resultS2}`);


        // --- S3: Preview Environment ---
        console.log('\n🔍 Running S3: Preview Environment Offset...');
        console.log('⚠️  ACTION REQUIRED:');
        console.log('1. Open the Theme Editor for this store in a new tab (or use existing session).');
        console.log('2. Click "Preview" to open the store with the Preview Bar.');
        console.log('3. Navigate to a Collection page in that Preview window.');
        console.log('4. Copy the URL of that Preview window (it should have _ab, _fd, or preview_theme_id).');
        console.log('   (Actually, better: Just navigate this browser tab to that Preview URL)');

        await ask('Navigate this browser tab to a Collection page with Preview Bar active');

        clearLogs();
        // We assume user navigated. check debug logic if enabled, or enable it
        if (!page.url().includes('agx_debug=1')) {
            const joiner = page.url().includes('?') ? '&' : '?';
            await page.goto(page.url() + joiner + 'agx_debug=1', { waitUntil: 'domcontentloaded' });
        }
        await new Promise(r => setTimeout(r, 2000));

        const s3_offset_log = logs.find(l => l.includes('Applied Bottom Offset'));
        console.log(`   ${s3_offset_log || 'No Offset Log'}`);
        // We expect offset > 0 if preview bar is detected
        const resultS3 = s3_offset_log && !s3_offset_log.includes('Offset: 0') ? 'PASS' : 'WARN (Offset 0 or Not Detected)';
        console.log(`✅ S3 Result: ${resultS3}`);


        // --- S4: TOP Display ---
        console.log('\n🔍 Running S4: TOP Display...');
        console.log('⚠️  ACTION REQUIRED:');
        console.log('1. Go to Theme Editor / App Embed settings.');
        console.log('2. Change Banner Placement to "TOP".');
        console.log('3. Save.');

        await ask('When TOP placement is saved');

        clearLogs();
        await page.goto(`${STORE_URL}/?agx_debug=1`, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));

        const s4_offset_log = logs.find(l => l.includes('Applied Top Offset'));
        console.log(`   ${s4_offset_log || 'No Top Offset Log'}`);

        // Check visual position
        const topVal = await page.evaluate(() => {
            const el = document.querySelector('[data-agx-banner-root="1"]');
            return el ? getComputedStyle(el).top : 'not found';
        });
        console.log(`   Computed Top: ${topVal}`);

        const resultS4 = s4_offset_log ? 'PASS' : 'FAIL';
        console.log(`✅ S4 Result: ${resultS4}`);


        // --- S5: Security ---
        console.log('\n🔍 Running S5: Security (sanitizeUrl)...');
        console.log('⚠️  ACTION REQUIRED:');
        console.log('1. Change Button URL to "javascript:alert(1)" in settings.');
        console.log('2. Save.');

        await ask('When malicious URL is saved');

        await page.reload({ waitUntil: 'networkidle0' });

        const href = await page.evaluate(() => {
            const btn = document.querySelector('[data-agx-cta="1"]');
            return btn ? btn.getAttribute('href') : 'no button';
        });

        console.log(`   Rendered href: ${href}`);
        const resultS5 = href === '#' || href === 'null' ? 'PASS' : 'FAIL';
        console.log(`✅ S5 Result: ${resultS5}`);


        // --- S6: Frequency ---
        console.log('\n🔍 Running S6: Frequency / Close...');
        console.log('⚠️  ACTION REQUIRED:');
        console.log('1. Revert any weird settings if needed (Placement BOTTOM, valid URL).');
        console.log('2. Ensure Frequency is set to something (e.g. FIRST or H24) or just rely on Close.');

        await ask('Ready to test Close logic?');

        // Clear storage
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'networkidle0' });

        // Verify visible
        let visible = await page.$('[data-agx-banner-root="1"]') !== null;
        console.log(`   Visible after clear: ${visible}`);

        // Click close
        if (visible) {
            console.log('   Clicking close...');
            await page.click('[data-agx-close="1"]');
            await new Promise(r => setTimeout(r, 500));
        }

        // Reload
        await page.reload({ waitUntil: 'networkidle0' });
        visible = await page.$('[data-agx-banner-root="1"]') !== null;
        console.log(`   Visible after reload (should be false): ${visible}`);

        const resultS6 = !visible ? 'PASS' : 'FAIL';
        console.log(`✅ S6 Result: ${resultS6}`);


        console.log('\n✨ All Scenarios Completed.');

    } catch (e) {
        console.error('❌ Error during verification:', e);
    } finally {
        console.log('Closing browser...');
        // await browser.close(); // Keep open for review?
        process.exit(0);
    }
})();
