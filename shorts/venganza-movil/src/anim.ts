// Animación pura (solo números). 30 fps, 420 cuadros = 14 s. Termina en el aire y vuelve al cuadro 0.
export const FPS = 30;
export const DUR = 420;
export type V3 = [number, number, number];

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sm = (x: number) => {
  x = clamp(x);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export const ramp = (f: number, a: number, b: number) => sm((f - a) / (b - a));
const lin = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
const L = (a: number, b: number, t: number) => a + (b - a) * t;
const L3 = (a: V3, b: V3, t: number): V3 => [L(a[0], b[0], t), L(a[1], b[1], t), L(a[2], b[2], t)];
const bump = (f: number, t0: number, d: number) => (f < t0 || f > t0 + d ? 0 : Math.sin((Math.PI * (f - t0)) / d));

// Escenario
export const SEAT_TOP = 2.6;
export const SEAT_X0 = 4.5;
export const SEAT_X1 = 6.5;
export const CHAIR_Z = 0.5;
export const BED_X0 = 7.8;
export const BED_TOP = 3.2;

export interface Phone {
  pos: V3; yaw: number; lay: number; lean: number; sq: number;
  lid: number; look: [number, number]; anger: number; mouth: number; glow: number; pupil: number;
  hL: V3; hR: V3;
}

const CRAWL0 = 100, PER = 22, NST = 4, STEP = 0.88;

function crawlHands(f: number, z: number): { hL: V3; hR: V3 } {
  let k = Math.floor((f - CRAWL0) / PER);
  k = clamp(k, 0, NST - 1);
  const u = f >= CRAWL0 + NST * PER ? PER : f - CRAWL0 - k * PER;
  const rear = STEP * k + 0.57, front = STEP * k + 1.45;
  const one = (d: number, zo: number): V3 => {
    const t = lin(u, d, 9 + d);
    return [L(rear, front, sm(t)), 0.06 + 0.6 * Math.sin(Math.PI * t), z + zo];
  };
  return { hL: one(0, 0.45), hR: one(2, -0.35) };
}

export function phoneAt(f: number): Phone {
  let x = 0, y = 0, z = 1.2, yaw = 0.2, lean = 0, sq = 1;
  let lay = 0.8 * (1 - ramp(f, 40, 84));
  yaw = 0.2 + 0.4 * ramp(f, 84, 112);
  // arrastre por el suelo
  if (f >= CRAWL0) {
    let k = clamp(Math.floor((f - CRAWL0) / PER), 0, NST - 1);
    const u = f >= CRAWL0 + NST * PER ? PER : f - CRAWL0 - k * PER;
    x = STEP * (k + ramp(u, 9, 19));
  }
  z = L(1.2, 0.5, ramp(f, 100, 190));
  // trepar la silla
  y += 0.5 * Math.sin(Math.PI * lin(f, 188, 198)) * (f < 198 ? 1 : 0);
  y += 1.75 * ramp(f, 201, 226) + 1.3 * ramp(f, 224, 240) - 0.43 * ramp(f, 246, 258);
  y += 0.1 * Math.sin((f - 201) * 0.9) * bump(f, 201, 25);
  x += 0.48 * ramp(f, 205, 226) + 0.9 * ramp(f, 232, 246) + 0.6 * ramp(f, 246, 260);
  lean = -1.45 * ramp(f, 230, 246) + 1.45 * ramp(f, 246, 262);
  // vuelo
  if (f >= 372) {
    const t = clamp((f - 372) / 47);
    x = 5.5 + 3.3 * t;
    y = 2.62 + 2.75 * (1 - (1 - t) * (1 - t));
    z = 0.5 - 0.7 * t;
    lean = -0.5 * sm(t * 2);
    yaw = 0.6 + 0.35 * ramp(f, 372, 392);
  }
  // aplastes
  sq = 1 + 0.01 * Math.sin(f * 0.25);
  sq -= 0.18 * bump(f, 84, 8) + 0.2 * bump(f, 262, 10) + 0.06 * bump(f, 198, 6);
  for (let k = 0; k < NST; k++) sq -= 0.05 * bump(f, CRAWL0 + PER * k + 9, 8);
  sq -= 0.22 * ramp(f, 300, 340) + 0.1 * ramp(f, 340, 368);
  sq += 0.02 * Math.sin(f * 1.7) * ramp(f, 340, 372);
  if (f >= 372) sq = L(1.3, 1.08, ramp(f, 372, 395));

  // manos
  const pos: V3 = [x, y, z];
  const yaw0 = 0.2;
  const anchor = (s: number): V3 => [
    s * 0.95 * Math.cos(yaw0) + 0.15 * Math.sin(yaw0), 0.07,
    1.2 - s * 0.95 * Math.sin(yaw0) + 0.15 * Math.cos(yaw0),
  ];
  let hL: V3, hR: V3;
  const cr = crawlHands(Math.max(f, CRAWL0), z);
  if (f < CRAWL0) {
    const c0 = crawlHands(CRAWL0, 1.2);
    hL = L3(anchor(-1), c0.hL, ramp(f, 88, 100));
    hR = L3(anchor(1), c0.hR, ramp(f, 88, 100));
  } else {
    hL = cr.hL; hR = cr.hR;
  }
  if (f >= 188) {
    const edgeL: V3 = [4.45, 2.74, CHAIR_Z + 0.45], edgeR: V3 = [4.45, 2.74, CHAIR_Z - 0.4];
    const p1L: V3 = [4.8, 2.64, CHAIR_Z + 0.5], p1R: V3 = [4.8, 2.64, CHAIR_Z - 0.5];
    const p2L: V3 = [5.15, 2.64, CHAIR_Z + 0.5], p2R: V3 = [5.15, 2.64, CHAIR_Z - 0.5];
    const idle = (s: number): V3 => [
      x + s * 0.85 * Math.cos(yaw) + 0.1 * Math.sin(yaw), y + 0.3 * sq,
      z - s * 0.85 * Math.sin(yaw) + 0.1 * Math.cos(yaw),
    ];
    let aL = L3(hL, edgeL, ramp(f, 190, 199)), aR = L3(hR, edgeR, ramp(f, 190, 199));
    aL = L3(aL, p1L, ramp(f, 226, 236)); aR = L3(aR, p1R, ramp(f, 226, 236));
    aL = L3(aL, p2L, ramp(f, 246, 254)); aR = L3(aR, p2R, ramp(f, 246, 254));
    const r = ramp(f, 262, 274);
    aL = L3(aL, idle(-1), r); aR = L3(aR, idle(1), r);
    // armas hacia atrás (impulso)
    const w = ramp(f, 300, 335);
    const backL: V3 = [x - 1.15, y + 0.95, z + 0.5], backR: V3 = [x - 1.15, y + 0.95, z - 0.45];
    aL = L3(aL, backL, w); aR = L3(aR, backR, w);
    if (f >= 372) {
      const fr = ramp(f, 372, 384);
      const fwL: V3 = [x + 1.35, y + 1.35, z + 0.15], fwR: V3 = [x + 1.35, y + 1.45, z - 0.55];
      aL = L3(aL, fwL, fr); aR = L3(aR, fwR, fr);
    }
    hL = aL; hR = aR;
  }

  // cara
  const blink = (t: number) => bump(f, t, 5);
  let lid = 0;
  lid += 0.12 * ramp(f, 40, 64) + 0.06 * ramp(f, 64, 100) - 0.1 * ramp(f, 186, 196) + 0.1 * ramp(f, 244, 262);
  lid += 0.18 * ramp(f, 296, 340) + 0.1 * ramp(f, 340, 370) - 0.4 * ramp(f, 372, 378);
  lid += blink(24) + blink(118) + blink(158) + blink(285) + blink(309);
  if (f < 2) lid = 1;
  else lid = L(1, lid, ramp(f, 1.5, 4));
  lid = clamp(lid, 0, 1);
  const anger = clamp(0.35 * ramp(f, 6, 40) + 0.2 * ramp(f, 64, 100) + 0.25 * ramp(f, 262, 340) + 0.2 * ramp(f, 340, 372));
  const lx = 0.0 + 0.85 * ramp(f, 54, 70) + 0.04 * Math.sin(f * 0.7) + 0.1 * ramp(f, 262, 300);
  const ly = 0.05 + 0.7 * ramp(f, 188, 196) - 0.7 * ramp(f, 236, 250) - 0.3 * ramp(f, 372, 380);
  const mouth = ramp(f, 372, 376);
  const glow = f < 2 ? 0 : 1 + 2.5 * Math.exp(-(f - 2) / 4);
  const pupil = 0.085 - 0.02 * anger - 0.012 * mouth;
  return { pos, yaw, lay, lean, sq, lid, look: [lx, ly], anger, mouth, glow, pupil, hL, hR };
}

// --- Dueño ---
export function ownerAt(f: number) {
  const breath = Math.sin((2 * Math.PI * f) / 84);
  return { breath, mouth: 0.5 + 0.5 * breath };
}

// --- Cámara ---
interface Key { p: V3; l: V3; fov: number }
interface Shot { a: number; b: number; f: Key; t: Key }
export const SHOTS: Shot[] = [
  { a: 0, b: 34, f: { p: [2.7, 1.9, 3.6], l: [0.1, 0.4, 0.75], fov: 34 }, t: { p: [1.9, 1.2, 2.9], l: [0.1, 0.42, 0.75], fov: 44 } },
  { a: 34, b: 64, f: { p: [13.6, 5.0, 3.4], l: [16.0, 4.1, -1.4], fov: 48 }, t: { p: [14.6, 4.7, 2.8], l: [16.1, 4.2, -1.4], fov: 46 } },
  { a: 64, b: 100, f: { p: [1.5, 0.4, 3.4], l: [-0.1, 0.8, 1.0], fov: 54 }, t: { p: [1.1, 0.55, 3.0], l: [0.0, 0.95, 1.1], fov: 50 } },
  { a: 100, b: 190, f: { p: [1.0, 0.9, 4.8], l: [0.4, 0.8, 1.0], fov: 60 }, t: { p: [4.5, 1.1, 4.6], l: [3.9, 1.0, 0.5], fov: 60 } },
  { a: 190, b: 262, f: { p: [4.3, 2.0, 8.0], l: [4.4, 1.8, 0.5], fov: 52 }, t: { p: [5.4, 3.2, 7.2], l: [5.0, 2.9, 0.5], fov: 50 } },
  { a: 262, b: 312, f: { p: [4.4, 4.0, 7.5], l: [6.2, 3.4, 0.3], fov: 55 }, t: { p: [4.9, 3.9, 6.8], l: [6.3, 3.4, 0.3], fov: 52 } },
  { a: 312, b: 372, f: { p: [6.8, 4.0, 3.4], l: [5.55, 3.35, 0.55], fov: 44 }, t: { p: [6.3, 3.8, 2.9], l: [5.55, 3.3, 0.55], fov: 41 } },
  { a: 372, b: 420, f: { p: [7.0, 3.4, 5.4], l: [6.0, 3.7, 0.5], fov: 56 }, t: { p: [9.6, 5.0, 6.0], l: [8.9, 5.3, 0.0], fov: 56 } },
];
const EVENTS = [{ t: 2, a: 0.1, d: 10 }, { t: 84, a: 0.05, d: 8 }, { t: 198, a: 0.05, d: 8 }, { t: 262, a: 0.07, d: 10 }, { t: 372, a: 0.14, d: 14 }];

export function camAt(f: number) {
  const s = SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
  const u = clamp((f - s.a) / (s.b - s.a));
  const t = 0.6 * u + 0.4 * sm(u); // nunca se queda quieta
  const p = L3(s.f.p, s.t.p, t), l = L3(s.f.l, s.t.l, t);
  let fov = L(s.f.fov, s.t.fov, t);
  let sh = 0;
  for (const e of EVENTS) if (f >= e.t && f < e.t + e.d) sh += e.a * Math.pow(1 - (f - e.t) / e.d, 2) * (f % 2 ? 1 : -1);
  const sway = (k: number) => 0.015 * Math.sin(f * 0.07 + k);
  const pos: V3 = [p[0] + sway(0) + sh * 0.5, p[1] + sway(1) + sh, p[2] + sway(2)];
  return { pos, look: l, fov, roll: sh * 0.15 };
}
