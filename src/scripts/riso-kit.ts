/* Drawing kit shared by the riso scenes: palette, seeded randomness, hand-cut shapes and plate
   operations. Scenes draw coverage in a 1000-unit-wide space; alpha is tone. */

export type Ink = keyof typeof INK;
export type Rng = () => number;
export type Plates = (g: CanvasRenderingContext2D, ink: Ink, rng: Rng, sr: Rng) => void;
/** A scene: height in 1000-wide units, its inks, the plate drawing, and optional crisp notation
    printed after the plates. `labelsFrom` is the smallest CSS width at which notation is legible. */
export interface Scene {
  h: number; inks: Ink[]; plates: Plates;
  ground?: Plates;
  screen?: { pitch: number; texture: number; registration: number };
  annotate?: (g: CanvasRenderingContext2D) => void;
  labelsFrom?: number;
}

/* The riso drum inks from sevenevesai/riso-windowseat. Secondary colours come from overprinting:
   yellow + pink prints orange, blue + pink lavender, yellow + blue green. Indigo stands in for black. */
export const INK = {
  yellow: '#FFE800', pink: '#FF48B0', blue: '#0078BF', green: '#00A95C',
  orange: '#FF6C2F', violet: '#765BA7', indigo: '#2E3192',
};

// Rational tangents (b/a), so each rotated dot grid tiles without a seam.
export const SCREEN: Record<Ink, [number, number]> = {
  yellow: [1, 0], pink: [1, 4], blue: [4, 1], green: [1, 1], orange: [2, 1], violet: [1, 2], indigo: [1, 1],
};
// Fixed misregistration per plate, in CSS px: enough to see on a contour, never enough to blur it.
export const REG: Record<Ink, [number, number]> = {
  yellow: [1.1, 0.8], pink: [-1.1, 0.9], blue: [0.8, -0.6], green: [-0.8, -0.8], orange: [0.6, 1], violet: [-0.9, -0.5], indigo: [0, 0],
};
export const PITCH = 2.6;  // CSS px between dot centres
export const U = 1000;     // scenes draw in a 1000-unit-wide space
export const TAU = Math.PI * 2;

/* ── deterministic randomness ── */

export function mulberry32(a: number): Rng {
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const rngFor = (key: string) => mulberry32(hash(key));
export const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;

export function cv(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
export const ctx = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;

/* ── craft kit: shapes carry hand wobble; nothing is a true circle or straight line ── */

export function makeWob(rng: Rng, harmonics = 3) {
  const h: number[][] = [];
  for (let i = 0; i < harmonics; i++) h.push([2 + i, rng() * 2 - 1, rng() * TAU]);
  return (t: number) => h.reduce((s, [k, a, p]) => s + a * Math.sin(k * t + p), 0) / harmonics;
}

export function curve(pts: number[][], closed: boolean, per = 10) {
  const n = pts.length, out: number[][] = [];
  const at = (i: number) => pts[closed ? (i + n * 2) % n : clamp(i, 0, n - 1)];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
        + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}

export function ringPts(x: number, y: number, rx: number, ry: number, n: number, rot = 0) {
  const out: number[][] = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU, px = Math.cos(t) * rx, py = Math.sin(t) * ry;
    out.push([x + px * c - py * s, y + px * s + py * c]);
  }
  return out;
}

/** Closed hand-cut contour through control points. amp is edge waver in units. */
export function cut(pts: number[][], rng: Rng, amp = 2) {
  const c = curve(pts, true, 10), n = c.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = c[i], b = c[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area > 0 ? 1 : -1;
  const w1 = makeWob(rng, 4), w2 = makeWob(rng, 9), d = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / n * TAU; d[i] = (w1(t) + w2(t * 3) * 0.3) * amp; }
  const p = new Path2D();
  for (let i = 0; i < n; i++) {
    const a = c[(i - 1 + n) % n], b = c[(i + 1) % n];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    const x = c[i][0] + sgn * ty * d[i], y = c[i][1] - sgn * tx * d[i];
    if (i) p.lineTo(x, y); else p.moveTo(x, y);
  }
  p.closePath();
  return p;
}

/** A hand-cut polygon that keeps its corners: edges are densely sampled before cut() smooths. */
export function poly(pts: number[][], rng: Rng, amp = 1) {
  const dense: number[][] = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length], n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12));
    for (let k = 0; k < n; k++) dense.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  });
  return cut(dense, rng, amp);
}
export const box = (x: number, y: number, w: number, h: number, rng: Rng, amp = 1) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], rng, amp);

/** A wobbly open stroke as a polyline path, for line work. */
export function line(pts: number[][], rng: Rng, amp = 1.2) {
  const c = curve(pts, false, 8), w = makeWob(rng, 5), p = new Path2D();
  c.forEach(([x, y], i) => {
    const o = w(i * 0.21) * amp;
    if (i) p.lineTo(x + o, y - o); else p.moveTo(x + o, y - o);
  });
  return p;
}

