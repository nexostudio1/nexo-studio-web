import React, {useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {EffectComposer} from '@react-three/postprocessing';
import {BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {AG, CO, PK, camAt, posesAt, Pose, ringing, ramp, shotAt, V3} from './anim';
import {InkPass, noInkFallback, NOINK} from './ink';
import {LensBlur} from './lensblur';
import {GradeEffect, GradeParams, GRADE_DAY2} from './grade';
import * as T from './tex';
import {Pen, bodyFront, Outfit, Expr, ArmPose, SKIN} from './toon';

type V = [number, number, number];
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const Toon: React.FC<{c?: string; map?: THREE.Texture}> = ({c = '#ffffff', map}) => <meshToonMaterial color={c} map={map ?? null} gradientMap={GRAD} />;
const Glow: React.FC<{c: string; k?: number; map?: THREE.Texture}> = ({c, k = 1, map}) => <meshBasicMaterial color={new THREE.Color(c).multiplyScalar(k)} map={map ?? null} toneMapped={false} />;
const RB = new Map<string, THREE.BufferGeometry>();
const rbox = (w: number, h: number, d: number, r: number) => {
  const key = [w, h, d, r].join(',');
  if (!RB.has(key)) RB.set(key, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999));
  return RB.get(key)!;
};
const Box: React.FC<{p: V; s: V; c?: string; r?: number; rot?: V; map?: THREE.Texture; shadow?: boolean}> = ({p, s, c, r = 0.02, rot = [0, 0, 0], map, shadow = true}) => (
  <mesh position={p} rotation={rot} geometry={rbox(s[0], s[1], s[2], r)} castShadow={shadow} receiveShadow><Toon c={c} map={map} /></mesh>
);
const Ball: React.FC<{p: V; s: V | number; c: string}> = ({p, s, c}) => (
  <mesh position={p} scale={typeof s === 'number' ? [s, s, s] : s} castShadow receiveShadow><sphereGeometry args={[1, 24, 16]} /><Toon c={c} /></mesh>
);
const Plane: React.FC<{p: V; s: [number, number]; rot?: V; map?: THREE.Texture; c?: string; glow?: number}> = ({p, s, rot = [0, 0, 0], map, c = '#ffffff', glow}) => (
  <mesh position={p} rotation={rot} receiveShadow={!glow}>
    <planeGeometry args={s} />
    {glow ? <Glow c={c} k={glow} map={map} /> : <Toon c={c} map={map} />}
  </mesh>
);

// ---------- cámara ----------
const CamRig: React.FC<{f: number}> = ({f}) => {
  const {camera} = useThree();
  const c = camAt(f);
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos);
    cam.up.set(Math.sin(c.roll), Math.cos(c.roll), 0);
    cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 150;
    cam.updateProjectionMatrix();
  });
  return null;
};

