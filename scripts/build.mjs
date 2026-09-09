import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = name => readFile(path.join(root, name), 'utf8');
const config = JSON.parse(await read('site.config.json'));
const pages = JSON.parse(await read('src/pages.json'));
const posts = JSON.parse(await read('src/posts.json')).sort((a, b) => b.date.localeCompare(a.date));
const baseArg = process.argv.indexOf('--base');
const rawBase = baseArg === -1 ? '' : process.argv[baseArg + 1];
if (rawBase === undefined || !/^\/?[\w/-]*$/.test(rawBase)) throw new Error('Use --base /repository-name (or omit for a custom domain).');
const base = rawBase.replace(/^\/+|\/+$/g, '');
const prefix = base ? `/${base}` : '';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateText = value => new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'America/New_York' }).format(new Date(value));
const urlFor = route => `${config.url}${route}`;
const withBase = html => html.replace(/\b(href|src)="\/(?!\/)/g, `$1="${prefix}/`);
const routes = [];

// Only this script-owned output directory is replaced; source and assets stay intact.
if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') throw new Error('Invalid build output');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });

function navigation(route) {
  const links = [['/', 'Home'], ['/news/', 'News'], ['/team/', 'Team'], ['/games/', 'Games']];
  return `<header class="site-header"><div class="nav-wrap">
    <a class="brand" href="/" aria-label="Sea Panda Creative home"><img src="${config.logo}" alt="" width="44" height="44"><span>Sea Panda<span class="brand-subtitle">Creative</span></span></a>
    <nav aria-label="Main navigation">${links.map(([href, label]) => {
      const active = href === '/' ? route === '/' : href === '/games/' ? ['/games/', '/polytropos/', '/orcinus/', '/number-nibbler/', '/orcinus-privacy/', '/number-nibbler-privacy/'].includes(route) : route.startsWith(href);
      return `<a href="${href}"${active ? ' aria-current="page"' : ''}${label === 'Games' ? ' class="nav-games"' : ''}>${label}</a>`;
    }).join('')}</nav></div></header>`;
}

function heroMarkup(hero, home = false) {
  return `<section class="hero${home ? ' hero-home' : ''}${hero.image ? ' hero-media' : ''}" aria-labelledby="page-title">
    <div class="hero-inner"><div class="hero-copy"><h1 id="page-title">${escape(hero.title)}</h1>
    ${hero.button ? `<a class="button" href="${escape(hero.button.href)}">${escape(hero.button.label)}</a>` : ''}</div>
    ${hero.image ? `<div class="hero-image"><img src="${hero.image}" alt="${escape(hero.imageAlt)}" fetchpriority="high"${home ? ' width="600" height="600"' : ''}>
      ${hero.video ? `<a href="${escape(hero.video)}" class="play-button" data-video aria-label="Play ${escape(hero.title)} trailer"><span aria-hidden="true">▶</span></a>` : ''}</div>` : ''}</div></section>`;
}

function document({ title, description, route, content, hero, home = false, noindex = false }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title === config.name ? title : `${title} — ${config.name}`)}</title>
  <meta name="description" content="${escape(description || config.description)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${urlFor(route)}">`}
  <link rel="icon" href="${config.favicon}" type="image/png">
  <link rel="alternate" href="/news.atom" title="Sea Panda Creative News" type="application/atom+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <script src="/assets/site.js" defer></script>
</head>
<body class="page-${escape(route.split('/')[1] || 'home')}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${navigation(route)}
  <main id="main">${hero ? heroMarkup(hero, home) : ''}${content}</main>
  <footer class="site-footer"><div class="footer-wrap"><p>Created by David and Adalia Socha</p><nav aria-label="Social links"><a href="https://twitter.com/david1socha">Twitter</a><a href="https://www.youtube.com/@seapandacreative/">YouTube</a></nav></div></footer>
  <dialog class="media-dialog" aria-label="Media viewer"><button type="button" class="dialog-close" aria-label="Close media viewer">Close ×</button><div class="dialog-content"></div></dialog>
