/* Riso plates for the site, after the window plates of sevenevesai/riso-windowseat: every scene is
   a rounded, borderless viewport, grounds and skies are full-bleed colour fields, and secondary
   colours come from overprinting the drum inks (yellow + pink = orange, blue + pink = lavender,
   yellow + blue = green). Notation (labels, leader lines) prints crisply above the screens in
   `annotate`. All landscapes and scenarios are illustrative; the trail panels are a real GSOM run
   on synthetic fixes (gsom.ts, trails.ts). */
import {
  INK, TAU, type Scene, type Ink, print, carve, plane, keyline, shade, linear, radial,
  rect, disc, arrow, cut, ringPts, ridge, ridgeAt, peaksAt, dashed, terrain, isolines, rngFor, gauss,
} from './riso-kit';
import { gsom, type GsomResult, type Pt } from './gsom';
import { gpsFixes } from './trails';

type G = CanvasRenderingContext2D;
export const SCENES: Record<string, Scene> = {};
const PAPER = '#FFFFFF';   // white multiplies to the page's paper
const inks: Ink[] = ['yellow', 'pink', 'green', 'blue', 'indigo'];
const diagramScreen = { pitch: 2.1, texture: 0.68, registration: 0.45 };

/* ── shapes ── */

function path(pts: number[][], close = false) {
  const p = new Path2D();
  p.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach(([x, y]) => p.lineTo(x, y));
  if (close) p.closePath();
  return p;
}
function ellipse(x: number, y: number, rx: number, ry: number) {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, 0, 0, TAU);
  return p;
}
function rounded(x: number, y: number, w: number, h: number, r: number) {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}

/** Clear a stroke's footprint from the plate, so a line printed in another ink stays pure. */
function carveLine(g: G, p: Path2D, w: number) {
  g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'destination-out'; g.lineWidth = w; g.stroke(p); g.restore();
}

/* ── the viewport ──
   Each scene is a rounded, borderless field of colour: content is clipped to the glass. */

interface Win { x: number; y: number; w: number; h: number; r: number; }
const glass = (v: Win) => rounded(v.x, v.y, v.w, v.h, v.r);

function inWindow(g: G, v: Win, draw: () => void) {
  g.save(); g.clip(glass(v)); draw(); g.restore();
}
/** A sky: violet at the zenith, through pink, to a warm horizon. `warmth` scales the sunset. */
function sky(g: G, ink: Ink, v: Win, horizon: number, warmth = 1) {
  const area = rect(v.x, v.y, v.w, horizon - v.y + 40);
  if (ink === 'blue') shade(g, area, linear(g, 0, v.y, 0, horizon, [[0, 0.55], [0.55, 0.18], [1, 0.02]]));
  if (ink === 'pink') shade(g, area, linear(g, 0, v.y, 0, horizon, [[0, 0.3], [0.5, 0.42 * warmth], [1, 0.22 * warmth]]));
  if (ink === 'yellow') shade(g, area, linear(g, 0, v.y, 0, horizon, [[0, 0], [0.45, 0.35 * warmth], [1, 0.9 * warmth]]));
}
/** A pale daylight ground for diagrams: warm at the foot, clearing upward. */
function daylight(g: G, ink: Ink, v: Win) {
  const area = rect(v.x, v.y, v.w, v.h);
  if (ink === 'yellow') shade(g, area, linear(g, 0, v.y, 0, v.y + v.h, [[0, 0.07], [1, 0.2]]));
  if (ink === 'pink') shade(g, area, linear(g, 0, v.y, 0, v.y + v.h, [[0, 0.06], [1, 0.035]]));
  if (ink === 'blue') shade(g, area, linear(g, 0, v.y, 0, v.y + v.h, [[0, 0.05], [0.6, 0]]));
}

/* ── notation: unscreened ink, drawn after the plates ── */

type NoteInk = Ink | 'paper';
const noteColors: Partial<Record<NoteInk, string>> = { paper: '#F7F1E6', pink: '#A72B70', green: '#166C44', blue: '#005F95', orange: '#A63D21' };
const noteColor = (c: NoteInk) => noteColors[c] ?? INK[c as Ink];

