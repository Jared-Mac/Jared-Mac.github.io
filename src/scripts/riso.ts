/* Risograph print engine for the site's illustrations.

   Ported from the print kit in sevenevesai/riso-windowseat (prints/workings): each scene is drawn
   once per ink as a coverage plate (alpha is tone), screened into halftone dots at a fixed angle,
   tinted, offset by a fixed misregistration and multiplied onto white. The canvas then multiplies
   onto the page's paper texture. Plates are baked at display size in device pixels, never scaled,
   because resampling a halftone moirés. */
import { INK, SCREEN, REG, PITCH, U, TAU, type Ink, type Rng, rngFor, clamp, cv, ctx } from './riso-kit';
import { SCENES } from './riso-scenes';

/* ── halftone screens ── */

interface Screen { S: number; th: Float32Array; }
const screens = new Map<string, Screen>();

function screenOf(ink: Ink, pitch: number): Screen {
  const key = ink + '@' + pitch.toFixed(2);
  const hit = screens.get(key);
  if (hit) return hit;
  const [a, b] = SCREEN[ink];
  const n = a * a + b * b;
  const S = Math.max(2, Math.round(pitch * Math.sqrt(n)));
  const P = S / Math.sqrt(n), u = P / Math.sqrt(n);
  const v1 = [u * a, u * b], v2 = [-u * b, u * a];
  const pts: number[][] = [];
  for (let m = -n; m <= n; m++) for (let k = -n; k <= n; k++) {
    const x = m * v1[0] + k * v2[0], y = m * v1[1] + k * v2[1];
    const wx = ((x % S) + S) % S, wy = ((y % S) + S) % S;
    if (!pts.some(p => Math.abs(p[0] - wx) < 0.01 && Math.abs(p[1] - wy) < 0.01)) pts.push([wx, wy]);
  }
  const wrapped: number[][] = [];
  for (const [x, y] of pts) for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) wrapped.push([x + dx, y + dy]);
  // A pixel takes ink when coverage exceeds the coverage at which a dot would reach it.
  const th = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d2 = Infinity;
    for (const [px, py] of wrapped) {
      const dx = x + 0.5 - px, dy = y + 0.5 - py, q = dx * dx + dy * dy;
      if (q < d2) d2 = q;
    }
    th[y * S + x] = clamp(Math.PI * d2 / (P * P), 0, 1);
  }
  const sc = { S, th };
  screens.set(key, sc);
  return sc;
}

/** Screen a coverage canvas; lower texture preserves continuous tones under the dots. */
function screenPlate(cover: HTMLCanvasElement, ink: Ink, pitch: number, texture = 1) {
  const { S, th } = screenOf(ink, pitch);
  const w = cover.width, h = cover.height;
  const img = ctx(cover).getImageData(0, 0, w, h), d = img.data;
  // At screen pitch a cell holds only ~13 pixels, so a smooth ramp quantises into visible bands;
  // a little seeded jitter on the threshold dithers the steps back into a ramp.
  const jit = rngFor('jitter:' + ink), J = 0.9 * texture / (S * S / (SCREEN[ink][0] ** 2 + SCREEN[ink][1] ** 2));
  const hex = INK[ink], r = parseInt(hex.slice(1, 3), 16), gr = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
  for (let y = 0; y < h; y++) {
    const row = (y % S) * S;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const c = d[i + 3] / 255, on = c >= 0.9 || (c > 0.004 && c + (jit() - 0.5) * J > th[row + (x % S)]);  // solids and line work print solid
      d[i] = r; d[i + 1] = gr; d[i + 2] = bl;
      d[i + 3] = Math.round((c + (Number(on) - c) * texture) * 255);
    }
  }
  const out = cv(w, h);
  ctx(out).putImageData(img, 0, 0);
  return out;
}

