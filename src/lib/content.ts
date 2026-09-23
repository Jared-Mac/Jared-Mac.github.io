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
  components?: { name: string; focus: string; summary: string; url: string }[];
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
/** Display titles for cards and project pages, and the title of each page's main figure. */
export const projectDesign: Record<string, { title: string; figure: string }> = {
  mantis: { title: 'MANTIS', figure: 'Keep the useful signal' },
  shield: { title: 'SHIELD', figure: 'A city, twice' },
  wildfire: { title: 'Wildfire intelligence', figure: 'Reading a changing landscape' },
  'trail-mapping': { title: 'Finding the trail', figure: 'From traces to topology' },
  'vr-labs': { title: 'A laboratory without walls', figure: 'Physical action, virtual response' },
};
/** A project without a design entry falls back to its own title rather than breaking the build. */
export const designOf = (project: Entry) => projectDesign[project.slug] ?? { title: project.title, figure: project.title };
/** Captions for each project's riso figure, saying what is measured and what is illustrative. */
export const projectFigure: Record<string, string> = {
  mantis: 'Conceptual view of MANTIS: an observed frame passes through a shared stem and a task-conditioned encoder. A compact latent representation crosses the uplink to task-specific decoder–head chains. The pink conditioning path represents the task signal; the three outputs represent urban segmentation, wildlife detection, and smoke detection. This illustration shows the architecture, not measured performance.',
  shield: 'Conceptual view of a community and its digital twin. Sensors in the physical city feed a computational model, where a possible flood scenario can be explored. The filled city represents observations; the wireframe city represents simulation.',
  wildfire: 'Illustrative spread scenarios from one ignition under a prevailing wind. Overlapping pink perimeters suggest uncertainty, contours describe synthetic terrain, and a reservoir interrupts the scenarios. These are procedural illustrations, not model predictions or an operational fire map.',
  'trail-mapping': 'From 820 synthetic GPS fixes to a connected trail network. Both panels use the same inputs: the left shows noisy observations, and the right shows the output of the growing self-organizing map, followed by triangle collapse and smoothing. This is an actual algorithm run on synthetic data.',
  'vr-labs': 'Conceptual view of a tracked laboratory. An overhead camera tracks an ArUco-style marker attached to the physical beaker. The marker’s position and orientation connect the beaker to its virtual counterpart. Colored axes indicate pose; the marker is illustrative.',
};
export const projectImage = (slug: string) => slug === 'mantis' ? '/uploads/mantis/architecture.png' : null;
export const canonicalPaths = ['/', '/projects/', '/publications/', '/experience/', '/tags/', ...projects.map(p => p.path), ...publications.map(p => p.path), ...tags.map(t => `/tags/${slugify(t)}/`)];
export const xmlEscape = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