function label(g: G, text: string, x: number, y: number, size = 18, color: NoteInk = 'indigo', align: CanvasTextAlign = 'left', halo = color !== 'paper') {
  g.save();
  g.globalAlpha = 1; g.fillStyle = noteColor(color);
  g.font = `500 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
  g.textAlign = align;
  if (halo) {   // a white halo, which multiplies away on paper but lifts text off artwork
    g.strokeStyle = PAPER; g.lineWidth = size * 0.22; g.lineJoin = 'round';
    g.globalAlpha = 0.65; g.strokeText(text, x, y); g.globalAlpha = 1;
  }
  g.fillText(text, x, y);
  g.restore();
}
function rule(g: G, pts: number[][], color: NoteInk = 'indigo', alpha = 0.6, w = 1.3, dash: number[] = []) {
  g.save();
  g.strokeStyle = noteColor(color); g.globalAlpha = alpha; g.lineWidth = w; g.setLineDash(dash);
  g.stroke(path(pts));
  g.restore();
}
function compass(g: G, x: number, y: number, color: NoteInk = 'indigo') {
  g.save(); g.strokeStyle = noteColor(color); g.globalAlpha = 0.7; g.lineWidth = 1.2;
  g.beginPath(); g.arc(x, y, 30, 0, TAU); g.stroke(); g.restore();
  rule(g, [[x - 18, y], [x + 18, y]], color, 0.7, 1.2);
  rule(g, [[x, y + 18], [x, y - 22]], color, 1, 2);
  rule(g, [[x - 7, y - 12], [x, y - 22], [x + 7, y - 12]], color, 1, 2);
  label(g, 'N', x, y - 40, 16, color, 'center');
}

/* ── Plate 01, home: a UAV over farmland at golden hour sends shrinking packets to an edge mast ── */

const HERO: Win = { x: 30, y: 30, w: 940, h: 860, r: 52 };

SCENES.hero = {
  h: 920, inks, labelsFrom: 420,
  plates(g, ink, _rng, sr) {
    const horizon = 560, vx = 520;
    const far = ridge(peaksAt(horizon - 20, sr, 150, 6), 920);
    const mid = ridge(ridgeAt(horizon + 8, sr, 26, 5, 0.02), 920);
    const sun = cut(ringPts(705, 395, 62, 62, 16), sr, 1);
    const drone = { x: 320, y: 250 }, mast = { x: 832, base: 612, top: 380 };
    // Fields in perspective: rows radiating from a vanishing point, cut by bands that close in.
    const rays = [-900, -560, -330, -170, -40, 90, 230, 400, 640, 980, 1500];
    const bands = [horizon + 10, 585, 616, 660, 725, 815, 940];
    const at = (ray: number, y: number) => vx + ray * (y - horizon + 60) / 440;
    const patches: [Path2D, number][] = [];
    for (let b = 0; b < bands.length - 1; b++) for (let r = 0; r < rays.length - 1; r++) {
      const y0 = bands[b], y1 = bands[b + 1];
      patches.push([path([[at(rays[r], y0), y0], [at(rays[r + 1], y0), y0], [at(rays[r + 1], y1), y1], [at(rays[r], y1), y1]], true), (b * 3 + r * 5) % 4]);
    }
    const fields = rect(0, horizon + 10, 1000, 400);
    const hedge = new Path2D();
    for (let i = 0; i < 16; i++) {
      const x = 60 + sr() * 880, y = 600 + sr() * 150, s = 8 + (y - 560) * 0.12;
      disc(x, y, s, hedge); disc(x + s * 0.8, y + 2, s * 0.75, hedge);
    }
    const foreground = ridge(ridgeAt(850, sr, 14, 7, 0), 960);
    const swath = path([[drone.x, drone.y + 30], [110, 900], [640, 900]], true);
    const craft = new Path2D();
    for (const [a, b] of [[[-75, -19], [75, 19]], [[-75, 19], [75, -19]]]) {
      craft.addPath(path([[drone.x + a[0], drone.y + a[1] - 3.5], [drone.x + b[0], drone.y + b[1] - 3.5], [drone.x + b[0], drone.y + b[1] + 3.5], [drone.x + a[0], drone.y + a[1] + 3.5]], true));
    }
    craft.addPath(ellipse(drone.x, drone.y, 28, 15));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) craft.addPath(ellipse(drone.x + sx * 75, drone.y + sy * 19, 30, 7));
    craft.addPath(rect(drone.x - 7, drone.y + 10, 14, 14));
    const tower = path([[mast.x - 20, mast.base], [mast.x - 4, mast.top], [mast.x + 4, mast.top], [mast.x + 20, mast.base]], true);
    const packets = new Path2D();
    [20, 17, 14, 11, 9, 7, 5].forEach((s, i, all) => {
      const t = (i + 1) / (all.length + 1);
      const x = drone.x + 90 + (mast.x - drone.x - 110) * t, y = drone.y + (mast.top - 40 - drone.y) * t - Math.sin(t * Math.PI) * 70;
      packets.rect(x - s / 2, y - s / 2, s, s);
    });
    const birds = new Path2D();
    for (const [bx, by, s] of [[600, 300, 9], [625, 290, 7], [645, 306, 8]]) {
      birds.moveTo(bx - s, by - s * 0.4); birds.quadraticCurveTo(bx - s * 0.4, by - s * 0.6, bx, by); birds.quadraticCurveTo(bx + s * 0.4, by - s * 0.6, bx + s, by - s * 0.4);
    }

    inWindow(g, HERO, () => {
      sky(g, ink, HERO, horizon);
      if (ink === 'yellow') {
        shade(g, rect(0, 0, 1000, 920), radial(g, 705, 395, 330, [[0, 0.7], [0.5, 0.3], [1, 0]]));
        print(g, sun, 1);
        carve(g, far);
        carve(g, fields); print(g, fields, 0.55);
        patches.forEach(([p, kind]) => plane(g, p, [0.85, 0.5, 0.75, 0.3][kind]));
        g.save(); g.clip(swath); print(g, fields, 0.25); g.restore();
        carve(g, hedge); carve(g, foreground);
        carve(g, craft); carve(g, packets); carve(g, tower);
      }
      if (ink === 'pink') {
        carve(g, sun); print(g, sun, 0.55);
        plane(g, far, 0.3); plane(g, mid, 0.18);
        carve(g, fields); print(g, fields, 0.06);
        carve(g, craft); carve(g, tower);
        carve(g, packets); print(g, packets, 1);
      }
      if (ink === 'green') {
        carve(g, fields);
        print(g, fields, 0.4);
        patches.forEach(([p, kind]) => plane(g, p, [0.12, 0.6, 0.3, 0.72][kind]));
        print(g, hedge, 0.95);
      }
      if (ink === 'blue') {
        carve(g, sun);
        plane(g, far, 0.3); plane(g, mid, 0.42);
        carve(g, fields);
        patches.forEach(([p, kind]) => print(g, p, [0, 0.12, 0.05, 0.2][kind]));
        plane(g, foreground, 0.55);
        carve(g, craft); carve(g, packets); carve(g, tower);
      }
      if (ink === 'indigo') {
        print(g, mid, 0.08);
        g.lineCap = 'round';
        keyline(g, birds, 2.4, 0.9);
        plane(g, foreground, 0.85);
        print(g, craft, 1);
        print(g, tower, 1);
        carve(g, path([[mast.x - 8, mast.base - 20], [mast.x, mast.top + 70], [mast.x + 8, mast.base - 20]], true));
        keyline(g, ellipse(mast.x + 16, mast.top + 18, 15, 22), 4);
        for (const r of [26, 40, 54]) { const p = new Path2D(); p.arc(mast.x, mast.top - 16, r, -2.7, -0.45); keyline(g, p, 2.4, 0.8); }
        keyline(g, packets, 1.6, 0.7);
      }
    });
  },
  annotate(g) {
    rule(g, [[320, 280], [110, 880]], 'indigo', 0.45); rule(g, [[320, 280], [640, 880]], 'indigo', 0.45);
    compass(g, 100, 118);
    label(g, '01 / SENSE', 170, 168, 20); rule(g, [[170, 180], [238, 180], [262, 214]]);
    label(g, '02 / COMPRESS', 468, 180, 18, 'pink');
    label(g, '03 / INFER', 832, 298, 20, 'indigo', 'center');
  },
};

/* ── MANTIS, after the paper's Fig. 1 ──
   The frame enters the shared stem; the TaskDetector reads the stem's features (not the frame)
   and its P_task drives the modulator, which conditions the encoder's ten cGDN sites. The compact
   latent crosses the uplink and fans out to task decoder–head chains. Conceptual: the latent cells
   and P_task bars are schematic. */

const MANTIS: Win = { x: 26, y: 26, w: 948, h: 650, r: 44 };

SCENES.mantis = {
  h: 700, inks, screen: diagramScreen,
  ground(g, ink) { inWindow(g, MANTIS, () => daylight(g, ink, MANTIS)); },
  plates(g, ink, _rng, sr) {
    const frame = rect(65, 213, 205, 220);
    const enc = path([[382, 218], [530, 278], [530, 369], [382, 428]], true);
    const stem = path([[303, 234], [326, 221], [326, 420], [303, 432]], true);
    const detector = path([[288, 482], [342, 482], [332, 516], [298, 516]], true);
    const plume = cut([[204, 398], [196, 372], [184, 342], [166, 308], [146, 276], [132, 246], [158, 238], [180, 262], [198, 296], [212, 336], [220, 382]], sr, 2);
    const roofs = new Path2D();
    [[82, 326], [119, 357], [212, 252], [219, 404]].forEach(([x, y]) => roofs.rect(x, y, 27, 22));
    const trees = new Path2D();
    for (let i = 0; i < 20; i++) disc(78 + sr() * 180, 280 + sr() * 138, 5 + sr() * 7, trees);
    const road = new Path2D(); road.moveTo(65, 395); road.bezierCurveTo(130, 380, 170, 300, 270, 262);
    const heads = [224, 334, 444];
    const pTask: [number, boolean][] = [[0.22, false], [0.14, false], [0.86, true]];   // urban, wildlife, smoke
    const bar = (i: number, p: number) => rect(356 + i * 13, 516 - p * 40, 9, p * 40);
    const latent: [Path2D, number][] = [];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) latent.push([rect(581 + i * 14, 291 + j * 14, 10, 10), 0.2 + ((i * 3 + j * 7) % 9) / 10]);
    const modulator = disc(447, 500, 14), ignition = disc(206, 399, 5);
    const smokeGlyph = cut([[840, heads[2] + 6], [836, heads[2] - 8], [848, heads[2] - 22], [858, heads[2] - 26], [851, heads[2] + 5]], sr, 0.5);

    inWindow(g, MANTIS, () => {
      if (ink === 'yellow') {
        plane(g, frame, 0.75); carve(g, roofs); carve(g, trees);
        print(g, rect(795, heads[2] - 30, 130, 60), 0.55);                       // the routed head
        pTask.forEach(([p, hot], i) => { if (hot) print(g, bar(i, p)); });
        print(g, modulator, 0.9); print(g, ignition);
      }
      if (ink === 'pink') {
        plane(g, frame, 0.12);
        g.save(); g.clip(frame); keyline(g, road, 9, 0.35); g.restore();
        print(g, roofs, 0.55);
        for (let i = 0; i < 10; i++) { const x = 389 + i * 13; keyline(g, path([[x, 225 + (x - 382) * 0.405], [x, 422 - (x - 382) * 0.4]]), 2.7, 0.9); }
        print(g, ignition);
        pTask.forEach(([p, hot], i) => { if (hot) print(g, bar(i, p)); });
        keyline(g, arrow(400, 500, 430, 500, 8), 3); print(g, modulator); keyline(g, arrow(447, 484, 447, 408, 10), 3);
        keyline(g, rect(829, heads[1] - 17, 35, 29), 2.5); print(g, ellipse(846, heads[1] - 4, 9, 5));
        keyline(g, rect(829, heads[2] - 17, 35, 29), 2.5);
      }
      if (ink === 'green') {
        carve(g, frame);
        g.save(); g.clip(frame); print(g, trees, 0.85); g.restore();
        print(g, stem, 0.35); print(g, rect(800, heads[0] - 25, 120, 50), 0.6);
      }
      if (ink === 'blue') {
        carve(g, frame);
        g.save(); g.clip(frame); keyline(g, road, 9, 0.35); print(g, roofs, 0.5); g.restore();
        print(g, stem, 0.75); print(g, enc, 0.3); latent.forEach(([p, a]) => print(g, p, a));
        print(g, rect(800, heads[0] - 25, 120, 50), 0.25); print(g, rect(800, heads[1] - 25, 120, 50), 0.2);
      }
      if (ink === 'indigo') {
        keyline(g, frame, 2.6);
        g.save(); g.clip(frame); carve(g, plume); shade(g, plume, linear(g, 210, 400, 140, 240, [[0, 0.7], [1, 0.12]])); g.restore();
        keyline(g, stem, 2); keyline(g, enc, 2.4); keyline(g, detector, 2);
        pTask.forEach(([p, hot], i) => { if (!hot) print(g, bar(i, p), 0.8); });
        keyline(g, arrow(275, 323, 299, 323, 7), 2.4); keyline(g, arrow(338, 323, 372, 323, 8), 2.4); keyline(g, arrow(538, 323, 570, 323, 8), 2.4);
        keyline(g, arrow(315, 434, 315, 476, 7), 2.2);                                    // stem features → detector
        dashed(g, path([[642, 321], [731, 321]]), [5, 8], 3);
        keyline(g, path([[734, 224], [734, 444]]), 2);
        heads.forEach(y => { keyline(g, arrow(734, y, 785, y, 8), 2); keyline(g, rect(795, y - 30, 130, 60), 2); });
        const seg = new Path2D();
        for (let i = 0; i < 4; i++) { seg.moveTo(809 + i * 29, 199); seg.lineTo(815 + i * 29, 249); }
        keyline(g, seg, 2, 0.7);
        print(g, smokeGlyph, 0.55);
      }
    });
  },
  annotate(g) {
    label(g, '01  OBSERVE', 66, 159, 22); label(g, '02  ENCODE', 373, 159, 22); label(g, '03  INFER', 758, 159, 22);
    label(g, 'cGDN × 10', 456, 204, 14, 'pink', 'center');
    label(g, 'TASK DETECTOR', 315, 545, 14, 'indigo', 'center');
    label(g, 'P(task)', 382, 470, 14, 'pink', 'center');
    label(g, 'MODULATOR', 447, 545, 14, 'pink', 'center');
    label(g, 'COMPACT LATENT', 573, 399, 16);
    label(g, 'Urban', 860, 283, 15, 'indigo', 'center'); label(g, 'Wildlife', 860, 393, 15, 'indigo', 'center'); label(g, 'Smoke', 860, 503, 15, 'indigo', 'center');
    label(g, 'UPLINK', 685, 300, 15, 'pink', 'center');
    rule(g, [[62, 601], [938, 601]], 'indigo', 0.4, 1);
    label(g, 'ON THE UAV', 66, 640, 17); label(g, 'AT THE EDGE', 938, 640, 17, 'indigo', 'right');
  },
};

/* ── SHIELD: a city at dusk and its digital twin ──
   Both cities share one isometric system. The observed city prints solid with lit windows; the
   twin is a glowing wireframe over the night sky, running a flood scenario. Blocks print back to
   front and clear what they hide. */

type V3 = [number, number, number];
const iso = (ox: number, oy: number, [x, y, z]: V3): Pt => [ox + (x - y) * 0.8, oy + (x + y) * 0.39 - z];
const BLOCKS: [number, number, number, number, number][] = [[35, 35, 62, 50, 92], [120, 35, 65, 58, 135], [37, 132, 58, 64, 56], [128, 143, 60, 50, 88], [275, 160, 47, 70, 78]];
const SHIELD: Win = { x: 26, y: 26, w: 948, h: 650, r: 44 };

function city(g: G, ink: Ink, ox: number, oy: number, twin: boolean, sr: () => number) {
  const T = (v: V3) => iso(ox, oy, v);
  const footprint = path(([[0, 0, 0], [340, 0, 0], [340, 300, 0], [0, 300, 0]] as V3[]).map(T), true);
  const river = path(([[245, -8, 0], [302, -8, 0], [240, 300, 0], [170, 300, 0]] as V3[]).map(T), true);
  const gridLines = new Path2D();
  for (let x = 0; x <= 340; x += 34) { gridLines.moveTo(...T([x, 0, 0])); gridLines.lineTo(...T([x, 300, 0])); }
  for (let y = 0; y <= 300; y += 30) { gridLines.moveTo(...T([0, y, 0])); gridLines.lineTo(...T([340, y, 0])); }
  if (!twin) {
    if (ink === 'indigo') plane(g, footprint, 0.5);
    if (ink === 'blue') { plane(g, footprint, 0.3); print(g, river, 0.7); }
    if (ink === 'green') plane(g, footprint, 0.25);
    if (ink === 'yellow' || ink === 'pink') carve(g, footprint);
  } else {
    if (ink === 'yellow') keyline(g, gridLines, 1.3, 0.55);
    if (ink === 'blue') print(g, river, 0.3);
  }
  const order = [...BLOCKS].sort((a, b) => (a[0] + a[2] + a[1] + a[3]) - (b[0] + b[2] + b[1] + b[3]));
  for (const [x, y, w, d, h] of order) {
    const top = path([T([x, y, h]), T([x + w, y, h]), T([x + w, y + d, h]), T([x, y + d, h])], true);
    const left = path([T([x, y + d, 0]), T([x + w, y + d, 0]), T([x + w, y + d, h]), T([x, y + d, h])], true);
    const right = path([T([x + w, y, 0]), T([x + w, y + d, 0]), T([x + w, y + d, h]), T([x + w, y, h])], true);
    const silhouette = path([T([x, y, h]), T([x + w, y, h]), T([x + w, y, 0]), T([x + w, y + d, 0]), T([x, y + d, 0]), T([x, y + d, h])], true);
    if (!twin) {
      carve(g, silhouette);
      if (ink === 'indigo') { print(g, left, 0.95); print(g, right, 0.7); print(g, top, 0.3); }
      if (ink === 'blue') { print(g, right, 0.45); print(g, top, 0.35); }
      if (ink === 'pink') print(g, top, 0.35);
      // Lit windows on both visible faces.
      const lit = new Path2D();
      for (let z = 14; z < h - 12; z += 16) {
        for (let u = 6; u < w - 8; u += 12) if (sr() < 0.5) { const [px, py] = T([x + u, y + d, z]); lit.rect(px, py - 7, 5, 7); }
        for (let u = 6; u < d - 8; u += 12) if (sr() < 0.4) { const [px, py] = T([x + w, y + u, z]); lit.rect(px, py - 7, 5, 7); }
      }
      if (ink === 'yellow') print(g, lit, 1); else carve(g, lit);
    } else {
      // The twin glows: its edges are cleared from the night plates and printed in yellow alone.
      const edges = new Path2D();
      edges.addPath(top); edges.addPath(left); edges.addPath(right);
      const floors = new Path2D();
      for (let z = 16; z < h - 5; z += 23) floors.addPath(path([T([x, y + d, z]), T([x + w, y + d, z]), T([x + w, y, z])]));
      // Nearer blocks restore the night over edges they hide, then clear their own.
      if (ink === 'blue' || ink === 'indigo') { plane(g, silhouette, ink === 'blue' ? 0.84 : 0.34); carveLine(g, edges, 3.2); carveLine(g, floors, 2); }
      if (ink === 'yellow') { carve(g, silhouette); keyline(g, edges, 2.4, 1); keyline(g, floors, 1.5, 0.7); }
    }
    if (ink === 'pink') { const [sx, sy] = T([x + w / 2, y + d / 2, h]); print(g, disc(sx, sy - 9, twin ? 3 : 5)); if (!twin) keyline(g, path([[sx, sy], [sx, sy - 9]]), 2); }
  }
  if (twin) {                                                     // the simulated flood line, in hot pink
    const flood = path(([[221, 0, 4], [266, 105, 4], [202, 215, 4], [146, 300, 4]] as V3[]).map(T));
    if (ink === 'blue' || ink === 'indigo') carveLine(g, flood, 4);
    if (ink === 'pink') dashed(g, flood, [7, 5], 3.2, 1);
  }
}

SCENES.shield = {
  h: 700, inks,
  plates(g, ink) {
    inWindow(g, SHIELD, () => {
      const all = rect(0, 0, 1000, 700);
      // Night above, a last band of dusk low on the horizon, a glow where the twin runs.
      if (ink === 'blue') shade(g, all, linear(g, 0, 26, 0, 676, [[0, 0.9], [0.7, 0.8], [1, 0.5]]));
      if (ink === 'indigo') shade(g, all, linear(g, 0, 26, 0, 676, [[0, 0.55], [0.6, 0.3], [1, 0.15]]));
      if (ink === 'pink') shade(g, all, linear(g, 0, 400, 0, 676, [[0, 0], [1, 0.35]]));
      if (ink === 'yellow') shade(g, all, radial(g, 716, 320, 230, [[0, 0.3], [1, 0]]));
      const stars = new Path2D(), rs = rngFor('shield-stars');
      for (let i = 0; i < 70; i++) disc(40 + rs() * 920, 40 + rs() * 260, 0.8 + rs() * 1.4, stars);
      carve(g, stars);
      if (ink === 'yellow') print(g, stars, 0.5);
      city(g, ink, 265, 350, false, rngFor('shield-windows'));
      city(g, ink, 696, 226, true, rngFor('shield-twin'));
      // Observations stream up to the twin in pink, cleared out of the night so they read pure.
      const uplink = new Path2D();
      uplink.moveTo(336, 290); uplink.bezierCurveTo(356, 143, 486, 68, 671, 186);
      const head = arrow(646, 171, 671, 186, 9), beads = new Path2D();
      [0, 1, 2].forEach(i => disc(422 + i * 32, 158 - i * 8, 5, beads));
      if (ink === 'blue' || ink === 'indigo') { carveLine(g, uplink, 4.5); carveLine(g, head, 4.5); carve(g, beads); }
      if (ink === 'pink') { dashed(g, uplink, [4, 10], 3.2, 1); keyline(g, head, 3); print(g, beads); }
    });
  },
  annotate(g) {
    rule(g, [[65, 613], [936, 613]], 'paper', 0.35, 1);
    label(g, '01 / THE OBSERVED CITY', 56, 652, 19, 'paper'); label(g, '02 / THE DIGITAL TWIN', 580, 652, 19, 'paper');
    label(g, 'LIVE OBSERVATIONS', 326, 113, 17, 'paper');
    label(g, 'SIMULATED FLOOD', 758, 491, 16, 'paper', 'center'); rule(g, [[766, 472], [766, 411]], 'paper', 0.6);
    label(g, 'SENSING', 64, 283, 17, 'paper'); rule(g, [[64, 300], [120, 300], [196, 330]], 'paper', 0.6);
  },
};

/* ── Wildfire: possible perimeters from one ignition under a prevailing wind ──
   A map on dry summer ground; each scenario leans with the wind by its own amount and reaches its
   own distance, and where they agree the pink and yellow overprint into a hot orange core. */

const FIRE: Win = { x: 26, y: 24, w: 948, h: 668, r: 44 };

SCENES.wildfire = {
  h: 700, inks, screen: diagramScreen,
  ground(g, ink) { inWindow(g, FIRE, () => daylight(g, ink, FIRE)); },
  plates(g, ink, _rng, sr) {
    const area = disc(444, 345, 273), lake = cut(ringPts(582, 256, 47, 94, 12, 0.65), sr, 3);
    const hf = terrain([[220, 195, 95, 1], [620, 442, 115, 1], [370, 410, 75, 0.8]], 0.08);
    const contours = isolines(hf, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], 130, 40, 620, 610, 7);
    const perimeter = (scale: number, seed: string, spread = 1) => {
      const rr = rngFor(seed), lean = 0.65 + (rr() - 0.5) * 0.5 * spread, reach = 1 + (rr() - 0.5) * 0.45 * spread;
      const f1 = rr() * TAU, f2 = rr() * TAU, pts: number[][] = [];
      for (let i = 0; i < 60; i++) {
        const t = i / 60 * TAU, c = Math.max(0, Math.cos(t + lean));
        const r = scale * (90 + 190 * reach * c ** 1.8) * (1 + spread * (0.1 * Math.sin(t * 5 + f1) + 0.06 * Math.sin(t * 9 + f2)));
        pts.push([334 + Math.cos(t) * r, 448 + Math.sin(t) * r * 0.87]);
      }
      return cut(pts, rr, 2);
    };
    const samples = Array.from({ length: 7 }, (_, i) => perimeter(0.82 + i * 0.03, 'perimeter-' + i));
    const winds = [arrow(792, 331, 876, 255, 12), arrow(815, 356, 899, 280, 12)];
    inWindow(g, FIRE, () => {
      if (ink === 'yellow') { plane(g, area, 0.42); samples.forEach(p => print(g, p, 0.14)); print(g, disc(334, 448, 26), 0.9); carve(g, lake); }
      if (ink === 'green') { g.save(); g.clip(area); keyline(g, contours, 2, 0.7); g.restore(); carve(g, lake); }
      if (ink === 'blue') { g.save(); g.clip(area); plane(g, lake, 0.85); g.restore(); }
      if (ink === 'pink') {
        g.save(); g.clip(area);
        samples.forEach(p => { print(g, p, 0.09); keyline(g, p, 1.6, 0.8); });
        carve(g, lake); print(g, disc(334, 448, 7));
        g.restore();
      }
      if (ink === 'indigo') {
        g.save(); g.clip(area);
        keyline(g, contours, 1, 0.12);
        [0.34, 0.6, 0.88].forEach(s => dashed(g, perimeter(s, 'mean', 0), [7, 7], 2, 0.7));
        carve(g, lake); keyline(g, lake, 2.1, 0.7); keyline(g, disc(334, 448, 15), 2.1);
        g.restore();
        keyline(g, area, 1.6, 0.4);
        keyline(g, winds[0], 3); keyline(g, winds[1], 2, 0.5);
      }
    });
  },
  annotate(g) {
    compass(g, 853, 166);
    rule(g, [[66, 641], [936, 641]], 'indigo', 0.35, 1);
    label(g, 'WIND', 840, 399, 19, 'indigo', 'center');
    label(g, 'ONE IGNITION', 65, 562, 17, 'pink'); rule(g, [[195, 551], [253, 506], [322, 459]], 'pink');
    label(g, 'MANY POSSIBLE FUTURES', 65, 674, 18); label(g, 'ILLUSTRATIVE SCENARIOS', 936, 674, 15, 'indigo', 'right');
    label(g, 'RESERVOIR', 736, 75, 16, 'blue', 'center'); rule(g, [[727, 88], [647, 136], [619, 196]], 'blue');
  },
};

/* Firegen's inference path, following cvae/fire.py and cvae/util.py: the current fire frame,
   wind speed and wind direction condition a latent distribution whose samples decode into
   possible next states. The fire shapes are schematic, not predictions exported from the model. */

const FIREGEN: Win = { x: 26, y: 26, w: 948, h: 666, r: 44 };

SCENES['wildfire-model'] = {
  h: 700, inks, screen: diagramScreen,
  ground(g, ink) { inWindow(g, FIREGEN, () => daylight(g, ink, FIREGEN)); },
  plates(g, ink, _rng, sr) {
    const inputY = [104, 282, 460], outputY = [104, 287, 470];
    const latent = disc(447, 350, 77), draws = [[423, 338], [461, 369], [470, 333]];
    inWindow(g, FIREGEN, () => {
      inputY.forEach((y, i) => {
        const box = rect(58, y, 168, 126);
        if (ink === 'green') print(g, box, 0.12);
        if (i === 0) {
          const p = cut(ringPts(132, y + 68, 31, 39, 16, 0.25), sr, 1.5);
          if (ink === 'yellow') print(g, p, 1);
          if (ink === 'pink') { print(g, p, 0.7); keyline(g, p, 2); }
          if (ink === 'green') carve(g, p);
        }
        if (i === 1 && ink === 'blue') for (let n = 0; n < 5; n++) print(g, rect(73 + n * 29, y + 17, 20, 93), 0.15 + n * 0.17);
        if (i === 2 && ink === 'indigo') for (let n = 0; n < 3; n++) for (let j = 0; j < 3; j++) keyline(g, arrow(77 + n * 47, y + 36 + j * 33, 98 + n * 47, y + 20 + j * 33, 6), 2, 0.8);
        if (ink === 'indigo') keyline(g, box, 1.8, 0.7);
      });
      if (ink === 'pink') {
        print(g, latent, 0.16);
        draws.forEach(([x, y]) => { print(g, disc(x, y, 5)); keyline(g, disc(x, y, 10), 1.4, 0.7); });
        keyline(g, arrow(529, 350, 562, 350, 8), 2.4);
      }
      if (ink === 'yellow') draws.forEach(([x, y]) => print(g, disc(x, y, 5)));
      if (ink === 'blue') {
        print(g, latent, 0.12);
        for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) {
          const a = Math.exp(-(i * i + j * j) / 12);
          if (a > 0.06) print(g, disc(447 + i * 12, 350 + j * 12, 2 + a * 2), a);
        }
      }
      if (ink === 'indigo') {
        dashed(g, latent, [4, 6], 1.6, 0.7);
        keyline(g, rect(570, 312, 116, 76), 2.2); print(g, rect(570, 312, 116, 76), 0.08);
        keyline(g, path([[700, 350], [737, 350], [737, 167], [773, 167]]), 1.8);
        keyline(g, path([[737, 350], [737, 533], [773, 533]]), 1.8);
        keyline(g, path([[700, 350], [773, 350]]), 1.8);
        outputY.forEach(y => keyline(g, arrow(744, y + 63, 773, y + 63, 7), 1.8));
        inputY.forEach((y, i) => {
          const targetY = 350 + (i - 1) * 35;
          keyline(g, path([[241, y + 63], [278, y + 63], [342, targetY + (i - 1) * 14], [360, targetY]]), 1.5, 0.6);
        });
      }
      outputY.forEach((y, i) => {
        const box = rect(786, y, 158, 126);
        const p = cut(ringPts(859 + i * 4, y + 62, 35 + i * 5, 46 - i * 3, 19, 0.25), rngFor('firegen-sample-' + i), 1.5);
        if (ink === 'green') { print(g, box, 0.12); carve(g, p); }
        if (ink === 'yellow') print(g, p, 0.95);
        if (ink === 'pink') { print(g, p, 0.55); keyline(g, p, 2); }
        if (ink === 'indigo') { keyline(g, box, 1.8, 0.7); dashed(g, ellipse(850, y + 69, 22, 28), [4, 4], 1.5, 0.55); }
      });
    });
  },
  annotate(g) {
    rule(g, [[58, 640], [944, 640]], 'indigo', 0.35, 1);
    ['FIRE AT TIME t', 'WIND SPEED', 'WIND DIRECTION'].forEach((s, i) => label(g, s, 58, 87 + i * 178, 18));
    label(g, 'CONDITIONAL', 447, 223, 17, 'indigo', 'center'); label(g, 'LATENT DISTRIBUTION', 447, 248, 17, 'indigo', 'center');
    label(g, 'SAMPLE', 447, 466, 17, 'pink', 'center');
    label(g, 'DECODE', 628, 358, 20, 'indigo', 'center');
    label(g, 'NEXT-STATE SAMPLES', 944, 66, 17, 'indigo', 'right');
    ['01', '02', '03'].forEach((s, i) => label(g, s, 798, 127 + i * 183, 13));
    label(g, 'FIREGEN / CONDITIONAL GENERATION', 58, 674, 18); label(g, 'SCHEMATIC', 944, 674, 15, 'indigo', 'right');
  },
};

/* ── Trail mapping: a real GSOM run on synthetic fixes, each stage in its own viewport ── */

let trailCache: { data: Pt[]; res: GsomResult } | null = null;
function trailModel() {
  if (!trailCache) {
    const rng = rngFor('trails'), data = gpsFixes(rng, gauss);
    trailCache = { data, res: gsom(data, { spreadFactor: 0.5, scale: 20, r: 30, rng }) };
  }
  return trailCache;
}
const topo = terrain([[610, 400, 70, 1], [180, 260, 90, 0.9], [860, 300, 120, 0.7], [420, 120, 100, 0.6]]);

function network(g: G, ink: Ink, data: Pt[], nodes: Pt[], edges: [number, number][], k: number, triangles: [number, number, number][] = []) {
  if (ink === 'pink' && data.length) { const dots = new Path2D(); data.forEach(([x, y]) => disc(x, y, 2.6 / k, dots)); print(g, dots, 0.8); }
  for (const [a, b, c] of triangles) {                         // false triangles print orange
    if (ink === 'yellow') print(g, path([nodes[a], nodes[b], nodes[c]], true), 1);
    if (ink === 'pink') print(g, path([nodes[a], nodes[b], nodes[c]], true), 0.8);
  }
  const degree = new Array(nodes.length).fill(0);
  edges.forEach(([a, b]) => { degree[a]++; degree[b]++; });
  if (ink === 'indigo') {
    const links = new Path2D();
    edges.forEach(([a, b]) => { links.moveTo(...nodes[a]); links.lineTo(...nodes[b]); });
    keyline(g, links, 2.5 / k);
  }
  // Neurons print as paper discs ringed in indigo; junctions fill solid.
  nodes.forEach(([x, y], i) => {
    carve(g, disc(x, y, 3.8 / k));
    if (ink === 'indigo') { if (degree[i] >= 3) print(g, disc(x, y, 4.5 / k)); else keyline(g, disc(x, y, 2.5 / k), 1.3 / k); }
  });
}
type Stage = 'fixes' | 'final' | 'grown' | 'connected';
function trailGround(g: G, ink: Ink, v: Win) {
  const k = v.w / 1040;
  inWindow(g, v, () => {
    g.save();
    g.translate(v.x + 8, v.y + (v.h - 625 * k) / 2); g.scale(k, k);
    const ground = rect(-60, -400, 1160, 1500);
    if (ink === 'yellow') print(g, ground, 0.16);
    if (ink === 'pink') shade(g, ground, linear(g, 0, -300, 0, 700, [[0, 0.08], [1, 0.025]]));
    if (ink === 'blue') shade(g, ground, linear(g, 0, -300, 0, 350, [[0, 0.09], [1, 0]]));
    if (ink === 'green') keyline(g, isolines(topo, [0.15, 0.3, 0.45, 0.6, 0.75, 0.9], -60, -400, 1160, 1500, 10), 1.2 / k, 0.22);
    g.restore();
  });
}
function trailPanel(g: G, ink: Ink, v: Win, stage: Stage) {
  const { data, res } = trailModel(), k = v.w / 1040;
  inWindow(g, v, () => {
    g.save();
    g.translate(v.x + 8, v.y + (v.h - 625 * k) / 2); g.scale(k, k);
    if (stage === 'fixes') network(g, ink, data, [], [], k);
    if (stage === 'final') network(g, ink, [], res.final.nodes, res.final.edges, k);
    if (stage === 'grown') network(g, ink, data, res.grown, [], k);
    if (stage === 'connected') network(g, ink, data, res.connected.nodes, res.connected.edges, k, res.triangles);
    g.restore();
  });
}

const TRAIL_A: Win = { x: 40, y: 139, w: 420, h: 413, r: 30 }, TRAIL_B: Win = { x: 540, y: 139, w: 420, h: 413, r: 30 };
SCENES['trail-mapping'] = {
  h: 700, inks, screen: diagramScreen,
  ground(g, ink) { trailGround(g, ink, TRAIL_A); trailGround(g, ink, TRAIL_B); },
  plates(g, ink) {
    trailPanel(g, ink, TRAIL_A, 'fixes');
    trailPanel(g, ink, TRAIL_B, 'final');
    if (ink === 'indigo') keyline(g, arrow(477, 345, 525, 345, 10), 2.3);
  },
  annotate(g) {
    rule(g, [[40, 624], [960, 624]], 'indigo', 0.35, 1);
    label(g, '01 / THE OBSERVATIONS', 40, 104, 20); label(g, '02 / THE NETWORK', 540, 104, 20);
    label(g, '820 SYNTHETIC GPS FIXES', 40, 600, 16, 'pink'); label(g, 'GROW · CONNECT · SIMPLIFY', 540, 600, 16);
    label(g, 'STRUCTURE EMERGES FROM NOISE', 40, 664, 19);
  },
};

const STEPS: Win[] = [0, 1, 2].map(i => ({ x: 22 + i * 336, y: 70, w: 284, h: 252, r: 22 }));
SCENES['trail-steps'] = {
  h: 400, inks, screen: diagramScreen,
  ground(g, ink) { STEPS.forEach(v => trailGround(g, ink, v)); },
  plates(g, ink) {
    (['grown', 'connected', 'final'] as Stage[]).forEach((stage, i) => trailPanel(g, ink, STEPS[i], stage));
    if (ink === 'indigo') { keyline(g, arrow(318, 196, 348, 196, 7), 2); keyline(g, arrow(654, 196, 684, 196, 7), 2); }
  },
  annotate(g) {
    ['01 / GROW', '02 / CONNECT', '03 / SIMPLIFY'].forEach((s, i) => label(g, s, STEPS[i].x, 42, 20));
    ['Adaptive neurons', 'Edges & false triangles', 'Collapsed, smoothed'].forEach((s, i) => label(g, s, STEPS[i].x, 370, 16));
  },
};

/* ── Spatial computing: tangible labware under a camera, and its virtual counterpart ── */

const LAB: Win = { x: 26, y: 26, w: 948, h: 666, r: 44 };

function fiducial(g: G, ink: Ink, x: number, y: number, s: number) {
  // Upright sticker on the beaker's front face, with a paper margin and a solid border.
  g.save();
  g.transform(1, 0.08, -0.04, 1, x, y);
  const cell = s / 6;
  carve(g, rect(-4, -4, s + 8, s + 8));
  if (ink === 'indigo') {
    print(g, rect(0, 0, s, s));
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      if ((i * 7 + j * 3) % 5 < 3) carve(g, rect((i + 1) * cell, (j + 1) * cell, cell, cell));
    }
  }
  g.restore();
}
function beaker(g: G, ink: Ink, x: number, y: number, wire = false) {
  const trace = (p: Path2D) => { p.moveTo(x - 48, y - 103); p.lineTo(x - 43, y); p.ellipse(x, y, 43, 17, 0, Math.PI, 0, true); p.lineTo(x + 48, y - 103); return p; };
  const body = trace(new Path2D()); body.closePath();
  const outline = trace(new Path2D());
  const liquid = path([[x - 46, y - 55], [x + 46, y - 55], [x + 42, y + 1], [x - 42, y + 1]], true);
  if (!wire) {
    carve(g, body);
    if (ink === 'blue') { print(g, body, 0.12); print(g, liquid, 0.55); print(g, ellipse(x, y - 55, 46, 17), 0.35); }
    if (ink === 'green') print(g, liquid, 0.3);
  }
  if (ink === (wire ? 'pink' : 'indigo')) {
    keyline(g, outline, 2.7, wire ? 0.8 : 1);
    keyline(g, ellipse(x, y - 103, 48, 18), 2.7, wire ? 0.8 : 1);
    keyline(g, ellipse(x, y - 55, 46, 17), 1.5, 0.5);
    for (let i = 0; i < 4; i++) keyline(g, path([[x - 30, y - 80 + i * 18], [x - 18, y - 80 + i * 18]]), 1.7, 0.65);
  }
}

SCENES['vr-labs'] = {
  h: 700, inks, screen: diagramScreen,
  ground(g, ink) {
    inWindow(g, LAB, () => {
      daylight(g, ink, LAB);
      if (ink === 'blue') shade(g, rect(0, 0, 1000, 700), linear(g, 0, 380, 0, 692, [[0, 0], [1, 0.12]]));
    });
  },
  plates(g, ink) {
    const bench = path([[85, 382], [448, 231], [737, 440], [374, 604]], true);
    const under = path([[85, 382], [374, 604], [737, 440], [737, 458], [374, 622], [85, 400]], true);
    const view = path([[448, 118], [136, 379], [635, 468]], true);
    const dish = ellipse(341, 476, 65, 29);
    const cam = rect(401, 78, 90, 50);
    inWindow(g, LAB, () => {
      // A lab wall in warm afternoon light, a pale blue floor, the camera's view lit on the bench.
      if (ink === 'yellow') { plane(g, bench, 0.55); print(g, view, 0.25); }
      if (ink === 'pink') plane(g, bench, 0.22);
      if (ink === 'blue') { plane(g, under, 0.55); print(g, dish, 0.25); }
      if (ink === 'green') { carve(g, bench); plane(g, under, 0.35); print(g, dish, 0.3); }
      if (ink === 'indigo') {
        carve(g, bench); keyline(g, bench, 2.2, 0.8); keyline(g, under, 2.2, 0.8); print(g, under, 0.2);
        keyline(g, cam, 3); print(g, rect(408, 85, 44, 35), 0.3); keyline(g, disc(471, 104, 12), 3); keyline(g, path([[417, 77], [425, 62], [468, 62], [478, 77]]), 2.5);
        keyline(g, dish, 2); keyline(g, ellipse(341, 476, 51, 21), 1.5, 0.6); keyline(g, path([[276, 476], [277, 493], [341, 522], [405, 493], [406, 476]]), 1.8, 0.7);
      }
      beaker(g, ink, 340, 366);
      beaker(g, ink, 812, 361, true);
      fiducial(g, ink, 333, 307, 42);
      if (ink === 'pink') {
        const bridge = new Path2D();
        bridge.moveTo(423, 370); bridge.bezierCurveTo(530, 267, 674, 260, 744, 297);
        dashed(g, bridge, [5, 8], 2.6); keyline(g, arrow(722, 294, 744, 297, 8), 2.6);
        dashed(g, rect(748, 233, 128, 166), [6, 6], 1.8, 0.8);
        keyline(g, arrow(423, 370, 500, 394, 10), 3.5);
      }
      if (ink === 'yellow') keyline(g, arrow(423, 370, 500, 394, 10), 3.5);   // x prints orange
      if (ink === 'green') keyline(g, arrow(423, 370, 380, 427, 10), 3.5);
      if (ink === 'indigo') {
        keyline(g, arrow(423, 370, 423, 298, 10), 3.5);
        dashed(g, path([[378, 338], [423, 370]]), [3, 4], 1.6, 0.6);
      }
    });
  },
  annotate(g) {
    rule(g, [[448, 132], [136, 379]], 'indigo', 0.35, 1, [5, 7]); rule(g, [[448, 132], [635, 468]], 'indigo', 0.35, 1, [5, 7]);
    rule(g, [[55, 650], [943, 650]], 'indigo', 0.35, 1);
    label(g, 'TRACKING CAMERA', 548, 114, 18); rule(g, [[529, 108], [499, 108]]);
    label(g, 'PHYSICAL', 75, 680, 20); label(g, 'VIRTUAL', 943, 680, 20, 'indigo', 'right');
    label(g, 'ARUCO MARKER', 83, 270, 16); rule(g, [[214, 265], [269, 265], [326, 316]]);
    label(g, 'POSE', 583, 253, 17, 'pink');
    label(g, 'x', 509, 400, 18, 'orange'); label(g, 'y', 366, 443, 18, 'green'); label(g, 'z', 421, 288, 18);
    label(g, 'VIRTUAL OBJECT', 812, 430, 16, 'indigo', 'center');
  },
};
