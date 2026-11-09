import {getInputProps} from 'remotion';
import React, {useEffect, useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {EffectComposer} from '@react-three/postprocessing';
import {BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {camAt, ownerAt, phoneAt, CHAIR_Z, Phone} from './anim';
import {InkPass, noInkFallback} from './ink';
import {LensBlur} from './lensblur';
import {GradeEffect, GradeParams} from './grade';
import * as T from './tex';
import {drawFace, FW, FH} from './face';

type V = [number, number, number];
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([95, 170, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const Toon: React.FC<{c?: string; map?: THREE.Texture}> = ({c = '#ffffff', map}) => <meshToonMaterial color={c} map={map ?? null} gradientMap={GRAD} />;
const Glow: React.FC<{c: string; k?: number}> = ({c, k = 2}) => <meshBasicMaterial color={new THREE.Color(c).multiplyScalar(k)} />;

const RB_CACHE = new Map<string, THREE.BufferGeometry>();
const rbox = (w: number, h: number, d: number, r: number) => {
  const key = [w, h, d, r].join(',');
  if (!RB_CACHE.has(key)) RB_CACHE.set(key, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999));
  return RB_CACHE.get(key)!;
};
const Box: React.FC<{p: V; s: V; c?: string; r?: number; rot?: V; map?: THREE.Texture; shadow?: boolean}> = ({p, s, c, r = 0.06, rot = [0, 0, 0], map, shadow = true}) => (
  <mesh position={p} rotation={rot} geometry={rbox(s[0], s[1], s[2], r)} castShadow={shadow} receiveShadow>
    <Toon c={c} map={map} />
  </mesh>
);
const Ball: React.FC<{p: V; s: V | number; c: string; rot?: V}> = ({p, s, c, rot = [0, 0, 0]}) => (
  <mesh position={p} rotation={rot} scale={typeof s === 'number' ? [s, s, s] : s} castShadow receiveShadow>
    <sphereGeometry args={[1, 28, 20]} />
    <Toon c={c} />
  </mesh>
);

const CamRig: React.FC<{f: number}> = ({f}) => {
  const {camera} = useThree();
  const c = camAt(f);
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(...c.look);
    cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 120;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }, [f]);
  return null;
};

// ---------- brazos de manguera con guantes ----------
const L1 = 1.05, L2 = 1.05;
function ik(S: THREE.Vector3, Tg: THREE.Vector3, pole: THREE.Vector3) {
  const d0 = Tg.clone().sub(S);
  const dir = d0.clone().normalize();
  const d = Math.min(Math.max(d0.length(), 0.3), L1 + L2 - 0.02);
  const hand = S.clone().add(dir.clone().multiplyScalar(d));
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
  if (p.lengthSq() < 1e-6) p.set(0, 0, -1);
  p.normalize();
  return {elbow: S.clone().add(dir.clone().multiplyScalar(a)).add(p.multiplyScalar(h)), hand};
}
const ARM = '#ffe2a0';
const Arm: React.FC<{S: THREE.Vector3; Tg: THREE.Vector3; pole: THREE.Vector3; side: number}> = ({S, Tg, pole, side}) => {
  const {elbow, hand} = ik(S, Tg, pole);
  const key = [S, elbow, hand].map((v) => v.toArray().map((n) => n.toFixed(4)).join(',')).join('|');
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([S, S.clone().lerp(elbow, 0.5), elbow, elbow.clone().lerp(hand, 0.5), hand]);
    return new THREE.TubeGeometry(curve, 32, 0.068, 10);
  }, [key]);
  useEffect(() => () => geo.dispose(), [geo]);
  const dir = hand.clone().sub(elbow).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <group>
      <mesh geometry={geo} castShadow><Toon c={ARM} /></mesh>
      <Ball p={[S.x, S.y, S.z]} s={0.08} c={ARM} />
      <group position={hand} quaternion={q}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.1, 0.045, 10, 20]} /><Toon c="#ffffff" /></mesh>
        <Ball p={[0, 0.15, 0]} s={[0.19, 0.17, 0.14]} c="#ffffff" />
        <Ball p={[side * 0.15, 0.1, 0.05]} s={[0.075, 0.1, 0.075]} c="#ffffff" />
        {[-0.08, 0, 0.08].map((x, i) => (
          <mesh key={i} position={[x, 0.31 - Math.abs(x) * 0.4, 0]} castShadow>
            <capsuleGeometry args={[0.052, 0.08, 4, 10]} /><Toon c="#ffffff" />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---------- teléfono ----------
const W = 0.8, H = 1.5, D = 0.16;
function rrect(w: number, h: number, r: number, x0: number, y0: number) {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}
const BODY_GEO = new THREE.ExtrudeGeometry(rrect(W, H, 0.15, -W / 2, 0), {depth: D, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 4, curveSegments: 10});
const SW = W - 0.09, SH = H - 0.12;
const SCREEN_GEO = (() => {
  const g = new THREE.ShapeGeometry(rrect(SW, SH, 0.11, -SW / 2, 0.06), 10);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + SW / 2) / SW, (p.getY(i) - 0.06) / SH);
  return g;
})();

const PhoneMesh: React.FC<{ph: Phone; f: number}> = ({ph, f}) => {
  const {cv, tex} = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = FW; c.height = FH;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return {cv: c, tex: t};
  }, []);
  drawFace(cv.getContext('2d')!, ph, f);
  tex.needsUpdate = true;
  const q = new THREE.Euler((-ph.lay * Math.PI) / 2, ph.yaw, ph.lean, 'ZYX');
  const sx = 1 / Math.sqrt(Math.max(ph.sq, 0.3));
  const quat = new THREE.Quaternion().setFromEuler(q);
  const inv = new THREE.Matrix4().compose(new THREE.Vector3(...ph.pos), quat, new THREE.Vector3(1, 1, 1)).invert();
  const qi = quat.clone().invert();
  const loc = (v: V) => new THREE.Vector3(...v).applyMatrix4(inv);
  const poleL = (s: number) => {
    const out = new THREE.Vector3(s, 0, 0).applyQuaternion(quat).setY(0).normalize();
    return out.multiplyScalar(0.7).add(new THREE.Vector3(0, 0.8, 0)).applyQuaternion(qi);
  };
  const shY = 0.74 * ph.sq;
  const shL = new THREE.Vector3(-0.44 * sx, shY, 0.08), shR = new THREE.Vector3(0.44 * sx, shY, 0.08);
  const lightCol = new THREE.Color('#7fc8ff').lerp(new THREE.Color('#ff3a2e'), ph.anger);
  const scr = new THREE.Color(1.18, 1.18, 1.18);
  return (
    <group position={ph.pos} rotation={q}>
      <group scale={[sx, ph.sq, sx]}>
        <mesh geometry={BODY_GEO} castShadow receiveShadow><Toon c="#ff6f2c" /></mesh>
        <mesh geometry={SCREEN_GEO} position={[0, 0, D + 0.037]}>
          <meshBasicMaterial map={tex} color={scr} />
        </mesh>
        {/* botones laterales */}
        <Box p={[W / 2 + 0.03, 1.08, D / 2]} s={[0.05, 0.22, 0.07]} r={0.02} c="#d9551d" />
        <Box p={[-W / 2 - 0.03, 1.12, D / 2]} s={[0.05, 0.14, 0.07]} r={0.02} c="#d9551d" />
        <Box p={[-W / 2 - 0.03, 0.92, D / 2]} s={[0.05, 0.14, 0.07]} r={0.02} c="#d9551d" />
        {/* cámara trasera */}
        <Box p={[-0.17, 1.24, -0.05]} s={[0.32, 0.32, 0.06]} r={0.07} c="#2a1c2e" />
        <Ball p={[-0.24, 1.31, -0.085]} s={[0.065, 0.065, 0.02]} c="#0c0c18" />
        <Ball p={[-0.1, 1.17, -0.085]} s={[0.065, 0.065, 0.02]} c="#0c0c18" />
        <pointLight position={[0, 0.85, 0.8]} color={lightCol} intensity={Math.min(ph.glow, 1.5) * 5} distance={7} decay={2} />
      </group>
      <Arm S={shL} Tg={loc(ph.hL)} pole={poleL(-1)} side={-1} />
      <Arm S={shR} Tg={loc(ph.hR)} pole={poleL(1)} side={1} />
    </group>
  );
};

