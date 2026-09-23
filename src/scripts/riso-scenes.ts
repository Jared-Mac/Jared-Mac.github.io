/* Scenes for the site's riso prints. Each scene draws once per ink; see riso-kit.ts for the
   conventions (1000-unit-wide space, alpha is tone, carve before printing over another ink). */
import {
  U, TAU, type Scene, type Rng, type Ink, cut, poly, box, line, ringPts, ridge, ridgeAt, peaksAt,
  print, carve, plane, keyline, shade, linear, radial, rect, full, dashed, disc, arrow, terrain, isolines, gauss, rngFor,
} from './riso-kit';
import { gsom, type GsomResult, type Pt } from './gsom';
import { gpsFixes } from './trails';

export const SCENES: Record<string, Scene> = {};
type G = CanvasRenderingContext2D;

/* ── Plate 01, home: a UAV over a range at dusk sends shrinking packets to an edge mast ── */

SCENES.hero = {
  h: 440, inks: ['sun', 'red', 'teal', 'navy'],
  plates(g, ink, _rng, sr) {
    const H = 440;
    const far = ridge(peaksAt(250, sr, 70, 6), H);
    const mid = ridge(ridgeAt(305, sr, 30, 4, 0.03), H);
    const nearF = ridgeAt(370, sr, 22, 3, -0.07);
    const near = ridge(nearF, H);
    const sun = cut(ringPts(250, 196, 64, 64, 14), sr, 1.2);
    const dx = 610, dy = 118;
    const cone = new Path2D();
    cone.moveTo(dx - 6, dy + 12); cone.lineTo(dx + 6, dy + 12); cone.lineTo(dx + 120, H + 10); cone.lineTo(dx - 105, H + 10); cone.closePath();
    const body = cut([[-26, -6], [26, -6], [30, 4], [18, 10], [-18, 10], [-30, 4]].map(([x, y]) => [dx + x, dy + y]), sr, 0.6);
    const craft = new Path2D();
    craft.addPath(body); craft.rect(dx - 74, dy - 3, 148, 5);
    const rotors = new Path2D();
    for (const s of [-1, 1]) { craft.rect(dx + s * 70 - 5, dy - 12, 10, 12); rotors.ellipse(dx + s * 70, dy - 14, 42, 3.2, 0, 0, TAU); }
    disc(dx, dy + 14, 6.5, craft);
    const mx = 862, my = nearF((mx + 40) / (U + 80));
    const mast = new Path2D(), braces = new Path2D();
    mast.moveTo(mx - 14, my + 6); mast.lineTo(mx - 3, my - 118); mast.lineTo(mx + 3, my - 118); mast.lineTo(mx + 14, my + 6); mast.closePath();
    for (let i = 0; i < 5; i++) {
      const y0 = my - i * 24, y1 = y0 - 24, w0 = 14 - i * 2.2, w1 = 14 - (i + 1) * 2.2;
      braces.moveTo(mx - w0, y0); braces.lineTo(mx + w1, y1); braces.moveTo(mx + w0, y0); braces.lineTo(mx - w1, y1);
    }
    const dish = cut(ringPts(mx + 10, my - 96, 8, 11, 8, 0.3), sr, 0.4);
    const packets = new Path2D();
    for (let i = 0, n = 11; i < n; i++) {
      const t = (i + 0.7) / (n + 0.4), s = 13 * (1 - t) + 4;   // each packet smaller than the last
      const x = dx + 80 + (mx - dx - 88) * t, y = dy - 6 + (my - 126 - dy) * t - Math.sin(t * Math.PI) * 38;
      packets.rect(x - s / 2, y - s / 2, s, s);
    }
    const stars = new Path2D();
    for (let i = 0; i < 26; i++) disc(sr() * U, sr() * 130, 1 + sr() * 1.6, stars);
    const lands: [Path2D, number, number, number][] = [[far, 0.34, 0, 0.18], [mid, 0.6, 0.12, 0.3], [near, 0.45, 0.88, 0.25]]; // teal, navy, lit navy

    if (ink === 'sun') {
      shade(g, full(H), linear(g, 0, 40, 0, 300, [[0, 0], [1, 0.7]]));
      shade(g, full(H), radial(g, 250, 196, 200, [[0, 0.45], [1, 0]]));
      print(g, sun, 1);
      for (const [p] of lands) carve(g, p);
      g.save(); g.clip(cone); for (const [p] of lands) print(g, p, 0.55); g.restore();
      carve(g, craft); carve(g, rotors); carve(g, packets);
    }
    if (ink === 'red') {
      shade(g, full(H), linear(g, 0, 0, 0, 280, [[0, 0.4], [0.7, 0.18], [1, 0.08]]));
      carve(g, sun); print(g, sun, 0.55);
      for (const [p] of lands) carve(g, p);
      print(g, far, 0.16);
      carve(g, craft); carve(g, rotors);
      carve(g, packets); print(g, packets, 1);
    }
    if (ink === 'teal') {
      for (const [p, a] of lands) plane(g, p, a);
      g.save(); g.clip(cone); for (const [p, a] of lands) plane(g, p, a * 0.5); g.restore();
      carve(g, packets);
    }
    if (ink === 'navy') {
      shade(g, full(H), linear(g, 0, 0, 0, 150, [[0, 0.4], [1, 0]]));
      carve(g, sun);
      print(g, stars, 0.9);
      for (const [p, , a] of lands) plane(g, p, a);
      g.save(); g.clip(cone); for (const [p, , , lit] of lands) plane(g, p, lit); g.restore();
      print(g, craft, 1); print(g, rotors, 0.5);
      carve(g, packets);
      print(g, mast, 1); keyline(g, braces, 2.2); print(g, dish, 1);
    }
  },
};

