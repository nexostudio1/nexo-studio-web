// «Kata-tataki»: el trabajo que nadie quiere en Japón. Tiempos (cuadros a 30 fps) sacados de tiempos.json:
//   17 «En Japón hay un trabajo que consiste en echar a la gente… sin despedirla.»
//  122 «Allí despedir es casi imposible:» 185 «la ley exige un motivo tan serio que los jueces casi siempre le dan la razón al trabajador.»
//  327 «Así que alguien tiene que convencerte de que te vayas tú.» 403 «Ese es Tanaka.»
//  432 «Su técnica se llama kata-tataki:» 490 «el golpecito en el hombro.»
//  531 «Pasa por tu mesa, te toca el hombro sin dejar de mirar el móvil… y tú entiendes que te toca renunciar voluntariamente.»
//  716 «Por suerte, gana un buen sueldo.» 769 «Por desgracia, siempre come solo.»
//  825 «Y si alguien se resiste,» 864 «va a la sala de expulsión:» 910 «una mesa,» 934 «una pared» ~955 «y nada que hacer,» 980 «hasta que se rinda.»
// 1009 «Un día, alguien le toca el hombro a Tanaka.»
// 1076 «Ahora pasa ocho horas mirando la pared…» 1165 «bueno, el móvil. Y le siguen pagando.»
export const FPS = 30;
export const DUR = 1364; // 1228 + 136 del plano nuevo («el pasillo»)
export type V3 = [number, number, number];
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const sm = (x: number) => { const t = clamp(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const ramp = (f: number, a: number, b: number) => sm((f - a) / (b - a));
export const lin = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const CO = 0, BR = 20, CT = 40, EX = -40; // oficina, comedor, juzgado, sala de expulsión
export const SEAT = 0.36;
export const TDESK: V3 = [-2.6, 0, -3.2]; // mesa de Tanaka
export type Loc = 'co' | 'br' | 'ct' | 'ex';
export type Key = {f: number; pos: V3; look: V3; fov: number};
export type Shot = {a: number; b: number; loc: Loc; keys: Key[]; dof: number; focus: V3 | ((f: number) => V3); linear?: boolean};

const WALK1 = (f: number): V3 => [lerp(-3.6, 3.6, lin(f, 0, 122)), 0, 1.1];
const X = (x: number, y: number, z: number): V3 => [EX + x, y, z];

export const SHOTS: Shot[] = [
  // 1 · gancho: Tanaka cruza la oficina mirando el móvil y todos se esconden
  {a: 0, b: 122, loc: 'co', dof: 8, linear: true, focus: (f) => { const p = WALK1(f); return [p[0], 1.3, p[2]]; }, keys: [
    {f: 0, pos: [-3.9, 2.05, 5.9], look: [-2.9, 0.95, 0.2], fov: 52},
    {f: 122, pos: [3.1, 2.05, 5.9], look: [3.9, 0.95, 0.2], fov: 52}]},
  // 2 · «despedir es casi imposible»: el jefe señala… y sello NULO
  {a: 122, b: 185, loc: 'co', dof: 8, focus: [3.2, 1.3, -3.4], keys: [
    {f: 122, pos: [5.4, 1.6, 0.2], look: [3.05, 1.15, -3.3], fov: 50},
    {f: 185, pos: [5.0, 1.5, -0.5], look: [3.1, 1.15, -3.4], fov: 46}]},
  // 3 · el juez da la razón al trabajador
  {a: 185, b: 323, loc: 'ct', dof: 6, focus: [CT, 1.8, -2.4], keys: [
    {f: 185, pos: [CT, 1.55, 4.8], look: [CT, 1.45, -1.2], fov: 52},
    {f: 256, pos: [CT, 1.8, 1.9], look: [CT, 1.85, -2.4], fov: 44},
    {f: 280, pos: [CT + 0.2, 1.7, 5.6], look: [CT, 1.3, -0.8], fov: 56},
    {f: 323, pos: [CT + 0.1, 1.65, 5.1], look: [CT, 1.28, -0.6], fov: 54}]},
  // 4 · el jefe llama a alguien con sonrisa de pillo
  {a: 323, b: 400, loc: 'co', dof: 12, focus: [3.5, 1.2, -4.1], keys: [
    {f: 323, pos: [3.95, 1.35, -2.4], look: [3.5, 1.22, -4.1], fov: 43},
    {f: 400, pos: [3.8, 1.3, -2.65], look: [3.5, 1.22, -4.1], fov: 40}]},
  // 5 · presentación de Tanaka (contrapicado)
  {a: 400, b: 430, loc: 'co', dof: 10, focus: [0, 1.4, 1.1], keys: [
    {f: 400, pos: [0.15, 0.75, 3.0], look: [0, 1.3, 1.1], fov: 46},
    {f: 430, pos: [0.08, 0.85, 2.55], look: [0, 1.32, 1.1], fov: 44}]},
  // 6 · demostración: el golpecito en el hombro
  {a: 430, b: 527, loc: 'co', dof: 10, focus: [-0.4, 1.15, -0.5], keys: [
    {f: 430, pos: [-0.42, 1.32, 2.0], look: [-0.42, 1.05, -0.5], fov: 44},
    {f: 486, pos: [-0.42, 1.25, 1.65], look: [-0.4, 1.03, -0.5], fov: 42},
    {f: 498, pos: [-0.42, 1.12, 1.2], look: [-0.38, 1.0, -0.5], fov: 42},
    {f: 527, pos: [-0.4, 1.1, 1.1], look: [-0.36, 1.0, -0.5], fov: 41}]},
  // 7 · pasa por tu mesa, toca, sigue con el móvil; tú te vas con la caja
  {a: 527, b: 711, loc: 'co', dof: 6, focus: [2.0, 1.15, -0.4], keys: [
    {f: 527, pos: [1.5, 1.5, 3.6], look: [1.8, 1.0, -0.2], fov: 48},
    {f: 598, pos: [1.9, 1.32, 2.3], look: [2.0, 1.05, -0.5], fov: 45},
    {f: 650, pos: [2.0, 1.3, 2.1], look: [2.2, 1.05, -0.4], fov: 45},
    {f: 711, pos: [3.9, 1.45, 3.7], look: [4.8, 1.0, 0.6], fov: 50}]},
  // 8 · por suerte, gana un buen sueldo
  {a: 711, b: 769, loc: 'co', dof: 10, focus: [TDESK[0], 1.2, -3.75], keys: [
    {f: 711, pos: [TDESK[0] + 0.3, 1.35, -1.5], look: [TDESK[0], 1.1, -3.75], fov: 46},
    {f: 769, pos: [TDESK[0] + 0.2, 1.3, -1.85], look: [TDESK[0], 1.12, -3.75], fov: 43}]},
  // 9 · por desgracia, siempre come solo
  {a: 769, b: 825, loc: 'br', dof: 6, focus: [BR - 0.3, 1.15, -0.05], keys: [
    {f: 769, pos: [BR - 0.15, 1.35, 2.5], look: [BR + 0.2, 1.0, -1.5], fov: 50},
    {f: 825, pos: [BR - 0.2, 1.3, 2.15], look: [BR + 0.15, 1.0, -1.5], fov: 47}]},
  // 10 · alguien se resiste (brazos cruzados)
  {a: 825, b: 864, loc: 'co', dof: 10, focus: [-1.9, 1.15, -0.5], keys: [
    {f: 825, pos: [-1.8, 1.32, 2.3], look: [-1.8, 1.05, -0.5], fov: 46},
    {f: 864, pos: [-1.8, 1.29, 2.0], look: [-1.8, 1.06, -0.5], fov: 44}]},
  // 11 · la sala de expulsión: una mesa, una pared, nada que hacer… bandera blanca
  {a: 864, b: 1004, loc: 'ex', dof: 6, focus: X(0, 1.1, -0.75), keys: [
    {f: 864, pos: X(1.7, 1.75, 2.6), look: X(0, 1.0, -1.2), fov: 52},
    {f: 906, pos: X(1.0, 1.5, 1.4), look: X(0, 0.9, -1.3), fov: 48},
    {f: 922, pos: X(1.15, 1.15, -0.95), look: X(0, 0.76, -1.6), fov: 46},
    {f: 940, pos: X(0.4, 1.4, -0.25), look: X(0, 2.05, -2.6), fov: 46},
    {f: 962, pos: X(0.45, 1.45, -0.2), look: X(0, 2.1, -2.6), fov: 44},
    {f: 976, pos: X(0.9, 1.6, 1.6), look: X(0, 1.0, -1.3), fov: 48},
    {f: 986, pos: X(-0.02, 1.38, -1.95), look: X(-0.14, 1.38, -0.75), fov: 58},
    {f: 1004, pos: X(-0.02, 1.38, -2.0), look: X(-0.14, 1.39, -0.75), fov: 57}]},
  // 12 · un día, alguien le toca el hombro a Tanaka
  {a: 1004, b: 1076, loc: 'co', dof: 12, focus: [TDESK[0], 1.2, -3.75], keys: [
    {f: 1004, pos: [TDESK[0] + 0.55, 1.35, -1.45], look: [TDESK[0] + 0.35, 1.12, -3.7], fov: 46},
    {f: 1050, pos: [TDESK[0] + 0.45, 1.32, -1.7], look: [TDESK[0] + 0.25, 1.14, -3.7], fov: 44},
    {f: 1054, pos: [TDESK[0] + 0.2, 1.25, -2.4], look: [TDESK[0], 1.2, -3.75], fov: 38},
    {f: 1076, pos: [TDESK[0] + 0.18, 1.24, -2.5], look: [TDESK[0], 1.2, -3.75], fov: 37}]},
  // 13 · ahora mira la pared… bueno, el móvil. Y le siguen pagando.
  {a: 1076, b: 1228, loc: 'ex', dof: 8, focus: X(0, 1.15, -0.75), keys: [
    {f: 1076, pos: X(0.9, 1.55, 1.7), look: X(0, 1.15, -1.0), fov: 48},
    {f: 1142, pos: X(0.45, 1.4, 0.7), look: X(0, 1.15, -0.9), fov: 46},
    {f: 1156, pos: X(1.15, 1.25, -0.6), look: X(0, 1.12, -0.8), fov: 46},
    {f: 1168, pos: X(0.6, 1.15, -1.45), look: X(0, 1.13, -0.75), fov: 45},
    {f: 1228, pos: X(0.45, 1.16, -1.55), look: X(0, 1.15, -0.75), fov: 42}]},
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
const focusAt0 = (f: number): V3 => { const s = shotAt(f); return typeof s.focus === 'function' ? s.focus(f) : s.focus; };

const SHAKES: [number, number][] = [[158, 1.4], [262, 1.0], [272, 0.8], [496, 0.4], [508, 0.4], [604, 0.4], [1052, 1.2], [1180, 0.6]];
export type Cam = {pos: V3; look: V3; fov: number; roll: number; shot: Shot};
const camAt0 = (f: number): Cam => {
  const s = shotAt(f), k = s.keys;
  let i = 0;
  while (i < k.length - 2 && f >= k[i + 1].f) i++;
  const u = (f - k[i].f) / Math.max(1, k[i + 1].f - k[i].f);
  const t = s.linear ? clamp(u) : sm(u);
  const pos = lerp3(k[i].pos, k[i + 1].pos, t), look = lerp3(k[i].look, k[i + 1].look, t);
  let fov = lerp(k[i].fov, k[i + 1].fov, t), roll = 0;
  pos[0] += Math.sin(f * 0.045) * 0.012; pos[1] += Math.sin(f * 0.031 + 1) * 0.008;
  for (const [sf, a] of SHAKES) {
    const d = f - sf;
    if (d < 0 || d > 8) continue;
    const e = a * (1 - d / 8) * (d % 2 ? -1 : 1);
    pos[0] += e * 0.03; pos[1] += e * 0.02; roll += e * 0.012;
  }
  // bote de cámara en el gancho, siguiendo los pasos de Tanaka
  if (f < 122) pos[1] += Math.abs(Math.sin((f / 16) * Math.PI * 2)) * 0.012;
  return {pos, look, fov, roll, shot: s};
};

// ---------- personajes ----------
export type Who = 'tanaka' | 'boss' | 'judge' | 'c1' | 'c2' | 'c3' | 'c4';
export type Pose = {
  id: string; who: Who; pos: V3; mode: 'sit' | 'stand' | 'stroll'; expr: string; arm?: string; t?: number; look?: number;
  phase?: number; facing?: -1 | 0 | 1; flip?: boolean; tilt?: number; headTilt?: number; blink?: number; shadesDrop?: number;
  /** dirección hacia la que mira el personaje en el mundo (x, z): si la cámara está detrás se dibuja de espaldas */
  faceDir?: [number, number]; squash?: number;
};
const blinkAt = (f: number, seed: number) => {
  let t = seed * 13, k = 0;
  while (t < f + 30) { const gap = 15 + ((Math.sin(seed * 91 + k * 37) + 1) / 2) * 54; t += gap; k++; if (f >= t && f < t + 4) return f - t < 2 ? 1 : 0.5; }
  return 0;
};
/** golpecitos: t de 0 a 1 en cada toque */
const taps = (f: number, starts: number[], d = 10) => { for (const s of starts) if (f >= s && f < s + d) return (f - s) / d; return 0; };
const pop = (f: number, at: number) => { const d = f - at; return d < 0 || d > 10 ? 0 : Math.sin((d / 10) * Math.PI) * Math.exp(-d / 6); };
const walkPath = (f: number, pts: [number, V3][]): {p: V3; moving: boolean; dir: number} => {
  if (f <= pts[0][0]) return {p: pts[0][1], moving: false, dir: 0};
  for (let i = 0; i < pts.length - 1; i++) {
    const [fa, a] = pts[i], [fb, b] = pts[i + 1];
    if (f < fb) { const t = (f - fa) / (fb - fa); const moving = a[0] !== b[0] || a[2] !== b[2]; return {p: lerp3(a, b, t), moving, dir: Math.sign(b[0] - a[0])}; }
  }
  return {p: pts[pts.length - 1][1], moving: false, dir: 0};
};

const posesAt0 = (f: number): Pose[] => {
  const s = shotAt(f), out: Pose[] = [];
  const P = (p: Pose) => out.push({...p, blink: p.blink ?? blinkAt(f, p.id.length * 7 + p.id.charCodeAt(0))});
  const worker = (id: Who, x: number, extra: Partial<Pose> = {}) => P({id, who: id, pos: [x, SEAT, -0.55], mode: 'sit', expr: 'neutral', arm: 'type', t: f / 30 + x, ...extra});
  if (s.loc === 'co') {
    if (f < 122) {
      const tp = WALK1(f);
      P({id: 'tanaka', who: 'tanaka', pos: tp, mode: 'stroll', phase: f / 16, facing: 1, expr: 'smile', arm: 'phone'});
      for (const [id, x] of [['c1', -2.3], ['c2', 0], ['c3', 2.3]] as [Who, number][]) {
        const near = clamp(1 - (Math.abs(tp[0] - x) - 0.3) / 0.9), duck = sm(near);
        worker(id, x, {pos: [x, SEAT - 0.5 * duck, -0.55], expr: duck > 0.25 ? 'nervous' : 'neutral', arm: duck > 0.25 ? undefined : 'type', look: (tp[0] - x) * 0.4});
      }
    } else if (f < 185) {
      P({id: 'c1', who: 'c1', pos: [2.7, 0, -2.75], mode: 'stand', expr: f < 128 ? 'neutral' : 'nervous', look: 0.6});
      P({id: 'boss', who: 'boss', pos: [3.5, SEAT, -4.1], mode: 'sit', expr: f < 158 ? 'stern' : 'dazed', arm: f >= 124 && f < 158 ? 'point' : undefined, flip: true, squash: pop(f, 124)});
    } else if (f < 400) {
      P({id: 'boss', who: 'boss', pos: [3.5, SEAT, -4.1], mode: 'sit', expr: 'smile', arm: 'ear', look: -0.4});
    } else if (f < 430) {
      P({id: 'tanaka', who: 'tanaka', pos: [0, 0, 1.1], mode: 'stand', expr: 'smile', arm: 'phone', squash: pop(f, 403)});
      worker('c2', 0); worker('c1', -2.3); worker('c3', 2.3);
    } else if (f < 527) {
      const tt = taps(f, [488, 500]);
      P({id: 'tanaka', who: 'tanaka', pos: [-0.88, 0, -0.42], mode: 'stand', expr: 'smile', arm: f >= 478 ? 'tap' : 'phone', t: tt});
      worker('c2', 0, {expr: f >= 494 ? 'shock' : 'neutral', arm: f >= 494 ? undefined : 'type', look: f >= 494 ? -0.7 : 0, squash: pop(f, 494)});
      worker('c1', -2.3);
    } else if (f < 711) {
      const w = walkPath(f, [[527, [0.1, 0, 1.15]], [572, [1.5, 0, 1.15]], [590, [1.5, 0, -0.42]], [624, [1.5, 0, -0.42]], [642, [1.5, 0, 1.15]], [711, [-1.6, 0, 1.15]]]);
      const tt = taps(f, [596, 608]);
      P({id: 'tanaka', who: 'tanaka', pos: w.p, mode: w.moving ? 'stroll' : 'stand', phase: f / 16, facing: (w.dir || 0) as -1 | 0 | 1, expr: 'smile',
        arm: f >= 592 && f < 622 ? 'tap' : 'phone', t: tt});
      worker('c2', 0);
      if (f < 660) worker('c3', 2.3, {expr: f < 602 ? 'neutral' : f < 640 ? 'shock' : 'pained', arm: f < 602 ? 'type' : undefined, squash: pop(f, 602), look: f >= 602 && f < 640 ? -0.6 : 0});
      else {
        const c = walkPath(f, [[660, [3.2, 0, -0.2]], [672, [3.2, 0, 0.9]], [711, [5.2, 0, 1.15]]]);
        P({id: 'c3', who: 'c3', pos: c.p, mode: 'stroll', phase: f / 18, facing: 1, expr: 'nervous', arm: 'box'});
      }
    } else if (f < 769) {
      P({id: 'tanaka', who: 'tanaka', pos: [TDESK[0], SEAT, -3.75], mode: 'sit', expr: 'grin', arm: 'phone', tilt: -7 + Math.sin(f * 0.15) * 1.5});
    } else if (f < 864) {
      const tt = taps(f, [834, 846]);
      P({id: 'tanaka', who: 'tanaka', pos: [-1.42, 0, -0.42], mode: 'stand', expr: 'smile', arm: 'tap', t: tt, flip: true});
      worker('c4', -2.3, {expr: 'stern', arm: 'cross', headTilt: f > 848 ? Math.sin((f - 848) * 0.7) * 7 : 0});
    } else {
      // 12 · el jefe le toca el hombro a Tanaka
      const b = walkPath(f, [[1008, [0.4, 0, -3.55]], [1040, [-1.72, 0, -3.55]]]);
      const tt = taps(f, [1046, 1058]);
      P({id: 'boss', who: 'boss', pos: b.p, mode: b.moving ? 'stroll' : 'stand', phase: f / 18, facing: b.moving ? -1 : 0, expr: 'smile', arm: f >= 1042 ? 'tap' : undefined, t: tt, flip: true});
      P({id: 'tanaka', who: 'tanaka', pos: [TDESK[0], SEAT, -3.75], mode: 'sit', expr: f < 1050 ? 'grin' : 'shock', arm: f < 1050 ? 'phone' : undefined,
        shadesDrop: ramp(f, 1050, 1058), squash: pop(f, 1050), look: f >= 1050 ? 0.7 : 0});
    }
  } else if (s.loc === 'ct') {
    const g = f >= 256 && f < 270 ? (f - 256) / 6 : f >= 270 && f < 282 ? (f - 270) / 6 : 0;
    P({id: 'judge', who: 'judge', pos: [CT, 0.75 + SEAT, -2.45], mode: 'sit', expr: 'stern', arm: 'gavel', t: clamp(g)});
    const won = f >= 266;
    P({id: 'c1', who: 'c1', pos: [CT - 0.85, 0, 0.35], mode: 'stand', expr: won ? 'relief_open' : 'nervous', arm: won ? 'up' : undefined, t: f / 30, squash: pop(f, 266)});
    P({id: 'boss', who: 'boss', pos: [CT + 0.85, 0, 0.35], mode: 'stand', expr: won ? 'shock' : 'stern', squash: pop(f, 266)});
  } else if (s.loc === 'br') {
    P({id: 'tanaka', who: 'tanaka', pos: [BR - 0.3, SEAT, -0.05], mode: 'sit', expr: 'neutral', arm: 'eat', t: f / 30});
    P({id: 'c1', who: 'c1', pos: [BR + 0.45, SEAT, -3.35], mode: 'sit', expr: 'laugh'});
    P({id: 'c2', who: 'c2', pos: [BR + 1.15, SEAT, -3.2], mode: 'sit', expr: 'laugh'});
    P({id: 'c3', who: 'c3', pos: [BR + 1.8, SEAT, -3.45], mode: 'sit', expr: 'smile_closed'});
  } else {
    // sala de expulsión: mira a la pared (−z)
    if (f < 1004) {
      const slump = ramp(f, 950, 975);
      P({id: 'c4', who: 'c4', pos: X(0, SEAT, -0.75), mode: 'sit', faceDir: [0, -1], expr: f >= 984 ? 'dazed' : 'neutral', arm: f >= 984 ? 'flag' : undefined, t: f / 30,
        tilt: f < 984 ? slump * 8 : 0, headTilt: f < 984 ? slump * 12 : 0, squash: pop(f, 984)});
    } else {
      P({id: 'tanaka', who: 'tanaka', pos: X(0, SEAT, -0.75), mode: 'sit', faceDir: [0, -1], expr: f < 1178 ? 'smile' : 'grin', arm: 'phone', squash: pop(f, 1178)});
    }
  }
  return out;
};

// teléfono/momentos con sonido (para la mezcla)
export const EVENTS = {stamp: 158, gavel: [262, 274], taps: [492, 504, 600, 612, 838, 850, 1050, 1062], bubble: 126, name: 403, coins: [716, 1180], flag: 984};

// ---------- plano nuevo: el pasillo de la vergüenza (769–905) ----------
// «Pero cada mañana tiene que pasar por delante de sus compañeros… y todos saben quién será el siguiente.»
export const G0 = 769, G1 = 905, GD = G1 - G0;
export const inGauntlet = (f: number) => f >= G0 && f < G1;
/** cuadro de la historia original (sin el plano nuevo); en el pasillo devuelve un cuadro neutro de oficina */
export const mapF = (f: number) => (f < G0 ? f : f >= G1 ? f - GD : 300);
const GSHOT: Shot = {a: G0, b: G1, loc: 'co', dof: 8, keys: [], focus: [0, 1.2, 1.1]};
// Tanaka avanza por el pasillo hacia la cámara (que está al fondo, en +x); se para un momento en 868–884
const gx = (f: number) => (f < 868 ? lerp(-3.6, 0.4, lin(f, G0, 868)) : f < 884 ? 0.4 : lerp(0.4, 2.3, lin(f, 884, G1)));
export const camAt = (f: number): Cam => {
  if (!inGauntlet(f)) return camAt0(mapF(f));
  const t = lin(f, G0, G1);
  return {pos: [5.4 - t * 0.5, 1.45, 1.75], look: [-1.2 + t * 1.6, 1.05, 0.45], fov: 50 - t * 4, roll: 0, shot: GSHOT};
};
export const focusAt = (f: number): V3 => (inGauntlet(f) ? [gx(f), 1.3, 1.15] : focusAt0(mapF(f)));
export const posesAt = (f: number): Pose[] => {
  if (!inGauntlet(f)) return posesAt0(mapF(f));
  const x = gx(f), out: Pose[] = [];
  const stop = f >= 868 && f < 884; // se para un segundo: todos lo miran
  out.push({id: 'tanaka', who: 'tanaka', pos: [x, 0, 1.2], mode: stop ? 'stand' : 'stroll', phase: (f - G0) / 18, facing: 0,
    expr: f < 800 ? 'neutral' : 'nervous', look: stop ? 0.7 : 0, blink: 0});
  for (const [id, wx] of [['c1', -2.3], ['c2', 0], ['c3', 2.3]] as [Who, number][]) {
    // desde la cámara (al fondo del pasillo) Tanaka queda a su izquierda en pantalla
    const lk = -clamp(0.5 + Math.abs(x - wx) * 0.3, 0, 1);
    out.push({id, who: id, pos: [wx, SEAT, -0.55], mode: 'sit', expr: 'stern', look: lk, headTilt: -4, blink: 0});
  }
  out.push({id: 'c4', who: 'c4', pos: [-1.2, 0, -1.7], mode: 'stand', expr: 'stern', arm: 'cross', look: -0.8, blink: 0});
  return out;
};