// ---------- efectos: polvo, Zzz, rayo de luna ----------
const Sprites: React.FC<{f: number}> = ({f}) => {
  const dot = useMemo(() => T.softDot(), []);
  const z = useMemo(() => T.zTex(), []);
  // nubecitas de polvo cuando algo golpea
  const hits = [84, 109, 131, 153, 175, 198, 236, 262, 372];
  const puffs: JSX.Element[] = [];
  for (const h of hits) {
    const age = f - h;
    if (age < 0 || age > 20) continue;
    const p = phoneAt(h).pos;
    const t = age / 20;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + h;
      const r = 0.25 + t * (0.9 + (i % 3) * 0.15);
      puffs.push(
        <sprite key={h * 10 + i} position={[p[0] + Math.cos(ang) * r, p[1] + 0.08 + t * 0.35 + (i % 2) * 0.05, p[2] + Math.sin(ang) * r * 0.7]} scale={[0.25 + t * 0.45, 0.25 + t * 0.45, 1]}>
          <spriteMaterial map={dot} color="#c7cdf0" transparent opacity={0.55 * (1 - t) * (1 - t)} depthWrite={false} />
        </sprite>,
      );
    }
  }
  return (
    <group>
      {puffs}
      {[0, 1, 2].map((i) => {
        const t = ((f + i * 28) % 84) / 84;
        return (
          <sprite key={'z' + i} position={[16.6 + t * 1.4, 5.6 + t * 1.8, -0.6]} scale={[0.55 + t * 0.7, 0.55 + t * 0.7, 1]}>
            <spriteMaterial map={z} transparent opacity={Math.sin(Math.PI * t) * 0.95} depthWrite={false} />
          </sprite>
        );
      })}
    </group>
  );
};

