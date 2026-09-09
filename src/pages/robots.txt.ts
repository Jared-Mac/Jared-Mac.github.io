import { site } from '../lib/content';
export function GET() { return new Response(`User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`); }
