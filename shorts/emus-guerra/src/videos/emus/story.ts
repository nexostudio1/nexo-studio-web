// "La guerra que perdió Australia" (48.4 s), timed to public/voz/voz.wav (word frames from public/voz/palabras.json).
// Words (frames): Sabías 0 · pájaros 82 · y perdió 99-115 | 1932 121 · oeste de Australia 177 · Veinte mil emús 212 · trigo 260 ·
// granjeros 275 | El gobierno 297 · Meredith 329 · dos soldados 352 · dos ametralladoras 379 · diez mil balas 412-440 |
// Primer día 445 · ven cincuenta emús 475 · Disparan 509 · salen corriendo 542 · cada uno para un lado 575-610 |
// Segundo intento 616 · mil emús 649 · beber a una presa 679 · Esta vez sí 710 · Abren fuego 736 · y la ametralladora 757 ·
// se atasca 785-800 | Por suerte 808 · ni un soldado herido 852 · Por desgracia 893 · tampoco muchos emús 921-950 |
// Fíjate 960 · un emú corre 979 · cincuenta km/h 1005 · más rápido que un coche 1057 · barrio 1106 | Meredith dijo 1124 ·
// tanques 1202 · Al final gastó 1222 · casi diez mil balas 1249 · diez por cada emú 1283-1315 | Y el trigo 1320 ·
// se lo siguieron comiendo 1346 · ¿Tú en qué bando habrías estado? 1397-1437
export const FPS = 30;
export const TOTAL = 1452;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** places */
export const CAMP = { x: 0, z: 0 };
export const DAM = { x: 300, z: -95, r: 16, gun: { x: 300, z: -63 } };
export const ROAD_Z = 30.5;
/** the emu that races the car (shot 7): x by output frame */
export const racerX = (f: number) => (f - 953) * 0.467;
export const carX = (f: number) => 13 + (f - 953) * 0.34;