const Motes: React.FC<{f: number}> = ({f}) => {
  const dot = useMemo(() => T.softDot(), []);
  const N = 260;
  const base = useMemo(() => {
    const R = T.rng(21), a: number[] = [];
    for (let i = 0; i < N; i++) {
      const y = R() * 8.5;
      a.push(2.1 + R() * 4.2 + (8.5 - y) * 0.0, y, -4.8 + R() * 6.2, R() * 6.28, 0.3 + R() * 0.7);
    }
    return a;
  }, []);
  const geo = useMemo(() => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)), []);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < N; i++) {
    const [x, y, z, ph, sp] = base.slice(i * 5, i * 5 + 5);
    p.setXYZ(i, x + Math.sin(f * 0.02 * sp + ph) * 0.3, ((y + f * 0.004 * sp) % 8.5) + 0.1, z + Math.cos(f * 0.017 * sp + ph) * 0.3);
  }
  p.needsUpdate = true;
  return (
    <points geometry={geo}>
      <pointsMaterial map={dot} size={0.07} color="#bcd0ff" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
};

// rayo de luz de luna desde la ventana hasta el suelo
const WX0 = 4.2, WX1 = 7.4, WY0 = 4.3, WY1 = 8.5, WZ = -5.1;
const DIR = new THREE.Vector3(-0.25, -1, 0.75);
const toFloor = (x: number, y: number): V => [x + DIR.x * y, 0.015, WZ + DIR.z * y];
const Shaft: React.FC = () => {
  const geo = useMemo(() => {
    const top: V[] = [[WX0, WY1, WZ], [WX1, WY1, WZ], [WX1, WY0, WZ], [WX0, WY0, WZ]];
    const bot = top.map(([x, y]) => toFloor(x, y));
    const pos: number[] = [], col: number[] = [];
    const ct = [0.16, 0.2, 0.32], cb = [0.02, 0.025, 0.05];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      for (const [v, c] of [[top[i], ct], [top[j], ct], [bot[j], cb], [top[i], ct], [bot[j], cb], [bot[i], cb]] as [V, number[]][]) {
        pos.push(...v); col.push(...c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, []);
  const panes = useMemo(() => T.panesTex(), []);
  const floorGeo = useMemo(() => {
    const c = [toFloor(WX0, WY1), toFloor(WX1, WY1), toFloor(WX1, WY0), toFloor(WX0, WY0)];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...c[0], ...c[1], ...c[2], ...c[0], ...c[2], ...c[3]], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0], 2));
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} opacity={0.55} />
      </mesh>
      <mesh geometry={floorGeo}>
        <meshBasicMaterial map={panes} color="#3a4a80" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

// cortina ondulada
const Curtain: React.FC<{x: number}> = ({x}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.5, 5.6, 40, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 13) * 0.09);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[x, 6.2, -4.95]} castShadow receiveShadow>
      <meshToonMaterial color="#1f7480" gradientMap={GRAD} side={THREE.DoubleSide} />
    </mesh>
  );
};

