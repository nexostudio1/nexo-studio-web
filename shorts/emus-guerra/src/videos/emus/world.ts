// Western Australia, 1932: wheat to the horizon, a farm with its windmill, a dirt road with a fence, a dam,
// Meredith's two Lewis guns... and twenty thousand emus. One world posed per frame (pure function of shot id + frame),
// built with the Alejandro template pieces (two-tone materials, painted textures, lit flat cards, world ink).
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, SKINS, WG } from "./toon";
import { Pool, Actor, Fx, Stage, tier, tierW, light2D, blob, BODY, WIDE } from "./troop";
import { emuSide, emuFront, lewisSide, lewisFront, car32, herdAtlas, EmuHerd, EmuLook } from "./emu";
import { NOINK } from "./ink";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { cloudHD, rep, ctex } from "./paint";
import { FPS, SHOTS, camAt, smooth, worldF, CAMP, DAM, ROAD_Z, racerX, carX, FIRE1, FIRE2, JAM } from "./story";

const L: LightPreset = { ...LIGHTS.day, el: 40, lit: [1.62, 1.46, 1.2], fog: "#e6d3ae", sky: "#e8f0ff", ground: "#c49a5a" };
const K: WorldLook = { ...LOOK.day, sky: { c: ["#efdcb4", "#cfdcea", "#8db6e6", "#4f8ad6", "#2f6cc4"], e: [0, 3, 9, 22, 50] } };
const CLOUD = { lit: "#ffffff", mid: "#dfe6f2", shade: "#b6c2d8" };
const LIGHT = -2.1;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lam = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));
const q4 = (x: number) => Math.round(x * 3) / 3;

// ---------------- cast ----------------
const KHAKI = "#9a8656";
const MEREDITH: Outfit = { jacket: "#8c7a4c", pants: "#7d6c46", boots: "#4a3426", hat: "slouch", cap: "#8a7650", belt: "#5a3a20", buttons: "#e0b84a", moustache: "#5a3a26", skin: SKINS[0], build: "stout" };
const GUNNER: Outfit = { jacket: KHAKI, pants: "#7d6c46", boots: "#4a3426", hat: "slouch", cap: "#8a7650", belt: "#5a3a20", buttons: "#c9b07a", skin: SKINS[1] };
const MATE: Outfit = { ...GUNNER, skin: SKINS[2], moustache: "#3a2a1e", cap: "#806e48" };

// ---------------- painted textures ----------------
const wheatTex = ctex("wheatField", 512, 512, (g, r) => {
  g.fillStyle = "#d9b45a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = r() * 512, y = r() * 512, l = 6 + r() * 14;
    g.strokeStyle = r() < 0.5 ? "rgba(168,128,50,0.55)" : r() < 0.7 ? "rgba(240,212,130,0.6)" : "rgba(140,104,44,0.45)";
    g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - l); g.stroke();
  }
  for (let i = 0; i < 26; i++) { const x = r() * 512, y = r() * 512, rr = 30 + r() * 60, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(150,110,48,0.22)"); gr.addColorStop(1, "rgba(150,110,48,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
});
const dirtTex = ctex("redDirt", 512, 512, (g, r) => {
  g.fillStyle = "#b8784a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,84,50,0.45)" : "rgba(210,150,100,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 8, 1 + r() * 3, 0, 0, 6.3); g.fill(); }
  g.strokeStyle = "rgba(110,64,38,0.5)"; g.lineWidth = 3; for (const y of [150, 360]) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.05) * 6); g.stroke(); } // wheel ruts
});
const waterTex = ctex("damWater", 512, 512, (g, r) => {
  g.fillStyle = "#5f9cc0"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(220,240,250,0.55)"; g.lineWidth = 3;
  for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 512, w = 16 + r() * 40; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 5, x + w, y); g.stroke(); }
});
const crateTex = ctex("ammoCrate", 256, 128, (g) => {
  g.fillStyle = "#7a5a34"; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#4e3820"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 122); for (const y of [42, 86]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.fillStyle = "#e8dcb0"; g.font = "bold 44px Arial"; g.textAlign = "center"; g.fillText(".303", 128, 78);
});
const houseTex = ctex("weatherboard", 256, 256, (g, r) => {
  g.fillStyle = "#e8dcc0"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(120,100,70,0.6)"; g.lineWidth = 3; for (let y = 0; y < 256; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + r() * 2); g.stroke(); }
});
const tuftDraw = (p: Pen, v: number) => { // 128 x 160 card of wheat stalks
  const g = p.g;
  for (let k = 0; k < 9; k++) {
    const x = 20 + k * 11 + (hh(k, v) - 0.5) * 10, top = 30 + hh(k, v + 3) * 40, lean = (hh(k, v + 7) - 0.5) * 24;
    g.strokeStyle = "#8a6a2c"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 160); g.quadraticCurveTo(x + lean * 0.3, 100, x + lean, top + 14); g.stroke();
    g.strokeStyle = "#e6c46a"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#c99a3e"; g.beginPath(); g.ellipse(x + lean, top, 5, 15, lean * 0.02, 0, 6.3); g.fill();
    g.strokeStyle = "#5a4020"; g.lineWidth = 1.5; g.stroke();
  }
};
const shellsDraw = (p: Pen) => { // 256 x 256: spent brass all over the ground
  const g = p.g;
  for (let i = 0; i < 160; i++) {
    const a = hh(i, 1) * 6.28, d = Math.sqrt(hh(i, 2)) * 118, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d;
    g.save(); g.translate(x, y); g.rotate(hh(i, 3) * 6.28);
    g.fillStyle = "#d8a63a"; g.strokeStyle = "#5a3a10"; g.lineWidth = 1.5; g.fillRect(-6, -2.5, 12, 5); g.strokeRect(-6, -2.5, 12, 5);
    g.fillStyle = "#f5d98a"; g.fillRect(-4, -1.5, 5, 1.6); g.restore();
  }
};

