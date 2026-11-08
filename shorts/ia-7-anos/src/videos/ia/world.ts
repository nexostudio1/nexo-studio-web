// "Los 7 años" — a city plaza at dusk that slowly turns red as a giant AI eye grows in the sky.
// Built on the Alejandro template pieces: painted sky by elevation, two-tone materials, flat character cards with
// contact blobs, instanced crowd, world ink. Everything is a pure function of (shot id, frame).
// The people face +z (toward the camera at the start); the eye hangs over the horizon at -z.
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, SKINS } from "./toon";
import { Pool, Actor, Fx, Stage, tier, blob, BODY, light2D } from "./troop";
import { Crowd, atlas } from "./crowd";
import { NOINK } from "./ink";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { cloudHD, rep, ctex } from "./paint";
import { FPS, SHOTS, camAt, smooth, worldF, takeover, EYE, REWIND } from "./story";

const BASE: LightPreset = { ...LIGHTS.golden, el: 22, lit: [0.95, 1.05, 1.45], shade: [0.16, 0.18, 0.34], lift: [0.04, 0.06, 0.14],
  charTint: [0.85, 0.95, 1.1], fog: "#2f4a6a", sunCol: "#9fc4ff", sunI: 2.6, sky: "#6f8fc0", ground: "#2a2a44", hemiI: 0.55, actorShadow: false };
const SKY_A = ["#3c8fa8", "#2e6f95", "#27497e", "#1d2b5a", "#101a3a"]; // calm teal dusk
const SKY_B = ["#ff6a3d", "#d22f2f", "#8a1a3a", "#4a0f2e", "#1c0818"]; // takeover red
const LIT_B: [number, number, number] = [1.5, 0.55, 0.42], SHADE_B: [number, number, number] = [0.26, 0.1, 0.2];
const FOG_A = new THREE.Color("#2f4a6a"), FOG_B = new THREE.Color("#7a1c2c");
const SMOKY = { lit: "#9fb4d8", mid: "#5a6a90", shade: "#2c3050" };
const LIGHT = -2.1;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lam = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));

// ---------------- cast: everyday people ----------------
const COATS = ["#3f6fb5", "#c25a4a", "#5d9a5a", "#e0a640", "#2f8f9a", "#8a63d0", "#e8e4da", "#d9643a"];
const HAIRS = ["#2a1d16", "#5a3b2a", "#d9b25a", "#1a1410", "#8a4a2a"];
export const person = (v: number): Outfit => ({
  jacket: COATS[v % 8], pants: v % 3 ? "#3b3f52" : "#4a5a7a", boots: "#2a2420", skin: SKINS[v % 4],
  hat: v % 5 === 1 ? "cap" : "hair", cap: COATS[(v * 3 + 2) % 8], hair: HAIRS[v % 5],
  ...(v % 4 === 2 ? { dress: COATS[(v + 3) % 8] } : {}),
});
const HERO: Outfit = { jacket: "#e8e4da", pants: "#3b3f52", boots: "#2a2420", hat: "hair", hair: "#5a3b2a", skin: SKINS[1], buttons: "#2f8f9a" };

const grid = (x0: number, x1: number, z0: number, z1: number, step: number, seed: number) => {
  const out: { x: number; z: number }[] = [];
  let i = 0;
  const dz = z1 >= z0 ? step : -step;
  for (let z = z0; dz > 0 ? z <= z1 : z >= z1; z += dz) for (let x = x0; x <= x1; x += step) {
    out.push({ x: x + (hh(i, seed) - 0.5) * step * 0.7, z: z + (hh(i, seed + 1) - 0.5) * step * 0.7 }); i++;
  }
  return out;
};
/** people drawn as lit cards near the camera: a plaza full of them, hero at the origin */
const NEAR = grid(-16, 16, -3, -34, 1.7, 7).map((p, i) => ({ ...p, v: (i * 5 + 3) % 12, i })).filter((p) => Math.abs(p.x) > 1.4);