/* ── MANTIS: the Fig. 1 data path, and the measured latent channel usage by task ──
   Client: frame → shared stem → cGDN encoder (ten conditioning sites), with the TaskDetector's
   P_task driving the modulator. The latent ẑ crosses the link and fans out to three task
   decoder–head chains; the smoke frame routes to the fire head. Below: mean bpp per latent
   channel for each task, read from the paper's channel-usage heatmap (units of 1e-4 bpp). */

const USAGE = {
  uavid: [3, 4, 4, 2, 2, 12, 2, 25, 3, 8, 2, 2, 2, 9, 4, 8, 4, 2, 4, 12, 3, 3, 4, 14, 2, 2, 65, 8, 38, 5, 5, 5, 2, 4, 2, 9, 6, 3, 2, 18, 2, 2, 2, 2, 2, 7, 7, 7],
  waid: [5, 15, 18, 2, 2, 36, 2, 42, 6, 22, 2, 2, 2, 27, 20, 28, 8, 5, 18, 27, 3, 3, 28, 34, 24, 6, 73, 27, 60, 27, 13, 26, 2, 27, 4, 28, 28, 6, 3, 9, 3, 5, 2, 2, 4, 40, 31, 30],
  fire: [9, 3, 6, 3, 3, 6, 3, 26, 3, 21, 21, 5, 3, 12, 3, 3, 3, 3, 10, 10, 3, 4, 3, 20, 4, 22, 63, 10, 68, 8, 3, 3, 3, 5, 3, 7, 14, 3, 3, 8, 3, 3, 3, 5, 3, 6, 7, 5],
};
const USAGE_MAX = 73;