// ---------- mobiliario ----------
const Chair: React.FC<{p: V; c?: string}> = ({p, c = '#3a3f52'}) => (
  <group position={p}>
    <Box p={[0, 0.46, 0]} s={[0.5, 0.08, 0.48]} c={c} r={0.04} />
    <Box p={[0, 0.85, -0.22]} s={[0.48, 0.62, 0.07]} c={c} r={0.05} />
    <mesh position={[0, 0.24, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.42, 8]} /><Toon c="#8b93a6" /></mesh>
    {[0, 1, 2, 3, 4].map((i) => { const a = (i / 5) * Math.PI * 2; return <Box key={i} p={[Math.cos(a) * 0.2, 0.04, Math.sin(a) * 0.2]} s={[0.36, 0.035, 0.05]} rot={[0, -a, 0]} c="#2b2f3a" />; })}
  </group>
);
/** mesa de oficina: tablero, panel frontal, monitor, teclado y papeles. La silla queda detrás (z −0.75). */
const Desk: React.FC<{p: V; screen: THREE.Texture; top?: string; w?: number; papers?: number; mug?: string; chair?: boolean}> = ({p, screen, top = '#f2f0ea', w = 1.5, papers = 2, mug = '#e8553a', chair = true}) => (
  <group position={p}>
    <Box p={[0, 0.7, 0]} s={[w, 0.05, 0.78]} c={top} />
    <Box p={[0, 0.36, 0.33]} s={[w - 0.06, 0.62, 0.03]} c="#8f98ab" />
    <Box p={[-w / 2 + 0.04, 0.35, 0]} s={[0.04, 0.68, 0.72]} c="#8f98ab" />
    <Box p={[w / 2 - 0.04, 0.35, 0]} s={[0.04, 0.68, 0.72]} c="#8f98ab" />
    <group position={[0.56, 0.73, -0.18]} rotation={[0, -0.6, 0]}>
      <Box p={[0, 0.03, 0]} s={[0.22, 0.02, 0.16]} c="#2b2f3a" />
      <Box p={[0, 0.12, 0]} s={[0.04, 0.18, 0.03]} c="#2b2f3a" />
      <Box p={[0, 0.34, 0]} s={[0.56, 0.36, 0.03]} c="#20232c" />
      <Plane p={[0, 0.34, 0.017]} s={[0.52, 0.32]} map={screen} glow={1.05} />
    </group>
    <Box p={[0, 0.735, 0.1]} s={[0.42, 0.02, 0.14]} c="#e7e9ef" />
    {Array.from({length: papers}, (_, i) => <Box key={i} p={[-0.55 + i * 0.03, 0.74 + i * 0.05, -0.15]} s={[0.24, 0.05, 0.32]} rot={[0, i * 0.12, 0]} c="#fbf8ef" r={0.005} />)}
    <mesh position={[-0.25, 0.78, 0.2]} castShadow><cylinderGeometry args={[0.04, 0.035, 0.1, 14]} /><Toon c={mug} /></mesh>
    {chair && <Chair p={[0, 0, -0.75]} />}
  </group>
);
/** teléfono de mesa; `ring` lo hace saltar */
const DeskPhone: React.FC<{p: V; ring: boolean; f: number; lifted?: boolean}> = ({p, ring, f, lifted}) => {
  const j = ring ? Math.abs(Math.sin(f * 2.2)) * 0.025 : 0, r = ring ? Math.sin(f * 2.2) * 0.12 : 0;
  return (
    <group position={[p[0], p[1] + j, p[2]]} rotation={[0, 0.35, r]}>
      <Box p={[0, 0.04, 0]} s={[0.24, 0.08, 0.2]} c="#e9e4da" r={0.03} />
      <Box p={[0.03, 0.085, 0.02]} s={[0.1, 0.01, 0.1]} c="#30343f" r={0.004} />
      {!lifted && <group position={[-0.06, 0.1, 0]} rotation={[0, 0, 0]}>
        <Box p={[0, 0, 0]} s={[0.05, 0.035, 0.2]} c="#e9e4da" r={0.017} />
        <Box p={[0, -0.01, -0.09]} s={[0.07, 0.05, 0.06]} c="#e9e4da" r={0.02} />
        <Box p={[0, -0.01, 0.09]} s={[0.07, 0.05, 0.06]} c="#e9e4da" r={0.02} />
      </group>}
      <Ball p={[0.1, 0.07, -0.07]} s={0.012} c={ring ? '#ff4b3a' : '#7d2a22'} />
    </group>
  );
};
const Plant: React.FC<{p: V; s?: number}> = ({p, s = 1}) => (
  <group position={p} scale={s}>
    <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.2, 0.15, 0.4, 16]} /><Toon c="#e6dccb" /></mesh>
    <Ball p={[0, 0.7, 0]} s={[0.35, 0.42, 0.35]} c="#3f9b52" />
    <Ball p={[0.18, 0.95, 0.05]} s={0.24} c="#4fb062" />
    <Ball p={[-0.16, 0.9, -0.05]} s={0.22} c="#378a48" />
  </group>
);
const Ceiling: React.FC<{x: number; w: number; d: number; z: number; on: boolean; tex: THREE.Texture}> = ({x, w, d, z, on, tex}) => (
  <group>
    <Plane p={[x, 3.2, z]} s={[w, d]} rot={[Math.PI / 2, 0, 0]} map={tex} />
    {[-1, 1].flatMap((sx) => [-1, 0.5].map((sz) => <Plane key={sx + '_' + sz} p={[x + sx * 2.2, 3.19, z + sz * 2.6]} s={[1.2, 0.6]} rot={[Math.PI / 2, 0, 0]} c={on ? '#ffffff' : '#9aa0b0'} glow={on ? 1.6 : 0.4} />))}
  </group>
);
const Window: React.FC<{p: V; w: number; h: number; tex: THREE.Texture; rot?: V}> = ({p, w, h, tex, rot = [0, 0, 0]}) => (
  <group position={p} rotation={rot}>
    <Plane p={[0, 0, 0]} s={[w, h]} map={tex} glow={1.0} />
    {Array.from({length: Math.round(w / 1.6) + 1}, (_, i) => <Box key={i} p={[-w / 2 + (i * w) / Math.round(w / 1.6), 0, 0.03]} s={[0.08, h, 0.06]} c="#d8dde6" />)}
    <Box p={[0, h / 2, 0.03]} s={[w, 0.1, 0.08]} c="#d8dde6" />
    <Box p={[0, -h / 2, 0.06]} s={[w + 0.1, 0.1, 0.18]} c="#d8dde6" />
  </group>
);

