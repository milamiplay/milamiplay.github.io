// Build script: extracts <path> elements from assets/ukraine-oblasts.svg
// and injects them into index.html, replacing the <!--MAP_PATHS--> placeholder.
//
// Idempotent — can be run multiple times safely:
// existing embedded paths are stripped before re-injection.
//
// Usage: node scripts/build.js

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ── Extract paths from SVG ─────────────────────────────────────────────────
const svgSrc = fs.readFileSync(path.join(ROOT, 'assets/ukraine-oblasts.svg'), 'utf8');

const pathRe = /<path\s+d="([^"]+)"\s*\n?\s*title="([^"]*)"\s*\n?\s*id="([^"]+)"\s*\/>/g;
const paths  = [];
let match;

while ((match = pathRe.exec(svgSrc)) !== null) {
    const [, d, title, id] = match;
    paths.push(`<path d="${d}" class="map-region" id="region-${id}" data-title="${title}"></path>`);
}

if (!paths.length) {
    console.error('No paths found — check the regex against the SVG formatting.');
    process.exit(1);
}

// ── Inject into index.html (idempotent) ────────────────────────────────────
const indexPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Strip any previously injected paths, restoring the placeholder
html = html.replace(
    /<g id="map-paths">[\s\S]*?<\/g>/,
    '<g id="map-paths"><!--MAP_PATHS--></g>'
);

// Inject new paths
html = html.replace('<!--MAP_PATHS-->', paths.join('\n'));

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`Injected ${paths.length} region paths → index.html`);