</body>
</html>
`;
}

async function emit(route, data) {
  const output = route === '/404.html' ? '404.html' : `${route.replace(/^\//, '')}index.html`;
  const target = path.join(dist, output);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, withBase(document({ route, ...data })));
  if (!data.noindex) routes.push(route);
}

for (const page of pages) {
  const route = page.slug === 'home' ? '/' : `/${page.slug}/`;
  await emit(route, { ...page, home: page.slug === 'home', content: await read(`src/pages/${page.slug}.html`) });
}

function newsCard(post) {
  const route = `/news/articles/${post.slug}/`;
  return `<article class="news-card">${post.image ? `<a href="${route}" tabindex="-1" aria-hidden="true"><img src="${post.image}" alt="" loading="lazy"></a>` : ''}
    <div>
    <h2><a href="${route}">${escape(post.title)}</a></h2><p>${escape(post.excerpt)}</p><time datetime="${escape(post.date)}">${dateText(post.date)}</time></div></article>`;
}

await emit('/news/', {
  title: 'News',
  hero: { title: 'News' },
  content: `<div class="news-layout"><div class="news-list">${posts.map(newsCard).join('\n')}</div></div>`
});

for (const post of posts) {
  const route = `/news/articles/${post.slug}/`;
  const body = await read(`src/posts/${post.slug}.html`);
  await emit(route, { title: post.title, description: post.excerpt,
    content: `<article class="post"><a class="back-link" href="/news/">← All news</a><header><h1>${escape(post.title)}</h1><p class="post-meta">David1socha · <time datetime="${post.date}">${dateText(post.date)}</time></p>${post.image ? `<img class="post-banner" src="${post.image}" alt="${escape(post.title)}">` : ''}</header>${body}</article>`
  });
}

await emit('/404.html', { title: 'Page not found', noindex: true, hero: { title: 'Page not found' }, content: '<section class="not-found"><p>This page may have moved.</p><a class="button" href="/">Return home</a></section>' });

// Old archive links keep working, but categories are no longer part of the site.
for (const legacy of ['articles', 'announcements', 'patch-notes', 'development-logs']) {
  const target = path.join(dist, 'news', legacy);
  await mkdir(target, { recursive: true });
  const html = document({ title: 'News', route: '/news/', noindex: true, hero: { title: 'News' }, content: '<section class="not-found"><a href="/news/">Continue to all news</a></section>' });
  await writeFile(path.join(target, 'index.html'), withBase(html).replace('<head>', `<head>\n  <meta http-equiv="refresh" content="0;url=${prefix}/news/">`));
}

// Preserve the existing feed URL with a newly generated, self-contained Atom feed.
let entries = '';
for (const post of posts) {
  const body = (await read(`src/posts/${post.slug}.html`)).replace(/\b(href|src)="\/(?!\/)/g, `$1="${config.url}/`);
  entries += `<entry><id>${escape(post.feedId || `tag:seapanda.xyz,2005:Article/${post.slug}`)}</id><title>${escape(post.title)}</title><link href="${urlFor(`/news/articles/${post.slug}/`)}"/><published>${post.date}</published><updated>${post.updated || post.date}</updated><author><name>Sea Panda Creative</name></author><summary>${escape(post.excerpt)}</summary><content type="html">${escape(body)}</content></entry>\n`;
}
await writeFile(path.join(dist, 'news.atom'), `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><id>${config.url}/news</id><title>Sea Panda Creative — News</title><updated>${posts[0]?.updated || new Date().toISOString()}</updated><link href="${config.url}/news/"/><link rel="self" href="${config.url}/news.atom"/>${entries}</feed>\n`);
await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route => `<url><loc>${urlFor(route)}</loc></url>`).join('')}</urlset>\n`);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.url}/sitemap.xml\n`);
await writeFile(path.join(dist, '.nojekyll'), '');
await writeFile(path.join(dist, 'CNAME'), `${config.domain}\n`);
console.log(`Built ${routes.length} content pages + 404 and legacy news redirects in ${dist}${base ? ` (base: /${base})` : ''}.`);
