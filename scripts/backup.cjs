const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const APP_NAME = 'shopify-speed-banner';
const EXCLUDES = [
    'node_modules',
    '.git',
    '.shopify',
    'dist',
    'build',
    '.cache',
    'coverage',
    '*.zip', // Don't zip other zips
    '*.tar.gz'
];

// --- Helpers ---
function getGitInfo() {
    try {
        // Check if git exists
        execSync('git --version', { stdio: 'ignore' });
    } catch (e) {
        return { type: 'nogit' };
    }

    try {
        // Check if valid repo
        execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    } catch (e) {
        return { type: 'nogit' };
    }

    try {
        // Check if valid HEAD (commits exist)
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        const shortSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        return { type: 'git', branch, shortSha };
    } catch (e) {
        // Git repo exists, but maybe no commits yet
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
        // Sanitize branch name for filename (replace / with -)
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

function resolveCollision(basePath) {
    let finalPath = basePath;
    let counter = 2;
    const ext = path.extname(basePath); // .zip
    const name = path.basename(basePath, ext); // filename without .zip
    const dir = path.dirname(basePath);

    while (fs.existsSync(finalPath)) {
        finalPath = path.join(dir, `${name}__${counter}${ext}`);
        counter++;
    }
    return finalPath;
}

// --- Main ---
try {
    console.log('📦 Preparing backup...');

    const baseFilename = generateFilename();
    const finalFilename = resolveCollision(baseFilename);

    console.log(`📄 Target file: ${finalFilename}`);

    // Construct exclude args for tar
    // Windows 10+ has tar.exe.
    // We use quotes to handle potential spaces, though unlikely in these ignores.
    const excludeArgs = EXCLUDES.map(pattern => `--exclude "${pattern}"`).join(' ');

    // Command: tar -a -c -f <file> <excludes> .
    const command = `tar -a -c -f "${finalFilename}" ${excludeArgs} *`;

    console.log('⏳ Archiving (this may take a moment)...');
    execSync(command, { stdio: 'inherit' });

    console.log(`✅ Backup created successfully: ${finalFilename}`);

} catch (e) {
    console.error('❌ Backup failed:', e.message);
    process.exit(1);
}