// ---------- la agencia «Ya no puedo más» ----------
const Agency: React.FC<{f: number; night: boolean; tx: Tx}> = ({f, night, tx}) => {
  const ring = ringing(f);
  return (
    <group>
      <Plane p={[AG, 0, -0.5]} s={[12, 11]} rot={[-Math.PI / 2, 0, 0]} map={tx.carpetAg} />
      <Plane p={[AG, 1.6, -4.6]} s={[12, 3.2]} map={tx.wallAg} />
      <Plane p={[AG + 4.5, 1.6, -0.5]} s={[11, 3.2]} rot={[0, -Math.PI / 2, 0]} map={tx.wallAg} />
      <Plane p={[AG - 4.5, 1.6, -0.5]} s={[11, 3.2]} rot={[0, Math.PI / 2, 0]} map={tx.wallAg} />
      <Box p={[AG, 0.06, -4.57]} s={[12, 0.12, 0.04]} c="#c9542a" />
      <Window p={[AG - 4.47, 1.75, -0.6]} w={6} h={2} tex={night ? tx.skyNight : tx.skyDay} rot={[0, Math.PI / 2, 0]} />
      <Plane p={[AG, 2.35, -4.56]} s={[3.4, 1.7]} map={tx.sign} glow={night ? 0.55 : 1.0} />
      <Ceiling x={AG} w={12} d={11} z={-0.5} on={!night} tex={tx.ceil} />
      <Desk p={[AG, 0, 0]} screen={night ? tx.scrNight : f >= 777 && f < 966 ? tx.scrCalls : tx.scrSheet} papers={night ? 1 : 3} mug="#ff7a2f" />
      <DeskPhone p={[AG - 0.45, 0.725, -0.05]} ring={ring} f={f} />
      {night && <>
        {/* lámpara de mesa + carta en el tablero */}
        <group position={[AG + 0.62, 0.72, -0.2]}>
          <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.08, 0.1, 0.03, 16]} /><Toon c="#2b2f3a" /></mesh>
          <Box p={[0, 0.2, 0]} s={[0.025, 0.36, 0.025]} c="#2b2f3a" />
          <mesh position={[-0.05, 0.4, 0.02]} rotation={[0, 0, 0.6]}><coneGeometry args={[0.1, 0.14, 18, 1, true]} /><Toon c="#ff7a2f" /></mesh>
          <Ball p={[-0.07, 0.36, 0.02]} s={0.03} c="#fff3c8" />
        </group>
        <pointLight position={[AG + 0.5, 1.15, -0.1]} color="#ffbe7a" intensity={6} distance={6} decay={2} />
        <Box p={[AG - 0.05, 0.728, 0.05]} s={[0.24, 0.004, 0.32]} rot={[0, 0.15, 0]} c="#fbf8ef" r={0.002} />
      </>}
      {/* puestos de atrás */}
      {[-2.3, 2.3].map((x) => <React.Fragment key={x}>
        <Desk p={[AG + x, 0, -2.2]} screen={tx.scrSheet} papers={2} mug={x > 0 ? '#3aa06a' : '#2f6fd6'} />
        <DeskPhone p={[AG + x - 0.45, 0.725, -2.25]} ring={false} f={f} lifted={!night && !(f >= 1023 && f < 1077)} />
      </React.Fragment>)}
      {[-2.3, 2.3].map((x) => <Desk key={'f' + x} p={[AG + x, 0, 1.8]} screen={tx.scrNight} papers={0} chair />)}
      <Plant p={[AG + 3.8, 0, -4]} s={1.1} />
      <Plant p={[AG - 3.9, 0, -3.9]} s={0.9} />
      {/* dispensador de agua */}
      <group position={[AG + 3.9, 0, -1.5]}>
        <Box p={[0, 0.5, 0]} s={[0.36, 1.0, 0.36]} c="#e9ecf2" r={0.04} />
        <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.15, 0.15, 0.42, 18]} /><meshToonMaterial color="#8fd0ff" gradientMap={GRAD} transparent opacity={0.85} /></mesh>
      </group>
    </group>
  );
};

