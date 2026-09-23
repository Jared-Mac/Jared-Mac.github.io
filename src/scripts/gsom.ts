/* Growing self-organizing map for trail-network construction, after Macshane & Ahmadinia,
   "AI Assisted Trail Map Generation based on Public GPS Data" (SIEDS 2023), §III:

   1. Initialization: three neurons at random data points; growth threshold GT = −2·ln(SF).
   2. Growth & learning: present each point; the nearest neuron wins, and every neuron within
      radius r of the winner moves toward the point by LR(k, N) = 0.02^⌊(1+k)/|N|⌋. A point whose
      error is at least GT grows a new neuron on itself. Repeat until no weight changes.
   3. Connection rule: present each point again and join its two nearest neurons with an edge
      ("neurons that fire together wire together"). Points are anonymous, never sequential traces.
   4. Collapsing: the rule over-connects into false triangles; repeatedly take the highest-degree
      node in a triangle and contract every triangle through it into their mean.
   5. Smoothing: adapt again without growth, first at 2r (50 runs) then at r/2 (20 runs).

   The paper does not give the smoothing learning rate, so this uses the schedule's base, 0.02. */

export type Pt = [number, number];
export interface Snapshot { nodes: Pt[]; edges: [number, number][]; }
export interface GsomResult { grown: Pt[]; connected: Snapshot; triangles: [number, number, number][]; final: Snapshot; }

const d2 = (a: Pt, b: Pt) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

function nearest(nodes: Pt[], p: Pt) {
  let best = 0, bd = Infinity, second = -1, sd = Infinity;
  nodes.forEach((n, i) => {
    const q = d2(n, p);
    if (q < bd) { second = best; sd = bd; best = i; bd = q; } else if (q < sd) { second = i; sd = q; }
  });
  return { best, second, dist: Math.sqrt(bd) };
}

function adapt(nodes: Pt[], p: Pt, winner: number, r: number, lr: number) {
  let moved = 0;
  const w = nodes[winner];
  for (const n of nodes) {
    if (d2(n, w) > r * r) continue;
    const dx = lr * (p[0] - n[0]), dy = lr * (p[1] - n[1]);
    n[0] += dx; n[1] += dy;
    moved += Math.abs(dx) + Math.abs(dy);
  }
  return moved;
}

const key = (a: number, b: number) => a < b ? `${a},${b}` : `${b},${a}`;

function triangles(n: number, edges: Set<string>) {
  const adj = Array.from({ length: n }, () => new Set<number>());
  for (const e of edges) { const [a, b] = e.split(',').map(Number); adj[a].add(b); adj[b].add(a); }
  const tris: [number, number, number][] = [];
  for (let a = 0; a < n; a++) for (const b of adj[a]) if (b > a) for (const c of adj[b]) if (c > b && adj[a].has(c)) tris.push([a, b, c]);
  return { tris, adj };
}

export function gsom(data: Pt[], o: { spreadFactor: number; scale: number; r: number; rng: () => number }): GsomResult {
  const GT = -2 * Math.log(o.spreadFactor) * o.scale;
  const nodes: Pt[] = [0, 1, 2].map(() => [...data[Math.floor(o.rng() * data.length)]] as Pt);

  // Growth & learning, until the weights stop changing.
  let k = 0;
  for (let epoch = 0; epoch < 12; epoch++) {
    let dW = 0;
    for (const p of data) {
      const { best, dist } = nearest(nodes, p);
      dW += adapt(nodes, p, best, o.r, Math.pow(0.02, Math.floor((1 + k) / nodes.length)));
      if (dist >= GT) nodes.push([p[0], p[1]]);
      k++;
    }
    if (dW < 1e-9) break;
  }
  const grown = nodes.map(n => [...n] as Pt);

  // Connection rule.
  const edges = new Set<string>();
  for (const p of data) { const { best, second } = nearest(nodes, p); if (second >= 0) edges.add(key(best, second)); }
  const toList = (s: Set<string>) => [...s].map(e => e.split(',').map(Number) as [number, number]);
  const connected = { nodes: grown.map(n => [...n] as Pt), edges: toList(edges) };
  const firstTris = triangles(nodes.length, edges).tris;

  // Collapse triangles around the highest-degree node until none remain.
  let cur = nodes.map(n => [...n] as Pt), curEdges = edges;
  for (;;) {
    const { tris, adj } = triangles(cur.length, curEdges);
    if (!tris.length) break;
    let hub = tris[0][0];
    for (const t of tris) for (const v of t) if (adj[v].size > adj[hub].size) hub = v;
    const T = new Set<number>();
    for (const t of tris) if (t.includes(hub)) t.forEach(v => T.add(v));
    const mean: Pt = [0, 0];
    T.forEach(v => { mean[0] += cur[v][0] / T.size; mean[1] += cur[v][1] / T.size; });
    const remap = new Map<number, number>(), next: Pt[] = [];
    cur.forEach((n, i) => { if (!T.has(i)) { remap.set(i, next.length); next.push(n); } });
    const merged = next.length;
    next.push(mean);
    T.forEach(v => remap.set(v, merged));
    const ne = new Set<string>();
    for (const e of curEdges) {
      const [a, b] = e.split(',').map(Number), ra = remap.get(a)!, rb = remap.get(b)!;
      if (ra !== rb) ne.add(key(ra, rb));
    }
    cur = next; curEdges = ne;
  }

  // Smoothing: no growth, wide then narrow neighbourhoods.
  for (let run = 0; run < 70; run++) {
    const r = run < 50 ? o.r * 2 : o.r * 0.5;
    for (const p of data) adapt(cur, p, nearest(cur, p).best, r, 0.02);
  }
  return { grown, connected, triangles: firstTris, final: { nodes: cur, edges: toList(curEdges) } };
}