// guirnalda de lucecitas
const FairyLights: React.FC<{x0: number; x1: number; y: number; sag: number; f: number}> = ({x0, x1, y, sag, f}) => {
  const N = 16;
  const pt = (t: number): V => [x0 + (x1 - x0) * t, y - sag * 4 * t * (1 - t), -5.02];
  const wire = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length: 21}, (_, i) => new THREE.Vector3(...pt(i / 20)))), 60, 0.015, 5), []);
  const cols = ['#ffcf6b', '#ff8fb0', '#8fd8ff', '#b6ff8f'];
  return (
    <group>
      <mesh geometry={wire}><meshBasicMaterial color="#141428" /></mesh>
      {Array.from({length: N}, (_, i) => {
        const p = pt((i + 0.5) / N);
        const tw = 1.6 + 0.6 * Math.sin(f * 0.15 + i * 1.7);
        return (
          <mesh key={i} position={[p[0], p[1] - 0.12, p[2] + 0.05]} scale={[0.09, 0.13, 0.09]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color={new THREE.Color(cols[i % 4]).multiplyScalar(tw)} />
          </mesh>
        );
      })}
    </group>
  );
};

const Frame: React.FC<{p: V; w: number; h: number; map: THREE.Texture}> = ({p, w, h, map}) => (
  <group position={p}>
    <Box p={[0, 0, 0]} s={[w + 0.24, h + 0.24, 0.1]} r={0.03} c="#2a1a14" />
    <mesh position={[0, 0, 0.056]}><planeGeometry args={[w, h]} /><Toon map={map} /></mesh>
  </group>
);