// ---------- la empresa de Kenji ----------
const Company: React.FC<{f: number; tx: Tx}> = ({f, tx}) => {
  const bossPhoneRing = f >= 432 && f < 447;
  const lifted = f >= 447 && f < 623 && !(f >= 536 && f < 600);
  return (
    <group>
      <Plane p={[CO, 0, -1]} s={[14, 13]} rot={[-Math.PI / 2, 0, 0]} map={tx.carpetCo} />
      <Window p={[CO + 1.5, 1.75, -5.5]} w={11} h={2.3} tex={tx.skyDay} />
      <Plane p={[CO, 1.6, -5.52]} s={[14, 3.2]} c="#eef0f4" />
      <Plane p={[CO - 5, 1.6, -1]} s={[13, 3.2]} rot={[0, Math.PI / 2, 0]} map={tx.wallCo} />
      <Plane p={[CO + 6.8, 1.6, -1]} s={[13, 3.2]} rot={[0, -Math.PI / 2, 0]} map={tx.wallCo} />
      <Plane p={[CO, 1.6, 4.6]} s={[14, 3.2]} rot={[0, Math.PI, 0]} map={tx.wallCo} />
      <Ceiling x={CO} w={14} d={13} z={-1} on tex={tx.ceil} />
      <Plane p={[CO - 4.97, 1.8, -2.2]} s={[0.9, 1.25]} rot={[0, Math.PI / 2, 0]} map={tx.poster} />
      <group position={[CO - 4.95, 1.55, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <Box p={[0, 0, -0.02]} s={[1.9, 1.2, 0.04]} c="#d8dde6" />
        <Plane p={[0, 0, 0.005]} s={[1.8, 1.1]} map={tx.chart} />
      </group>
      <Plane p={[CO + 6.77, 1.7, -1.6]} s={[0.7, 0.8]} rot={[0, -Math.PI / 2, 0]} map={tx.calendar} />
      {/* Kenji y compañeros */}
      <Desk p={[CO, 0, 0]} screen={f >= 623 ? tx.scrNight : tx.scrSheet} papers={4} mug="#2f6fd6" />
      <Desk p={[CO - 2.3, 0, 0]} screen={tx.scrSheet} papers={3} mug="#3aa06a" />
      <Desk p={[CO + 2.3, 0, 0]} screen={tx.scrSheet} papers={2} mug="#c0353a" />
      <Desk p={[CO - 2.3, 0, 2.2]} screen={tx.scrNight} papers={1} />
      <Desk p={[CO + 2.3, 0, 2.2]} screen={tx.scrNight} papers={1} />
      <Desk p={[CO - 2.3, 0, -2.2]} screen={tx.scrSheet} papers={2} />
      {/* jefe: mesa grande de madera junto a la ventana */}
      <group position={[CO + 3.5, 0, -3.5]}>
        <Box p={[0, 0.72, 0]} s={[2.0, 0.07, 0.95]} c="#8a5532" />
        <Box p={[0, 0.37, 0.42]} s={[1.96, 0.68, 0.05]} c="#6e4026" />
        <Box p={[-0.95, 0.37, 0]} s={[0.06, 0.68, 0.9]} c="#6e4026" />
        <Box p={[0.95, 0.37, 0]} s={[0.06, 0.68, 0.9]} c="#6e4026" />
        <Plane p={[0, 0.85, 0.37]} s={[0.36, 0.09]} map={tx.plate} rot={[-0.3, 0, 0]} />
        <Box p={[0.6, 0.8, -0.1]} s={[0.3, 0.1, 0.36]} c="#fbf8ef" r={0.005} />
        <Chair p={[0, 0, -0.62]} c="#2b2230" />
      </group>
      <DeskPhone p={[CO + 2.95, 0.755, -3.3]} ring={bossPhoneRing} f={f} lifted={lifted} />
      <Plant p={[CO + 6.2, 0, -5]} s={1.2} />
      <Plant p={[CO - 4.4, 0, -4.9]} s={1.0} />
      {/* fotocopiadora y estantería */}
      <Box p={[CO - 4.4, 0.55, -2.9]} s={[0.8, 1.1, 0.7]} c="#e3e6ec" r={0.05} />
      <group position={[CO + 6.4, 0, 1.5]}>
        <Box p={[0, 0.9, 0]} s={[0.5, 1.8, 1.4]} c="#c9cfdb" />
        {[0.4, 0.9, 1.4].map((y) => [-0.45, -0.15, 0.15, 0.45].map((z, i) => <Box key={y + '_' + z} p={[-0.1, y, z]} s={[0.35, 0.36, 0.1 + (i % 2) * 0.04]} c={['#2f6fd6', '#e8553a', '#3aa06a', '#f2b33d'][(i + Math.round(y * 2)) % 4]} />))}
      </group>
    </group>
  );
};

// ---------- el parque ----------
const Park: React.FC<{f: number; tx: Tx}> = ({f, tx}) => {
  const petals = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(160 * 3), 3)); return g;
  }, []);
  const R = T.rng(9), p = petals.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < 160; i++) {
    const x0 = PK - 3 + R() * 6, y0 = R() * 4, z0 = -3 + R() * 5, sp = 0.6 + R() * 0.8;
    p.setXYZ(i, x0 + Math.sin(f * 0.05 * sp + i) * 0.3 + f * 0.004, 4 - ((y0 + f * 0.012 * sp) % 4), z0 + Math.cos(f * 0.04 + i) * 0.2);
  }
  p.needsUpdate = true;
  return (
    <group>
      <Plane p={[PK, 0, -4]} s={[40, 30]} rot={[-Math.PI / 2, 0, 0]} map={tx.grass} />
      <Plane p={[PK, 6, -14]} s={[40, 16]} map={tx.parkSky} glow={1} />
      <Plane p={[PK, 0.005, 0.2]} s={[1.6, 30]} rot={[-Math.PI / 2, 0, 0.25]} c="#e6d3a8" />
      {[[-2.4, -2.6], [2.6, -3.4], [-4.5, -6], [5, -7], [0.6, -8]].map(([x, z], i) => (
        <group key={i} position={[PK + x, 0, z]}>
          <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.14, 0.2, 1.8, 10]} /><Toon c="#6b4630" /></mesh>
          <Ball p={[0, 2.4, 0]} s={[1.3, 1.0, 1.2]} c="#ffb7cf" />
          <Ball p={[0.8, 2.1, 0.2]} s={0.8} c="#ffc8da" />
          <Ball p={[-0.8, 2.2, -0.1]} s={0.85} c="#f7a3c0" />
          <Ball p={[0.1, 3.0, 0.1]} s={0.75} c="#ffd0e0" />
        </group>
      ))}
      <group position={[PK + 1.5, 0, -1.4]} rotation={[0, -0.3, 0]}>
        <Box p={[0, 0.45, 0]} s={[1.5, 0.06, 0.42]} c="#b06a3a" />
        <Box p={[0, 0.75, -0.2]} s={[1.5, 0.3, 0.05]} c="#b06a3a" />
        {[-0.65, 0.65].map((x) => <Box key={x} p={[x, 0.22, 0]} s={[0.06, 0.45, 0.4]} c="#3a3f52" />)}
      </group>
      <points geometry={petals}><pointsMaterial map={tx.petal} size={0.09} transparent alphaTest={0.4} depthWrite={false} sizeAttenuation /></points>
    </group>
  );
};