/** A horizon band closed to the bottom of the frame. */
export function ridge(f: (u: number) => number, h: number, n = 140) {
  const p = new Path2D();
  p.moveTo(-40, h + 40);
  for (let i = 0; i <= n; i++) p.lineTo(-40 + i / n * (U + 80), f(i / n));
  p.lineTo(U + 40, h + 40);
  p.closePath();
  return p;
}
export function ridgeAt(y: number, rng: Rng, amp = 40, freq = 5, tilt = 0) {
  const w = makeWob(rng, 5), t = makeWob(rng, 7);
  return (u: number) => y + w(u * freq) * amp + tilt * (u - 0.5) * U + t(u * 37) * amp * 0.12;
}
export function peaksAt(y: number, rng: Rng, amp = 90, n = 5) {
  const ps = Array.from({ length: n }, (_, i) => ({
    c: (i + 0.5) / n + (rng() - 0.5) * 0.7 / n, h: amp * (0.4 + rng() * 0.6), w: (0.55 + rng() * 0.9) / n, lean: (rng() - 0.5) * 0.7,
  }));
  const jag = makeWob(rng, 8);
  return (u: number) => {
    let top = y;
    for (const p of ps) {
      const d = (u - p.c) / p.w;
      top = Math.min(top, y - p.h * Math.max(0, 1 - Math.abs(d)) * (1 + p.lean * (d > 0 ? 1 : -1)));
    }
    return top + jag(u * 26) * amp * 0.06;
  };
}

export const tone = (g: CanvasRenderingContext2D, a: number) => { g.globalAlpha = clamp(a, 0, 1); };
export function print(g: CanvasRenderingContext2D, p: Path2D, a = 1) { tone(g, a); g.fill(p); }
export function carve(g: CanvasRenderingContext2D, p: Path2D) {
  g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'destination-out'; g.fill(p); g.restore();
}
/** Print at an exact tone, clearing what the plate already holds beneath. */
export function plane(g: CanvasRenderingContext2D, p: Path2D, a: number) { carve(g, p); print(g, p, a); }
export function keyline(g: CanvasRenderingContext2D, p: Path2D, w = 2.5, a = 1) { tone(g, a); g.lineWidth = w; g.stroke(p); }
/** Tone ramp inside a shape: the screen turns it into a dot-size ramp. */
export function shade(g: CanvasRenderingContext2D, p: Path2D, grad: CanvasGradient) {
  g.save(); g.clip(p); g.globalAlpha = 1; g.fillStyle = grad; g.fill(p); g.restore();
}
export function linear(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, number][]) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [at, a] of stops) gr.addColorStop(at, `rgba(0,0,0,${a})`);
  return gr;
}
export function radial(g: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, number][]) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, a] of stops) gr.addColorStop(at, `rgba(0,0,0,${a})`);
  return gr;
}
export const rect = (x: number, y: number, w: number, h: number) => { const p = new Path2D(); p.rect(x, y, w, h); return p; };
export const full = (h: number) => rect(-20, -20, U + 40, h + 40);
/** Stroke a shape with a dash pattern, in scene units. */
export function dashed(g: CanvasRenderingContext2D, p: Path2D, dash: number[], w = 2, a = 1) {
  g.save(); g.setLineDash(dash); keyline(g, p, w, a); g.restore();
}

/** A filled disc; circles are small enough here that wobble would only read as error. */
export function disc(x: number, y: number, r: number, into = new Path2D()) {
  into.moveTo(x + r, y); into.arc(x, y, r, 0, TAU);
  return into;
}

/** A straight arrow with an open chevron head. */
export function arrow(x0: number, y0: number, x1: number, y1: number, head = 10) {
  const p = new Path2D(), a = Math.atan2(y1 - y0, x1 - x0);
  p.moveTo(x0, y0); p.lineTo(x1, y1);
  p.moveTo(x1 - head * Math.cos(a - 0.5), y1 - head * Math.sin(a - 0.5));
  p.lineTo(x1, y1);
  p.lineTo(x1 - head * Math.cos(a + 0.5), y1 - head * Math.sin(a + 0.5));
  return p;
}

/** A smooth height field: a few Gaussian hills over a long, low swell. */
export function terrain(hills: [number, number, number, number][], swell = 0.12) {
  return (x: number, y: number) => {
    let h = swell * (Math.sin(x * 0.006 + 1.3) + Math.cos(y * 0.008 - 0.4));
    for (const [cx, cy, s, amp] of hills) h += amp * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));
    return h;
  };
}

/** Contour lines of f by marching squares, as one path per call. */
export function isolines(f: (x: number, y: number) => number, levels: number[], x0: number, y0: number, w: number, h: number, step = 8) {
  const nx = Math.ceil(w / step), ny = Math.ceil(h / step), v: number[] = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) v.push(f(x0 + i * step, y0 + j * step));
  const at = (i: number, j: number) => v[j * (nx + 1) + i];
  const p = new Path2D();
  // Edges: 0 top, 1 right, 2 bottom, 3 left; each case lists the edge pairs it joins.
  const CASES: number[][] = [[], [3, 2], [2, 1], [3, 1], [0, 1], [0, 3, 2, 1], [0, 2], [0, 3], [0, 3], [0, 2], [0, 1, 3, 2], [0, 1], [3, 1], [2, 1], [3, 2], []];
  for (const L of levels) {
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const segs = CASES[(a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0)];
      if (!segs.length) continue;
      const x = x0 + i * step, y = y0 + j * step, t = (p: number, q: number) => (L - p) / (q - p);
      const pt = (e: number) => e === 0 ? [x + t(a, b) * step, y] : e === 1 ? [x + step, y + t(b, c) * step]
        : e === 2 ? [x + t(d, c) * step, y + step] : [x, y + t(a, d) * step];
      for (let s = 0; s < segs.length; s += 2) {
        const [px, py] = pt(segs[s]), [qx, qy] = pt(segs[s + 1]);
        p.moveTo(px, py); p.lineTo(qx, qy);
      }
    }
  }
  return p;
}

/** Deterministic Gaussian sample. */
export function gauss(rng: Rng) {
  const u = Math.max(1e-9, rng()), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}