// ---------------- the AI eye (flat glowing card, faces the camera) ----------------
const eyeDraw = (p: Pen) => { // 512 x 512
  const g = p.g, c = 256;
  g.fillStyle = "#12060c"; g.beginPath(); g.ellipse(c, c, 190, 120, 0, 0, 6.3); g.fill(); // eyelid shape
  g.strokeStyle = "#ff6a4a"; g.lineWidth = 8; g.stroke();
  const ir = g.createRadialGradient(c, c, 4, c, c, 104); ir.addColorStop(0, "#fff6d0"); ir.addColorStop(0.35, "#ff6a2a"); ir.addColorStop(1, "#b00a2a");
  g.fillStyle = ir; g.beginPath(); g.arc(c, c, 104, 0, 6.3); g.fill();
  g.strokeStyle = "rgba(255,230,190,0.7)"; g.lineWidth = 3;
  for (let k = 0; k < 24; k++) { const a = k * 0.2618; g.beginPath(); g.moveTo(c + Math.cos(a) * 40, c + Math.sin(a) * 40); g.lineTo(c + Math.cos(a) * 100, c + Math.sin(a) * 100); g.stroke(); }
  g.fillStyle = "#12060c"; g.beginPath(); g.ellipse(c, c, 22, 70, 0, 0, 6.3); g.fill(); // slit pupil
  g.strokeStyle = "rgba(20,0,8,0.9)"; g.lineWidth = 4; g.beginPath(); g.ellipse(c, c, 190, 120, 0, 0, 6.3); g.stroke();
};
const windowsTex = (kind: number) => ctex(`win${kind}`, 256, 512, (g, r) => {
  g.fillStyle = ["#2a3552", "#3a2f4a", "#24404f"][kind % 3]; g.fillRect(0, 0, 256, 512);
  for (let y = 12; y < 500; y += 32) for (let x = 12; x < 244; x += 32) {
    const on = r() < 0.45; g.fillStyle = on ? (r() < 0.5 ? "#ffd98a" : "#9fe4ff") : "#141a2c"; g.fillRect(x, y, 18, 20);
  }
  g.strokeStyle = "rgba(10,8,18,0.8)"; g.lineWidth = 3; g.strokeRect(0, 0, 256, 512);
});
const plazaTex = ctex("plaza", 512, 512, (g, r) => {
  g.fillStyle = "#3a3e56"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) {
    g.fillStyle = r() < 0.5 ? "rgba(120,130,170,0.18)" : "rgba(10,10,30,0.2)"; g.fillRect(x + 2, y + 2, 60, 60);
  }
  g.strokeStyle = "rgba(14,10,24,0.7)"; g.lineWidth = 3;
  for (let k = 0; k <= 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
});

// ---------------- motes: drifting data sparks around the camera ----------------
const MOTE = { n: 5000, b: 34, h: 12 };
const MOTE_VS = `
attribute vec4 aSeed; uniform float uT; uniform vec3 uCam; uniform float uPx; varying float vA; varying float vHot;
void main() {
  float B = ${MOTE.b.toFixed(1)}, H = ${MOTE.h.toFixed(1)};
  vec3 p = position;
  p.y = mod(p.y + uT * (0.25 + 0.6 * aSeed.x), H);
  p.x += sin(uT * (0.5 + aSeed.y) + aSeed.z * 30.0) * 0.5;
  p.z += cos(uT * (0.4 + aSeed.z) + aSeed.w * 30.0) * 0.5;
  p.xz = uCam.xz + mod(p.xz - uCam.xz + 0.5 * B, B) - 0.5 * B;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float big = step(0.85, aSeed.w);
  float sz = mix(0.025, 0.05, aSeed.y) + big * 0.08;
  gl_PointSize = clamp(sz * uPx / max(0.1, -mv.z), 2.0, 80.0);
  float life = p.y / H;
  vA = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.6, 1.0, life)) * (0.6 + 0.4 * sin(uT * (4.0 + 5.0 * aSeed.x) + aSeed.z * 50.0));
  vA *= smoothstep(0.35, 1.0, -mv.z);
  vHot = aSeed.x;
  gl_Position = projectionMatrix * mv;
}`;
const MOTE_FS = `
uniform float uFade; uniform float uRed; varying float vA; varying float vHot;
void main() {
  vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float core = exp(-r * r * 4.0) + 0.6 * exp(-r * r * 30.0);
  vec3 cool = mix(vec3(0.2, 0.8, 1.0), vec3(0.7, 1.0, 1.0), vHot), hot = mix(vec3(1.0, 0.25, 0.1), vec3(1.0, 0.7, 0.3), vHot);
  gl_FragColor = vec4(mix(cool, hot, uRed) * core * vA * uFade * 3.0, 1.0);
}`;