// ---------- personajes (tarjetas 2D dibujadas cada cuadro) ----------
const OUTFIT: Record<Pose['who'], Outfit> = {
  sato: {jacket: '#f4f1ea', vest: '#ff7a2f', pants: '#3b3f52', boots: '#2b2b33', hat: 'hair', hair: '#2b2230', headset: true, buttons: '#d9dde0'},
  kenji: {jacket: '#e4ecfa', tie: '#2f6fd6', glasses: true, pants: '#2f3442', boots: '#2b2b33', hat: 'hair', hair: '#1f1a24', skin: '#f5c9a0', buttons: '#c9d3e6'},
  boss: {jacket: '#5d6577', tie: '#c0353a', pants: '#3f4554', boots: '#1f1f26', hat: null, moustache: '#2b2230', skin: '#ecd0b6', build: 'stout', buttons: '#3f4554'},
  c1: {jacket: '#ffffff', tie: '#3aa06a', pants: '#3b3f52', boots: '#2b2b33', hat: 'hair', hair: '#4a3020', buttons: '#d9dde0'},
  c2: {jacket: '#f6e2ec', pants: '#4a3f5e', boots: '#2b2b33', hat: 'hair', hair: '#2b2230', skin: '#ffe2c2', buttons: '#e3c3d3'},
  c3: {jacket: '#dfe8e0', tie: '#8a5ac9', pants: '#3b3f52', boots: '#2b2b33', hat: 'hair', hair: '#1f1a24', skin: '#ecd0b6', buttons: '#c3d0c5'},
  a1: {jacket: '#f4f1ea', vest: '#ff7a2f', pants: '#3b3f52', boots: '#2b2b33', hat: 'hair', hair: '#5a3b2a', headset: true, buttons: '#d9dde0'},
  a2: {jacket: '#f4f1ea', vest: '#ff7a2f', pants: '#3b3f52', boots: '#2b2b33', hat: 'hair', hair: '#1f1a24', headset: true, skin: '#f5c9a0', buttons: '#d9dde0'},
};
const SEED: Record<string, number> = {sato: 3, kenji: 11, boss: 5, c1: 21, c2: 8, c3: 14, a1: 17, a2: 29, a3: 33};
const CK = 2; // resolución del lienzo: 600x1000 unidades → 1200x2000 px
const SU = 0.00216; // metros por unidad
type Card = {cv: HTMLCanvasElement; tex: THREE.CanvasTexture};
const CARDS = new Map<string, Card>();
const cardFor = (id: string): Card => {
  if (!CARDS.has(id)) {
    const cv = document.createElement('canvas'); cv.width = 600 * CK; cv.height = 1000 * CK;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    CARDS.set(id, {cv, tex});
  }
  return CARDS.get(id)!;
};
const CARD_GEO = new THREE.PlaneGeometry(600 * SU, 1000 * SU).translate(0, 500 * SU, 0);
const BLOB_GEO = new THREE.CircleGeometry(0.32, 24).rotateX(-Math.PI / 2);