// ---------------- emus as cards ----------------
const EDGE = (() => { // the near edge of the great herd, drawn as lit cards
  const out: { x: number; z: number; i: number; ph: number; flip: boolean; sh: boolean }[] = []; let i = 0;
  for (let z = -27; z >= -38; z -= 2.1) for (let x = -16; x <= 20; x += 2.0) {
    out.push({ x: x + (hh(i, 1) - 0.5) * 1.4, z: z + (hh(i, 2) - 0.5) * 1.2, i, ph: hh(i, 3), flip: hh(i, 4) < 0.5, sh: hh(i, 5) < 0.4 }); i++;
  }
  return out;
})();
const FIFTY = Array.from({ length: 50 }, (_, i) => {
  const a = hh(i, 11) * 6.28, d = 1.2 + Math.sqrt(hh(i, 12)) * 7;
  const dir = i * 2.39996 + hh(i, 13) * 0.6; // golden-angle spread: every one its own way
  return { x: Math.cos(a) * d, z: -45 + Math.sin(a) * d * 0.8, i, ph: hh(i, 14), dx: Math.cos(dir), dz: Math.sin(dir), v: 5 + hh(i, 15) * 4, flip: hh(i, 16) < 0.5 };
});
const APPROACH = Array.from({ length: 36 }, (_, i) => { // walking in to drink
  const a = -Math.PI / 2 + (hh(i, 21) - 0.5) * 5.2, r0 = 52 + hh(i, 22) * 20;
  return { a, r0, i, ph: hh(i, 23) };
}).filter((q) => Math.abs(Math.cos(q.a)) > 0.25 || Math.sin(q.a) < 0);
const RUNNERS = Array.from({ length: 12 }, (_, i) => ({ z: -64.2 - (i % 3) * 0.9 - (i % 2 ? 0 : 4.5), dir: i % 2 ? 1 : -1, v: 9 + hh(i, 31) * 4, off: hh(i, 32) * 12, i }));
const CHARGE = Array.from({ length: 39 }, (_, i) => ({ x: -13 + (i % 13) * 2.17 + (hh(i, 41) - 0.5) * 0.6, row: Math.floor(i / 13), i, ph: hh(i, 42) }));