type Key = { f: number; pos: V3; look: V3; fov: number; glide?: boolean };
export type ShotDef = { id: number; a: number; b: number; keys: Key[]; fog: [number, number] };
const R7 = (f: number, dy = 0): V3 => [racerX(f) - 0.4, 1.35 + dy, ROAD_Z + 7.2];
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 126, fog: [150, 1600], keys: [ // Meredith face on, his men beside him, the emus behind; past him and up
    { f: 0, pos: [0.25, 1.72, 4.6], look: [0, 1.75, 0], fov: 40 },
    { f: 14, pos: [0.22, 1.72, 4.2], look: [0, 1.75, 0], fov: 40 },
    { f: 58, pos: [0.95, 2.0, -2.6], look: [0, 1.2, -60], fov: 46, glide: true },
    { f: 112, pos: [0, 34, 6], look: [0, 0, -120], fov: 56, glide: true },
    { f: 126, pos: [0, 35, 6.6], look: [0, 0, -120], fov: 56 },
  ] },
  { id: 2, a: 120, b: 296, fog: [150, 1600], keys: [ // down in the wheat with the feeding herd, then up: 20,000 of them
    { f: 120, pos: [3.2, 1.1, -23.6], look: [1.5, 1.0, -34], fov: 40 },
    { f: 202, pos: [2.8, 1.15, -25], look: [1.2, 1.0, -34], fov: 40 },
    { f: 258, pos: [0, 70, -16], look: [0, 0, -260], fov: 58, glide: true },
    { f: 296, pos: [0, 72, -17], look: [0, 0, -262], fov: 58 },
  ] },
  { id: 3, a: 290, b: 445, fog: [150, 1600], keys: [ // the expedition: Meredith, two soldiers, two guns, 10,000 rounds
    { f: 290, pos: [0.15, 1.66, 3.3], look: [0, 1.62, 0], fov: 38 },
    { f: 340, pos: [0.12, 1.66, 3.0], look: [0, 1.62, 0], fov: 38 },
    { f: 372, pos: [0, 1.9, 8], look: [0, 1.3, 0], fov: 44, glide: true },
    { f: 400, pos: [0, 1.5, 9], look: [0, 0.95, 0], fov: 46, glide: true },
    { f: 432, pos: [0, 5, 16], look: [0, 0.8, -0.5], fov: 50, glide: true },
    { f: 445, pos: [0, 5.2, 16.5], look: [0, 0.8, -0.5], fov: 50 },
  ] },
  { id: 4, a: 439, b: 618, fog: [150, 1600], keys: [ // first day: 50 emus, from among them looking back at the guns; then they scatter
    { f: 439, pos: [0.7, 2.9, -59], look: [0, 1.2, 0], fov: 24 },
    { f: 540, pos: [0.6, 2.9, -58], look: [0, 1.2, 0], fov: 23 },
    { f: 592, pos: [0, 13, -27], look: [0, 0, -50], fov: 56, glide: true },
    { f: 618, pos: [0, 13.6, -26.4], look: [0, 0, -50], fov: 56 },
  ] },
  { id: 5, a: 612, b: 815, fog: [150, 1600], keys: [ // the dam: a thousand emus drinking; down to the gunner; it jams (slow motion)
    { f: 612, pos: [300, 38, -30], look: [300, 0, -95], fov: 52 },
    { f: 690, pos: [300, 36, -33], look: [300, 0, -95], fov: 52 },
    { f: 716, pos: [300.3, 1.45, -66.6], look: [300, 1.45, -62], fov: 38, glide: true },
    { f: 760, pos: [300.25, 1.5, -65.6], look: [300, 1.55, -62], fov: 36 },
    { f: 802, pos: [300.12, 1.62, -64.1], look: [300, 1.72, -62], fov: 32, glide: true },
    { f: 815, pos: [300.1, 1.63, -63.9], look: [300, 1.72, -62], fov: 32 },
  ] },
  { id: 6, a: 809, b: 959, fog: [150, 1600], keys: [ // nobody hurt... and the emus run rings round them
    { f: 809, pos: [300.3, 1.55, -71], look: [300, 1.3, -62], fov: 44 },
    { f: 886, pos: [300.25, 1.6, -70], look: [300, 1.3, -62], fov: 44 },
    { f: 936, pos: [306, 12, -48], look: [300, 0, -92], fov: 54, glide: true },
    { f: 959, pos: [306.3, 12.4, -47.4], look: [300, 0, -92], fov: 54 },
  ] },
  { id: 7, a: 953, b: 1124, fog: [150, 1600], keys: [ // tracking beside a running emu; it overtakes a car
    { f: 953, pos: R7(953), look: [racerX(953) + 0.3, 1.25, ROAD_Z], fov: 42 },
    { f: 1124, pos: R7(1124), look: [racerX(1124) + 0.3, 1.25, ROAD_Z], fov: 42 },
  ] },
  { id: 8, a: 1118, b: 1323, fog: [150, 1600], keys: [ // "like tanks": the herd charges the guns; then the spent rounds
    { f: 1118, pos: [0.2, 1.68, 3.0], look: [0, 1.66, 0], fov: 38 },
    { f: 1150, pos: [0.18, 1.68, 2.7], look: [0, 1.66, 0], fov: 38 },
    { f: 1192, pos: [0.7, 1.0, -2.4], look: [0, 1.5, -25], fov: 44, glide: true },
    { f: 1218, pos: [0.65, 1.0, -2.8], look: [0, 1.55, -25], fov: 44 },
    { f: 1262, pos: [0, 7, 9.5], look: [0, 0.4, -1.5], fov: 52, glide: true },
    { f: 1323, pos: [0, 7.4, 10.2], look: [0, 0.4, -1.5], fov: 52 },
  ] },
  { id: 9, a: 1317, b: TOTAL, fog: [150, 1600], keys: [ // and the wheat... they kept eating it. Which side would you be on?
    { f: 1317, pos: [3, 4.2, -18], look: [5, 1, -34], fov: 46 },
    { f: 1388, pos: [6.0, 1.3, -25.4], look: [5.3, 1.3, -29], fov: 38, glide: true },
    { f: TOTAL, pos: [5.6, 1.32, -26.5], look: [5.3, 1.38, -29], fov: 36 },
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

// ---- slow motion on "se atasca": the world clock runs at 22 % ----
const SLOW = { in0: 758, in1: 768, out0: 800, out1: 812, rate: 0.22 };
const rateAt = (f: number) => 1 - (1 - SLOW.rate) * (smooth((f - SLOW.in0) / (SLOW.in1 - SLOW.in0)) - smooth((f - SLOW.out0) / (SLOW.out1 - SLOW.out0)));
const WF = (() => { const a = [0]; for (let f = 1; f <= TOTAL + 2; f++) a.push(a[f - 1] + rateAt(f - 0.5)); return a; })();
export const worldF = (f: number) => { const i = Math.max(0, Math.min(TOTAL + 1, Math.floor(f))); return WF[i] + (WF[i + 1] - WF[i]) * (f - i); };
/** gun events in world frames */
export const FIRE1 = [worldF(509), worldF(545)], FIRE2 = [worldF(738), worldF(783)], JAM = worldF(783);

export const dofAt = (id: number, f: number): { cInf: number; focus?: V3 } => {
  if (id === 1) return f < 18 ? { cInf: 14, focus: [0, 1.75, 0] } : { cInf: lerp(10, 0, smooth((f - 40) / 40)) };
  if (id === 2) return f < 205 ? { cInf: 10 } : { cInf: lerp(10, 0, smooth((f - 205) / 30)) };
  if (id === 3) return f < 345 ? { cInf: 12, focus: [0, 1.62, 0] } : { cInf: lerp(8, 2, smooth((f - 345) / 60)) };
  if (id === 4) return f < 545 ? { cInf: 4, focus: [0, 1.5, 0] } : { cInf: lerp(8, 0, smooth((f - 545) / 30)) };
  if (id === 5) return f < 700 ? { cInf: 0 } : { cInf: 13, focus: [300, 1.6, -62] };
  if (id === 6) return f < 890 ? { cInf: 9, focus: [300, 1.4, -62] } : { cInf: lerp(9, 0, smooth((f - 890) / 30)) };
  if (id === 7) return { cInf: 11, focus: [racerX(f), 1.3, ROAD_Z] };
  if (id === 8) return f < 1155 ? { cInf: 13, focus: [0, 1.66, 0] } : f < 1222 ? { cInf: 8 } : { cInf: lerp(8, 2, smooth((f - 1222) / 30)) };
  return f < 1380 ? { cInf: lerp(4, 12, smooth((f - 1330) / 50)) } : { cInf: 13, focus: [5.3, 1.4, -29] };
};

/** discreet numbers at the top of the frame */
export const MARKS = [
  { a: 121, b: 178, label: "1932", sub: "Australia Occidental" },
  { a: 412, b: 444, label: "10.000", sub: "balas" },
  { a: 1005, b: 1058, label: "50 km/h", sub: "lo que corre un emú" },
  { a: 1249, b: 1282, label: "9.860", sub: "balas disparadas" },
  { a: 1283, b: 1320, label: "986", sub: "emús · 10 balas por cada uno" },
];