const CharCard: React.FC<{ps: Pose; cam: V3; night: boolean}> = ({ps, cam, night}) => {
  const {cv, tex} = cardFor(ps.id);
  const g = cv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(CK, 0, 0, CK, 0, 0);
  const pen = new Pen(g);
  const o: Outfit = {...OUTFIT[ps.who], flush: ps.flush ?? 0};
  bodyFront(pen, o, {mode: ps.mode, expr: ps.expr as Expr, arm: ps.arm as ArmPose | undefined, t: ps.t, look: ps.look ?? 0, blink: ps.blink ?? 0,
    tilt: ps.tilt ?? 0, headTilt: ps.headTilt ?? 0, seed: SEED[ps.id] ?? 1, light: (-125 * Math.PI) / 180});
  tex.needsUpdate = true;
  const yaw = Math.atan2(cam[0] - ps.pos[0], cam[2] - ps.pos[2]);
  const tint = night ? new THREE.Color(0.62, 0.62, 0.86) : new THREE.Color(1, 1, 1);
  const s = ps.scale ?? 1;
  return (
    <group position={ps.pos}>
      <mesh geometry={CARD_GEO} rotation={[0, yaw, 0]} scale={[s, s, s]} layers={NOINK} renderOrder={2}>
        <meshBasicMaterial map={tex} color={tint} alphaTest={0.5} side={THREE.DoubleSide} />
      </mesh>
      {ps.mode === 'stand' && <mesh geometry={BLOB_GEO} position={[0, 0.006, 0]} layers={NOINK}>
        <meshBasicMaterial color="#000018" transparent opacity={0.28} depthWrite={false} />
      </mesh>}
    </group>
  );
};