/** Small glyphs for the three tasks, drawn into a w×h tile at (x, y). */
function taskGlyph(g: G, ink: Ink, task: 'uavid' | 'waid' | 'fire', x: number, y: number, w: number, h: number, sr: Rng, a = 1) {
  const tile = rect(x, y, w, h);
  if (task === 'uavid') {                                    // segmentation mask: a mosaic of classes
    const cols = 5, rows = 4, cw = w / cols, ch = h / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const cls = (i * 7 + j * 3 + (i > 2 && j > 1 ? 1 : 0)) % 4, c = rect(x + i * cw, y + j * ch, cw, ch);
      if (ink === 'sun' && cls !== 2) print(g, c, [0.7, 0.3, 0, 0.9][cls] * a);
      if (ink === 'teal' && cls !== 3) print(g, c, [0.2, 0.7, 0.5, 0][cls] * a);
      if (ink === 'navy' && cls === 2) print(g, c, 0.55 * a);
    }
  }
  if (task === 'waid') {                                     // wildlife detection: animals in boxes
    if (ink === 'teal') print(g, tile, 0.45 * a);
    if (ink === 'sun') print(g, tile, 0.3 * a);
    for (const [u, v, s] of [[0.25, 0.35, 1], [0.62, 0.62, 0.8], [0.8, 0.28, 0.7]]) {
      const cx = x + u * w, cy = y + v * h, r = 5.5 * s;
      const animal = cut(ringPts(cx, cy, r * 1.4, r, 8, 0.4), sr, 0.5);
      if (ink === 'navy') { carve(g, animal); print(g, animal, a); }
      if (ink === 'teal') carve(g, animal);
      if (ink === 'red') keyline(g, rect(cx - r * 2.2, cy - r * 1.9, r * 4.4, r * 3.8), 1.8, a);
    }
  }
  if (task === 'fire') {                                     // smoke detection: a plume in a box
    if (ink === 'sun') print(g, tile, 0.35 * a);
    if (ink === 'teal') print(g, rect(x, y + h * 0.72, w, h * 0.28), 0.6 * a);
    const plume = cut([[x + w * 0.3, y + h * 0.75], [x + w * 0.22, y + h * 0.5], [x + w * 0.4, y + h * 0.25], [x + w * 0.75, y + h * 0.12], [x + w * 0.62, y + h * 0.4], [x + w * 0.42, y + h * 0.75]], sr, 1.2);
    if (ink === 'navy') { carve(g, plume); shade(g, plume, linear(g, x, y + h, x + w, y, [[0, 0.6], [1, 0.2]])); }
    if (ink === 'sun' || ink === 'teal') carve(g, plume);
    if (ink === 'red') { print(g, disc(x + w * 0.35, y + h * 0.76, 3), a); keyline(g, rect(x + w * 0.14, y + h * 0.06, w * 0.72, h * 0.8), 1.8, a); }
  }
  if (ink === 'navy') keyline(g, tile, 1.6, a);
}