// ---------- cuarto ----------
const Room: React.FC<{f: number}> = ({f}) => {
  const tx = useMemo(() => ({
    floor: T.floorTex(), wall: T.wallTex(), wood: T.woodTex('#c98a3d'), dark: T.woodTex('#7a4630'), quilt: T.quiltTex(),
    rug: T.rugTex(), win: T.windowTex(), rocket: T.posterRocket(), mount: T.posterMount(), clock: T.clockTex(),
  }), []);
  const o = ownerAt(f);
  const cable = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, 0.9, -5.0), new THREE.Vector3(-4.0, 0.2, -4.2), new THREE.Vector3(-3.0, 0.045, -2.5),
    new THREE.Vector3(-2.2, 0.045, -0.3), new THREE.Vector3(-1.5, 0.045, 0.4), new THREE.Vector3(-1.0, 0.045, 1.5),
  ]), 60, 0.045, 8), []);
  const BZ = -1.5;
  const lampOn = 1;
  return (
    <group>
      {/* piso, paredes, techo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0, 2]} receiveShadow><planeGeometry args={[60, 30]} /><Toon map={tx.floor} /></mesh>
      <mesh position={[8, 6.5, -5.2]} receiveShadow><planeGeometry args={[60, 13]} /><Toon map={tx.wall} /></mesh>
      <mesh position={[-9, 6.5, 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow><planeGeometry args={[30, 13]} /><Toon map={tx.wall} /></mesh>
      <mesh position={[8, 13, 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[60, 30]} /><meshBasicMaterial color="#161c4a" /></mesh>
      {/* zócalo y friso */}
      <Box p={[8, 1.25, -5.12]} s={[60, 2.5, 0.12]} r={0.02} c="#2c3574" shadow={false} />
      <Box p={[8, 2.55, -5.06]} s={[60, 0.14, 0.22]} r={0.04} c="#e9e1cc" shadow={false} />
      <Box p={[8, 0.16, -5.06]} s={[60, 0.32, 0.2]} r={0.03} c="#e9e1cc" shadow={false} />
      <Box p={[-8.94, 1.25, 2]} s={[0.12, 2.5, 30]} r={0.02} c="#2c3574" shadow={false} />
      <Box p={[-8.9, 2.55, 2]} s={[0.22, 0.14, 30]} r={0.04} c="#e9e1cc" shadow={false} />
      {/* ventana */}
      <mesh position={[5.8, 6.4, -5.17]}><planeGeometry args={[3.2, 4.2]} /><meshBasicMaterial map={tx.win} color={new THREE.Color(1.5, 1.5, 1.5)} /></mesh>
      <Box p={[5.8, 4.2, -5.0]} s={[3.9, 0.22, 0.6]} r={0.05} c="#e9e1cc" />
      <Box p={[5.8, 8.55, -5.08]} s={[3.6, 0.2, 0.25]} r={0.04} c="#e9e1cc" />
      <Box p={[4.1, 6.4, -5.08]} s={[0.2, 4.4, 0.25]} r={0.04} c="#e9e1cc" />
      <Box p={[7.5, 6.4, -5.08]} s={[0.2, 4.4, 0.25]} r={0.04} c="#e9e1cc" />
      <Box p={[5.8, 6.4, -5.1]} s={[0.1, 4.2, 0.16]} r={0.03} c="#e9e1cc" />
      <Box p={[5.8, 6.4, -5.1]} s={[3.2, 0.1, 0.16]} r={0.03} c="#e9e1cc" />
      <mesh position={[5.8, 9.0, -4.9]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 5.2, 10]} /><Toon c="#c9a35a" /></mesh>
      <Curtain x={3.45} />
      <Curtain x={8.15} />
      {/* maceta en la ventana */}
      <Box p={[7.0, 4.55, -4.9]} s={[0.5, 0.5, 0.45]} r={0.08} c="#d0603c" />
      {[[-0.1, 0.45, 0], [0.12, 0.6, 0.05], [0, 0.75, -0.05], [-0.15, 0.68, 0.06]].map(([x, y, z], i) => (
        <Ball key={i} p={[7.0 + x, 4.55 + y, -4.9 + z]} s={[0.2, 0.28, 0.2]} c={i % 2 ? '#3fae5c' : '#2f9050'} />
      ))}
      {/* alfombra */}
      <mesh position={[1.0, 0.012, 1.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[3.4, 64]} /><Toon map={tx.rug} /></mesh>
      {/* cargador abandonado */}
      <mesh geometry={cable} castShadow><Toon c="#f2f2f2" /></mesh>
      <Box p={[-0.95, 0.09, 1.58]} s={[0.2, 0.12, 0.32]} r={0.04} c="#f2f2f2" />
      <Box p={[-4.2, 0.95, -5.08]} s={[0.5, 0.7, 0.08]} r={0.05} c="#efeadc" />
      {/* mesita de noche, lámpara y despertador */}
      <group position={[-2.8, 0, -4.0]}>
        <Box p={[0, 1.15, 0]} s={[2.0, 2.3, 1.5]} r={0.08} c="#ffffff" map={tx.dark} />
        <Box p={[0, 1.6, 0.76]} s={[1.7, 0.7, 0.05]} r={0.03} c="#8a5236" />
        <Box p={[0, 0.75, 0.76]} s={[1.7, 0.7, 0.05]} r={0.03} c="#8a5236" />
        <Ball p={[0, 1.6, 0.82]} s={0.07} c="#e9c46a" />
        <Ball p={[0, 0.75, 0.82]} s={0.07} c="#e9c46a" />
        <mesh position={[-0.4, 2.45, 0]} castShadow><cylinderGeometry args={[0.28, 0.34, 0.2, 20]} /><Toon c="#2d6b73" /></mesh>
        <mesh position={[-0.4, 2.9, 0]}><cylinderGeometry args={[0.05, 0.05, 0.8, 8]} /><Toon c="#c9a35a" /></mesh>
        <mesh position={[-0.4, 3.45, 0]}><cylinderGeometry args={[0.38, 0.58, 0.65, 24, 1, true]} /><Glow c="#ffcf8a" k={1.6 * lampOn} /></mesh>
        <Box p={[0.45, 2.52, 0.2]} s={[0.75, 0.42, 0.32]} r={0.08} c="#2b2b3a" />
        <mesh position={[0.45, 2.53, 0.365]}><planeGeometry args={[0.62, 0.3]} /><meshBasicMaterial map={tx.clock} color={new THREE.Color(2, 2, 2)} /></mesh>
        <Box p={[0.5, 2.35, -0.35]} s={[0.8, 0.14, 0.55]} r={0.02} c="#3a6ea5" />
        <Box p={[0.48, 2.47, -0.36]} s={[0.7, 0.12, 0.5]} r={0.02} c="#d9534f" />
        <pointLight position={[-0.4, 3.3, 0.6]} color="#ffb565" intensity={14} distance={11} decay={2} />
      </group>
      {/* estante con libros y póster */}
      <Box p={[-2.6, 5.2, -4.85]} s={[3.2, 0.14, 0.7]} r={0.03} c="#ffffff" map={tx.dark} />
      {[['#d9534f', 0.85], ['#3a6ea5', 1.0], ['#f0ad4e', 0.75], ['#5cb85c', 0.95], ['#8e5ea2', 0.8], ['#e9e1cc', 0.9]].map(([c, h], i) => (
        <Box key={i} p={[-3.9 + i * 0.26, 5.27 + (h as number) / 2, -4.85]} s={[0.22, h as number, 0.55]} r={0.02} c={c as string} />
      ))}
      <Box p={[-1.95, 5.27 + 0.32, -4.8]} s={[0.55, 0.6, 0.45]} r={0.12} c="#c9e0f0" />
      <Frame p={[-0.4, 6.0, -5.12]} w={2.0} h={2.8} map={tx.rocket} />
      <Frame p={[12.6, 7.0, -5.12]} w={2.8} h={1.95} map={tx.mount} />
      <FairyLights x0={8.6} x1={17.6} y={8.6} sag={0.7} f={f} />
      {/* silla */}
      <Box p={[5.5, 2.475, CHAIR_Z]} s={[2.1, 0.25, 2.1]} r={0.08} c="#ffffff" map={tx.wood} />
      {[[4.65, 1.4], [6.35, 1.4], [4.65, -0.4], [6.35, -0.4]].map(([lx, lz], i) => (
        <Box key={i} p={[lx, 1.18, lz]} s={[0.2, 2.35, 0.2]} r={0.05} c="#e4b07a" map={tx.wood} />
      ))}
      <Box p={[5.5, 1.0, 1.4]} s={[1.5, 0.12, 0.12]} r={0.04} c="#e4b07a" map={tx.wood} />
      <Box p={[4.85, 3.65, -0.45]} s={[0.18, 2.3, 0.18]} r={0.05} c="#e4b07a" map={tx.wood} />
      <Box p={[6.15, 3.65, -0.45]} s={[0.18, 2.3, 0.18]} r={0.05} c="#e4b07a" map={tx.wood} />
      <Box p={[5.5, 4.55, -0.45]} s={[1.8, 0.5, 0.16]} r={0.08} c="#ffffff" map={tx.wood} />
      <Box p={[5.5, 3.55, -0.45]} s={[1.3, 0.14, 0.12]} r={0.04} c="#ffffff" map={tx.wood} />
      {/* sudadera tirada en la silla */}
      <Ball p={[6.0, 2.72, -0.1]} s={[0.55, 0.16, 0.45]} c="#6b5bd6" rot={[0, 0.4, 0.1]} />
      <Ball p={[6.4, 2.6, 0.2]} s={[0.18, 0.12, 0.4]} c="#6b5bd6" rot={[0.3, 0.2, 0]} />
      {/* cama */}
      <Box p={[12.9, 1.45, BZ]} s={[10.3, 2.0, 7.0]} r={0.15} c="#ffffff" map={tx.dark} />
      <Box p={[12.9, 2.85, BZ]} s={[10.0, 0.85, 6.8]} r={0.3} c="#f3eee3" />
      <Box p={[18.15, 3.9, BZ]} s={[0.5, 3.8, 7.2]} r={0.2} c="#ffffff" map={tx.dark} />
      <Box p={[16.4, 3.55, BZ + 1.2]} s={[2.6, 0.7, 2.6]} r={0.32} c="#ffffff" />
      <Box p={[16.7, 3.6, BZ - 1.6]} s={[2.4, 0.75, 2.4]} r={0.32} c="#d8e4ff" />
      {/* cobija con el dueño debajo */}
      <group position={[11.6, 3.25, BZ + 0.2]} scale={[1, 1 + 0.05 * o.breath, 1 + 0.03 * o.breath]}>
        <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1.25]} castShadow receiveShadow>
          <capsuleGeometry args={[1.25, 5.4, 10, 28]} />
          <Toon map={tx.quilt} />
        </mesh>
      </group>
      <Box p={[11.0, 3.3, BZ + 1.95]} s={[7.6, 0.9, 0.25]} r={0.12} c="#e6a83c" />
      {/* brazo del dueño fuera de la cobija */}
      <mesh position={[14.2, 4.45, BZ + 1.05]} rotation={[0.2, 0, 1.25]} castShadow><capsuleGeometry args={[0.28, 1.5, 8, 16]} /><Toon c="#4f7fd1" /></mesh>
      <Ball p={[13.3, 4.15, BZ + 1.2]} s={[0.3, 0.24, 0.3]} c="#f1c7a0" />
      {/* calcetines */}
      {[-0.55, 0.65].map((dz, i) => (
        <group key={i} position={[8.25, 3.9, BZ + 0.2 + dz]} rotation={[0, 0, 0.3 - i * 0.1]}>
          <Box p={[0, 0, 0]} s={[0.55, 0.62, 0.62]} r={0.22} c="#ffffff" />
          <Box p={[0, 0.2, 0]} s={[0.58, 0.14, 0.65]} r={0.06} c="#d63f3f" />
          <Box p={[0, -0.05, 0]} s={[0.58, 0.12, 0.65]} r={0.05} c="#d63f3f" />
        </group>
      ))}
      {/* cabeza del dueño con gorro de dormir */}
      <group position={[16.25, 4.6, BZ + 0.25]} rotation={[0, 0.25, 0]} scale={[1, 1 + 0.02 * o.breath, 1]}>
        <Ball p={[0, 0, 0]} s={[0.98, 0.95, 0.92]} c="#f1c7a0" />
        <Ball p={[-0.95, 0, 0]} s={[0.2, 0.28, 0.16]} c="#e9b48e" />
        <Ball p={[0.25, 0.4, -0.3]} s={[0.95, 0.72, 0.85]} c="#4a2a1a" />
        <Ball p={[-0.45, 0.72, -0.1]} s={[0.32, 0.2, 0.28]} c="#4a2a1a" />
        <Ball p={[-0.05, 0.8, 0.05]} s={[0.32, 0.2, 0.3]} c="#4a2a1a" />
        <mesh position={[0.45, 0.95, -0.2]} rotation={[0, 0, -1.0]} castShadow><coneGeometry args={[0.75, 1.9, 24]} /><Toon c="#3f6fd8" /></mesh>
        <mesh position={[0.18, 0.62, -0.2]} rotation={[0, 0, -1.0]}><torusGeometry args={[0.72, 0.12, 10, 30]} /><Toon c="#ffffff" /></mesh>
        <Ball p={[1.4, 1.6, -0.2]} s={0.24} c="#ffffff" />
        {[-0.36, 0.36].map((x, i) => (
          <group key={i}>
            <mesh position={[x, 0.12, 0.86]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.15, 0.035, 8, 16, Math.PI]} /><meshBasicMaterial color="#2a1a14" /></mesh>
            <Box p={[x, 0.42, 0.82]} s={[0.32, 0.07, 0.07]} r={0.03} c="#3a2418" rot={[0, 0, x > 0 ? 0.15 : -0.15]} />
            <Ball p={[x * 1.5, -0.12, 0.78]} s={[0.17, 0.1, 0.05]} c="#f09a96" />
          </group>
        ))}
        <Ball p={[0, -0.02, 0.95]} s={[0.13, 0.12, 0.1]} c="#e8a98c" />
        <Ball p={[0, -0.4, 0.84]} s={[0.12 + 0.07 * o.mouth, 0.06 + 0.11 * o.mouth, 0.05]} c="#6a1f2a" />
      </group>
      {/* ropa y pantuflas en el suelo */}
      <Ball p={[8.6, 0.2, 3.1]} s={[0.55, 0.2, 0.3]} c="#e888a8" rot={[0, 0.3, 0]} />
      <Ball p={[9.6, 0.2, 2.8]} s={[0.55, 0.2, 0.3]} c="#e888a8" rot={[0, -0.2, 0]} />
      <Ball p={[-2.4, 0.18, 2.4]} s={[0.7, 0.18, 0.5]} c="#3a8f8a" rot={[0, 0.6, 0]} />
      <Ball p={[-1.9, 0.16, 2.9]} s={[0.35, 0.12, 0.6]} c="#3a8f8a" rot={[0, 1.2, 0]} />
    </group>
  );
};

