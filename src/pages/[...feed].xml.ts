import { projects, publications, tags, slugify, site, xmlEscape, type Entry } from '../lib/content';
export function getStaticPaths() {
  const all = [...publications, ...projects].sort((a,b) => b.date.localeCompare(a.date));
  return [
    { params: { feed: 'index' }, props: { entries: all } },
    { params: { feed: 'project/index' }, props: { entries: projects } },
    { params: { feed: 'publication/index' }, props: { entries: publications } },
    { params: { feed: 'publication_types/index' }, props: { entries: publications } },
    ...['conference-paper', 'journal-article', 'preprint'].map((type, index) => ({ params: { feed: `publication_types/${index + 1}/index` }, props: { entries: publications.filter(p => p.slug.startsWith(type + '/')) } })),
    { params: { feed: 'tags/index' }, props: { entries: all } },
    ...tags.map(tag => ({ params: { feed: `tags/${slugify(tag)}/index` }, props: { entries: all.filter(p => p.tags.includes(tag)) } })),
  ];
}
export function GET({ props }: { props: { entries: Entry[] } }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Jared Macshane — Research</title><link>${site}/</link><description>Projects and publications in systems and machine learning.</description><language>en</language>${props.entries.map(entry => `<item><title>${xmlEscape(entry.title)}</title><link>${site}${entry.path}</link><guid>${site}${entry.path}</guid><description>${xmlEscape(entry.summary)}</description><pubDate>${new Date(entry.date).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