SCENES.mantis = {
  h: 625, inks: ['sun', 'red', 'teal', 'navy'],
  plates(g, ink, _rng, sr) {
    // Input frame: a wildland–urban-interface tile with a road, houses, trees and a new plume.
    const fx = 40, fy = 60, fs = 200, frame = rect(fx, fy, fs, fs);
    const road = new Path2D();
    road.moveTo(fx, fy + 150); road.bezierCurveTo(fx + 70, fy + 130, fx + 120, fy + 70, fx + fs, fy + 55);
    const houses = new Path2D();
    for (const [u, v] of [[0.12, 0.55], [0.3, 0.5], [0.44, 0.34], [0.62, 0.18], [0.2, 0.86]]) houses.addPath(box(fx + u * fs, fy + v * fs, 18, 14, sr, 0.4));
    const trees = new Path2D();
    for (let i = 0; i < 26; i++) disc(fx + 110 + sr() * 85, fy + 95 + sr() * 95, 6 + sr() * 6, trees);
    const plume = cut([[fx + 150, fy + 150], [fx + 120, fy + 110], [fx + 118, fy + 60], [fx + 90, fy + 22], [fx + 140, fy + 40], [fx + 165, fy + 95], [fx + 172, fy + 140]], sr, 3);

    // Client path.
    const stem = new Path2D();
    for (let i = 0; i < 3; i++) stem.addPath(poly([[272 + i * 14, 88 + i * 8], [296 + i * 14, 78 + i * 8], [296 + i * 14, 232 + i * 8], [272 + i * 14, 242 + i * 8]], sr, 0.5));
    const enc = poly([[370, 70], [510, 128], [510, 196], [370, 254]], sr, 0.8);
    const sites = new Path2D();
    for (let i = 0; i < 10; i++) { const x = 382 + i * 12.5, t = (x - 370) / 140; sites.moveTo(x, 76 + t * 56); sites.lineTo(x, 248 - t * 56); }
    const pBars: [number, number][] = [[0.18, 0], [0.1, 0], [0.86, 1]];         // P_task: urban, wildlife, fire
    const bars = new Path2D(), fireBar = new Path2D();
    pBars.forEach(([p, hot], i) => (hot ? fireBar : bars).rect(282 + i * 18, 330 - p * 62, 12, p * 62));
    const modulator = disc(420, 312, 11);

    // Latent ẑ, a 4×4 patch of its grid, toned by the fire task's channel usage.
    const z: [Path2D, number][] = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) z.push([rect(530 + i * 13, 136 + j * 13, 11, 11), USAGE.fire[(j * 4 + i) * 3] / USAGE_MAX]);
    const link = new Path2D(); link.moveTo(592, 162); link.lineTo(770, 162);
    const waves = new Path2D();
    for (const r of [10, 18, 26]) { waves.moveTo(680 + r * Math.cos(-2.4), 132 + r * Math.sin(-2.4)); waves.arc(680, 132, r, -2.4, -0.74); }
    const antenna = new Path2D(); antenna.moveTo(680, 162); antenna.lineTo(680, 134);

    // Server: fan-out to three decoder → head chains.
    const heads: ['uavid' | 'waid' | 'fire', number][] = [['uavid', 60], ['waid', 162], ['fire', 264]];
    const fan = new Path2D(); fan.moveTo(770, 162); fan.lineTo(790, 162); fan.moveTo(790, 95); fan.lineTo(790, 299);
    const decoders = heads.map(([, y]) => poly([[808, y + 25], [850, y + 8], [850, y + 62], [808, y + 45]], sr, 0.5));
    const feeds = new Path2D();
    heads.forEach(([, y]) => { feeds.moveTo(790, y + 35); feeds.lineTo(806, y + 35); feeds.moveTo(852, y + 35); feeds.lineTo(868, y + 35); });

    // Channel-usage heatmap.
    const rows: ['uavid' | 'waid' | 'fire', Ink][] = [['uavid', 'teal'], ['waid', 'navy'], ['fire', 'red']];
    const hx = 118, hw = 842, cw = hw / 48, rowY = (r: number) => 408 + r * 58;

    if (ink === 'sun') {
      print(g, frame, 0.42);
      carve(g, houses); carve(g, trees); carve(g, plume); print(g, plume, 0.18);
      print(g, rect(hx - 6, rowY(2) - 6, hw + 12, 58), 0.3);                 // the active task's row
      carve(g, rect(hx, rowY(2), hw, 50));
    }
    if (ink === 'teal') {
      g.save(); g.clip(frame); print(g, trees, 0.8); carve(g, plume); g.restore();
      print(g, stem, 0.35); print(g, enc, 0.28);
    }
    if (ink === 'red') {
      keyline(g, sites, 1.6, 0.9);
      print(g, fireBar, 1); print(g, modulator, 1);
      keyline(g, arrow(318, 318, 405, 314, 7), 2.4); keyline(g, arrow(426, 299, 440, 240, 8), 2.4);
      print(g, disc(fx + 160, fy + 150, 3.5), 1);                            // the ignition
    }
    if (ink === 'navy') {
      g.save(); g.clip(frame);
      g.lineCap = 'butt'; keyline(g, road, 11, 0.55); g.lineCap = 'round';
      print(g, houses, 0.9); carve(g, plume); shade(g, plume, linear(g, fx + 150, fy + 150, fx + 100, fy + 20, [[0, 0.5], [1, 0.12]]));
      g.restore();
      keyline(g, frame, 2);
      keyline(g, arrow(246, 160, 266, 160, 7), 2.4);
      keyline(g, stem, 2); keyline(g, enc, 2.4);
      keyline(g, arrow(338, 160, 362, 160, 7), 2.4); keyline(g, arrow(514, 162, 526, 162, 6), 2.4);
      print(g, bars, 0.8);
      keyline(g, line([[276, 331], [340, 331]], sr, 0.3), 1.6);
      for (const [c, a] of z) { print(g, c, 0.12 + a * 0.88); }
      dashed(g, link, [10, 7], 3); keyline(g, antenna, 2.4); keyline(g, waves, 2, 0.8);
      keyline(g, fan, 2.4); keyline(g, feeds, 2.2);
      heads.forEach(([task], i) => { print(g, decoders[i], task === 'fire' ? 0.85 : 0.35); });
      // heatmap axis: ticks every eighth channel
      const axis = new Path2D(); axis.moveTo(hx, 590); axis.lineTo(hx + hw, 590);
      for (let c = 0; c <= 48; c += 8) { axis.moveTo(hx + c * cw, 590); axis.lineTo(hx + c * cw, 598); }
      keyline(g, axis, 1.5, 0.8);
    }
    heads.forEach(([task, y]) => taskGlyph(g, ink, task, 872, y, 92, 70, rngFor('mantis-head-' + task), task === 'fire' ? 1 : 0.42));
    rows.forEach(([task, rowInk], r) => {
      taskGlyph(g, ink, task, 40, rowY(r) + 2, 62, 46, rngFor('mantis-row-' + task), 1);
      if (ink !== rowInk) return;
      // one bar per latent channel, height proportional to its measured mean bpp
      USAGE[task].forEach((v, c) => { const bh = Math.max(1.5, 48 * v / USAGE_MAX); print(g, rect(hx + c * cw + 1.5, rowY(r) + 48 - bh, cw - 3, bh), 1); });
      keyline(g, line([[hx, rowY(r) + 49], [hx + hw, rowY(r) + 49]], sr, 0.2), 1.2, 0.6);
    });
  },
};

