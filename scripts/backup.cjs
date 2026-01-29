const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Configuration ---
// Determine paths dynamically but respect user requirement using environment variables if strictly needed
// or just resolve from the script location.
// Requirement: "Root: C:\Users\olivy\.gemini\antigravity\workspace\shopify-speed-banner"
// We can find root relative to this script (scripts/backup.cjs -> ../)
const ROOT_DIR = path.resolve(__dirname, '..');

// Requirement: "Output: C:\Users\olivy\OneDrive\デスクトップ\shopify-speed-banner"
// We try to construct this robustly using USERPROFILE, or fall back to the raw path.
const DESKTOP_DIR = path.join(os.homedir(), 'OneDrive', 'デスクトップ');
const OUTPUT_DIR = path.join(DESKTOP_DIR, 'shopify-speed-banner');

const APP_NAME = 'shopify-speed-banner';

// Base Excludes (Wildcards supported by tar --exclude)
const BASE_EXCLUDES = [
    'node_modules',
    '.git',
    '.shopify',
    'dist',
    'build',
    '.cache',
    'coverage',
    '.turbo',
    '.next',
    // Zip/Tar logic
    '*.zip',
    '*.tar.gz',
    // Secrets & Keys
    '.env',
    // '.env.*', // handled dynamically to save .env.example
    '*.pem', '*.key', '*.p12', '*.crt', '*.cer',
    'secrets*', '*secret*', '*token*', '*apikey*', '*api_key*',
    // Database
    'database.sqlite',
    'prisma/*.db',
    'prisma/*.db-journal',
    'prisma/dev.sqlite',
    'prisma/dev.sqlite-journal',
    // IDE
    '.vscode',
    '.idea'
];

// --- Helpers ---
function getGitInfo() {
    try {
        execSync('git --version', { stdio: 'ignore' });
    } catch (e) { return { type: 'nogit' }; }

    try {
        execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    } catch (e) { return { type: 'nogit' }; }

    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        const shortSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        return { type: 'git', branch, shortSha };
    } catch (e) {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        return { type: 'nocommit', branch };
    }
}

function getFormattedDate() {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}_${HH}-${mm}`;
}

function generateFilename() {
    const dateStr = getFormattedDate();
    const gitInfo = getGitInfo();

    let suffix = '';
    if (gitInfo.type === 'git') {
        const safeBranch = gitInfo.branch.replace(/[\/\\]/g, '-');
        suffix = `__branch-${safeBranch}__sha-${gitInfo.shortSha}`;
    } else if (gitInfo.type === 'nocommit') {
        const safeBranch = gitInfo.branch.replace(/[\/\\]/g, '-');
        suffix = `__branch-${safeBranch}__nocommit`;
    } else {
        suffix = `__nogit`;
    }

    return `${APP_NAME}__${dateStr}${suffix}.zip`;
}

function resolveCollision(targetPath) {
    if (!fs.existsSync(targetPath)) return targetPath;

    const ext = path.extname(targetPath); // .zip
    const dir = path.dirname(targetPath);
    const name = path.basename(targetPath, ext); // filename without .zip

    let counter = 2;
    let finalPath = targetPath;

    while (fs.existsSync(finalPath)) {
        finalPath = path.join(dir, `${name}__${counter}${ext}`);
        counter++;
    }
    return finalPath;
}

// --- Main ---
try {
    // 1. Ensure absolute root context
    console.log(`📂 Project Root: ${ROOT_DIR}`);
    process.chdir(ROOT_DIR);

    // 2. Prepare Output Directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        console.log(`📁 Creating output directory: ${OUTPUT_DIR}`);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 3. Resolve filename
    const baseFilename = generateFilename();
    let fullOutputPath = path.join(OUTPUT_DIR, baseFilename);
    fullOutputPath = resolveCollision(fullOutputPath);

    console.log(`📦 Preparing backup to: ${fullOutputPath}`);

    // 4. Build Exclusion List
    // Dynamic check for .env.* files to exclude them UNLESS it is .env.example
    const dynamicExcludes = [];
    try {
        const files = fs.readdirSync(ROOT_DIR);
        files.forEach(f => {
            if (f.startsWith('.env') && f !== '.env.example' && f !== '.env') {
                // .env is already in BASE_EXCLUDES.
                // pass specific filenames to be safe
                dynamicExcludes.push(f);
            }
        });
    } catch (e) { /* ignore */ }

    const allExcludes = [...BASE_EXCLUDES, ...dynamicExcludes];

    // 5. Execute Compression
    // Command: tar -a -c -f "<fullPath>" <excludes> .
    // Note: Using "." includes dotfiles (like .eslintrc)
    const excludeArgs = allExcludes.map(pattern => `--exclude "${pattern}"`).join(' ');
    const command = `tar -a -c -f "${fullOutputPath}" ${excludeArgs} .`;

    console.log('⏳ Archiving...');
    console.log(`   (Excluding: ${allExcludes.length} patterns/files)`);
    // console.log(`   Command: ${command}`); // Debug only

    execSync(command, { stdio: 'inherit' });

    // 6. Report
    console.log('---------------------------------------------------');
    console.log(`✅ Backup Complete!`);
    console.log(`📍 Location: ${fullOutputPath}`);
    console.log(`🚫 Excludes:`);
    console.log(allExcludes.map(e => `   - ${e}`).join('\n'));
    console.log('---------------------------------------------------');

} catch (e) {
    console.error('❌ Backup failed:', e.message);
    process.exit(1);
}
