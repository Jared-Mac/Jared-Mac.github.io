# Jared Macshane

Personal research portfolio built with Astro, TypeScript, and custom CSS.
Published at **https://jaredmacshane.com/** through GitHub Pages.

## Development

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Astro prints the local preview URL. Run `npm run build` to check types, generate
the static site, and validate content migration, local links, metadata, and feeds.
Run `npm run preview` to serve the production build.

## Content

- `content/project/*/index.md`: project descriptions and metadata.
- `content/publication/*/*/index.md`: publications, authors, abstracts, DOI and paper links.
- `content/authors/admin/_index.md`: biography, education, awards, and profile information.
- `content/experience.md`: research and industry experience.
- `static/uploads/resume.pdf`: downloadable CV.
- `static/uploads/mantis/`: original research figures.
- `src/pages/index.astro`: homepage introduction and featured research.
- `src/styles/global.css`: design system and responsive layouts.

Existing Markdown front matter is supported directly; no content conversion is
needed. Entries marked `draft: true` are excluded. The name `admin` in publication
author lists renders as Jared Macshane. Search and year filters run in the browser;
all content and navigation are available without JavaScript.

## Publishing

Pushing to `main` runs `.github/workflows/deploy.yml`, which checks and builds the
site, then uploads `dist/` to GitHub Pages. Pull requests run the same validation
without deploying. Generated output and dependencies are not committed.

In repository Settings → Pages, use **GitHub Actions** as the source and
`jaredmacshane.com` as the custom domain. Enable **Enforce HTTPS** once GitHub has
issued its certificate. The canonical origin is defined in `astro.config.mjs`
and `src/lib/content.ts`; `static/CNAME` preserves the custom domain.

Original project/publication URLs, topic pages, RSS URLs, CV downloads, and
the author-page redirect are preserved. Sitemap and social metadata are generated
at build time. Legacy Hugo-generated output and build configuration have been removed;
the previous site remains available in Git history.
