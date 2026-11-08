// Emu War pieces, drawn with the template's Pen (ink outline, flat fills):
//  - emuSide: profile on the WIDE card (2000 x 1400 design, feet on WG), facing +x; run gait / pecking / looking at camera
//  - emuFront: front view on the BODY card (600 x 1000, feet at y = 975)
//  - lewisSide / lewisFront: Lewis gun on its tripod, with muzzle flash or jam (smoke + spring)
//  - car32: a 1932 car on the WIDE card, facing +x, with its startled driver
//  - EmuHerd: an instanced herd (thousands of emus) animated in the vertex shader
import * as THREE from "three";
import { Pen, INK, shade, WG, curve } from "./toon";
import { NOINK } from "./ink";

type P2 = [number, number];
export type EmuLook = { eat?: number; eye?: "side" | "cam" | "shut"; brow?: "none" | "angry" | "worried"; feather?: string; smug?: boolean };
const FEATHER = "#6e5641", FEATHER_DK = "#4e3c2e", SKIN_BLUE = "#7f9fca", LEG = "#77707e", BEAK = "#3a3230";
const EYE_W = "#fffaf0";

const shag = (cx: number, cy: number, rx: number, ry: number, teeth: number, depth: number, seed = 1): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i <= 90; i++) {
    const a = (i / 90) * Math.PI * 2, s = Math.sin(a);
    let r = 1;
    if (s > -0.1) r += depth * (0.5 + 0.5 * Math.sin(a * teeth + seed)) * Math.min(1, (s + 0.1) * 2); // ragged hem below
    else r += depth * 0.25 * (0.5 + 0.5 * Math.sin(a * teeth * 1.3 + seed));
    pts.push([cx + Math.cos(a) * rx * r, cy + s * ry * r]);
  }
  return pts;
};
const eyeball = (p: Pen, x: number, y: number, r: number, o: EmuLook, dirX: number) => {
  if (o.eye === "shut") { p.arc(x, y + r * 0.2, r, r * 0.6, 200, 340, r * 0.35); return; }
  p.ell(x, y, r, r * 1.1, EYE_W, r * 0.28);
  const px = o.eye === "cam" ? 0 : dirX * r * 0.38;
  p.dot(x + px, y + r * 0.1, r * 0.48, INK);
  p.dot(x + px - r * 0.18, y - r * 0.12, r * 0.15, "#ffffff");
  if (o.brow === "angry") p.stroke([[x - r * 1.1 * dirX, y - r * 1.6], [x + r * 1.0 * dirX, y - r * 1.05]], r * 0.42);
  if (o.brow === "worried") p.stroke([[x - r * 1.0 * dirX, y - r * 1.1], [x + r * 1.1 * dirX, y - r * 1.6]], r * 0.42);
  if (o.smug) p.stroke([[x - r * 1.1, y - r * 0.15], [x + r * 1.1, y - r * 0.3]], r * 0.4); // half-shut lid
};

