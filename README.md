# Sea Panda Creative

Static website for Sea Panda Creative, prepared for GitHub Pages.

## Build and preview

Requires Node.js 22 or newer. There are no npm dependencies.

```powershell
npm run build
npm run check
npm start
```

Open `http://127.0.0.1:4187/`. Set `PORT` if that port is already in use. The generated static site is written to `dist/`.

## Content

- `src/pages/*.html`: page content and app privacy policies.
- `src/pages.json`: page titles, descriptions, hero artwork, trailers, and calls to action.
- `src/posts/*.html`: news article bodies.
- `src/posts.json`: article titles, excerpts, dates, and optional banner images.
- `public/assets/site.css`: layout, colors, responsive styling, and typography.
- `public/assets/site.js`: optional video and image viewer.
- `public/assets/images/`: local artwork and screenshots.
- `site.config.json`: site title, canonical URL, domain, and logos.

To add an article, create an HTML fragment in `src/posts/` and add its metadata to `src/posts.json`. The build generates the article page, news index, feed, sitemap, and 404 page.

Internal page links use trailing slashes, such as `/polytropos/`. To test a repository-path deployment locally, use:

```powershell
node scripts/build.mjs --base /repository-name
node scripts/check.mjs --base /repository-name
```

## GitHub Pages

The repository includes `.github/workflows/pages.yml`, which builds and deploys `dist/` whenever `main` changes.

1. In the repository’s **Settings → Pages**, choose **GitHub Actions** as the source.
2. Push changes to `main`, or run **Deploy Sea Panda Creative** from the Actions tab.
3. Wait for the workflow to finish, then open the URL shown in Pages settings.
4. For a custom domain, enter it under **Settings → Pages → Custom domain**, configure the DNS records GitHub provides, and enable HTTPS after the certificate is ready.

The site is entirely static. It has no login, comments, signup form, analytics, database, server functions, or secret keys. Store links and video embeds point to their respective external services.

## Verification

`npm run check` validates generated HTML, local links, fragment targets, asset paths, accessibility metadata, and GitHub Pages size limits.
