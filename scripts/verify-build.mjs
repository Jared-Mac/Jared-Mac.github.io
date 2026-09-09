import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

// Check the deployed artifact, including content migration and navigation targets.
const root = 'dist';
const domain = 'https://jaredmacshane.com';
const files = readdirSync(root, { recursive: true }).filter(file => statSync(join(root, file)).isFile());
const htmlFiles = files.filter(file => file.endsWith('.html'));
let checkedLinks = 0;
for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');
  assert(!html.includes('https://jared-mac.github.io/'), `${file}: stale canonical domain`);
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  assert(canonical?.[1].startsWith(domain + '/'), `${file}: missing canonical URL`);
  const redirect = /http-equiv="refresh"/.test(html);
  if (!redirect) {
    assert.match(html, /<html lang="en"/, `${file}: missing document language`);
    assert.match(html, /<main\b[^>]*id="main"/, `${file}: missing main landmark`);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${file}: expected exactly one h1`);
    assert.match(html, /<meta name="description" content="[^"]+"/, `${file}: missing description`);
    assert.match(html, /<meta property="og:title" content="[^"]+"/, `${file}: missing Open Graph title`);
    assert.match(html, /<meta name="twitter:description" content="[^"]+"/, `${file}: missing X description`);
    if (file.startsWith('publication/')) assert(!html.includes('property="og:image"'), `${file}: inherited irrelevant publication image`);
  }
  for (const match of html.matchAll(/\b(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    const value = match[1].replaceAll('&amp;', '&');
    if (!value.startsWith('/') && !value.startsWith(domain + '/')) continue;
    const pathname = decodeURIComponent(new URL(value, domain).pathname);
    const path = join(root, pathname);
    assert(existsSync(path) || existsSync(join(path, 'index.html')), `${file}: broken local URL ${value}`);
    checkedLinks++;
  }
  for (const image of html.matchAll(/<img\b[^>]*>/g)) assert(/\balt="[^"]*"/.test(image[0]), `${file}: image has no alt text`);
}
let published = 0;
let drafts = 0;
for (const section of ['project', 'publication']) {
  for (const file of readdirSync(`content/${section}`, { recursive: true }).filter(p => p.endsWith('/index.md'))) {
    const entry = matter(readFileSync(join('content', section, file), 'utf8'));
    const path = join(root, section, file.replace(/index\.md$/, 'index.html'));
    if (entry.data.draft) {
      assert(!existsSync(path), `Draft exposed: ${path}`);
      drafts++;
    } else {
      assert(existsSync(path), `Missing migrated content: ${path}`);
      const html = readFileSync(path, 'utf8');
      assert(html.includes(entry.data.title.replaceAll('&', '&amp;')), `Incorrect title: ${path}`);
      if (entry.data.doi) assert(html.includes(`https://doi.org/${entry.data.doi}`), `Missing DOI: ${path}`);
      published++;
    }
  }
}
assert.equal(readFileSync('dist/CNAME', 'utf8').trim(), 'jaredmacshane.com');
assert(existsSync('dist/.nojekyll'));
assert.match(readFileSync('dist/robots.txt', 'utf8'), /Sitemap: https:\/\/jaredmacshane.com\/sitemap.xml/);
assert.match(readFileSync('dist/index.xml', 'utf8'), /<rss version="2.0">/);
assert(statSync('dist/uploads/resume.pdf').size > 1000);
console.log(`Verified ${htmlFiles.length} pages, ${checkedLinks} internal links, ${published} migrated entries, ${drafts} excluded draft, canonical metadata, CV, feeds, and custom domain.`);
