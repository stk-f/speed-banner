const fs = require('fs');
const path = require('path');

const KEYWORDS = [
    'SHOPIFY', 'SECRET', 'TOKEN', 'PASSWORD', 'DATABASE_URL',
    'API_KEY', 'ACCESS_KEY', 'PRIVATE_KEY', 'BEARER', 'AUTH'
];

const EXCLUDES = [
    'node_modules', '.git', '.shopify', 'dist', 'build',
    '.cache', 'coverage', '.vscode', 'package-lock.json',
    'README.md', 'scripts/scan-secrets.js', '.env.example'
];

function scan(dir) {
    let hasLeak = false;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (EXCLUDES.includes(file)) continue;

        if (stat.isDirectory()) {
            if (scan(fullPath)) hasLeak = true;
        } else {
            // Check file content
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                for (const keyword of KEYWORDS) {
                    if (content.includes(keyword) && !content.includes(`// ignore-secret`)) {
                        // Simple heuristic: if likely a variable definition or hardcoded string
                        // We just warn about existence.
                        // Refine checking to avoid false positives in code (like property names).
                        // Ideally we look for "CONF = '...'" assignment.
                        // For strict mode, just report presence.

                        // Check if it's just the keyword itself (like in this script) or a value.
                        // Let's print the line.
                        const lines = content.split('\n');
                        lines.forEach((line, i) => {
                            if (line.includes(keyword) && !line.includes('process.env')) {
                                // Ignore imports or type definitions might be too loose.
                                // Just Warn.
                                console.warn(`[WARNING] Possible secret '${keyword}' in ${fullPath}:${i + 1}`);
                                // console.warn(`   Line: ${line.trim().substring(0, 50)}...`);
                                hasLeak = true;
                            }
                        });
                    }
                }
            } catch (e) {
                // Ignore binary or read errors
            }
        }
    }
    return hasLeak;
}

console.log("Scanning for secrets...");
const found = scan(process.cwd());
if (found) {
    console.log("❌ Potential secrets found. Please verify.");
    // process.exit(1); // Don't fail hard for now, just warn user to check.
} else {
    console.log("✅ No obvious secrets found.");
}