/** profile, facing +x. ph = run phase 0..1 (null = standing), eat = 0 (head up) .. 1 (pecking the ground) */
export const emuSide = (p: Pen, ph: number | null, o: EmuLook = {}) => {
  const G = WG, cx = 1000, fe = o.feather ?? FEATHER, dk = shade(fe, 0.72), run = ph !== null;
  const bob = run ? Math.abs(Math.sin(2 * Math.PI * (ph as number))) * 26 : 0, by = G - 560 - bob;
  const lean = run ? 0.18 : 0;
  const leg = (off: number, near: boolean) => {
    const sw = run ? Math.sin(2 * Math.PI * ((ph as number) + off)) : 0;
    const lift = run ? Math.max(0, Math.cos(2 * Math.PI * ((ph as number) + off))) * 110 : 0;
    const hip: P2 = [cx + 30, by + 90], knee: P2 = [cx - 40 + sw * 70, G - 250 - lift * 0.6], foot: P2 = [cx + 30 + sw * 190, G - 14 - lift];
    const col = near ? LEG : shade(LEG, 0.78);
    p.stroke([hip, knee], 40, INK); p.stroke([hip, knee], 28, col);
    p.stroke([knee, foot], 34, INK); p.stroke([knee, foot], 22, col);
    for (const [dx, dy] of [[70, 6], [52, -10], [-28, 4]] as P2[]) { p.stroke([foot, [foot[0] + dx, foot[1] + dy + 8]], 20, INK); p.stroke([foot, [foot[0] + dx, foot[1] + dy + 8]], 10, col); }
  };
  leg(0.5, false);
  // body: a big shaggy mop
  p.g.save(); p.g.translate(cx, by); p.g.rotate(-lean * 0.6); p.g.translate(-cx, -by);
  const body = shag(cx - 20, by, 250, 165, 13, 0.16, 2);
  p.poly(body, fe, 11);
  p.clip(body, () => {
    p.ell(cx - 60, by + 90, 260, 90, dk, 0); // darker underside
    for (let k = 0; k < 9; k++) { const x = cx - 220 + k * 50; p.stroke(curve([x, by - 60 + (k % 2) * 20], [x - 20, by + 20], [x + 10, by + 120]), 6, shade(fe, 0.6)); }
  });
  p.g.restore();
  // neck + head, bending down to peck when eat > 0
  const e = Math.max(0, Math.min(1, o.eat ?? 0));
  const base: P2 = [cx + 170, by - 70];
  const head: P2 = [cx + 250 + 110 * e, G - 960 + (960 - 120) * e - (run ? bob * 0.5 : 0) + (run ? 60 : 0)];
  const knee: P2 = [cx + 250 + 40 * e, by - 230 + 260 * e];
  const neck = curve(base, knee, [head[0] - 10, head[1] + 30]);
  p.stroke(neck, 74, INK); p.stroke(neck, 56, shade(fe, 0.9));
  const upper = neck.slice(Math.floor(neck.length * 0.45));
  p.stroke(upper, 46, SKIN_BLUE);
  // head
  const hx = head[0], hy = head[1];
  p.ell(hx, hy, 58, 46, "#5a4838", 10);
  p.poly([[hx + 44, hy - 6], [hx + 118, hy + 6 + 18 * e], [hx + 46, hy + 22]], BEAK, 8);
  p.stroke([[hx - 40, hy - 40], [hx - 10, hy - 52], [hx + 20, hy - 44]], 10, "#3b2e24"); // scruffy crown
  eyeball(p, hx + 12, hy - 8, 19, o, 1);
  // near leg over the body
  leg(0.0, true);
};

/** front view, facing the camera (BODY card). ph = run phase (null = standing) */
export const emuFront = (p: Pen, ph: number | null, o: EmuLook = {}) => {
  const fe = o.feather ?? FEATHER, cx = 300, F = 975, run = ph !== null;
  const bob = run ? Math.abs(Math.sin(2 * Math.PI * (ph as number))) * 18 : 0;
  for (const s of [-1, 1]) {
    const lift = run ? Math.max(0, Math.cos(2 * Math.PI * ((ph as number) + (s > 0 ? 0.5 : 0)))) * 70 : 0;
    const top: P2 = [cx + s * 55, F - 470 - bob], knee: P2 = [cx + s * 75, F - 230 - lift * 0.6], foot: P2 = [cx + s * 70, F - 12 - lift];
    p.stroke([top, knee, foot], 36, INK); p.stroke([top, knee, foot], 24, LEG);
    for (const d of [-34, 0, 34]) { p.stroke([foot, [foot[0] + d, foot[1] + 16]], 18, INK); p.stroke([foot, [foot[0] + d, foot[1] + 16]], 9, LEG); }
  }
  const by = F - 560 - bob;
  const body = shag(cx, by, 165, 175, 11, 0.15, 5);
  p.poly(body, fe, 10);
  p.clip(body, () => { p.ell(cx, by + 110, 170, 80, shade(fe, 0.75), 0); for (let k = 0; k < 6; k++) { const x = cx - 110 + k * 44; p.stroke(curve([x, by - 40], [x + 10, by + 40], [x - 6, by + 130]), 5, shade(fe, 0.6)); } });
  const neck: P2[] = [[cx, by - 120], [cx + 6, by - 230], [cx, F - 790 - bob]];
  p.stroke(neck, 70, INK); p.stroke(neck, 52, shade(fe, 0.9)); p.stroke(neck.slice(1), 44, SKIN_BLUE);
  const hy = F - 820 - bob;
  p.ell(cx, hy, 56, 50, "#5a4838", 10);
  p.ell(cx, hy + 34, 22, 15, BEAK, 7); // beak, end on
  p.stroke([[cx - 26, hy - 46], [cx, hy - 60], [cx + 26, hy - 46]], 10, "#3b2e24");
  eyeball(p, cx - 34, hy - 6, 17, o, -1); eyeball(p, cx + 34, hy - 6, 17, o, 1);
};