// cactus de Kenji con cara (tarjeta 2D)
const Cactus: React.FC<{f: number; cam: V3; tx: Tx}> = ({f, cam, tx}) => {
  const p: V = [CO - 0.62, 0.725, 0.12];
  const yaw = Math.atan2(cam[0] - p[0], cam[2] - p[2]);
  const sad = f >= 623 && f < 1225;
  return (
    <group position={p}>
      <mesh rotation={[0, yaw, 0]} layers={NOINK} renderOrder={2}>
        <planeGeometry args={[0.2, 0.3]} />
        <meshBasicMaterial map={sad ? tx.cactusSad : tx.cactus} alphaTest={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
const cactusTex = (sad: boolean) => T.canvasTex(400, 600, (g) => {
  g.setTransform(2, 0, 0, 2, 0, 0);
  const p = new Pen(g); p.ol = 7;
  p.poly([[60, 300], [140, 300], [130, 225], [70, 225]], '#d9663a');
  p.poly([[55, 225], [145, 225], [145, 205], [55, 205]], '#e8774a');
  p.poly([[78, 205], [70, 90], [80, 50], [100, 40], [120, 50], [130, 90], [122, 205]], '#4fae5a');
  p.poly([[124, 140], [150, 135], [158, 110], [160, 85], [150, 82], [144, 115], [127, 118]], '#4fae5a');
  for (const [x, y] of [[90, 80], [112, 70], [96, 140], [118, 160], [86, 180]]) p.stroke([[x - 4, y - 4], [x + 4, y + 4]], 2.5);
  p.dot(90, 110, 5); p.dot(112, 110, 5);
  if (sad) { p.arc(101, 138, 9, 6, 200, 340, 3.5); p.ell(122, 100, 3.5, 5.5, '#9fd4ff', 2); }
  else p.arc(101, 122, 9, 6, 20, 160, 3.5);
});

// ---------- efectos 2D en el mundo ----------
const Fx: React.FC<{p: V; map: THREE.Texture; s: number; o?: number; rot?: number}> = ({p, map, s, o = 1, rot = 0}) => (
  <sprite position={p} scale={[s, s, 1]} layers={NOINK}>
    <spriteMaterial map={map} transparent opacity={o} depthWrite={false} depthTest={false} rotation={rot} />
  </sprite>
);
const Effects: React.FC<{f: number; tx: Tx}> = ({f, tx}) => {
  const out: React.ReactNode[] = [];
  const pulse = (a: number) => 0.85 + 0.15 * Math.sin(f * 1.6 + a);
  if (ringing(f)) out.push(<Fx key="r1" p={[AG - 0.45, 0.98, -0.05]} map={tx.ring} s={0.42 * pulse(0)} />);
  if (f >= 432 && f < 447) out.push(<Fx key="r2" p={[CO + 2.95, 1.0, -3.3]} map={tx.ring} s={0.5 * pulse(1)} />);
  if (f >= 476 && f < 506) out.push(<Fx key="sh" p={[CO + 3.12, 1.2, -3.9]} map={tx.shout} s={0.55 * pulse(2)} rot={Math.sin(f) * 0.1} />);
  if (f >= 549 && f < 558) out.push(<Fx key="im" p={[CO + 3.85, 0.8, -3.85]} map={tx.impact} s={0.35 + (f - 549) * 0.04} o={1 - (f - 549) / 9} />);
  if (f >= 968 && f < 1021) {
    out.push(<Fx key="s2" p={[AG + 0.35, 1.25, -0.5]} map={tx.shout} s={0.55 * pulse(3)} rot={-0.6} />);
    out.push(<Fx key="sw" p={[AG - 0.22, 1.38, -0.45]} map={tx.sweat} s={0.08} />);
  }
  if (f >= 220 && f < 262) {
    const R = T.rng(4);
    for (let i = 0; i < 9; i++) {
      const t = (f - 220) / 42, x = CO + 3.3 + (R() - 0.5) * 0.5 + Math.sin(f * 0.2 + i) * 0.05, y = 1.25 - t * (0.4 + R() * 0.3);
      out.push(<Fx key={'pb' + i} p={[x, y, -3.8 + (R() - 0.5) * 0.2]} map={tx.paperBit} s={0.06} rot={f * 0.2 + i} />);
    }
  }
  return <>{out}</>;
};

type Tx = ReturnType<typeof makeTx>;
const makeTx = () => ({
  carpetAg: T.carpetTex('#2f8f8a'), carpetCo: T.carpetTex('#3f63b8'), wallAg: T.wallTex('#f3e6d3'), wallCo: T.wallTex('#f4f5f8'), ceil: T.ceilTex(),
  skyDay: T.skylineTex(false), skyNight: T.skylineTex(true), sign: T.signTex(), scrSheet: T.deskScreen('sheet'), scrCalls: T.deskScreen('calls'),
  scrNight: T.deskScreen('night'), poster: T.posterTex(), chart: T.chartTex(), calendar: T.calendarTex(), plate: T.nameplate('部長'),
  grass: T.grassTex(), parkSky: T.parkSky(), petal: T.petalTex(), ring: T.ringFx(), shout: T.shoutFx(), impact: T.impactFx(),
  paperBit: T.paperBitTex(), sweat: T.sweatTex(), cactus: cactusTex(false), cactusSad: cactusTex(true),
});

// ---------- postproceso ----------
const GRADE_NIGHT: GradeParams = {ky: [0, 0.085, 0.25, 0.54, 0.81, 0.94, 1], sat: [1.05, 1.15, 1.08], tintS: [0.03, 0], tintM: [0.005, 0], tintH: [-0.015, 0.012], vig: [0.32, 0.35]};
const GRADE_OFFICE: GradeParams = {...GRADE_DAY2, sat: [1.04, 1.1, 1.04], vig: [0.16, 0.42]};
const fwd = new THREE.Vector3();
const Post: React.FC<{focus: V3; dof: number; night: boolean; cpos: V3; clook: V3}> = ({focus, dof, night, cpos, clook}) => {
  const {camera, scene} = useThree();
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera, {widthNear: 4.6, widthFar: 2.8, distNear: 2, distFar: 20}),
    lens: new LensBlur({maxCoC: 24, nearScale: 1.2, q: 0.5}),
    bloom: new BloomEffect({blendFunction: BlendFunction.ADD, intensity: 0.45, luminanceThreshold: 0.95, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.6}),
    tone: new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}),
    grade: new GradeEffect(GRADE_OFFICE, 1),
  }), [camera, scene]);
  noInkFallback(scene);
  // la cámara de este cuadro (CamRig la coloca después, en su useLayoutEffect)
  const cp = new THREE.Vector3(...cpos);
  fwd.set(...clook).sub(cp).normalize();
  fx.lens.focus = Math.max(0.3, new THREE.Vector3(...focus).sub(cp).dot(fwd));
  fx.lens.cInf = dof;
  fx.grade.set(night ? GRADE_NIGHT : GRADE_OFFICE);
  // hijos estables: EffectComposer reconstruye todos los pases si cambian
  const kids = useMemo(() => [
    <primitive key="ink" object={fx.ink} dispose={null} />, <primitive key="lp" object={fx.lens.pre} dispose={null} />,
    <primitive key="lm" object={fx.lens.main} dispose={null} />, <primitive key="bl" object={fx.bloom} dispose={null} />,
    <primitive key="tn" object={fx.tone} dispose={null} />, <primitive key="gr" object={fx.grade} dispose={null} />,
  ], [fx]);
  return <EffectComposer multisampling={2}>{kids}</EffectComposer>;
};