/* ── SHIELD: a city and its digital twin. Rooftop sensors stream up to a wireframe copy in which
   a flood simulation runs ahead of the water actually observed below. ── */

SCENES.shield = {
  h: 625, inks: ['sun', 'red', 'teal', 'navy'],
  plates(g, ink, _rng, sr) {
    const base = 585, tBase = 300, tk = 0.72;
    const blocks: [number, number, number][] = [];
    let x = 55;
    while (x < 930) { const w = 44 + sr() * 50, h = 70 + sr() * 150; blocks.push([x, w, h]); x += w + 10 + sr() * 12; }
    const city = new Path2D(), windows = new Path2D(), twin = new Path2D(), twinFloors = new Path2D();
    for (const [bx, w, h] of blocks) {
      city.addPath(box(bx, base - h, w, h + 4, sr, 0.8));
      for (let wy = base - h + 14; wy < base - 18; wy += 22) for (let wx = bx + 9; wx < bx + w - 12; wx += 16) if (sr() < 0.5) windows.rect(wx, wy, 7, 10);
      const th = h * tk;
      twin.rect(bx, tBase - th, w, th);
      for (let fy = tBase - 18; fy > tBase - th + 4; fy -= 18) { twinFloors.moveTo(bx, fy); twinFloors.lineTo(bx + w, fy); }
    }
    const grid = new Path2D();
    for (let gx = 40; gx <= 960; gx += 40) { grid.moveTo(gx, tBase); grid.lineTo(gx + (gx - 500) * 0.08, tBase + 26); }
    for (const gy of [tBase, tBase + 13, tBase + 26]) { grid.moveTo(40, gy); grid.lineTo(960, gy); }
    const observed = ridge(ridgeAt(base - 14, sr, 5, 11), 625);
    const simulated = rect(20, tBase - 62, 960, 62);
    const simLine = line([[20, tBase - 62], [500, tBase - 64], [980, tBase - 61]], sr, 0.8);
    const sensors = new Path2D(), uplinks = new Path2D();
    blocks.forEach(([bx, w, h], i) => {
      if (i % 3 !== 1) return;
      const sx = bx + w / 2, sy = base - h;
      sensors.moveTo(sx, sy); sensors.lineTo(sx, sy - 14);
      disc(sx, sy - 18, 4.5, sensors);
      uplinks.moveTo(sx, sy - 26); uplinks.lineTo(sx, tBase + 30);
    });
    if (ink === 'sun') { keyline(g, grid, 1.4, 0.7); shade(g, rect(0, 330, U, 260), linear(g, 0, 330, 0, 590, [[0, 0], [1, 0.3]])); carve(g, city); print(g, windows, 1); carve(g, observed); }
    if (ink === 'teal') { plane(g, observed, 0.7); shade(g, simulated, linear(g, 0, tBase - 62, 0, tBase, [[0, 0.08], [1, 0.4]])); }
    if (ink === 'red') { g.lineCap = 'round'; dashed(g, uplinks, [2, 9], 3.2); print(g, sensors, 1); keyline(g, sensors, 2.4); dashed(g, simLine, [10, 6], 2.2); }
    if (ink === 'navy') { print(g, city, 0.86); carve(g, windows); carve(g, sensors); keyline(g, twin, 2); keyline(g, twinFloors, 1.2, 0.45); keyline(g, line([[20, base + 2], [980, base + 2]], sr, 0.5), 2.5); }
  },
};