/** Lewis gun on its tripod in profile, muzzle to +x (WIDE card). flash 0..1, jam 0..1 (smoke + sprung spring) */
export const lewisSide = (p: Pen, flash = 0, jam = 0) => {
  const G = WG, cx = 1000, y = G - 520;
  for (const [x, w] of [[cx - 110, 0], [cx + 150, 0], [cx + 20, 0]] as P2[]) p.stroke([[cx + 20, y + 30], [x, G - 8]], 22 + w, INK);
  for (const x of [cx - 110, cx + 150, cx + 20]) p.stroke([[cx + 20, y + 30], [x, G - 8]], 12, "#5a5a52");
  p.poly([[cx - 330, y - 10], [cx - 150, y - 26], [cx - 130, y + 30], [cx - 320, y + 70]], "#7a5230", 9); // stock
  p.poly([[cx - 150, y - 34], [cx + 300, y - 30], [cx + 300, y + 30], [cx - 150, y + 34]], "#3e4339", 10); // cooling shroud
  for (let k = 0; k < 7; k++) p.stroke([[cx - 110 + k * 55, y - 30], [cx - 110 + k * 55, y + 30]], 5, "#2b2f28");
  p.poly([[cx + 300, y - 12], [cx + 380, y - 12], [cx + 380, y + 12], [cx + 300, y + 12]], "#2b2f28", 8); // muzzle
  p.ell(cx - 50, y - 50, 150, 24, "#2c302a", 9); // flat drum magazine
  p.ell(cx - 50, y - 50, 40, 9, "#6a6e64", 4);
  p.poly([[cx - 110, y + 30], [cx - 80, y + 30], [cx - 90, y + 110], [cx - 120, y + 110]], "#5a3a22", 7); // grip
  if (flash > 0) {
    const c: P2 = [cx + 400, y], r = 70 + 150 * flash;
    const pts: P2[] = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; pts.push([c[0] + Math.cos(a) * rr * 1.4, c[1] + Math.sin(a) * rr * 0.8]); }
    p.poly(pts, "#ffd23a", 6); p.ell(c[0] + 10, c[1], r * 0.45, r * 0.3, "#fff6c8", 0);
  }
  if (jam > 0) {
    for (let i = 0; i < 6; i++) { const a = i * 1.1, d = 40 + 140 * jam; p.ell(cx - 50 + Math.cos(a) * d, y - 110 - jam * 120 + Math.sin(a) * d * 0.4, (60 - i * 4) * (0.6 + jam * 0.6), (50 - i * 3) * (0.6 + jam * 0.6), `rgba(205,200,190,${(0.95 - 0.5 * jam).toFixed(2)})`, 0); }
    const sp: P2[] = []; for (let i = 0; i <= 40; i++) { const t = i / 40; sp.push([cx + 40 + 26 * Math.sin(t * 24), y - 60 - t * 240 * Math.min(1, jam * 2)]); }
    p.stroke(sp, 14, INK); p.stroke(sp, 7, "#b8b8b0");
  }
};
/** Lewis gun seen end on, muzzle at the camera (BODY card) */
export const lewisFront = (p: Pen, flash = 0, jam = 0) => {
  const cx = 300, F = 975, y = F - 470;
  for (const s of [-1, 0, 1]) { p.stroke([[cx, y + 40], [cx + s * 170, F - 6]], 24, INK); p.stroke([[cx, y + 40], [cx + s * 170, F - 6]], 13, "#5a5a52"); }
  p.ell(cx, y - 84, 170, 30, "#2c302a", 9); // drum magazine, edge on
  p.ell(cx, y, 62, 62, "#3e4339", 10); p.ell(cx, y, 26, 26, "#14140f", 6); // shroud + bore
  if (flash > 0) {
    const r = 80 + 220 * flash; const pts: P2[] = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + 0.2, rr = i % 2 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    p.poly(pts, "#ffd23a", 6); p.ell(cx, y, r * 0.42, r * 0.42, "#fff6c8", 0);
  }
  if (jam > 0) {
    for (let i = 0; i < 6; i++) { const a = i * 1.1, d = 30 + 110 * jam; p.ell(cx + Math.cos(a) * d, y - 150 - jam * 120 + Math.sin(a) * d * 0.4, (54 - i * 4) * (0.6 + jam * 0.6), (44 - i * 3) * (0.6 + jam * 0.6), `rgba(205,200,190,${(0.95 - 0.5 * jam).toFixed(2)})`, 0); }
    const sp: P2[] = []; for (let i = 0; i <= 40; i++) { const t = i / 40; sp.push([cx + 50 + 22 * Math.sin(t * 24), y - 100 - t * 200 * Math.min(1, jam * 2)]); }
    p.stroke(sp, 12, INK); p.stroke(sp, 6, "#b8b8b0");
  }
};