// ---------------- world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private skyMat: THREE.ShaderMaterial; private sky: THREE.Mesh;
  private fog = new THREE.Fog("#e6d3ae", 150, 1600);
  private clouds: THREE.Mesh[] = [];
  private herd: EmuHerd; private herdFar: EmuHerd; private damHerd: EmuHerd;
  private tufts: { mesh: THREE.InstancedMesh };
  private crates = new THREE.Group();
  private blades = new THREE.Group();
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private sph = new THREE.Sphere(); private v = new THREE.Vector3();

  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight(L.sky, L.ground, L.hemiI);
    this.sun = new THREE.DirectionalLight(L.sunCol, L.sunI);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    const cm = [0, 1, 2, 3].map((k) => cloudHD(k, CLOUD));
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + hh(i, 20), d = 800 + hh(i, 21) * 600, w = 180 + hh(i, 23) * 160;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cm[i % 4], transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 120 + hh(i, 22) * 300, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    // ground: wheat everywhere; red dirt at the camp, along the road and round the dam
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), lam({ map: rep(wheatTex, 900, 900) }));
    ground.receiveShadow = true; R.add(ground);
    const patch = (geo: THREE.BufferGeometry, x: number, z: number, map: THREE.Texture, y = 0.012) => {
      const m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), lam({ map })); m.position.set(x, y, z); m.receiveShadow = true; R.add(m); return m;
    };
    patch(new THREE.CircleGeometry(9, 40), CAMP.x, CAMP.z, rep(dirtTex, 3, 3));
    patch(new THREE.PlaneGeometry(400, 4.2), 100, ROAD_Z, rep(dirtTex, 100, 1));
    patch(new THREE.CircleGeometry(DAM.r + 9, 48), DAM.x, DAM.z, rep(dirtTex, 6, 6));
    patch(new THREE.PlaneGeometry(10, 36), DAM.x, DAM.z + 34, rep(dirtTex, 2, 6));
    patch(new THREE.CircleGeometry(DAM.r, 48), DAM.x, DAM.z, rep(waterTex, 3, 3), 0.05);
    // fence along the road
    const post = lam({ color: "#6b4a2e" }), wire = new THREE.MeshBasicMaterial({ color: "#4a4038" });
    for (let x = -20; x <= 160; x += 3.6) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.12), post); m.position.set(x, 0.57, ROAD_Z - 2.6); m.castShadow = true; R.add(m); }
    for (const y of [0.55, 0.95]) { const m = new THREE.Mesh(new THREE.BoxGeometry(180, 0.02, 0.02), wire); m.position.set(70, y, ROAD_Z - 2.6); R.add(m); }
    // the farm: weatherboard house, iron roof, windmill
    const house = new THREE.Group(); house.position.set(-26, 0, -12); R.add(house);
    const walls = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 6), lam({ map: rep(houseTex, 3, 1) })); walls.position.y = 1.6; walls.castShadow = true; walls.receiveShadow = true; house.add(walls);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.6, 4, 1).rotateY(Math.PI / 4).scale(1.05, 1, 0.72), lam({ color: "#a8463a" })); roof.position.y = 4.5; roof.castShadow = true; house.add(roof);
    const verandah = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.15, 2.4), lam({ color: "#9a9a92" })); verandah.position.set(0, 2.7, 4.1); house.add(verandah);
    for (const x of [-4.5, 0, 4.5]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.16), post); m.position.set(x, 1.35, 5.2); house.add(m); }
    const mill = new THREE.Group(); mill.position.set(-14, 0, -20); R.add(mill);
    const steel = lam({ color: "#8a8c90" });
    for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 10.4), steel); leg.position.set(x * 0.55, 5, z * 0.55); leg.rotation.set(z * 0.11, 0, -x * 0.11); mill.add(leg); }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2.4, 24), lam({ color: "#9aa0a4" })); tank.position.set(4, 1.2, 2); tank.castShadow = true; mill.add(tank);
    this.blades.position.set(0, 10.3, 0.6); mill.add(this.blades);
    for (let k = 0; k < 14; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.9, 0.04), lam({ color: "#d8d8d0" })); b.position.set(0, 1.25, 0); const piv = new THREE.Group(); piv.rotation.z = (k / 14) * Math.PI * 2; piv.add(b); this.blades.add(piv); }
    const vane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 2.2), lam({ color: "#c84a3a" })); vane.position.set(0, 10.3, -1.6); mill.add(vane);
    // ammunition crates: two stacks behind the guns
    const crateM = lam({ map: crateTex });
    for (const sx of [-1, 1]) for (let row = 0; row < 4; row++) for (let k = 0; k < 4 - row; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.46, 0.55), crateM);
      m.position.set(sx * (3.0 + (k - (3 - row) / 2) * 0.92), 0.23 + row * 0.46, -1.3 + (hh(k + row * 4, sx) - 0.5) * 0.1);
      m.castShadow = true; m.receiveShadow = true; this.crates.add(m);
    }
    R.add(this.crates);
    // the herds: the near herd, the herd to the horizon (wider than any frame), and the thousand at the dam
    const eat = herdAtlas("eat");
    const pts = (x0: number, x1: number, z0: number, z1: number, step: number, seed: number, keep: (x: number, z: number) => boolean) => {
      const out: { x: number; z: number }[] = []; let i = 0;
      for (let z = z0; z >= z1; z -= step) for (let x = x0; x <= x1; x += step) {
        const px = x + (hh(i, seed) - 0.5) * step * 0.8, pz = z + (hh(i, seed + 1) - 0.5) * step * 0.8; i++;
        if (keep(px, pz)) out.push({ x: px, z: pz });
      }
      return out;
    };
    this.herd = new EmuHerd(R, eat, pts(-170, 170, -40, -330, 2.6, 3, () => true), 0.5, 1);
    this.herdFar = new EmuHerd(R, eat, pts(-700, 700, -330, -1700, 5.5, 5, () => true), 0.5, 2);
    this.damHerd = new EmuHerd(R, eat, pts(DAM.x - 50, DAM.x + 50, DAM.z + 50, DAM.z - 50, 2.3, 7, (x, z) => {
      const d = Math.hypot(x - DAM.x, z - DAM.z);
      return d > DAM.r + 1.2 && d < DAM.r + 30 && !(z > DAM.z + 18 && Math.abs(x - DAM.x) < 14);
    }), 0.6, 3);
    // wheat tufts, instanced billboards (cleared at the camp, on the road, round the dam and where the camera stands)
    {
      const cv = document.createElement("canvas"); cv.width = 4 * 128; cv.height = 160;
      const g = cv.getContext("2d")!; for (let k = 0; k < 4; k++) { g.setTransform(1, 0, 0, 1, k * 128, 0); tuftDraw(new Pen(g), k); }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const clear: [number, number, number][] = [[CAMP.x, CAMP.z, 9.5], [DAM.x, DAM.z, DAM.r + 9], [DAM.x, DAM.z + 34, 9], [3.2, -23.6, 3], [0.6, -58.5, 2.5], [6, -25.6, 2.6], [300.3, -70, 3]];
      const tp = pts(-60, 60, 26, -80, 1.25, 9, (x, z) => clear.every(([cx, cz, r]) => Math.hypot(x - cx, z - cz) > r) && Math.abs(z - ROAD_Z) > 3.6)
        .concat(pts(DAM.x - 45, DAM.x + 45, DAM.z + 60, DAM.z - 40, 1.25, 11, (x, z) => clear.every(([cx, cz, r]) => Math.hypot(x - cx, z - cz) > r)))
        .concat(pts(-20, 170, ROAD_Z + 14, ROAD_Z - 14, 1.1, 13, (x, z) => Math.abs(z - ROAD_Z) > 3.4 && Math.abs(x) + Math.abs(z) > 12));
      const geo = new THREE.PlaneGeometry(0.85, 1.06).translate(0, 0.5, 0);
      const tl = new Float32Array(tp.length); tp.forEach((_, i) => { tl[i] = Math.floor(hh(i, 17) * 4); });
      geo.setAttribute("aT", new THREE.InstancedBufferAttribute(tl, 1));
      const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.45, color: new THREE.Color(0.95, 0.9, 0.82), side: THREE.DoubleSide });
      mat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aT;")
          .replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vec2((uv.x + aT) / 4.0, uv.y);\n#endif")
          .replace("#include <project_vertex>", "vec4 mvPosition = modelViewMatrix * (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0));\nmvPosition.xy += position.xy;\ngl_Position = projectionMatrix * mvPosition;");
      };
      mat.customProgramCacheKey = () => "tufts";
      const mesh = new THREE.InstancedMesh(geo, mat, tp.length), m = new THREE.Matrix4();
      tp.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, 0, p.z)));
      mesh.frustumCulled = false; mesh.layers.set(NOINK); R.add(mesh);
      this.tufts = { mesh };
    }
  }

  private shotSun(id: number) {
    let v = this.sunCache.get(id);
    if (v) return v;
    const s = SHOTS[id - 1];
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(id === 4 ? -70 : id === 3 || id === 8 ? 140 : 72), el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const fw = worldF(f), t = fw / FPS, S = SHOTS[id - 1];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = c.pos[1] > 20 ? 0.5 : 0.15; cam.far = 5000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus), sunDir = this.shotSun(id);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 120);
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 700; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce);
    TONE.uSat.value = 0.82;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    const up = smooth((c.pos[1] - 5) / 200);
    this.fog.near = THREE.MathUtils.lerp(90, S.fog[0], up); this.fog.far = THREE.MathUtils.lerp(1200, S.fog[1], up);
    scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) m.quaternion.copy(cam.quaternion);
    // herds: the great herd is away while the 50 are on screen; everyone keeps pecking
    for (const h of [this.herd, this.herdFar, this.damHerd]) h.u.uT.value = t;
    this.herd.mesh.visible = this.herdFar.mesh.visible = id !== 4;
    this.crates.visible = id === 3 || id === 8;
    this.blades.rotation.z = -t * 2.2;

    // ---- cards ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const light = light2D(sunDir, right);
    const st: Stage = { places: [], fx: [] };
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const lidAt = (i: number) => {
      let s = Math.round(-60 * hh(i, 9));
      for (let n = 0; s <= f && n < 120; n++) { const k = f - s; if (k >= 0 && k < 4) return [0.5, 1, 1, 0.5][k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
      return 0;
    };
    const visible = (x: number, y: number, z: number, r: number) => this.frustum.intersectsSphere(this.sph.set(this.v.set(x, y, z), r));
    const person = (who: string, o: Outfit, x: number, z: number, opts: Parameters<typeof bodyFront>[2], i: number) => {
      if (!visible(x, 1.1, z, 3.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, 1.2, z)), [w, h, k] = tier(d), near = d < 16;
      const o2 = { ...opts, light, seed: (i * 5 + 3) % 7 + 1, blink: near ? lidAt(i) : 0 };
      if (!near) o2.expr = "neutral";
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y: 0, z, size: [w, h, k], draw: (p) => bodyFront(p, o, o2) });
      if (d < 60) blob(st, sunDir, x, 0, z);
    };
    /** a front-view card (BODY) that is not a person */
    const front = (key: string, x: number, z: number, draw: (p: Pen) => void, sc = 1, shadow = true) => {
      if (!visible(x, 1.1 * sc, z, 3 * sc)) return;
      const d = cam.position.distanceTo(this.v.set(x, 1.2, z)) / sc, [w, h, k] = tier(d);
      st.places.push({ key: `${key}|${w}`, x, y: 0, z, size: [w, h, k], scale: sc, draw });
      if (shadow && d * sc < 60) blob(st, sunDir, x, 0, z, sc);
    };
    /** a profile card (WIDE); faceX = +1 when it faces/moves toward screen right */
    const side = (key: string, x: number, z: number, faceX: number, draw: (p: Pen) => void, sc = 1, shadow = true) => {
      if (!visible(x, 1.3 * sc, z, 3 * sc)) return;
      const d = cam.position.distanceTo(this.v.set(x, 1.3 * sc, z)) / sc, [w, h, k] = tierW(d);
      st.places.push({ key: `${key}|${w}`, x, y: 0, z, size: [w, h, k], wide: true, scale: sc, mirror: faceX < 0, draw });
      if (shadow && d * sc < 70) { blob(st, sunDir, x - 0.5 * sc, 0, z, 1.3 * sc); blob(st, sunDir, x + 0.5 * sc, 0, z, 1.3 * sc); }
    };
    /** screen-direction sign of a world direction */
    const scr = (dx: number, dz: number) => (dx * right.x + dz * right.z >= 0 ? 1 : -1);
    const toCam = (x: number, z: number) => { const dx = cam.position.x - x, dz = cam.position.z - z, n = Math.hypot(dx, dz) || 1; return [dx / n, dz / n]; };
    const emu = (key: string, x: number, z: number, dx: number, dz: number, ph: number | null, o: EmuLook, i: number) => {
      if (Math.hypot(cam.position.x - x, cam.position.z - z) < 4.2 && cam.position.y < 3) return; // never a blur filling the lens
      const [cx, cz] = toCam(x, z), along = (dx * cx + dz * cz) / (Math.hypot(dx, dz) || 1);
      const near = cam.position.distanceTo(this.v.set(x, 1, z)) < 14, o2 = { ...o, eye: o.eye ?? (near && lidAt(i + 500) > 0.6 ? "shut" as const : o.eye) };
      if (Math.abs(along) > 0.82) front(`emuF|${key}|${ph}|${JSON.stringify(o2)}`, x, z, (p) => emuFront(p, ph, o2));
      else side(`emuS|${key}|${ph}|${JSON.stringify(o2)}`, x, z, scr(dx, dz), (p) => emuSide(p, ph, o2));
    };
    const gun = (x: number, z: number, dx: number, dz: number, flash: number, jam: number) => {
      const [cx, cz] = toCam(x, z), along = dx * cx + dz * cz, fl = Math.round(flash * 2) / 2, jm = Math.round(jam * 12) / 12;
      if (Math.abs(along) > 0.72) front(`gunF|${fl}|${jm}`, x, z, (p) => lewisFront(p, fl, jm), 1, false);
      else side(`gunS|${fl}|${jm}`, x, z, scr(dx, dz), (p) => lewisSide(p, fl, jm), 1, false);
    };
    const gait = (ph: number, hz: number) => Math.floor(((((t * hz + ph) % 1) + 1) % 1) * 8) / 8;
    const peck = (ph: number) => q4(0.5 - 0.5 * Math.cos(2 * Math.PI * (t * 0.45 + ph)));
    const burst = (w0: number, w1: number) => (fw >= w0 && fw < w1 ? [1, 0.5, 0][Math.floor(fw) % 3] : 0);

    // the men
    const atDam = id === 5 || id === 6;
    const B = atDam ? { x: DAM.gun.x, z: DAM.gun.z + 1.0 } : CAMP;
    const jam = id === 5 ? smooth((fw - JAM) / 6) * (1 - smooth((fw - JAM - 60) / 40)) : 0;
    if (id !== 2 && id !== 7 && id !== 9) {
      const exM: Expr = id === 1 ? (f < 99 ? "stern" : "nervous") : id === 3 ? "stern" : id === 4 ? "stern" : id === 5 ? (fw >= JAM ? "shock" : "stern") : id === 6 ? "dazed" : f < 1160 ? "pained" : "nervous";
      const exG: Expr = id === 3 ? "grin" : id === 5 ? (fw >= JAM ? "shock" : f >= 708 ? "grin" : "stern") : id === 6 ? "dazed" : id === 8 ? "nervous" : "stern";
      const exA: Expr = id === 5 && fw >= JAM ? "nervous" : id === 6 ? "dazed" : id === 3 ? "smile" : "stern";
      if (atDam) {
        person("gunner", GUNNER, B.x, B.z, { mode: "stand", expr: exG, facing: 0, look: 0 }, 2);
        person("meredith", MEREDITH, B.x - 1.9, B.z + 0.5, { mode: "stand", expr: exM, facing: 0, look: 0 }, 1);
        person("mate", MATE, B.x + 1.9, B.z + 0.5, { mode: "stand", expr: exA, facing: 0, look: 0 }, 3);
        gun(DAM.gun.x, DAM.gun.z, 0, -1, burst(FIRE2[0], Math.min(FIRE2[1], JAM)), jam);
        if (id === 6) gun(B.x + 1.9, B.z - 0.9, 0, -1, 0, 0);
      } else {
        person("meredith", MEREDITH, 0, 0, { mode: "stand", expr: exM, facing: 0, look: 0 }, 1);
        person("gunner", GUNNER, -1.7, 0.25, { mode: "stand", expr: exG, facing: 0, look: 0 }, 2);
        person("mate", MATE, 1.7, 0.25, { mode: "stand", expr: exA, facing: 0, look: 0 }, 3);
        if (id === 3) { gun(-3.1, 0.9, -1, 0, 0, 0); gun(3.1, 0.9, 1, 0, 0, 0); }
        if (id === 4 || id === 8) { const fl = id === 4 ? burst(FIRE1[0], FIRE1[1]) : 0; gun(-1.2, -1.1, 0, -1, fl, 0); gun(1.2, -1.1, 0, -1, id === 4 ? burst(FIRE1[0] + 1, FIRE1[1]) : 0, 0); }
        if (id === 8) for (const [x, z, s] of [[-1.3, -0.4, 2.6], [1.4, -0.3, 2.4], [0, 0.8, 3.2], [-2.6, 0.6, 2], [2.5, 0.7, 2.2]]) st.fx.push({ key: "shells", cw: 256, ch: 256, draw: shellsDraw, x, y: 0.03, z, w: s, h: s, flat: true, rot: x });
      }
    }

    // the near edge of the great herd: feeding
    if (id !== 4 && id !== 5 && id !== 6) for (const q of EDGE) {
      if (id === 9 && Math.hypot(q.x - 5.3, q.z + 29) < 1.6) continue;
      emu(`edge${q.sh ? 1 : 0}|${peck(q.ph)}`, q.x, q.z, q.flip ? 1 : -1, 0, null, { eat: peck(q.ph), feather: q.sh ? "#7d6450" : undefined }, q.i + 100);
    }
    // shot 4: fifty emus; after "salen corriendo" each runs its own way
    if (id === 4) {
      const go = Math.max(0, t - worldF(540) / FPS);
      for (const q of FIFTY) {
        const d = go > 0 ? q.v * go : 0, x = q.x + q.dx * d, z = q.z + q.dz * d;
        if (go > 0) emu("run", x, z, q.dx, q.dz, gait(q.ph, 2.6), { brow: "worried" }, q.i + 200);
        else emu(`fifty|${peck(q.ph)}`, x, z, q.flip ? 1 : -1, 0, null, { eat: fw > FIRE1[0] ? 0 : peck(q.ph), eye: fw > FIRE1[0] ? "cam" : undefined }, q.i + 200);
      }
    }
    // the dam: emus walking in to drink
    if (id === 5 || id === 6) {
      for (const q of APPROACH) {
        const r = Math.max(DAM.r + 2, q.r0 - 1.3 * t), x = DAM.x + Math.cos(q.a) * r, z = DAM.z + Math.sin(q.a) * r;
        const walking = r > DAM.r + 2.05;
        emu(`dam|${walking}`, x, z, -Math.cos(q.a), -Math.sin(q.a), walking ? gait(q.ph, 1.1) : null, { eat: walking ? 0 : peck(q.ph) }, q.i + 300);
      }
    }
    // shot 6: emus run circles round the unhurt soldiers
    if (id === 6) for (const q of RUNNERS) {
      const span = 12, x = DAM.x + ((((q.off + q.dir * q.v * t) % span) + span) % span) - span / 2;
      emu("ring", x, q.z, q.dir, 0, gait(q.i * 0.13, 2.6), { brow: q.i % 3 ? undefined : "angry", smug: q.i % 4 === 1 }, q.i + 400);
    }
    // shot 7: the racer and the car
    if (id === 7) {
      const rx = racerX(f), cxp = carX(f), passed = rx > cxp + 1.5;
      emu("racer", rx, ROAD_Z, 1, 0, gait(0, 2.8), { brow: passed ? undefined : "angry", smug: passed }, 7);
      side(`car|${Math.floor(fw / 2) % 5}|${passed}`, cxp, ROAD_Z - 1.0, 1, (p) => car32(p, (Math.floor(fw / 2) % 5) * 0.63, passed), 1);
    }
    // shot 8: the charge, "like tanks"
    if (id === 8) for (const q of CHARGE) {
      const z = Math.min(-11 - q.row * 2.4, -27 - q.row * 2.4 + 6 * Math.max(0, t - 1150 / FPS)), moving = z < -11.05 - q.row * 2.4;
      emu(`charge|${moving}`, q.x, z, 0, 1, moving ? gait(q.ph, 2.4) : null, { brow: "angry", eye: moving ? undefined : "cam" }, q.i + 600);
    }
    // shot 9: the one that looks at you
    if (id === 9) {
      const looking = f >= 1395;
      if (looking) front(`star|${lidAt(9) > 0.6}`, 5.3, -29, (p) => emuFront(p, null, { eye: lidAt(9) > 0.6 ? "shut" : "cam", smug: true }));
      else emu(`star|${peck(0.2)}`, 5.3, -29, -1, 0, null, { eat: peck(0.2) }, 9);
    }

    let ai = 0;
    for (const p of st.places) {
      const a = this.actor(ai++), [w, h, k] = p.size, s = p.scale ?? 1;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.geometry = p.wide ? WIDE : BODY;
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.set(p.mirror ? -s : s, s, s);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    for (const p of st.fx) {
      if (!visible(p.x, p.y, p.z, Math.max(p.w, p.h))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else e2.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      e2.mesh.scale.set(p.w, p.h, 1);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (let i = 0; i < fi; i++) this.fxs[i].bind();
    return focus;
  }
}
void WG;
