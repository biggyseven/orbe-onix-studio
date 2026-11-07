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

const studyPath = join(root, 'etude-de-forme.html');
if (exists(studyPath)) {
  const studyHtml = readFileSync(studyPath, 'utf8');
  const sculptureScriptPath = join(root, 'assets', 'hero-3d.js');
  const sculptureScript = exists(sculptureScriptPath) ? readFileSync(sculptureScriptPath, 'utf8') : '';

  for (const [label, token] of [
    ['3D PNG export control', 'data-sculpture-capture'],
    ['live export status', 'data-capture-status'],
    ['keyboard shortcut declaration', 'aria-keyshortcuts="Space 1 2 3 C F"']
  ]) {
    if (!studyHtml.includes(token)) errors.push('etude-de-forme.html: missing ' + label);
  }

  for (const [label, token] of [
    ['transparent PNG capture pipeline', 'readRenderTargetPixels'],
    ['keyboard interaction handler', 'document.addEventListener("keydown"'],
    ['three-view gallery renderer', 'const renderStudyGallery'],
    ['gallery render-target readback', 'renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels)'],
    ['gallery view activation', 'data-study-gallery-view']
  ]) {
    if (!sculptureScript.includes(token)) errors.push('assets/hero-3d.js: missing ' + label);
  }

  const galleryStart = studyHtml.indexOf('<section class="study-gallery"');
  const galleryEnd = studyHtml.indexOf('<section class="study-materials"', galleryStart);
  const galleryHtml = galleryStart >= 0 && galleryEnd > galleryStart
    ? studyHtml.slice(galleryStart, galleryEnd)
    : '';

  const galleryCards = galleryHtml.match(/class="study-gallery-card /g) || [];
  if (galleryCards.length !== 3) errors.push('etude-de-forme.html: expected exactly three composition cards');
  for (const view of ['front', 'three-quarter', 'side']) {
    if (!galleryHtml.includes('data-study-render="' + view + '"')) {
      errors.push('etude-de-forme.html: missing ' + view + ' gallery render slot');
    }
    if (!galleryHtml.includes('data-study-gallery-view="' + view + '"')) {
      errors.push('etude-de-forme.html: missing ' + view + ' gallery action');
    }
  }
}

const workPath = join(root, 'work.html');
if (exists(workPath)) {
  const workHtml = readFileSync(workPath, 'utf8');
  for (const filter of ['all', 'sites', 'commerce', 'applications']) {
    if (!workHtml.includes('data-filter="' + filter + '"')) {
      errors.push('work.html: missing archive filter ' + filter);
    }
  }
  for (const category of ['sites', 'commerce', 'applications']) {
    const cards = workHtml.match(new RegExp('data-category="' + category + '"', 'g')) || [];
    if (cards.length !== 1) errors.push('work.html: expected one concept in category ' + category);
  }
  if (workHtml.includes('data-door-reveal') || workHtml.includes('work.html?door=1')) {
    errors.push('work.html: the old door overlay must not hide the updated archive');
  }
    if ((workHtml.match(/class="portfolio-card-scope"/g) || []).length !== 3) {
    errors.push('work.html: every concept must declare its explored scope');
  }
}

const servicesPath = join(root, 'services.html');
if (exists(servicesPath)) {
  const servicesHtml = readFileSync(servicesPath, 'utf8');
  if ((servicesHtml.match(/class="services-card"/g) || []).length !== 4) {
    errors.push('services.html: expected four service families');
  }
  if ((servicesHtml.match(/class="services-process-step"/g) || []).length !== 5) {
    errors.push('services.html: expected five process steps');
  }
  if ((servicesHtml.match(/<details>/g) || []).length !== 6) {
    errors.push('services.html: expected six FAQ entries');
  }
  if (!servicesHtml.includes('Il n’envoie pas automatiquement votre demande')) {
    errors.push('services.html: contact brief limitation must remain explicit');
  }
}

const projectPath = join(root, 'project.html');
const siteScriptPath = join(root, 'assets', 'site.js');
if (exists(projectPath) && exists(siteScriptPath)) {
  const projectHtml = readFileSync(projectPath, 'utf8');
  const siteScript = readFileSync(siteScriptPath, 'utf8');

  for (const key of ['naya-house', 'forme', 'flowstate']) {
    if (!siteScript.includes("'" + key + "': {")) {
      errors.push('assets/site.js: missing case-study data for ' + key);
    }
    if (!projectHtml.includes('data-project-demo="' + key + '"')) {
      errors.push('project.html: missing prototype for ' + key);
    }
  }
  for (const selector of ["'#case-scope':data.scopeShort", "'#case-honesty':data.honesty"]) {
    if (!siteScript.includes(selector)) errors.push('assets/site.js: missing project-specific case field ' + selector);
  }
  if (!projectHtml.includes('id="case-honesty"')) {
    errors.push('project.html: missing visible project honesty disclosure');
  }
}

if (errors.length) {
  console.error('Site validation failed:\n' + errors.map(error => ' - ' + error).join('\n'));
  process.exit(1);
}
console.log('Site validation passed: ' + htmlFiles.length + ' HTML pages, local references and document landmarks checked.');