/** 1932 car in profile, facing +x (WIDE card). wheel = rotation (rad), shock = driver's face */
export const car32 = (p: Pen, wheel: number, shock = false) => {
  const G = WG, cx = 1000, col = "#2b2d36", hi = "#3c3f4c";
  p.poly([[cx - 520, G - 300], [cx + 560, G - 300], [cx + 600, G - 200], [cx - 540, G - 200]], col, 10); // chassis
  p.poly([[cx + 150, G - 470], [cx + 520, G - 450], [cx + 560, G - 300], [cx + 150, G - 300]], hi, 10); // bonnet
  for (let k = 0; k < 5; k++) p.stroke([[cx + 230 + k * 55, G - 440], [cx + 230 + k * 55, G - 320]], 6, "#1c1d24");
  p.poly([[cx + 545, G - 450], [cx + 585, G - 445], [cx + 595, G - 310], [cx + 560, G - 305]], "#c9c2a8", 7); // radiator
  p.poly([[cx - 470, G - 300], [cx - 450, G - 690], [cx + 120, G - 690], [cx + 160, G - 300]], col, 10); // cabin
  const win: P2[] = [[cx - 120, G - 650], [cx + 100, G - 650], [cx + 125, G - 470], [cx - 120, G - 470]];
  p.poly(win, "#cfe3ec", 8);
  // the driver, in the window
  p.clip(win, () => {
    p.ell(cx + 10, G - 545, 62, 66, "#f5c9a0", 8);
    p.poly([[cx - 70, G - 590], [cx + 90, G - 600], [cx + 80, G - 640], [cx - 50, G - 640]], "#5a4a38", 7); // cap
    if (shock) { p.ell(cx + 22, G - 560, 12, 15, EYE_W, 4); p.dot(cx + 22, G - 558, 6); p.ell(cx + 50, G - 560, 12, 15, EYE_W, 4); p.dot(cx + 50, G - 558, 6); p.ell(cx + 36, G - 515, 13, 17, "#5a1c1c", 5); }
    else { p.dot(cx + 22, G - 560, 7); p.dot(cx + 50, G - 560, 7); p.stroke([[cx + 20, G - 520], [cx + 52, G - 522]], 6); }
  });
  for (const [x0, x1] of [[-560, -230], [300, 620]]) p.poly([[cx + x0, G - 210], [cx + x0 + 40, G - 330], [cx + x1 - 40, G - 330], [cx + x1, G - 210]], "#1f2028", 9); // fenders
  p.ell(cx + 595, G - 400, 30, 30, "#f3e3a0", 6); // headlamp
  for (const wx of [cx - 390, cx + 450]) {
    p.ell(wx, G - 130, 125, 125, "#1a1a1e", 10); p.ell(wx, G - 130, 82, 82, "#c03a2e", 6);
    for (let k = 0; k < 10; k++) { const a = wheel + (k * Math.PI) / 5; p.stroke([[wx, G - 130], [wx + Math.cos(a) * 78, G - 130 + Math.sin(a) * 78]], 6, "#e8dcc0"); }
    p.ell(wx, G - 130, 20, 20, "#e8dcc0", 5);
  }
  p.stroke([[cx - 470, G - 610], [cx - 560, G - 640]], 10); // spare-wheel bracket
};