// ---------- postproceso ----------
const PROF: {msaa?: number; sm?: number; nopost?: boolean; q?: number} = getInputProps() as any;
const GRADE_NIGHT: GradeParams = {
  ky: [0, 0.085, 0.25, 0.54, 0.81, 0.94, 1],
  sat: [1.05, 1.15, 1.08],
  tintS: [0.03, 0.0], tintM: [0.005, 0.0], tintH: [-0.015, 0.012],
  vig: [0.32, 0.35],
};
const fwd = new THREE.Vector3();
const Post: React.FC<{f: number; focus: THREE.Vector3; dof: number}> = ({f, focus, dof}) => {
  const {camera, scene} = useThree();
  const fx = useMemo(() => {
    const b = new BloomEffect({blendFunction: BlendFunction.ADD, intensity: 0.7, luminanceThreshold: 0.95, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.65});
    return {
      ink: new InkPass(scene, camera as THREE.PerspectiveCamera, {widthNear: 4.4, widthFar: 2.6, distNear: 3, distFar: 30}),
      lens: new LensBlur({maxCoC: 24, nearScale: 1.2, q: PROF.q ?? 0.5}),
      bloom: b,
      tone: new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}),
      grade: new GradeEffect(GRADE_NIGHT, 1),
    };
  }, [camera, scene]);
  noInkFallback(scene);
  const cam = camera as THREE.PerspectiveCamera;
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, focus.clone().sub(cam.position).dot(fwd));
  fx.lens.cInf = dof;
  // children estables: EffectComposer reconstruye (y recompila) todos los pases si cambian
  const kids = useMemo(() => [
    <primitive key="ink" object={fx.ink} dispose={null} />,
    <primitive key="lp" object={fx.lens.pre} dispose={null} />,
    <primitive key="lm" object={fx.lens.main} dispose={null} />,
    <primitive key="bl" object={fx.bloom} dispose={null} />,
    <primitive key="tn" object={fx.tone} dispose={null} />,
    <primitive key="gr" object={fx.grade} dispose={null} />,
  ], [fx]);
  return <EffectComposer multisampling={PROF.msaa ?? 2}>{kids}</EffectComposer>;
};

