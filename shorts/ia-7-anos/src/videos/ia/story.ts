// Timeline of "Los 7 años" (20.2 s), timed to public/voz/voz.wav (see voz/segs.json).
// Voice frames: "Olvida a los robots asesinos" 0-45 · "La IA no necesita balas: le bastan siete años" 49-152 ·
// "Año uno" 156-216 · "Año tres" 220-337 · "Año cinco" 341-406 · "Año siete" 410-504 · "Por suerte... Por desgracia..." 508-604
export const FPS = 30;
export const TOTAL = 606;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 = calm teal dusk, 1 = the sky has gone red */
export const takeover = (f: number) => smooth(f / 560);
/** the eye in the sky: opens over the first second, then grows with the years */
export const EYE = {
  x: 0, z: -520,
  y: (f: number) => lerp(45, 130, smooth(f / 560)),
  w: (f: number) => lerp(70, 560, smoother((f - 20) / 540)),
};

type Key = { f: number; pos: V3; look: V3; fov: number; glide?: boolean };
export type ShotDef = { id: number; a: number; b: number; keys: Key[]; fog: [number, number] };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 152, fog: [120, 900], keys: [
    { f: 0, pos: [0.2, 1.7, 4.8], look: [0, 1.9, 0], fov: 40 }, // the hero, face on
    { f: 16, pos: [0.15, 1.7, 4.4], look: [0, 1.9, 0], fov: 40 },
    { f: 60, pos: [1.1, 1.9, -3.6], look: [0, 2.6, -40], fov: 44, glide: true }, // we pass the hero, into the crowd
    { f: 128, pos: [0.6, 2.2, -9], look: [0, 40, -500], fov: 50, glide: true }, // and look up: the eye
    { f: 152, pos: [0.6, 2.3, -9.5], look: [0, 42, -500], fov: 50 },
  ] },
  { id: 2, a: 146, b: 340, fog: [120, 900], keys: [
    { f: 146, pos: [0.9, 1.5, -4], look: [0, 2.2, -40], fov: 42 },
    { f: 200, pos: [0.7, 1.5, -12], look: [0, 2.4, -50], fov: 42, glide: true },
    { f: 262, pos: [0.4, 1.6, -22], look: [0, 3.2, -70], fov: 40, glide: true },
    { f: 316, pos: [0, 9, -22], look: [0, 1, -50], fov: 50, glide: true }, // rising over the heads
    { f: 340, pos: [0, 10, -22.5], look: [0, 1, -50], fov: 50 },
  ] },
  { id: 3, a: 334, b: 508, fog: [200, 1200], keys: [
    { f: 334, pos: [0, 26, 8], look: [0, 4, -45], fov: 56 }, // from above: everyone looking down at the glow
    { f: 400, pos: [0, 36, 18], look: [0, 10, -80], fov: 60, glide: true },
    { f: 508, pos: [0, 37, 19], look: [0, 11, -80], fov: 60 },
  ] },
  { id: 4, a: 502, b: TOTAL, fog: [250, 1400], keys: [
    { f: 502, pos: [0, 3.2, 10], look: [0, 80, -500], fov: 46 }, // wide: the eye fills the sky
    { f: 566, pos: [0, 4.2, 14], look: [0, 90, -500], fov: 46, glide: true },
    { f: TOTAL, pos: [0, 4.4, 14.6], look: [0, 92, -500], fov: 46 },
  ] },
];
export const XFADE = 6;

const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const camAt = (id: number, f: number) => {
  const k = SHOTS[id - 1].keys;
  if (f <= k[0].f) return { pos: k[0].pos, look: k[0].look, fov: k[0].fov };
  for (let i = 1; i < k.length; i++) if (f <= k[i].f) {
    const u = (f - k[i - 1].f) / (k[i].f - k[i - 1].f), t = k[i].glide ? smoother(u) : u;
    return { pos: lerp3(k[i - 1].pos, k[i].pos, t), look: lerp3(k[i - 1].look, k[i].look, t), fov: lerp(k[i - 1].fov, k[i].fov, t) };
  }
  const l = k[k.length - 1];
  return { pos: l.pos, look: l.look, fov: l.fov };
};

export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (let i = SHOTS.length - 1; i > 0; i--) {
    const a = SHOTS[i].a;
    if (f >= a + XFADE) return [{ id: i + 1, alpha: 1 }];
    if (f >= a) return [{ id: i, alpha: 1 }, { id: i + 1, alpha: (f - a + 1) / (XFADE + 1) }];
  }
  return [{ id: 1, alpha: 1 }];
};

// slow motion on "año siete": the world clock runs at 35 %
const SLOW = { in0: 440, in1: 452, out0: 540, out1: 552, rate: 0.35 };
const rateAt = (f: number) => 1 - (1 - SLOW.rate) * (smooth((f - SLOW.in0) / (SLOW.in1 - SLOW.in0)) - smooth((f - SLOW.out0) / (SLOW.out1 - SLOW.out0)));
const WF = (() => { const a = [0]; for (let f = 1; f <= TOTAL + 2; f++) a.push(a[f - 1] + rateAt(f - 0.5)); return a; })();
export const worldF = (f: number) => { const i = Math.max(0, Math.min(TOTAL + 1, Math.floor(f))); return WF[i] + (WF[i + 1] - WF[i]) * (f - i); };

export const dofAt = (id: number, f: number): { cInf: number; focus?: V3 } => {
  if (id === 1) return f < 18 ? { cInf: 14, focus: [0, 1.9, 0] } : { cInf: lerp(10, 0, smooth((f - 40) / 40)) };
  if (id === 2) return { cInf: lerp(8, 2, smooth((f - 146) / 150)) };
  return { cInf: 0 };
};

/** discreet year counter at the top of the frame */
export const YEARS = [
  { a: 156, b: 218, label: "AÑO 1", sub: "las tareas pequeñas" },
  { a: 220, b: 338, label: "AÑO 3", sub: "40 % de los empleos expuestos · FMI" },
  { a: 341, b: 408, label: "AÑO 5", sub: "decide qué ves y qué crees" },
  { a: 410, b: 506, label: "AÑO 7", sub: "nadie la apaga" },
];
