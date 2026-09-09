import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const argIndex = process.argv.indexOf('--base');
const baseName = argIndex === -1 ? '' : (process.argv[argIndex + 1] || '').replace(/^\/+|\/+$/g, '');
const base = baseName ? '/' + baseName : '';
async function walk(dir, prefix = '') {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(path.join(dir, entry.name), `${name}/`));
    else files.push(name);
  }
  return files;
}
const files = await walk(dist);
const fileSet = new Set(files);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const errors = [];
let links = 0;
const documents = new Map(await Promise.all(htmlFiles.map(async file => [file, await readFile(path.join(dist, file), 'utf8')])));
function reference(raw, from) {
  raw = raw.replaceAll('&amp;', '&');
  if (/^(https?:|mailto:|tel:|data:)/.test(raw) || raw.startsWith('//')) return;
  const current = from.endsWith('index.html') ? from.slice(0, -10) : from;
  const url = new URL(raw, `https://preview.invalid${base}/${current}`);
  let local = decodeURIComponent(url.pathname);
  if (base) {
    if (!local.startsWith(base + '/') && local !== base) { errors.push(`${from}: link escapes base: ${raw}`); return; }
    local = local.slice(base.length);
  }
  local = local.replace(/^\//, '');
  if (!local || local.endsWith('/')) local += 'index.html';
  if (!fileSet.has(local)) { errors.push(`${from}: missing or wrong-case file: ${raw}`); return; }
  if (url.hash && documents.has(local)) {
    const id = decodeURIComponent(url.hash.slice(1));
    if (!documents.get(local).includes(`id="${id}"`)) errors.push(`${from}: missing anchor ${raw}`);
  }
  links++;
}
for (const [file, html] of documents) {
  if (/<form\b|csrf|turbolinks|static\.manakeep|linodeobjects|\/auth\/|email\/subscribe|news_comments/i.test(html)) errors.push(`${file}: old platform dependency`);
  if ((html.match(/<h1\b/g) || []).length !== 1) errors.push(`${file}: expected one main heading`);
  if (!/<html lang="en">/.test(html) || !/<meta name="viewport"/.test(html) || !/<main id="main">/.test(html)) errors.push(`${file}: missing document accessibility metadata`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
  if (new Set(ids).size !== ids.length) errors.push(`${file}: duplicate element IDs`);
  for (const match of html.matchAll(/<(a|img|script|link|iframe)\b[^>]*>/g)) {
    const tag = match[0];
    for (const attr of tag.matchAll(/\b(?:href|src)="([^"]+)"/g)) reference(attr[1], file);
    if (match[1] === 'img' && !/\balt=/.test(tag)) errors.push(`${file}: image lacks alt text`);
    if (match[1] === 'iframe' && !/\btitle=/.test(tag)) errors.push(`${file}: iframe lacks title`);
    if (['img', 'script', 'link'].includes(match[1]) && /\b(?:src|href)="https?:/.test(tag) && !/rel="canonical"/.test(tag)) errors.push(`${file}: externally hosted asset`);
  }
}
const css = await readFile(path.join(dist, 'assets/site.css'), 'utf8');
for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) reference(match[1], 'assets/site.css');
const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
if ((await readFile(path.join(dist, 'CNAME'), 'utf8')).trim() !== config.domain) errors.push('CNAME does not match site.config.json');
for (const name of ['.nojekyll', 'news.atom', 'sitemap.xml', 'robots.txt', '404.html', 'orcinus-privacy/index.html', 'number-nibbler-privacy/index.html']) if (!fileSet.has(name)) errors.push(`Missing ${name}`);
let bytes = 0;
for (const file of files) {
  const size = (await stat(path.join(dist, file))).size;
  if (size > 100 * 1024 * 1024) errors.push(`File exceeds GitHub regular Git file limit: ${file}`);
  bytes += size;
}
if (bytes > 1024 ** 3) errors.push('Site exceeds GitHub Pages 1 GiB limit');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Passed: ${htmlFiles.length} HTML files, ${links} local references, ${(bytes / 1024 ** 2).toFixed(1)} MiB; no missing local files or ManaKeep runtime dependencies.`);