const World: React.FC = () => {
  const f = useCurrentFrame();
  // frameloop="never": un solo render por cuadro, después de todos los useLayoutEffect de los hijos
  const advance = useThree((st) => st.advance);
  useLayoutEffect(() => { advance(f * (1000 / 30)); });
  const ph = phoneAt(f);
  const c = camAt(f);
  const focus = c.focus === 'owner' ? new THREE.Vector3(16.2, 4.6, -1.0) : new THREE.Vector3(ph.pos[0], ph.pos[1] + 0.8 * ph.sq, ph.pos[2]);
  return (
    <>
      <color attach="background" args={['#161c4a']} />
      <CamRig f={f} />
      <ambientLight color="#4d57a8" intensity={0.75} />
      <hemisphereLight args={['#7f8fe0', '#3a2440', 1.0]} />
      <directionalLight position={[-5, 9, 12]} color="#8a9cf0" intensity={0.9} />
      <directionalLight position={[6.5, 10, -7.5]} color="#a8c2ff" intensity={2.3} castShadow
        shadow-mapSize={[PROF.sm ?? 4096, PROF.sm ?? 4096]} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={45}
        shadow-bias={-0.0005} shadow-normalBias={0.03} />
      <pointLight position={[12, 7.6, -3.5]} color="#ffbe7a" intensity={22} distance={14} decay={2} />
      <Room f={f} />
      <Shaft />
      <Motes f={f} />
      <Sprites f={f} />
      <PhoneMesh ph={ph} f={f} />
      {PROF.nopost ? null : <Post f={f} focus={focus} dof={c.dof} />}
    </>
  );
};

