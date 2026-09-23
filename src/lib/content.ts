import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface Entry {
  slug: string; path: string; title: string; summary: string; body: string;
  tags: string[]; date: string; year: string; draft?: boolean; featured?: boolean;
  abstract?: string; authors?: string[]; doi?: string; publication?: string;
  publication_short?: string; url_pdf?: string; url_code?: string; url_project?: string;
  publication_status?: string; publication_types?: string[];
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
export const projectKicker: Record<string, string> = {
  mantis: 'Task-informed neural compression', shield: 'Community-scale digital twins', wildfire: 'Resource-aware environmental sensing', 'trail-mapping': 'Geospatial machine learning', 'vr-labs': 'Immersive science education',
};
/** Captions for each project's riso figure, saying what is measured and what is illustrative. */
export const projectFigure: Record<string, string> = {
  mantis: 'Top: the data path from the paper’s Fig. 1. A frame passes through the shared stem into the cGDN-modulated encoder (its ten conditioning sites in red), while the TaskDetector’s P_task drives the modulator; the latent ẑ crosses the uplink and fans out to task decoder–head chains, here routed to smoke detection. Bottom: measured mean bitrate per latent channel for urban segmentation (teal), wildlife detection (blue) and fire/smoke detection (red), from the paper’s channel-usage analysis.',
  shield: 'Illustration: the city below and its digital twin above. Rooftop sensors stream observations up to the twin, where a flood simulation (dashed line) runs ahead of the water level observed on the ground.',
  wildfire: 'Illustration: seven sampled fire perimeters from one ignition, as a conditional generative spread model produces them. Ink accumulates where samples agree, the lake stops every sample, and dashed isochrones follow the mean perimeter over time.',
  'trail-mapping': 'A real run of the growing self-organizing map on synthetic trails: 820 anonymous GPS fixes (red) and the collapsed, smoothed network of neurons (blue), with junction neurons filled. The dashed ring marks the neighbourhood radius r.',
  'vr-labs': 'Illustration: an overhead tracking camera’s view of a lab bench. Each object carries an ArUco-style marker, and each detection is outlined with its corners and pose axes (x red, y teal, z toward the camera).',
};
export const projectImage = (slug: string) => slug === 'mantis' ? '/uploads/mantis/architecture.png' : null;
export const canonicalPaths = ['/', '/projects/', '/publications/', '/experience/', '/tags/', ...projects.map(p => p.path), ...publications.map(p => p.path), ...tags.map(t => `/tags/${slugify(t)}/`)];
export const xmlEscape = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