/** Ink starvation: flecks dropped out of solids so they read as riso, not laser. */
function starve(g: CanvasRenderingContext2D, rng: Rng, dpr: number) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  const { width: w, height: h } = g.canvas;
  const n = Math.round(w * h / (1000 * dpr * dpr));
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.2 + rng() * 0.55;
    g.beginPath();
    g.arc(rng() * w, rng() * h, (0.3 + rng() * 1.2) * dpr, 0, TAU);
    g.fill();
  }
  g.restore();
}

/* ── baking ── */

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const dprOf = () => Math.min(window.devicePixelRatio || 1, 2);
const MAX_BAKE = 2600;  // device px across

interface Job { plates: HTMLCanvasElement[]; reg: [number, number][]; ground?: HTMLCanvasElement; annotate?: (g: CanvasRenderingContext2D) => void; scale?: number; }

function composite(canvas: HTMLCanvasElement, job: Job, upto: number) {
  const o = canvas.getContext('2d')!;
  // White multiplies away, so the page's paper stock shows through everywhere ink is not.
  o.globalCompositeOperation = 'source-over';
  o.fillStyle = '#fff';
  o.fillRect(0, 0, canvas.width, canvas.height);
  if (job.ground) o.drawImage(job.ground, 0, 0);
  o.globalCompositeOperation = 'multiply';
  for (let i = 0; i < upto; i++) o.drawImage(job.plates[i], job.reg[i][0], job.reg[i][1]);
  if (upto === job.plates.length && job.annotate) {
    o.save();
    o.globalCompositeOperation = 'source-over';
    o.setTransform(job.scale!, 0, 0, job.scale!, 0, 0);
    job.annotate(o);
    o.restore();
  }
}

/** Pass the plates through the press one ink at a time, then keep the finished print. */
let pressed = false;
const activePresses = new WeakMap<HTMLCanvasElement, Job>();
function press(canvas: HTMLCanvasElement, job: Job) {
  activePresses.set(canvas, job);
  delete canvas.dataset.printed;
  if (pressed || reduced()) { composite(canvas, job, job.plates.length); canvas.dataset.printed = ''; return; }
  let i = 0;
  const step = () => {
    if (activePresses.get(canvas) !== job) return;
    composite(canvas, job, ++i);
    if (i < job.plates.length) setTimeout(step, 110);
    else canvas.dataset.printed = '';
  };
  step();
}

function bakeScene(canvas: HTMLCanvasElement, id: string) {
  const sc = SCENES[id];
  if (!sc) return;
  const css = canvas.clientWidth;
  if (!css) return;
  // Cap the backing store so an enlarged figure stays affordable to screen on a phone.
  const dpr = Math.min(dprOf(), MAX_BAKE / css), w = Math.round(css * dpr);
  const h = Math.round(w * sc.h / U), k = w / U;
  canvas.width = w; canvas.height = h;
  const cover = cv(w, h), g = ctx(cover);
  // Notation is only set where it can be read; small cards show the picture alone.
  const labelled = css >= (sc.labelsFrom ?? 560);
  const job: Job = { plates: [], reg: [], annotate: labelled ? sc.annotate : undefined, scale: k };
  if (sc.ground) {
    // Soft underprinting leaves the detailed diagram ink visually in front.
    job.ground = cv(w, h);
    const base = ctx(job.ground);
    base.fillStyle = '#fff'; base.fillRect(0, 0, w, h);
    base.globalCompositeOperation = 'multiply';
    for (const ink of sc.inks) {
      g.setTransform(k, 0, 0, k, 0, 0);
      g.clearRect(0, 0, U, sc.h);
      g.fillStyle = g.strokeStyle = '#000';
      g.save();
      sc.ground(g, ink, rngFor(id + ':' + ink), rngFor(id + ':shape'));
      g.restore();
      base.drawImage(screenPlate(cover, ink, 2.1 * dpr, 0.12), 0, 0);
    }
  }
  for (const ink of sc.inks) {
    g.setTransform(k, 0, 0, k, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, U, sc.h);
    g.fillStyle = g.strokeStyle = '#000';
    g.lineCap = g.lineJoin = 'round';
    g.save();
    sc.plates(g, ink, rngFor(id + ':' + ink), rngFor(id + ':shape'));
    g.restore();
    starve(g, rngFor(id + ':' + ink + ':void'), dpr);
    job.plates.push(screenPlate(cover, ink, (sc.screen?.pitch ?? PITCH) * dpr, sc.screen?.texture ?? 1));
    const registration = sc.screen?.registration ?? 1;
    job.reg.push([REG[ink][0] * dpr * registration, REG[ink][1] * dpr * registration]);
  }
  press(canvas, job);
}