/* ── Wildfire: spread from one ignition under a north-easterly-bound wind, drawn as a set of
   sampled perimeters from a generative spread model. Where samples agree, ink accumulates; the
   lake stops every sample. Dashed isochrones trace the mean perimeter at three times. ── */

SCENES.wildfire = {
  h: 625, inks: ['sun', 'red', 'teal', 'navy'],
  plates(g, ink, _rng, sr) {
    const hf = terrain([[220, 160, 110, 1], [760, 470, 140, 0.8], [520, 250, 90, 0.5], [120, 520, 100, 0.6]]);
    const contours = isolines(hf, [0.1, 0.25, 0.4, 0.55, 0.7, 0.85], -10, -10, U + 20, 645, 8);
    const lake = cut(ringPts(705, 300, 78, 46, 10, -0.3), sr, 5);
    const ix = 330, iy = 420, wind = -0.5;              // wind heading, radians (toward upper right)
    const perimeter = (scale: number, rs: Rng, jitter: number) => {
      const w1 = (rs() - 0.5) * 0.7 * jitter, stretch = 1 + (rs() - 0.5) * 0.6 * jitter, pts: number[][] = [];
      const fingers = Array.from({ length: 3 }, () => [2 + Math.floor(rs() * 5), rs() * TAU, rs()]);
      for (let i = 0; i < 40; i++) {
        const th = i / 40 * TAU, c = Math.cos(th - wind - w1);
        const f = fingers.reduce((s, [k, ph, a]) => s + a * Math.sin(k * th + ph), 0) / 3;
        const r = scale * (80 + 260 * stretch * Math.max(0, c) ** 1.6 + 30 * c) * (1 + jitter * f * 0.22);
        pts.push([ix + Math.cos(th) * r, iy + Math.sin(th) * r * 0.82]);
      }
      return cut(pts, rs, 4);
    };
    const samples = Array.from({ length: 7 }, (_, i) => perimeter(1, rngFor('fire-sample-' + i), 1));
    const mean = [0.35, 0.65, 1].map(s => perimeter(s, rngFor('fire-mean'), 0));
    const winds = new Path2D();
    for (const [wx, wy] of [[70, 80], [130, 130], [60, 180]]) winds.addPath(arrow(wx, wy, wx + 70 * Math.cos(wind), wy + 70 * Math.sin(wind), 11));
    if (ink === 'sun') { print(g, full(625), 0.36); carve(g, lake); }
    if (ink === 'teal') { keyline(g, contours, 1.5, 0.55); plane(g, lake, 0.75); }
    if (ink === 'red') { for (const s of samples) print(g, s, 0.1); for (const s of samples) keyline(g, s, 1.6, 0.9); carve(g, lake); print(g, disc(ix, iy, 7), 1); }
    if (ink === 'navy') {
      mean.forEach((m, i) => dashed(g, m, [9, 7], 2.2, 0.55 + i * 0.15));
      carve(g, lake); keyline(g, lake, 2, 0.6);
      keyline(g, disc(ix, iy, 13), 2.2);
      keyline(g, winds, 2.4, 0.8);
    }
  },
};

/* ── Trail mapping: a growing self-organizing map fitted to anonymous GPS fixes. The network is
   computed by gsom.ts on the synthetic trails in trails.ts, not drawn by hand. ── */

let trailCache: { data: Pt[]; res: GsomResult } | null = null;
function trailModel() {
  if (!trailCache) {
    const rng = rngFor('trails');
    const data = gpsFixes(rng, gauss);
    trailCache = { data, res: gsom(data, { spreadFactor: 0.5, scale: 20, r: 30, rng }) };
  }
  return trailCache;
}
const trailTerrain = terrain([[610, 400, 70, 1], [180, 260, 90, 0.9], [860, 300, 120, 0.7], [420, 120, 100, 0.6]]);

function degrees(n: number, edges: [number, number][]) {
  const d = new Array(n).fill(0);
  for (const [a, b] of edges) { d[a]++; d[b]++; }
  return d;
}

