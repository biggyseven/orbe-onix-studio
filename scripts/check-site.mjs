import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const htmlFiles = readdirSync(root).filter(name => name.endsWith('.html'));
const errors = [];
const exists = path => { try { return statSync(path).isFile(); } catch { return false; } };

for (const file of htmlFiles) {
  const source = readFileSync(join(root, file), 'utf8');
  if (!/<html\s+lang=["']fr["']/i.test(source)) errors.push(file + ': missing French document language');
  if (!/<title>\s*[^<]+\s*<\/title>/i.test(source)) errors.push(file + ': missing title');
  if (!/<h1\b/i.test(source)) errors.push(file + ': missing primary heading');
  if (!/<main\b[^>]*id=["']main["']/i.test(source)) errors.push(file + ': missing main landmark or skip-link target');

  const refs = [...source.matchAll(/(?:href|src)=["']([^"'#]+)["']/gi)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue;
    const clean = decodeURIComponent(ref.split('?')[0]);
    const target = resolve(root, clean.startsWith('/') ? '.' + clean : clean);
    if (!target.startsWith(root + '/') && target !== root) {
      errors.push(file + ': path escapes site root: ' + ref);
    } else if (!exists(target)) {
      errors.push(file + ': missing local asset or page: ' + ref);
    }
  }
}

// Lightweight CSS integrity check. It catches malformed blocks and broken local url() references.
const cssPath = join(root, 'assets', 'site.css');
const css = readFileSync(cssPath, 'utf8');
let depth = 0;
let quote = '';
let inComment = false;
for (let i = 0; i < css.length; i++) {
  const ch = css[i];
  const next = css[i + 1];
  if (inComment) {
    if (ch === '*' && next === '/') { inComment = false; i++; }
    continue;
  }
  if (quote) {
    if (ch === '\\') i++;
    else if (ch === quote) quote = '';
    continue;
  }
  if (ch === '/' && next === '*') { inComment = true; i++; continue; }
  if (ch === '"' || ch === "'") { quote = ch; continue; }
  if (ch === '{') depth++;
  if (ch === '}') {
    depth--;
    if (depth < 0) { errors.push('assets/site.css: unexpected closing brace'); break; }
  }
}
if (inComment) errors.push('assets/site.css: unclosed comment');
if (quote) errors.push('assets/site.css: unclosed string');
if (depth !== 0) errors.push('assets/site.css: unbalanced braces');

for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
  const url = match[2].trim();
  if (!url || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) continue;
  const target = resolve(root, 'assets', decodeURIComponent(url.split('?')[0]));
  if (!target.startsWith(resolve(root, 'assets') + '/') && target !== resolve(root, 'assets')) {
    errors.push('assets/site.css: url escapes asset directory: ' + url);
  } else if (!exists(target)) {
    errors.push('assets/site.css: missing local url() resource: ' + url);
  }
}

if (errors.length) {
  console.error('Site validation failed:\n' + errors.map(error => ' - ' + error).join('\n'));
  process.exit(1);
}
console.log('Site validation passed: ' + htmlFiles.length + ' HTML pages, local references, document landmarks and CSS integrity checked.');