// ---------------- world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private skyMat: THREE.ShaderMaterial; private sky: THREE.Mesh;
  private fog = new THREE.Fog("#2f4a6a", 80, 900);
  private clouds: THREE.Mesh[] = [];
  private eye: THREE.Mesh; private eyeMat: THREE.MeshBasicMaterial;
  private crowd: Crowd;
  private motes = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPx: { value: 1000 }, uFade: { value: 1 }, uRed: { value: 0 } };
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private sph = new THREE.Sphere(); private v = new THREE.Vector3();
  private c4 = [0, 1, 2, 3, 4].map(() => new THREE.Color());

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
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#9fc4ff", "#2a2a44", 1.0);
    this.sun = new THREE.DirectionalLight("#9fc4ff", 2.4);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);

    // flat cartoon clouds ring
    const cm = [0, 1, 2, 3].map((k) => cloudHD(k, SMOKY));
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + hh(i, 20), d = 800 + hh(i, 21) * 500, w = 200 + hh(i, 23) * 160;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cm[i % 4], color: new THREE.Color(0.9, 0.9, 1.0), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 90 + hh(i, 22) * 320, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // the plaza
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), lam({ map: rep(plazaTex, 600, 600), color: "#ffffff" }));
    ground.receiveShadow = true; R.add(ground);
    // city blocks around the plaza and far down the avenue
    const mk = (x: number, z: number, w: number, h: number, d: number, k: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ map: rep(windowsTex(k), Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 14))), color: "#ffffff" }));
      m.position.set(x, h / 2, z); m.receiveShadow = true; m.castShadow = true; R.add(m);
    };
    for (let i = 0; i < 40; i++) {
      const side = i % 2 ? 1 : -1, z = 10 - (i >> 1) * 38;
      mk(side * (34 + hh(i, 1) * 10), z, 22 + hh(i, 2) * 14, 40 + hh(i, 3) * 90, 24 + hh(i, 4) * 10, i);
    }
    for (let i = 0; i < 14; i++) { // behind the camera, so wide shots read as a city
      const side = i % 2 ? 1 : -1;
      mk(side * (30 + hh(i, 5) * 60), 30 + (i >> 1) * 22, 24 + hh(i, 6) * 16, 40 + hh(i, 7) * 80, 26, i + 3);
    }
    // the eye
    this.eyeMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.5, 1.3, 1.3) });
    {
      const cv = document.createElement("canvas"); cv.width = 512; cv.height = 512;
      eyeDraw(new Pen(cv.getContext("2d")!));
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; this.eyeMat.map = t;
    }
    this.eye = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.eyeMat);
    this.eye.layers.set(NOINK); this.eye.renderOrder = 3; R.add(this.eye);

    // the crowd: thousands behind the near cards, filling the avenue
    const at = atlas(Array.from({ length: 12 }, (_, i) => person(i)), LIGHT);
    this.crowd = new Crowd(R, at, [...grid(-24, 24, -36, -150, 1.0, 40), ...grid(-60, 60, -150, -420, 1.8, 41)].filter((q) => q.z < -33), 2.3);

    {
      const N = MOTE.n, pos = new Float32Array(N * 3), sd = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) {
        pos.set([hh(i, 90) * MOTE.b, hh(i, 91) * MOTE.h, hh(i, 92) * MOTE.b], i * 3);
        sd.set([hh(i, 93), hh(i, 94), hh(i, 95), hh(i, 96)], i * 4);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 4));
      const mat = new THREE.ShaderMaterial({ uniforms: this.motes, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: MOTE_VS, fragmentShader: MOTE_FS });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false; pts.layers.set(NOINK); pts.renderOrder = 5;
      const u = this.motes.uPx;
      pts.onBeforeRender = (r, _s, c) => { const rt = r.getRenderTarget(), h = rt ? rt.height : r.domElement.height; u.value = h / (2 * Math.tan(THREE.MathUtils.degToRad((c as THREE.PerspectiveCamera).fov) / 2)); };
      R.add(pts);
    }
  }

  private shotSun(id: number) {
    if (id === 5) id = 1; // the loop shot shares the opening shot's light
    let v = this.sunCache.get(id);
    if (v) return v;
    const s = SHOTS[id - 1];
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(70), el = THREE.MathUtils.degToRad(BASE.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const fw = worldF(f), t = fw / FPS, L = BASE, K: WorldLook = LOOK.golden, S = SHOTS[id - 1];
    const red = takeover(f);
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = c.pos[1] > 30 ? 1 : 0.2; cam.far = 5000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus), sunDir = this.shotSun(id);
    const lerp3 = (a: number[], b: number[], u: number) => a.map((x, i) => x + (b[i] - x) * u) as [number, number, number];
    const lit = lerp3(L.lit, LIT_B, red), shd = lerp3(L.shade, SHADE_B, red), tint = lerp3(L.charTint, [1.15, 0.8, 0.7], red);
    // light rig
    this.hemi.color.set(L.sky).lerp(new THREE.Color("#ff7a6a"), red); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol).lerp(new THREE.Color("#ff6a4a"), red); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 120);
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 700; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...lit); TONE.uShadeCol.value.set(...shd); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce);
    TONE.uSat.value = 0.85;
    CHAR.uCharTint.value.set(...tint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // sky + fog
    const su = this.skyMat.uniforms;
    SKY_A.forEach((h, i) => { const a = new THREE.Color(h), b = new THREE.Color(SKY_B[i]); untone("#" + a.lerp(b, red).getHexString(), su["c" + i].value); });
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone("#" + FOG_A.clone().lerp(FOG_B, red).getHexString(), this.fog.color);
    const up = smooth((c.pos[1] - 5) / 200);
    this.fog.near = THREE.MathUtils.lerp(40, S.fog[0], up); this.fog.far = THREE.MathUtils.lerp(700, S.fog[1], up);
    scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) m.quaternion.copy(cam.quaternion);
    this.motes.uT.value = t; this.motes.uCam.value.copy(cam.position); this.motes.uRed.value = red;
    this.motes.uFade.value = 1 - smooth((c.pos[1] - 10) / 30);
    // the eye: opens, grows, breathes
    const open = EYE.open(f), size = EYE.w(f), br = 1 + 0.03 * Math.sin(t * 2.2);
    this.eye.position.set(EYE.x, EYE.y(f), EYE.z); this.eye.quaternion.copy(cam.quaternion);
    this.eye.scale.set(size * br, size * br * Math.max(0.04, open), 1);
    this.eyeMat.opacity = EYE.alpha(f) * 0.98;

    // ---- cast ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const light = light2D(sunDir, right);
    const st: Stage = { places: [], fx: [] };
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const lidAt = (i: number) => {
      let s = Math.round(-60 * hh(i, 9));
      for (let n = 0; s <= f && n < 80; n++) { const k = f - s; if (k >= 0 && k < 4) return [0.5, 1, 1, 0.5][k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
      return 0;
    };
    const visible = (x: number, y: number, z: number, r: number) => this.frustum.intersectsSphere(this.sph.set(this.v.set(x, y, z), r));
    const place = (who: string, o: Outfit, x: number, z: number, opts: Parameters<typeof bodyFront>[2], i: number) => {
      if (!visible(x, 1.1, z, 3.5)) return;
      const d = cam.position.distanceTo(this.v.set(x, 1.2, z)), [w, h, k] = tier(d), near = d < 16;
      const o2 = { ...opts, light, seed: (i * 5 + 3) % 7 + 1, blink: near ? lidAt(i) : 0 };
      if (!near) o2.expr = "neutral";
      st.places.push({ key: `${who}|${JSON.stringify(o2)}`, x, y: 0, z, size: [w, h, k], draw: (p) => bodyFront(p, o, o2) });
      if (d < 60) blob(st, sunDir, x, 0, z);
    };
    // mood by year: calm -> worried -> eyes down on the glow -> blank
    const reset = f >= REWIND.a + 6; // memory wiped: back to the happy start
    const mood = (i: number): Expr => f < 150 || reset ? (i % 3 ? "neutral" : "smile") : f < 340 ? (i % 2 ? "nervous" : "shock") : "dazed";
    // the hero stands in front, looking at us, then at the sky
    place("hero", HERO, 0, 0, { mode: "stand", expr: f < 60 || reset ? "smile" : f < 150 ? "shock" : f >= REWIND.wink && f < REWIND.a + 6 ? "nervous" : "dazed", facing: 0, look: f > 70 ? 0 : 0 }, 1);
    const stroll = f < 340 || reset;
    for (const s of NEAR) {
      const ph = Math.floor(((((t * 1.0 + s.i * 0.37) % 1) + 1) % 1) * 8) / 8;
      place(`n${s.v}`, person(s.v), s.x, s.z + (stroll ? Math.sin(t * 0.5 + s.i) * 0.15 : 0),
        stroll ? { mode: "stroll", phase: ph, expr: mood(s.i), facing: 0, lift: 30 } : { mode: "stand", expr: mood(s.i), facing: 0, look: 0 }, s.i + 40);
    }

    let ai = 0;
    for (const p of st.places) {
      const a = this.actor(ai++), [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.geometry = BODY;
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.set(1, 1, 1);
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