/** Draw GSOM state: GPS fixes, then edges and neurons. Sizes are divided by `k` so a scaled panel keeps its marks legible. */
function drawNetwork(g: G, ink: Ink, data: Pt[], nodes: Pt[], edges: [number, number][], k: number, o: { tris?: [number, number, number][]; junctions?: boolean }) {
  const dots = new Path2D(), rings = new Path2D(), hubs = new Path2D(), links = new Path2D(), tris = new Path2D();
  for (const [x, y] of data) disc(x, y, 2.3 / k, dots);
  for (const [a, b] of edges) { links.moveTo(...nodes[a]); links.lineTo(...nodes[b]); }
  const deg = degrees(nodes.length, edges);
  nodes.forEach(([x, y], i) => disc(x, y, (o.junctions && deg[i] >= 3 ? 8.5 : 5.5) / k, o.junctions && deg[i] >= 3 ? hubs : rings));
  for (const [a, b, c] of o.tris ?? []) { tris.moveTo(...nodes[a]); tris.lineTo(...nodes[b]); tris.lineTo(...nodes[c]); tris.closePath(); }
  if (ink === 'red') { print(g, dots, 0.9); print(g, tris, 0.95); keyline(g, tris, 4 / k); }
  if (ink === 'navy') { keyline(g, links, 3 / k); print(g, hubs, 1); }
  // Neurons print as paper discs: carve every plate, then ring them in navy.
  carve(g, rings); carve(g, hubs);
  if (ink === 'navy') { keyline(g, rings, 2.2 / k); print(g, hubs, 1); }
}

SCENES['trail-mapping'] = {
  h: 625, inks: ['sun', 'red', 'teal', 'navy'],
  plates(g, ink) {
    const { data, res } = trailModel();
    if (ink === 'sun') print(g, full(625), 0.3);
    if (ink === 'teal') keyline(g, isolines(trailTerrain, [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94], -10, -10, U + 20, 645, 8), 1.4, 0.5);
    drawNetwork(g, ink, data, res.final.nodes, res.final.edges, 1, { junctions: true });
    if (ink === 'navy') {                                       // neighbourhood radius r around one neuron
      const n = res.final.nodes[Math.floor(res.final.nodes.length * 0.4)];
      dashed(g, disc(n[0], n[1], 30), [5, 5], 1.6, 0.8);
    }
  },
};

/* Three stages on one crop of the same run: neurons grown on the fixes; the connection rule's
   edges, with the false triangles it makes filled; the collapsed and smoothed network. */
SCENES['trail-steps'] = {
  h: 262, inks: ['sun', 'red', 'teal', 'navy'],
  plates(g, ink) {
    const { data, res } = trailModel();
    const cx = 330, cy = 190, cw = 480, ch = 380, k = 300 / cw;       // crop around the junction and loop
    const inCrop = ([x, y]: Pt) => x > cx - 20 && x < cx + cw + 20 && y > cy - 20 && y < cy + ch + 20;
    const sub = data.filter(inCrop);
    const stages: [Pt[], [number, number][], { tris?: [number, number, number][]; junctions?: boolean }][] = [
      [res.grown, [], {}],
      [res.connected.nodes, res.connected.edges, { tris: res.triangles }],
      [res.final.nodes, res.final.edges, { junctions: true }],
    ];
    stages.forEach(([nodes, edges, o], i) => {
      const px = i * 350, frame = rect(px, 12, 300, ch * k);
      g.save();
      g.beginPath(); g.rect(px, 12, 300, ch * k); g.clip();
      g.translate(px, 12); g.scale(k, k); g.translate(-cx, -cy);
      if (ink === 'sun') print(g, rect(cx, cy, cw, ch), 0.3);
      if (ink === 'teal') keyline(g, isolines(trailTerrain, [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94], cx - 10, cy - 10, cw + 20, ch + 20, 8), 1.4 / k, 0.45);
      drawNetwork(g, ink, sub, nodes, edges, k, o);
      g.restore();
      if (ink === 'navy') keyline(g, frame, 1.6);
      if (ink === 'navy' && i < 2) keyline(g, arrow(px + 308, 12 + ch * k / 2, px + 342, 12 + ch * k / 2, 8), 2.2);
    });
  },
};

/* ── VR labs: a bench seen by the overhead tracking camera. Each tracked object carries an
   ArUco-style fiducial (black border, 4×4 bit grid); detections are outlined with their corner
   points and pose axes (x red, y teal, z toward the camera). ── */