// ---------------- instanced herd ----------------
const TW = 300, TH = 210, SU = 0.00216;
/** atlas: 4 animation frames (columns) x 2 feather shades (rows); mode = "eat" (pecking cycle) or "run" (gallop) */
export const herdAtlas = (mode: "eat" | "run") => {
  const cv = document.createElement("canvas"); cv.width = 4 * TW; cv.height = 2 * TH;
  const g = cv.getContext("2d")!, k = TW / 2000;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    g.setTransform(k, 0, 0, k, c * TW, r * TH);
    const feather = r ? "#7d6450" : FEATHER;
    if (mode === "eat") emuSide(new Pen(g), null, { eat: [0, 0.55, 1, 0.55][c], feather });
    else emuSide(new Pen(g), c / 4, { feather });
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
};
export class EmuHerd {
  mesh: THREE.InstancedMesh;
  u = { uT: { value: 0 }, uShift: { value: new THREE.Vector3() } };
  constructor(parent: THREE.Object3D, tex: THREE.Texture, pts: { x: number; z: number }[], rate: number, seed = 1, scale = 1) {
    const w = 2000 * SU * scale, h = 1400 * SU * scale;
    const geo = new THREE.PlaneGeometry(w, h).translate(0, (1375 - 700) * SU * scale, 0);
    const n = pts.length, ph = new Float32Array(n * 3);
    const hs = (i: number, s: number) => { const v = Math.sin(i * 127.1 + s * 311.7 + seed) * 43758.5453; return v - Math.floor(v); };
    pts.forEach((_, i) => { ph[i * 3] = hs(i, 1); ph[i * 3 + 1] = hs(i, 2) < 0.5 ? 0 : 1; ph[i * 3 + 2] = hs(i, 3) < 0.5 ? -1 : 1; });
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(ph, 3));
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.4, alphaToCoverage: true, color: new THREE.Color(0.88, 0.86, 0.84), side: THREE.DoubleSide });
    const U = this.u;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = U.uT; sh.uniforms.uShift = U.uShift;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>\nattribute vec3 aSeed;\nuniform float uT;\nuniform vec3 uShift;`)
        .replace("#include <uv_vertex>", `#include <uv_vertex>
#ifdef USE_MAP
float fr = floor(fract(uT * ${rate.toFixed(3)} + aSeed.x) * 4.0);
vec2 uu = vec2(aSeed.z > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
vMapUv = vec2((uu.x + fr) / 4.0, (uu.y + (1.0 - aSeed.y)) / 2.0);
#endif`)
        .replace("#include <project_vertex>", `vec4 mvPosition = modelViewMatrix * (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(uShift, 0.0));
mvPosition.xy += position.xy;
gl_Position = projectionMatrix * mvPosition;`);
    };
    mat.customProgramCacheKey = () => `herd${rate}`;
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4();
    pts.forEach((p, i) => this.mesh.setMatrixAt(i, m.makeTranslation(p.x, 0, p.z)));
    this.mesh.frustumCulled = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
}