// líneas de velocidad en el salto
const SpeedLines: React.FC<{f: number}> = ({f}) => {
  if (f < 372) return null;
  const k = Math.min(1, (f - 372) / 6);
  const R = T.rng(Math.floor(f / 2) * 7 + 1);
  const lines = Array.from({length: 34}, () => {
    const a = R() * Math.PI * 2, r0 = 0.55 + R() * 0.2, len = 0.25 + R() * 0.35, w = 2 + R() * 5;
    const cx = 0.6, cy = 0.38;
    return {x1: cx + Math.cos(a) * r0 * 1.2, y1: cy + Math.sin(a) * r0 * 1.8, x2: cx + Math.cos(a) * (r0 + len) * 1.2, y2: cy + Math.sin(a) * (r0 + len) * 1.8, w};
  });
  return (
    <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.42 * k}}>
      {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#ffffff" strokeWidth={l.w / 1080} strokeLinecap="round" />)}
    </svg>
  );
};

export const Scene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#161c4a'}}>
      <ThreeCanvas frameloop="never" width={1080} height={1920} shadows gl={{antialias: false, stencil: false, toneMappingExposure: 1.0}} camera={{fov: 50, position: [0, 2, 8], near: 0.05, far: 120}}>
        <World />
      </ThreeCanvas>
      <SpeedLines f={f} />
    </AbsoluteFill>
  );
};