/** A gentle duotone: continuous shading keeps the face readable beneath a light screen. */
function bakePhoto(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const dpr = dprOf(), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
  if (!w || !h) return;
  canvas.width = w; canvas.height = h;
  const [sx, sy, sw, sh] = (canvas.dataset.crop ?? `0 0 ${img.naturalWidth} ${img.naturalHeight}`).split(' ').map(Number);
  const scale = Math.max(w / sw, h / sh);
  const src = cv(w, h), s = ctx(src);
  s.drawImage(img, sx + (sw - w / scale) / 2, sy + (sh - h / scale) / 2, w / scale, h / scale, 0, 0, w, h);
  const px = s.getImageData(0, 0, w, h).data;
  const job: Job = { plates: [], reg: [] };
  const layers: [Ink, (d: number) => number][] = [
    ['pink', d => clamp((d - 0.1) * 0.35, 0, 0.3)],
    ['indigo', d => clamp(Math.pow(Math.max(0, d - 0.16) / 0.84, 1.2) * 0.95, 0, 1)],
  ];
  for (const [ink, curveOf] of layers) {
    const cover = cv(w, h), c = ctx(cover), img2 = c.createImageData(w, h), out = img2.data;
    for (let i = 0; i < px.length; i += 4) {
      const lum = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255;
      out[i + 3] = curveOf(clamp((1 - lum - 0.5) * 1.1 + 0.5, 0, 1)) * 255;
    }
    c.putImageData(img2, 0, 0);
    // Preserve facial detail: no ink dropout, faint dots, and almost aligned plates.
    job.plates.push(screenPlate(cover, ink, PITCH * 0.7 * dpr, 0.18));
    job.reg.push([REG[ink][0] * dpr * 0.15, REG[ink][1] * dpr * 0.15]);
  }
  press(canvas, job);
}

function bakeAll() {
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-riso]').forEach(c => bakeScene(c, c.dataset.riso!));
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-riso-photo]').forEach(c => {
    const img = document.querySelector<HTMLImageElement>(c.dataset.risoPhoto!);
    if (!img) return;
    const go = () => { try { bakePhoto(c, img); } catch { c.hidden = true; } };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
  });
}

export function init() {
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 60));
  // Notation is set in IBM Plex Mono, so wait for the webfont before printing it into a canvas.
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => idle(() => { bakeAll(); setTimeout(() => { pressed = true; }, 1000); }));
  // Re-screen at the new size rather than scaling finished dots.
  let lastW = innerWidth, timer = 0;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    clearTimeout(timer);
    timer = window.setTimeout(bakeAll, 250);
  });
  const dialog = document.querySelector<HTMLDialogElement>('.figure-dialog');
  if (dialog) {
    const large = dialog.querySelector<HTMLCanvasElement>('canvas')!;
    document.querySelectorAll<HTMLButtonElement>('[data-expand-scene]').forEach(button => {
      button.addEventListener('click', () => {
        const title = button.dataset.figureTitle!;
        dialog.querySelector('h2')!.textContent = title;
        large.setAttribute('aria-label', button.closest('figure')?.querySelector('figcaption p')?.textContent ?? title);
        large.dataset.riso = button.dataset.expandScene!;
        dialog.showModal();
        bakeScene(large, large.dataset.riso);
        dialog.querySelector('.viewer-scroll')!.scrollTo(0, 0);
      });
    });
    dialog.querySelector('[data-close-figure]')!.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
  }
}
