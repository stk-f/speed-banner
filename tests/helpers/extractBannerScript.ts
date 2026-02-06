import fs from 'fs';
import path from 'path';

/**
 * Reads banner.liquid and extracts the JavaScript content from the main <script> tag.
 * Replaces {{ block.id }} with "test-block" to make it executable.
 * Searches multiple common paths for robustness.
 */
export function extractBannerScript(): string {
    // Candidate paths relative to the project root (process.cwd())
    const candidates = [
        'extensions/banner-block/blocks/banner.liquid',
        'Extensions/Banner-Block/blocks/banner.liquid',
        'Extensions/Banner-Block/banner.liquid',
        'extensions/Banner-Block/banner.liquid',
        // Fallback for standard structure if folders renamed
        'extensions/banner/blocks/banner.liquid'
    ];

    let content = '';

    for (const relPath of candidates) {
        const absPath = path.resolve(process.cwd(), relPath);
        if (fs.existsSync(absPath)) {
            content = fs.readFileSync(absPath, 'utf8');
            console.log(`[extractBannerScript] Found banner.liquid at: ${relPath}`);
            break;
        }
    }

    if (!content) {
        throw new Error(`
      [extractBannerScript] Could not find banner.liquid.
      Searched in:
      ${candidates.map(p => `  - ${p}`).join('\n')}
      Current Directory: ${process.cwd()}
    `);
    }

    // Extract content between <script> and </script>
    // Robustly find the script containing the main singleton guard
    const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
    let match;
    let targetScript = '';

    while ((match = scriptRegex.exec(content)) !== null) {
        const scriptContent = match[1];
        if (scriptContent && scriptContent.includes('window.__AGX_SPEED_BANNER__')) {
            targetScript = scriptContent;
        }
    }

    // Fallback: If no singleton found, grab the last one (less safe but fallback)
    if (!targetScript) {
        console.warn('[extractBannerScript] Warning: Specific singleton guard not found. Using last script tag.');
        const allMatches = content.match(/<script>([\s\S]*?)<\/script>/gi);
        if (!allMatches || allMatches.length === 0) {
            throw new Error('No <script> tags found in banner.liquid');
        }
        targetScript = allMatches[allMatches.length - 1].replace(/<script>|<\/script>/gi, '');
    }

    if (!targetScript) {
        throw new Error('Failed to extract script content from banner.liquid');
    }

    // Replace Liquid variables for Test Environment
    // {{ block.id }} or {{block.id}} -> 'test-block'
    let patched = targetScript.replace(/\{\{\s*block\.id\s*\}\}/g, 'test-block');

    return patched;
}