const World: React.FC = () => {
  const f = useCurrentFrame();
  const c = camAt(f), s = c.shot, night = !!s.night;
  const tx = useMemo(makeTx, []);
  const advance = useThree((st) => st.advance);
  useLayoutEffect(() => { advance(f * (1000 / 30)); }); // frameloop="never": un render por cuadro
  const poses = posesAt(f);
  const sunX = s.loc === 'ag' ? AG - 9 : s.loc === 'co' ? CO + 4 : PK + 6;
  const sunZ = s.loc === 'ag' ? -1 : s.loc === 'co' ? -12 : 6;
  return (
    <>
      <color attach="background" args={[night ? '#0d1236' : '#bcd6f2']} />
      <CamRig f={f} />
      <ambientLight color={night ? '#4a55a8' : '#ffffff'} intensity={night ? 0.55 : 1.15} />
      <hemisphereLight args={[night ? '#6c7fd8' : '#e8f1ff', night ? '#2a2040' : '#9a8f86', night ? 0.6 : 0.9]} />
      <directionalLight position={[sunX, 8, sunZ]} target-position={[s.loc === 'ag' ? AG : s.loc === 'co' ? CO : PK, 0, -1]} color={night ? '#8a9cf0' : '#fff2dc'}
        intensity={night ? 0.5 : 1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9}
        shadow-camera-bottom={-9} shadow-camera-near={0.5} shadow-camera-far={40} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[c.pos[0] + 2, 5, c.pos[2] + 6]} color={night ? '#5a6ad0' : '#dfe8ff'} intensity={night ? 0.25 : 0.5} />
      {s.loc === 'ag' && <Agency f={f} night={night} tx={tx} />}
      {s.loc === 'co' && <Company f={f} tx={tx} />}
      {s.loc === 'pk' && <Park f={f} tx={tx} />}
      {s.loc === 'co' && <Cactus f={f} cam={c.pos} tx={tx} />}
      {poses.map((p) => <CharCard key={p.id} ps={p} cam={c.pos} night={night} />)}
      <Effects f={f} tx={tx} />
      <Post focus={s.focus} dof={s.dof} night={night} cpos={c.pos} clook={c.look} />
    </>
  );
};

// ---------- la app en el móvil (inserto 2D) ----------
const AppUI: React.FC<{f: number}> = ({f}) => {
  if (f < 270 || f >= 352) return null;
  const inn = interpolate(f, [270, 282], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out = interpolate(f, [342, 351], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = (1 - inn) * 900 + out * 900, press = f >= 326 && f < 334;
  const done = f >= 334;
  return (
    <div style={{position: 'absolute', left: 250, top: 560 + y, width: 580, height: 1040, borderRadius: 70, background: '#20232c', border: '10px solid #241726',
      boxShadow: '0 30px 80px rgba(0,0,30,0.45)', transform: `rotate(${(1 - inn) * 8 - 3}deg)`, fontFamily: 'sans-serif', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 22, borderRadius: 50, background: 'linear-gradient(#fff6ee, #ffe2cf)', overflow: 'hidden'}}>
        <div style={{height: 300, background: '#ff7a2f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>
          <div style={{fontSize: 30, fontWeight: 700, opacity: 0.9}}>もう無理</div>
          <div style={{fontSize: 66, fontWeight: 900, lineHeight: 1.0, textAlign: 'center'}}>YA NO<br />PUEDO MÁS</div>
        </div>
        <div style={{padding: '40px 40px 0', color: '#3a1a0a'}}>
          <div style={{fontSize: 40, fontWeight: 800}}>Renunciamos por ti</div>
          <div style={{fontSize: 30, marginTop: 18, color: '#7a4a32'}}>✓ Sin hablar con tu jefe<br />✓ Hoy mismo</div>
          <div style={{fontSize: 92, fontWeight: 900, marginTop: 34, color: '#d6332a'}}>¥20.000</div>
        </div>
        <div style={{position: 'absolute', left: 40, right: 40, bottom: 60, height: 120, borderRadius: 60, background: done ? '#3aa06a' : '#ff7a2f',
          color: '#fff', fontSize: 50, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${press ? 0.92 : 1})`,
          border: '6px solid #241726'}}>{done ? '¡CONTRATADO!' : 'CONTRATAR'}</div>
        {f >= 318 && f < 336 && <div style={{position: 'absolute', left: 300, top: 860 - (f < 326 ? (326 - f) * 12 : 0), width: 90, height: 90, borderRadius: 45,
          background: 'rgba(255,255,255,0.7)', border: '6px solid #241726'}} />}
      </div>
    </div>
  );
};

export const Scene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#bcd6f2'}}>
      <ThreeCanvas frameloop="never" width={1080} height={1920} shadows gl={{antialias: false, stencil: false}} camera={{fov: 45, position: [0, 1.5, 4], near: 0.05, far: 150}}>
        <World />
      </ThreeCanvas>
      <AppUI f={f} />
    </AbsoluteFill>
  );
};
