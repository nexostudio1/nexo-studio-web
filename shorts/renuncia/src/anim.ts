// Tiempos (cuadros a 30 fps, sacados de tiempos.json) y plan de tomas.
//  17 «En Japón puedes pagarle a un desconocido para que renuncie por ti.»
// 114 «Tokio.» 129 «Kenji lleva tres años sin vacaciones,» 193 «y su jefe rompe todas sus cartas de renuncia.»
// 263 «Así que paga unos veinte mil yenes» 352 «literalmente,» 382 «Ya no puedo más.»
// 410 «Su agente, Sato,» 445 «llama al jefe.» 474 «El jefe grita.» 506 «Sato no cuelga.» 536 «El jefe golpea la mesa.» 578 «Sato sigue leyendo su guion.»
// 623 «Kenji no vuelve nunca a la oficina.» 680 «Ni siquiera a por su cactus.»
// 727 «Por suerte, Kenji es libre.» 777 «Por desgracia, a Sato le quedan cuarenta llamadas más.»
// 859 «Fíjate:» 877 «allí renunciar se siente como abandonar a tu familia.» 966 «Alguien tiene que aguantar los gritos.» 1023 «Ese es el trabajo que nadie quiere.»
// 1077 «Esa noche, Sato escribe su propia carta…» ~1150 «y marca el número de la agencia.» 1192 suena su propio teléfono → bucle al cuadro 0.
export const FPS = 30;
export const DUR = 1225;
export type V3 = [number, number, number];

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const sm = (x: number) => { const t = clamp(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const ramp = (f: number, a: number, b: number) => sm((f - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// lugares
export const AG = -40; // agencia «Ya no puedo más»
export const CO = 0;   // empresa de Kenji
export const PK = 40;  // parque
export const SEAT = 0.36; // base de la tarjeta de un personaje sentado

export type Loc = 'ag' | 'co' | 'pk';
export type Key = {f: number; pos: V3; look: V3; fov: number};
export type Shot = {a: number; b: number; loc: Loc; night?: boolean; keys: Key[]; dof: number; focus: V3};

const A = (x: number, y: number, z: number): V3 => [AG + x, y, z];
const SATO_EYES = A(0, 1.2, -0.55);
const BOSS_EYES: V3 = [3.5, 1.2, -4.1];
const KENJI_EYES: V3 = [0, 1.2, -0.55];

export const SHOTS: Shot[] = [
  // 1 · gancho: suena el teléfono de la agencia, Sato contesta; la cámara se abre y enseña la agencia
  {a: 0, b: 112, loc: 'ag', dof: 12, focus: SATO_EYES, keys: [
    {f: 0, pos: A(-0.15, 1.12, 1.25), look: A(-0.22, 0.98, -0.35), fov: 44},
    {f: 46, pos: A(-0.1, 1.18, 1.4), look: A(-0.1, 1.05, -0.5), fov: 44},
    {f: 112, pos: A(0.9, 1.75, 3.9), look: A(0, 1.5, -2.5), fov: 50}]},
  // 2 · Tokio: la oficina de Kenji, abierta, hasta su mesa
  {a: 112, b: 190, loc: 'co', dof: 6, focus: KENJI_EYES, keys: [
    {f: 112, pos: [-3.6, 2.7, 5.2], look: [0.8, 1.3, -2.5], fov: 56},
    {f: 190, pos: [0.55, 1.38, 1.7], look: [0, 1.08, -0.5], fov: 44}]},
  // 3 · Kenji entrega la carta y el jefe la rompe
  {a: 190, b: 262, loc: 'co', dof: 8, focus: [3.3, 1.3, -3.2], keys: [
    {f: 190, pos: [5.4, 1.6, 0.2], look: [3.0, 1.15, -3.3], fov: 50},
    {f: 262, pos: [5.0, 1.5, -0.4], look: [3.05, 1.15, -3.4], fov: 46}]},
  // 4 · Kenji mira la app en el móvil
  {a: 262, b: 350, loc: 'co', dof: 12, focus: KENJI_EYES, keys: [
    {f: 262, pos: [-0.18, 1.3, 1.45], look: [0, 1.12, -0.55], fov: 40},
    {f: 350, pos: [-0.12, 1.28, 1.3], look: [0, 1.13, -0.55], fov: 39}]},
  // 5 · el cartel «Ya no puedo más» (golpe de zoom en 382)
  {a: 350, b: 410, loc: 'ag', dof: 4, focus: A(0, 2.35, -4.4), keys: [
    {f: 350, pos: A(0.4, 1.7, 1.6), look: A(0, 2.25, -4.4), fov: 50},
    {f: 380, pos: A(0.25, 1.85, 0.6), look: A(0, 2.3, -4.4), fov: 46},
    {f: 386, pos: A(0.1, 2.0, -1.2), look: A(0, 2.32, -4.4), fov: 40},
    {f: 410, pos: A(0.05, 2.05, -1.5), look: A(0, 2.33, -4.4), fov: 39}]},
  // 6 · Sato se pone los cascos y marca
  {a: 410, b: 445, loc: 'ag', dof: 12, focus: SATO_EYES, keys: [
    {f: 410, pos: A(-0.2, 1.3, 1.5), look: A(-0.05, 1.15, -0.55), fov: 40},
    {f: 445, pos: A(-0.15, 1.28, 1.35), look: A(-0.05, 1.16, -0.55), fov: 39}]},
  // 7 · el jefe contesta… y grita
  {a: 445, b: 506, loc: 'co', dof: 12, focus: BOSS_EYES, keys: [
    {f: 445, pos: [3.9, 1.35, -2.45], look: [3.5, 1.22, -4.1], fov: 42},
    {f: 506, pos: [3.8, 1.32, -2.6], look: [3.5, 1.22, -4.1], fov: 40}]},
  // 8 · Sato, impasible
  {a: 506, b: 536, loc: 'ag', dof: 14, focus: SATO_EYES, keys: [
    {f: 506, pos: A(-0.12, 1.25, 1.25), look: A(0, 1.2, -0.55), fov: 38},
    {f: 536, pos: A(-0.1, 1.24, 1.1), look: A(0, 1.2, -0.55), fov: 37}]},
  // 9 · el jefe golpea la mesa
  {a: 536, b: 578, loc: 'co', dof: 8, focus: BOSS_EYES, keys: [
    {f: 536, pos: [4.6, 1.65, -1.9], look: [3.5, 1.1, -4.0], fov: 48},
    {f: 578, pos: [4.45, 1.6, -2.1], look: [3.5, 1.1, -4.0], fov: 46}]},
  // 10 · Sato lee su guion
  {a: 578, b: 623, loc: 'ag', dof: 12, focus: SATO_EYES, keys: [
    {f: 578, pos: A(-0.45, 1.32, 1.45), look: A(0, 1.1, -0.55), fov: 42},
    {f: 623, pos: A(-0.38, 1.3, 1.3), look: A(0, 1.12, -0.55), fov: 41}]},
  // 11 · la mesa vacía de Kenji y su cactus
  {a: 623, b: 727, loc: 'co', dof: 10, focus: [-0.62, 0.86, 0.12], keys: [
    {f: 623, pos: [1.1, 1.55, 2.1], look: [0, 0.95, -0.3], fov: 48},
    {f: 678, pos: [-0.1, 1.15, 1.2], look: [-0.5, 0.88, 0], fov: 44},
    {f: 727, pos: [-0.5, 0.93, 0.66], look: [-0.62, 0.86, 0.1], fov: 36}]},
  // 12 · Kenji libre en el parque
  {a: 727, b: 777, loc: 'pk', dof: 6, focus: [PK, 1.3, 0], keys: [
    {f: 727, pos: [PK + 0.6, 1.0, 3.6], look: [PK, 1.15, 0], fov: 46},
    {f: 777, pos: [PK + 0.2, 1.25, 3.0], look: [PK, 1.2, 0], fov: 44}]},
  // 13 · Sato y las cuarenta llamadas en espera
  {a: 777, b: 859, loc: 'ag', dof: 10, focus: SATO_EYES, keys: [
    {f: 777, pos: A(-0.6, 1.42, 1.6), look: A(0.15, 1.05, -0.45), fov: 45},
    {f: 859, pos: A(-0.45, 1.36, 1.35), look: A(0.12, 1.08, -0.45), fov: 42}]},
  // 14 · la oficina mira la silla vacía («abandonar a tu familia»)
  {a: 859, b: 966, loc: 'co', dof: 6, focus: [0, 1.3, -1.8], keys: [
    {f: 859, pos: [0, 1.6, 2.0], look: [0, 1.35, -1.8], fov: 50},
    {f: 966, pos: [0, 1.58, 1.4], look: [0, 1.36, -1.8], fov: 46}]},
  // 15 · los gritos le llegan a Sato
  {a: 966, b: 1023, loc: 'ag', dof: 14, focus: SATO_EYES, keys: [
    {f: 966, pos: A(-0.15, 1.25, 1.3), look: A(0, 1.2, -0.55), fov: 40},
    {f: 1023, pos: A(-0.12, 1.24, 1.15), look: A(0, 1.2, -0.55), fov: 39}]},
  // 16 · plano alto: Sato solo en la agencia vacía
  {a: 1023, b: 1077, loc: 'ag', dof: 0, focus: SATO_EYES, keys: [
    {f: 1023, pos: A(0.7, 1.6, 1.9), look: A(0, 1.0, -0.5), fov: 46},
    {f: 1077, pos: A(2.6, 4.4, 5.8), look: A(0, 0.7, -1.2), fov: 50}]},
  // 17 · de noche: escribe su carta, marca… y suena su propio teléfono (enlaza con el plano 1)
  {a: 1077, b: 1225, loc: 'ag', night: true, dof: 12, focus: SATO_EYES, keys: [
    {f: 1077, pos: A(0.2, 1.4, 1.7), look: A(0, 1.0, -0.4), fov: 44},
    {f: 1150, pos: A(-0.1, 1.3, 1.45), look: A(-0.05, 1.08, -0.45), fov: 42},
    {f: 1188, pos: A(-0.12, 1.22, 1.35), look: A(-0.12, 1.02, -0.4), fov: 43},
    {f: 1225, pos: A(-0.15, 1.12, 1.25), look: A(-0.22, 0.98, -0.35), fov: 44}]},
];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// sacudidas: [cuadro, fuerza]
const SHAKES: [number, number][] = [[2, 0.5], [383, 1.0], [476, 0.7], [490, 0.5], [549, 1.3], [1192, 0.8]];
export type Cam = {pos: V3; look: V3; fov: number; roll: number; shot: Shot};
export const camAt = (f: number): Cam => {
  const s = shotAt(f), k = s.keys;
  let i = 0;
  while (i < k.length - 2 && f >= k[i + 1].f) i++;
  const t = sm((f - k[i].f) / Math.max(1, k[i + 1].f - k[i].f));
  const pos = lerp3(k[i].pos, k[i + 1].pos, t), look = lerp3(k[i].look, k[i + 1].look, t);
  let fov = lerp(k[i].fov, k[i + 1].fov, t), roll = 0;
  // respiración de cámara: nunca quieta
  pos[0] += Math.sin(f * 0.045) * 0.012; pos[1] += Math.sin(f * 0.031 + 1) * 0.008;
  for (const [sf, a] of SHAKES) {
    const d = f - sf;
    if (d < 0 || d > 8) continue;
    const e = a * (1 - d / 8) * (d % 2 ? -1 : 1);
    pos[0] += e * 0.03; pos[1] += e * 0.02; roll += e * 0.012;
  }
  // gritos del jefe y en los cascos de Sato: temblor fino continuo
  if ((f >= 476 && f < 506) || (f >= 968 && f < 1020)) { const e = Math.sin(f * 2.7) * 0.006; pos[0] += e; pos[1] += Math.cos(f * 3.1) * 0.004; }
  return {pos, look, fov, roll, shot: s};
};

// ---------- personajes ----------
export type Pose = {
  id: string; who: 'sato' | 'kenji' | 'boss' | 'c1' | 'c2' | 'c3' | 'a1' | 'a2';
  pos: V3; mode: 'sit' | 'stand'; expr: string; arm?: string; t?: number; look?: number; flush?: number; blink?: number; tilt?: number; headTilt?: number; scale?: number;
};

const blinkAt = (f: number, seed: number) => {
  // parpadeo cada 0.5–2.3 s
  let t = seed * 13, k = 0;
  while (t < f + 30) { const gap = 15 + ((Math.sin(seed * 91 + k * 37) + 1) / 2) * 54; t += gap; k++; if (f >= t && f < t + 4) return f - t < 2 ? 1 : 0.5; }
  return 0;
};

export const posesAt = (f: number): Pose[] => {
  const s = shotAt(f), out: Pose[] = [];
  const P = (p: Pose) => out.push({...p, blink: p.blink ?? blinkAt(f, p.id.length + p.who.charCodeAt(0))});
  if (s.loc === 'ag') {
    const sato = A(0, SEAT, -0.55);
    let expr = 'neutral', arm: string | undefined, t = 0, look = 0;
    if (f < 112) { arm = f < 9 ? undefined : 'ear'; expr = f < 9 ? 'shock' : 'smile'; look = f < 9 ? -0.8 : 0; }
    else if (f < 410) { arm = 'ear'; expr = 'smile'; }
    else if (f < 445) { arm = 'type'; t = f / 30; expr = 'neutral'; }
    else if (f < 578) { expr = 'neutral'; }
    else if (f < 623) { arm = 'read'; expr = 'neutral'; look = -0.2; }
    else if (f < 966) { expr = f < 820 ? 'neutral' : 'dazed'; arm = 'type'; t = f / 30; }
    else if (f < 1023) { expr = 'pained'; }
    else if (f < 1077) { expr = 'neutral'; }
    else if (f < 1150) { arm = 'write'; t = f / 30; expr = 'neutral'; look = -0.3; }
    else if (f < 1192) { arm = 'cell'; expr = 'neutral'; }
    else { arm = 'cell'; expr = 'shock'; look = -0.9; }
    P({id: 'sato', who: 'sato', pos: sato, mode: 'sit', expr, arm, t, look, headTilt: f >= 966 && f < 1023 ? -6 : 0});
    const busy = !s.night && !(f >= 1023 && f < 1077);
    if (busy) {
      P({id: 'a1', who: 'a1', pos: A(-2.3, SEAT, -2.75), mode: 'sit', expr: 'smile', arm: 'ear'});
      P({id: 'a2', who: 'a2', pos: A(2.3, SEAT, -2.75), mode: 'sit', expr: 'nervous', arm: 'ear'});
    }
  } else if (s.loc === 'co') {
    // Kenji
    if (f < 190) P({id: 'kenji', who: 'kenji', pos: [0, SEAT, -0.55], mode: 'sit', expr: 'dazed', arm: 'type', t: f / 30});
    else if (f < 262) {
      const tear = ramp(f, 214, 232);
      P({id: 'kenji', who: 'kenji', pos: [2.75, 0, -2.75], mode: 'stand', expr: f < 214 ? 'nervous' : 'shock', arm: f < 208 ? 'paper' : undefined, look: 0.6});
      P({id: 'boss', who: 'boss', pos: [3.5, SEAT, -4.1], mode: 'sit', expr: 'stern', arm: f >= 208 ? 'tear' : undefined, t: tear, look: -0.6});
    } else if (f < 350) P({id: 'kenji', who: 'kenji', pos: [0, SEAT, -0.55], mode: 'sit', expr: f < 318 ? 'nervous' : 'relief', arm: 'phone'});
    if (f >= 445 && f < 623) {
      const shout = f >= 474 && f < 506, slam = f >= 536 && f < 600;
      P({id: 'boss', who: 'boss', pos: [3.5, SEAT, -4.1], mode: 'sit',
        expr: f < 474 ? 'stern' : shout ? 'shock' : 'stern', arm: slam ? 'slam' : 'ear', t: ramp(f, 538, 549),
        flush: f < 470 ? 0 : 1, headTilt: shout ? Math.sin(f * 1.3) * 3 : 0});
    }
    if (f < 190 || (f >= 262 && f < 350) || (f >= 623 && f < 727)) {
      // compañeros trabajando
      P({id: 'c1', who: 'c1', pos: [-2.3, SEAT, -0.55], mode: 'sit', expr: 'neutral', arm: 'type', t: f / 30 + 1});
      P({id: 'c2', who: 'c2', pos: [2.3, SEAT, -0.55], mode: 'sit', expr: 'neutral', arm: 'type', t: f / 30 + 2});
      if (f < 190 || f >= 623) P({id: 'boss', who: 'boss', pos: [3.5, SEAT, -4.1], mode: 'sit', expr: 'stern'});
    }
    if (f >= 859 && f < 966) {
      // todos de pie mirando la silla vacía
      const lk = Math.sin(f * 0.02) * 0.2;
      P({id: 'boss', who: 'boss', pos: [0, 0, -2.0], mode: 'stand', expr: 'stern', look: lk});
      P({id: 'c1', who: 'c1', pos: [-0.95, 0, -1.75], mode: 'stand', expr: 'stern', look: 0.3});
      P({id: 'c2', who: 'c2', pos: [0.95, 0, -1.75], mode: 'stand', expr: 'stern', look: -0.3});
      P({id: 'c3', who: 'c3', pos: [-0.45, 0, -2.6], mode: 'stand', expr: 'stern'});
      P({id: 'a3', who: 'c3', pos: [0.5, 0, -2.65], mode: 'stand', expr: 'stern', scale: 0.98} as Pose);
    }
  } else {
    P({id: 'kenji', who: 'kenji', pos: [PK, 0, 0], mode: 'stand', expr: 'relief_open', arm: 'up', t: f / 30, tilt: Math.sin(f * 0.25) * 3});
  }
  return out;
};

// teléfonos sonando: [inicio, fin] en cuadros
export const RINGS: [number, number][] = [[0, 9], [1192, 1225]];
export const ringing = (f: number) => RINGS.some(([a, b]) => f >= a && f < b);
