import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface Entry {
  slug: string; path: string; title: string; summary: string; body: string;
  tags: string[]; date: string; year: string; draft?: boolean; featured?: boolean;
  abstract?: string; authors?: string[]; doi?: string; publication?: string;
  publication_short?: string; url_pdf?: string; url_code?: string; url_project?: string;
}
export const site = 'https://jaredmacshane.com';
export const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const markdown = (text: string) => marked.parse(text, { async: false });
function readEntries(section: string): Entry[] {
  const root = join(process.cwd(), 'content', section);
  const entries: Entry[] = [];
  function walk(dir: string) {
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, file.name);
      if (file.isDirectory()) walk(path);
      else if (file.name === 'index.md') {
        const { data, content } = matter(readFileSync(path, 'utf8'));
        if (data.draft) continue;
        const slug = relative(root, dirname(path)).replaceAll('\\', '/');
        const date = new Date(data.date).toISOString();
        entries.push({ ...data, slug, path: `/${section}/${slug}/`, body: content, date, year: date.slice(0, 4) } as Entry);
      }
    }
  }
  walk(root);
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
export const projects = readEntries('project');
export const publications = readEntries('publication');
export const tags = [...new Set([...projects, ...publications].flatMap(entry => entry.tags))].sort();
export const profile = matter(readFileSync(join(process.cwd(), 'content/authors/admin/_index.md'), 'utf8'));
export const experience = matter(readFileSync(join(process.cwd(), 'content/experience.md'), 'utf8')).data;
export const authors = (entry: Entry) => entry.authors?.map(name => name === 'admin' ? 'Jared Macshane' : name).join(', ') ?? '';
export const shortTitle: Record<string, string> = {
  mantis: 'MANTIS', shield: 'SHIELD', wildfire: 'Wildfire intelligence', 'trail-mapping': 'Mapping the unmarked', 'vr-labs': 'Hands-on, virtually',
};
export const projectKicker: Record<string, string> = {
  mantis: 'Task-informed neural compression', shield: 'Community-scale digital twins', wildfire: 'Resource-aware environmental sensing', 'trail-mapping': 'Geospatial machine learning', 'vr-labs': 'Immersive science education',
};
export const projectImage = (slug: string) => slug === 'mantis' ? '/uploads/mantis/architecture.png' : null;
export const canonicalPaths = ['/', '/projects/', '/publications/', '/experience/', '/tags/', ...projects.map(p => p.path), ...publications.map(p => p.path), ...tags.map(t => `/tags/${slugify(t)}/`)];
export const xmlEscape = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
