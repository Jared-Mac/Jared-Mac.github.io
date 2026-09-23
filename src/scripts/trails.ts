/* The synthetic trail network behind the trail-mapping figures: four trails with two junctions
   and one loop, and anonymous GPS fixes scattered around them (no ordering, as in public OSM
   point dumps). Popular trails collect more fixes. */
import type { Pt } from './gsom';

export const TRAILS: { pts: Pt[]; weight: number }[] = [
  { weight: 1, pts: [[40, 560], [160, 500], [260, 470], [360, 410], [430, 330], [520, 300], [640, 250], [760, 170], [900, 110], [985, 80]] },
  { weight: 0.8, pts: [[430, 330], [470, 420], [560, 480], [700, 500], [840, 540], [985, 565]] },
  { weight: 0.55, pts: [[700, 500], [735, 420], [705, 340], [640, 250]] },
  { weight: 0.5, pts: [[260, 470], [185, 360], [120, 230], [55, 120]] },
];

export function gpsFixes(rng: () => number, gauss: (r: () => number) => number, count = 820, sigma = 7): Pt[] {
  const segs: { a: Pt; b: Pt; w: number }[] = [];
  for (const t of TRAILS) for (let i = 1; i < t.pts.length; i++) {
    const a = t.pts[i - 1], b = t.pts[i];
    segs.push({ a, b, w: Math.hypot(b[0] - a[0], b[1] - a[1]) * t.weight });
  }
  const total = segs.reduce((s, x) => s + x.w, 0), out: Pt[] = [];
  for (let n = 0; n < count; n++) {
    let pick = rng() * total, s = segs[0];
    for (s of segs) { if ((pick -= s.w) <= 0) break; }
    const u = rng();
    out.push([s.a[0] + (s.b[0] - s.a[0]) * u + gauss(rng) * sigma, s.a[1] + (s.b[1] - s.a[1]) * u + gauss(rng) * sigma]);
  }
  return out;
}
