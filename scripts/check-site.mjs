import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

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

if (errors.length) {
  console.error('Site validation failed:\n' + errors.map(error => ' - ' + error).join('\n'));
  process.exit(1);
}
console.log('Site validation passed: ' + htmlFiles.length + ' HTML pages, local references and document landmarks checked.');