function marker(cx: number, cy: number, s: number, rot: number, rs: Rng) {
  const cells = 6, c = s / cells, cos = Math.cos(rot), sin = Math.sin(rot);
  const T = (u: number, v: number): [number, number] => [cx + (u * cos - v * sin), cy + (u * sin + v * cos)];
  const quad = (u: number, v: number, w: number) => { const p = new Path2D(); const q = [T(u, v), T(u + w, v), T(u + w, v + w), T(u, v + w)]; p.moveTo(...q[0]); q.slice(1).forEach(pt => p.lineTo(...pt)); p.closePath(); return p; };
  const outer = quad(-s / 2, -s / 2, s), bits = new Path2D();
  for (let j = 1; j < cells - 1; j++) for (let i = 1; i < cells - 1; i++) if (rs() < 0.5) bits.addPath(quad(-s / 2 + i * c, -s / 2 + j * c, c));
  const m = s * 0.62;
  const corners = [T(-m, -m), T(m, -m), T(m, m), T(-m, m)];
  const outline = new Path2D(); outline.moveTo(...corners[0]); corners.slice(1).forEach(pt => outline.lineTo(...pt)); outline.closePath();
  const cornerDots = new Path2D(); corners.forEach(([x, y]) => disc(x, y, 4, cornerDots));
  const ax = arrow(cx, cy, ...T(s * 1.05, 0), 9), ay = arrow(cx, cy, ...T(0, -s * 1.05), 9);
  return { outer, bits, outline, cornerDots, ax, ay, z: disc(cx, cy, 5) };
}

SCENES['vr-labs'] = {
  h: 625, inks: ['sun', 'red', 'teal', 'navy'],
  plates(g, ink, _rng, sr) {
    const grain = new Path2D();
    for (let y = 18; y < 625; y += 26) grain.addPath(line([[0, y], [330, y + 4], [660, y - 3], [1000, y + 2]], sr, 2));
    // Objects from above: a beaker, an Erlenmeyer flask (base and neck), a sample tray with wells.
    const beaker = disc(270, 250, 88), beakerLiquid = disc(270, 250, 70);
    const flask = disc(640, 230, 105), neck = disc(640, 230, 28);
    const tray = box(400, 430, 330, 120, sr, 0.8), wells = new Path2D();
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) disc(440 + i * 50, 465 + j * 50, 15, wells);
    const marks = [marker(150, 420, 92, 0.22, rngFor('aruco-3')), marker(840, 400, 92, -0.35, rngFor('aruco-7')), marker(850, 130, 80, 0.6, rngFor('aruco-12'))];
    const objects = new Path2D(); objects.addPath(beaker); objects.addPath(flask); objects.addPath(tray);
    const markerAreas = new Path2D(); marks.forEach(m => markerAreas.addPath(m.outer));
    if (ink === 'sun') { print(g, full(625), 0.42); carve(g, objects); carve(g, markerAreas); print(g, wells, 0.5); }
    if (ink === 'teal') { keyline(g, grain, 1.4, 0.18); carve(g, objects); carve(g, markerAreas); print(g, flask, 0.22); carve(g, neck); print(g, tray, 0.3); carve(g, wells); keyline(g, beaker, 5, 0.8); marks.forEach(m => keyline(g, m.ay, 4)); }
    if (ink === 'red') { print(g, beakerLiquid, 0.45); print(g, wells, 0.55); marks.forEach(m => { keyline(g, m.outline, 2.4); print(g, m.cornerDots, 1); keyline(g, m.ax, 4); }); }
    if (ink === 'navy') {
      keyline(g, flask, 2.6); keyline(g, neck, 2.6); keyline(g, tray, 2.4);
      marks.forEach(m => { print(g, m.outer, 1); carve(g, m.bits); });
      marks.forEach(m => { carve(g, m.z); print(g, m.z, 1); keyline(g, m.z, 2); });
    }
    // The pose axes print clean over the marker and bench: clear them from the other plates.
    const clearAxes = (paths: Path2D[]) => { g.save(); g.globalAlpha = 1; g.lineWidth = 7; g.globalCompositeOperation = 'destination-out'; paths.forEach(p => g.stroke(p)); g.restore(); };
    if (ink === 'sun' || ink === 'navy') clearAxes(marks.flatMap(m => [m.ax, m.ay]));
    if (ink === 'teal') clearAxes(marks.map(m => m.ax));
    if (ink === 'red') clearAxes(marks.map(m => m.ay));
  },
};
