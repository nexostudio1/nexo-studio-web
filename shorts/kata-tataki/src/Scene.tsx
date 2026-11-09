import React, {useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {EffectComposer} from '@react-three/postprocessing';
import {BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {CO, BR, CT, EX, TDESK, SEAT, camAt, focusAt, posesAt, Pose, ramp, shotAt, V3, EVENTS} from './anim';
import {InkPass, noInkFallback, NOINK} from './ink';
import {LensBlur} from './lensblur';
import {GradeEffect, GradeParams, GRADE_DAY2} from './grade';
import * as T from './tex';
import {Pen, bodyFront, Outfit, Expr, ArmPose} from './toon';

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

// ---------- la oficina ----------
const Office: React.FC<{f: number; tx: Tx}> = ({f, tx}) => (
  <group>
    <Plane p={[CO, 0, -1]} s={[14, 13]} rot={[-Math.PI / 2, 0, 0]} map={tx.carpetCo} />
    <Window p={[CO + 1.5, 1.75, -5.5]} w={11} h={2.3} tex={tx.skyDay} />
    <Plane p={[CO, 1.6, -5.52]} s={[14, 3.2]} c="#eef0f4" />
    <Plane p={[CO - 5, 1.6, -1]} s={[13, 3.2]} rot={[0, Math.PI / 2, 0]} map={tx.wallCo} />
    <Plane p={[CO + 6.8, 1.6, -1]} s={[13, 3.2]} rot={[0, -Math.PI / 2, 0]} map={tx.wallCo} />
    <Plane p={[CO, 1.6, 5.4]} s={[14, 3.2]} rot={[0, Math.PI, 0]} map={tx.wallCo} />
    <Ceiling x={CO} w={14} d={13} z={-1} on tex={tx.ceil} />
    <Plane p={[CO - 4.97, 1.8, -2.0]} s={[0.9, 1.25]} rot={[0, Math.PI / 2, 0]} map={tx.poster} />
    <group position={[CO - 4.95, 1.55, 0.9]} rotation={[0, Math.PI / 2, 0]}>
      <Box p={[0, 0, -0.02]} s={[1.9, 1.2, 0.04]} c="#d8dde6" />
      <Plane p={[0, 0, 0.005]} s={[1.8, 1.1]} map={tx.chart} />
    </group>
    <Plane p={[CO + 6.77, 1.7, -1.6]} s={[0.7, 0.8]} rot={[0, -Math.PI / 2, 0]} map={tx.calendar} />
    <Desk p={[CO - 2.3, 0, 0]} screen={tx.scrSheet} papers={3} mug="#3aa06a" />
    <Desk p={[CO, 0, 0]} screen={tx.scrSheet} papers={4} mug="#2f6fd6" />
    <Desk p={[CO + 2.3, 0, 0]} screen={f >= 660 && f < 711 ? tx.scrNight : tx.scrSheet} papers={2} mug="#c0353a" />
    {/* la mesa de Tanaka: limpia, solo un cojín y un cartel */}
    <Desk p={TDESK} screen={tx.scrNight} papers={0} mug="#ff7ab0" />
    <Plane p={[TDESK[0], 0.85, TDESK[2] + 0.37]} s={[0.42, 0.1]} map={tx.plateT} rot={[-0.3, 0, 0]} />
    {/* jefe */}
    <group position={[CO + 3.5, 0, -3.5]}>
      <Box p={[0, 0.72, 0]} s={[2.0, 0.07, 0.95]} c="#8a5532" />
      <Box p={[0, 0.37, 0.42]} s={[1.96, 0.68, 0.05]} c="#6e4026" />
      <Box p={[-0.95, 0.37, 0]} s={[0.06, 0.68, 0.9]} c="#6e4026" />
      <Box p={[0.95, 0.37, 0]} s={[0.06, 0.68, 0.9]} c="#6e4026" />
      <Plane p={[0, 0.85, 0.37]} s={[0.36, 0.09]} map={tx.plate} rot={[-0.3, 0, 0]} />
      <Box p={[0.6, 0.8, -0.1]} s={[0.3, 0.1, 0.36]} c="#fbf8ef" r={0.005} />
      <Chair p={[0, 0, -0.62]} c="#2b2230" />
    </group>
    <DeskPhone p={[CO + 2.95, 0.755, -3.3]} ring={false} f={f} lifted={f >= 323 && f < 400} />
    <Plant p={[CO + 6.2, 0, -5]} s={1.2} />
    <Plant p={[CO - 4.4, 0, -4.9]} s={1.0} />
    <Box p={[CO - 4.4, 0.55, -3.3]} s={[0.8, 1.1, 0.7]} c="#e3e6ec" r={0.05} />
    <group position={[CO + 6.4, 0, 1.5]}>
      <Box p={[0, 0.9, 0]} s={[0.5, 1.8, 1.4]} c="#c9cfdb" />
      {[0.4, 0.9, 1.4].map((y) => [-0.45, -0.15, 0.15, 0.45].map((z, i) => <Box key={y + '_' + z} p={[-0.1, y, z]} s={[0.35, 0.36, 0.1 + (i % 2) * 0.04]} c={['#2f6fd6', '#e8553a', '#3aa06a', '#f2b33d'][(i + Math.round(y * 2)) % 4]} />))}
    </group>
    <Plant p={[CO - 4.3, 0, 3.6]} s={1.1} />
  </group>
);

// ---------- el comedor ----------
const Table: React.FC<{p: V; c?: string}> = ({p, c = '#f2f0ea'}) => (
  <group position={p}>
    <mesh position={[0, 0.72, 0]} castShadow receiveShadow><cylinderGeometry args={[0.55, 0.55, 0.05, 32]} /><Toon c={c} /></mesh>
    <mesh position={[0, 0.36, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, 0.7, 10]} /><Toon c="#8b93a6" /></mesh>
    <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.3, 0.3, 0.04, 20]} /><Toon c="#2b2f3a" /></mesh>
  </group>
);
const BreakRoom: React.FC<{f: number; tx: Tx}> = ({f, tx}) => (
  <group>
    <Plane p={[BR, 0, -1]} s={[12, 10]} rot={[-Math.PI / 2, 0, 0]} map={tx.floorBr} />
    <Plane p={[BR, 1.6, -4.2]} s={[12, 3.2]} map={tx.wallBr} />
    <Plane p={[BR - 4, 1.6, -1]} s={[10, 3.2]} rot={[0, Math.PI / 2, 0]} map={tx.wallBr} />
    <Plane p={[BR + 5, 1.6, -1]} s={[10, 3.2]} rot={[0, -Math.PI / 2, 0]} map={tx.wallBr} />
    <Ceiling x={BR} w={12} d={10} z={-1} on tex={tx.ceil} />
    <Window p={[BR + 1.2, 1.8, -4.17]} w={4.8} h={1.6} tex={tx.skyDay} />
    <group position={[BR - 3.2, 0, -3.6]}><Box p={[0, 0.9, 0]} s={[0.9, 1.8, 0.7]} c="#d6332a" r={0.04} /><Plane p={[0, 1.0, 0.36]} s={[0.8, 1.55]} map={tx.vending} /></group>
    <Table p={[BR - 0.3, 0, 0.35]} />
    <Box p={[BR - 0.32, 0.77, 0.45]} s={[0.24, 0.06, 0.16]} c="#c0353a" r={0.015} />
    <Box p={[BR - 0.32, 0.79, 0.45]} s={[0.2, 0.03, 0.12]} c="#fbf8ef" r={0.01} />
    <Table p={[BR + 1.1, 0, -2.75]} />
    {[[BR + 0.85, -2.55], [BR + 1.4, -2.6]].map(([x, z], i) => <mesh key={i} position={[x, 0.79, z]}><cylinderGeometry args={[0.04, 0.035, 0.1, 12]} /><Toon c={['#3aa06a', '#2f6fd6'][i]} /></mesh>)}
    <Plant p={[BR + 4.4, 0, -3.7]} s={1.1} />
    {/* un pequeño matojo que cruza rodando: silencio absoluto */}
    {f >= 785 && f < 825 && (() => {
      const t = (f - 785) / 40, x = BR + 1.6 - t * 3.4;
      return <sprite position={[x, 0.16 + Math.abs(Math.sin(t * 14)) * 0.08, 1.0]} scale={[0.3, 0.3, 1]} layers={NOINK}><spriteMaterial map={tx.weed} rotation={t * 9} transparent alphaTest={0.3} /></sprite>;
    })()}
  </group>
);

// ---------- el juzgado ----------
const Court: React.FC<{tx: Tx}> = ({tx}) => (
  <group>
    <Plane p={[CT, 0, -1]} s={[12, 12]} rot={[-Math.PI / 2, 0, 0]} map={tx.floorCt} />
    <Plane p={[CT, 1.8, -3.6]} s={[12, 3.6]} map={tx.wood} />
    <Plane p={[CT - 4.5, 1.8, -1]} s={[12, 3.6]} rot={[0, Math.PI / 2, 0]} map={tx.wood} />
    <Plane p={[CT + 4.5, 1.8, -1]} s={[12, 3.6]} rot={[0, -Math.PI / 2, 0]} map={tx.wood} />
    <Plane p={[CT, 2.75, -3.57]} s={[0.9, 0.9]} map={tx.emblem} />
    {/* estrado */}
    <Box p={[CT, 0.37, -2.6]} s={[3.6, 0.74, 1.6]} c="#6e4026" />
    <Box p={[CT, 1.17, -1.95]} s={[3.0, 0.9, 0.12]} c="#8a5532" r={0.03} />
    <Box p={[CT, 1.64, -2.1]} s={[3.1, 0.06, 0.45]} c="#5a3520" />
    <Chair p={[CT, 0.74, -3.05]} c="#1f1f26" />
    {/* mesas de las partes */}
    {[-1, 1].map((sd) => <group key={sd} position={[CT + sd * 0.95, 0, -0.35]}>
      <Box p={[0, 0.7, 0]} s={[1.2, 0.05, 0.6]} c="#8a5532" />
      <Box p={[0, 0.35, 0.27]} s={[1.16, 0.66, 0.04]} c="#6e4026" />
    </group>)}
    {[-3.2, 3.2].map((x) => <Box key={x} p={[CT + x, 0.45, 2.4]} s={[2.2, 0.9, 0.5]} c="#7d4c2c" />)}
  </group>
);

// ---------- la sala de expulsión ----------
const ExRoom: React.FC<{f: number; tx: Tx}> = ({f, tx}) => {
  // reloj: normal, y a toda velocidad en el «nada que hacer»
  const sp = f >= 944 && f < 986 ? 1 : 0;
  const ang = (f * 0.004 + (sp ? (f - 944) * 0.45 : f >= 986 ? 42 * 0.45 : 0)) % (Math.PI * 2);
  const flick = sp ? 0.85 + 0.15 * Math.sin(f * 1.7) : 1;
  return (
    <group>
      <Plane p={[EX, 0, -0.5]} s={[6, 7]} rot={[-Math.PI / 2, 0, 0]} map={tx.floorEx} />
      <Plane p={[EX, 1.6, -2.6]} s={[6, 3.2]} map={tx.wallEx} />
      <Plane p={[EX - 2.6, 1.6, -0.5]} s={[7, 3.2]} rot={[0, Math.PI / 2, 0]} map={tx.wallEx} />
      <Plane p={[EX + 2.6, 1.6, -0.5]} s={[7, 3.2]} rot={[0, -Math.PI / 2, 0]} map={tx.wallEx} />
      <Plane p={[EX, 1.6, 3.0]} s={[6, 3.2]} rot={[0, Math.PI, 0]} map={tx.wallEx} />
      <Plane p={[EX, 3.2, -0.5]} s={[6, 7]} rot={[Math.PI / 2, 0, 0]} c="#cfd2d8" />
      <Plane p={[EX, 3.18, -0.6]} s={[1.0, 0.4]} rot={[Math.PI / 2, 0, 0]} c="#ffffff" glow={1.4 * flick} />
      {/* puerta */}
      <group position={[EX + 2.58, 0, 1.4]} rotation={[0, -Math.PI / 2, 0]}>
        <Box p={[0, 1.05, 0]} s={[0.95, 2.1, 0.05]} c="#9aa0ad" />
        <Ball p={[0.35, 1.0, 0.04]} s={0.04} c="#d8dde6" />
      </group>
      {/* la mesa vacía, frente a la pared */}
      <Box p={[EX, 0.7, -1.55]} s={[1.0, 0.05, 0.6]} c="#d4d6dc" />
      {[[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]].map(([x, z], i) => <Box key={i} p={[EX + x, 0.35, -1.55 + z]} s={[0.04, 0.7, 0.04]} c="#8b93a6" />)}
      <Box p={[EX, 0.42, -0.62]} s={[0.46, 0.06, 0.42]} c="#5d6577" r={0.03} />
      <Box p={[EX, 0.21, -0.62]} s={[0.04, 0.42, 0.04]} c="#8b93a6" />
      {/* reloj */}
      <group position={[EX, 2.15, -2.58]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.28, 0.28, 0.04, 32]} /><Toon c="#ffffff" /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.005]}><torusGeometry args={[0.28, 0.025, 8, 32]} /><Toon c="#2b2f3a" /></mesh>
        <group rotation={[0, 0, -ang * 12]} position={[0, 0, 0.03]}><Box p={[0, 0.1, 0]} s={[0.018, 0.22, 0.01]} c="#2b2f3a" r={0.004} /></group>
        <group rotation={[0, 0, -ang]} position={[0, 0, 0.035]}><Box p={[0, 0.07, 0]} s={[0.03, 0.15, 0.01]} c="#2b2f3a" r={0.006} /></group>
      </group>
    </group>
  );
};

// ---------- personajes ----------
const OUTFIT: Record<Pose['who'], Outfit> = {
  tanaka: {jacket: '#ffb7cc', pants: '#2b2f3a', boots: '#f4f1ea', hat: 'hair', hair: '#1f1a24', skin: '#f5c9a0', shades: 1, buttons: '#e89ab0'},
  boss: {jacket: '#5d6577', tie: '#c0353a', pants: '#3f4554', boots: '#1f1f26', hat: null, moustache: '#2b2230', skin: '#ecd0b6', build: 'stout', buttons: '#3f4554'},
  judge: {jacket: '#1f1f26', pants: '#1f1f26', boots: '#1f1f26', hat: 'hair', hair: '#e8e8ee', skin: '#ffe2c2', buttons: '#1f1f26', tie: '#ffffff'},
  c1: {jacket: '#ffffff', tie: '#3aa06a', pants: '#3b3f52', boots: '#2b2b33', hat: 'hair', hair: '#4a3020', buttons: '#d9dde0'},
  c2: {jacket: '#e4ecfa', tie: '#2f6fd6', glasses: true, pants: '#2f3442', boots: '#2b2b33', hat: 'hair', hair: '#1f1a24', skin: '#f5c9a0', buttons: '#c9d3e6'},
  c3: {jacket: '#f6e2ec', pants: '#4a3f5e', boots: '#2b2b33', hat: 'hair', hair: '#2b2230', skin: '#ffe2c2', buttons: '#e3c3d3'},
  c4: {jacket: '#dfe8e0', tie: '#8a5ac9', pants: '#3b3f52', boots: '#2b2b33', hat: 'hair', hair: '#1f1a24', skin: '#ecd0b6', buttons: '#c3d0c5'},
};
const SEED: Record<string, number> = {tanaka: 9, boss: 5, judge: 23, c1: 21, c2: 11, c3: 8, c4: 14};
const CK = 2, SU = 0.00216;
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

const CharCard: React.FC<{ps: Pose; cam: V3}> = ({ps, cam}) => {
  const {cv, tex} = cardFor(ps.id);
  const g = cv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(CK, 0, 0, CK, 0, 0);
  const back = !!ps.faceDir && (cam[0] - ps.pos[0]) * ps.faceDir[0] + (cam[2] - ps.pos[2]) * ps.faceDir[1] < 0;
  const base = OUTFIT[ps.who];
  const o: Outfit = back ? {...base, buttons: 'none', tie: undefined, vest: undefined} : {...base, shadesDrop: ps.shadesDrop ?? 0};
  bodyFront(new Pen(g), o, {mode: ps.mode === 'stroll' ? 'stroll' : ps.mode, phase: ps.phase ?? 0, facing: ps.facing ?? 0, expr: ps.expr as Expr,
    arm: ps.arm as ArmPose | undefined, t: ps.t, look: ps.look ?? 0, blink: ps.blink ?? 0, tilt: ps.tilt ?? 0, headTilt: ps.headTilt ?? 0,
    seed: SEED[ps.who] ?? 1, light: (-125 * Math.PI) / 180, back});
  tex.needsUpdate = true;
  const yaw = Math.atan2(cam[0] - ps.pos[0], cam[2] - ps.pos[2]);
  const q = ps.squash ?? 0, sx = 1 + 0.12 * q, sy = 1 - 0.1 * q;
  return (
    <group position={ps.pos}>
      <mesh geometry={CARD_GEO} rotation={[0, yaw, 0]} scale={[ps.flip ? -sx : sx, sy, 1]} layers={NOINK} renderOrder={2}>
        <meshBasicMaterial map={tex} alphaTest={0.5} side={THREE.DoubleSide} />
      </mesh>
      {ps.mode !== 'sit' && <mesh geometry={BLOB_GEO} position={[0, 0.006, 0]} layers={NOINK}>
        <meshBasicMaterial color="#000018" transparent opacity={0.28} depthWrite={false} />
      </mesh>}
    </group>
  );
};

// ---------- efectos ----------
const Fx: React.FC<{p: V; map: THREE.Texture; s: number | [number, number]; o?: number; rot?: number}> = ({p, map, s, o = 1, rot = 0}) => (
  <sprite position={p} scale={typeof s === 'number' ? [s, s, 1] : [s[0], s[1], 1]} layers={NOINK} renderOrder={3}>
    <spriteMaterial map={map} transparent opacity={o} depthWrite={false} depthTest={false} rotation={rot} />
  </sprite>
);
const coinRain = (f: number, f0: number, c: V, tx: Tx, key: string) => {
  if (f < f0 || f > f0 + 60) return [];
  const R = T.rng(f0), out: React.ReactNode[] = [];
  for (let i = 0; i < 26; i++) {
    const d = f - f0 - R() * 18, x = c[0] + (R() - 0.5) * 1.6, z = c[2] + (R() - 0.5) * 0.6, sp = 0.035 + R() * 0.02;
    if (d < 0) continue;
    const y = c[1] + 1.1 - d * sp * (1 + d * 0.02);
    if (y < c[1] - 0.9) continue;
    out.push(<Fx key={key + i} p={[x, y, z]} map={tx.coin} s={[0.11 * Math.abs(Math.cos(f * 0.3 + i)) + 0.02, 0.11]} />);
  }
  return out;
};
const Effects: React.FC<{f: number; tx: Tx}> = ({f, tx}) => {
  const out: React.ReactNode[] = [];
  // bocadillo del jefe
  if (f >= 126 && f < 160) { const k = Math.min(1, (f - 126) / 5); out.push(<Fx key="bb" p={[CO + 3.15, 1.75, -3.9]} map={tx.bubble} s={[0.85 * k, 0.48 * k]} />); }
  // golpe del mazo
  for (const g of EVENTS.gavel) if (f >= g && f < g + 8) out.push(<Fx key={'gv' + g} p={[CT + 0.42, 1.68, -2.0]} map={tx.impact} s={0.3 + (f - g) * 0.04} o={1 - (f - g) / 8} />);
  // golpecitos en el hombro
  const tapAt: [number, V][] = [[492, [-0.25, 1.05, -0.4]], [504, [-0.25, 1.05, -0.4]], [600, [2.05, 1.05, -0.4]], [612, [2.05, 1.05, -0.4]],
    [838, [-2.05, 1.05, -0.4]], [850, [-2.05, 1.05, -0.4]], [1050, [TDESK[0] + 0.25, 1.05, -3.6]], [1062, [TDESK[0] + 0.25, 1.05, -3.6]]];
  for (const [ft, p] of tapAt) if (f >= ft && f < ft + 6) out.push(<Fx key={'tp' + ft} p={p} map={tx.tapFx} s={0.16 + (f - ft) * 0.02} o={1 - (f - ft) / 6} />);
  out.push(...coinRain(f, 716, [TDESK[0], 1.2, -3.6], tx, 'ca'));
  out.push(...coinRain(f, 1180, [EX, 1.2, -0.75], tx, 'cb'));
  return <>{out}</>;
};

type Tx = ReturnType<typeof makeTx>;
const makeTx = () => ({
  carpetCo: T.carpetTex('#3f63b8'), wallCo: T.wallTex('#f4f5f8'), ceil: T.ceilTex(), skyDay: T.skylineTex(false), scrSheet: T.deskScreen('sheet'),
  scrNight: T.deskScreen('night'), poster: T.posterTex(), chart: T.chartTex(), calendar: T.calendarTex(), plate: T.nameplate('部長'), plateT: T.nameplate('肩たたき係'),
  floorBr: T.carpetTex('#c98a4a'), wallBr: T.wallTex('#fbe9c8'), vending: T.vendingTex(), weed: T.weedTex(),
  floorCt: T.carpetTex('#7a2f3a'), wood: T.woodPanel(), emblem: T.emblemTex(), floorEx: T.carpetTex('#8a8f9a'), wallEx: T.wallTex('#c9ccd3'),
  impact: T.impactFx(), tapFx: T.tapFxTex(), coin: T.coinTex(), bubble: T.bubbleTex('¡DESPEDIDO!'),
});

// ---------- postproceso ----------
const GRADE_OFFICE: GradeParams = {...GRADE_DAY2, sat: [1.04, 1.12, 1.05], vig: [0.16, 0.42]};
const GRADE_GREY: GradeParams = {...GRADE_DAY2, sat: [0.8, 0.82, 0.85], vig: [0.3, 0.38]};
const fwd = new THREE.Vector3();
const Post: React.FC<{focus: V3; dof: number; grey: boolean; cpos: V3; clook: V3}> = ({focus, dof, grey, cpos, clook}) => {
  const {camera, scene} = useThree();
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera, {widthNear: 4.6, widthFar: 2.8, distNear: 2, distFar: 20}),
    lens: new LensBlur({maxCoC: 24, nearScale: 1.2, q: 0.5}),
    bloom: new BloomEffect({blendFunction: BlendFunction.ADD, intensity: 0.4, luminanceThreshold: 0.95, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.6}),
    tone: new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}),
    grade: new GradeEffect(GRADE_OFFICE, 1),
  }), [camera, scene]);
  noInkFallback(scene);
  const cp = new THREE.Vector3(...cpos);
  fwd.set(...clook).sub(cp).normalize();
  fx.lens.focus = Math.max(0.3, new THREE.Vector3(...focus).sub(cp).dot(fwd));
  fx.lens.cInf = dof;
  fx.grade.set(grey ? GRADE_GREY : GRADE_OFFICE);
  const kids = useMemo(() => [
    <primitive key="ink" object={fx.ink} dispose={null} />, <primitive key="lp" object={fx.lens.pre} dispose={null} />,
    <primitive key="lm" object={fx.lens.main} dispose={null} />, <primitive key="bl" object={fx.bloom} dispose={null} />,
    <primitive key="tn" object={fx.tone} dispose={null} />, <primitive key="gr" object={fx.grade} dispose={null} />,
  ], [fx]);
  return <EffectComposer multisampling={2}>{kids}</EffectComposer>;
};

const World: React.FC = () => {
  const f = useCurrentFrame();
  const c = camAt(f), s = c.shot;
  const tx = useMemo(makeTx, []);
  const advance = useThree((st) => st.advance);
  useLayoutEffect(() => { advance(f * (1000 / 30)); }); // frameloop="never": un render por cuadro
  const cx = {co: CO, br: BR, ct: CT, ex: EX}[s.loc];
  return (
    <>
      <color attach="background" args={['#bcd6f2']} />
      <CamRig f={f} />
      <ambientLight color="#ffffff" intensity={s.loc === 'ex' ? 0.95 : 1.15} />
      <hemisphereLight args={['#e8f1ff', '#9a8f86', 0.9]} />
      <directionalLight position={[cx + 4, 8, s.loc === 'co' ? -12 : 6]} target-position={[cx, 0, -1]} color="#fff2dc" intensity={s.loc === 'ex' ? 0.9 : 1.6} castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9}
        shadow-camera-near={0.5} shadow-camera-far={40} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[c.pos[0] + 2, 5, c.pos[2] + 6]} color="#dfe8ff" intensity={0.5} />
      {s.loc === 'co' && <Office f={f} tx={tx} />}
      {s.loc === 'br' && <BreakRoom f={f} tx={tx} />}
      {s.loc === 'ct' && <Court tx={tx} />}
      {s.loc === 'ex' && <ExRoom f={f} tx={tx} />}
      {posesAt(f).map((p) => <CharCard key={p.id} ps={p} cam={c.pos} />)}
      <Effects f={f} tx={tx} />
      <Post focus={focusAt(f)} dof={s.dof} grey={s.loc === 'ex' && f < 1160} cpos={c.pos} clook={c.look} />
    </>
  );
};

// ---------- insertos 2D: sello NULO y cartel de presentación ----------
const Stamp: React.FC<{f: number}> = ({f}) => {
  if (f < 158 || f >= 185) return null;
  const d = f - 158, k = Math.min(1, d / 4), sc = 2.4 - 1.4 * k;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center'}}>
      <div style={{transform: `rotate(-14deg) scale(${sc})`, opacity: Math.min(1, d / 2), border: '22px solid #d6332a', borderRadius: 40, padding: '10px 60px',
        color: '#d6332a', fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: 220, letterSpacing: 10, background: 'rgba(255,255,255,0.18)'}}>NULO</div>
    </div>
  );
};
const NameCard: React.FC<{f: number}> = ({f}) => {
  if (f < 404 || f >= 472) return null;
  const k = interpolate(f, [404, 412, 464, 472], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 80, top: 230, transform: `translateX(${(1 - k) * -700}px)`, fontFamily: 'Inter, sans-serif'}}>
      <div style={{background: '#ff7ab0', color: '#fff', fontWeight: 900, fontSize: 110, padding: '6px 34px', border: '8px solid #241726', borderRadius: 20, display: 'inline-block'}}>TANAKA</div>
      <div style={{background: '#241726', color: '#fff', fontWeight: 800, fontSize: 44, padding: '10px 24px', marginTop: 12, borderRadius: 14, display: 'inline-block'}}>Especialista en «kata-tataki»</div>
    </div>
  );
};

export const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const flash = f >= 158 && f < 162 ? (162 - f) / 4 * 0.5 : 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#bcd6f2'}}>
      <ThreeCanvas frameloop="never" width={1080} height={1920} shadows gl={{antialias: false, stencil: false}} camera={{fov: 45, position: [0, 1.5, 4], near: 0.05, far: 150}}>
        <World />
      </ThreeCanvas>
      <Stamp f={f} />
      <NameCard f={f} />
      {flash > 0 && <AbsoluteFill style={{background: `rgba(255,255,255,${flash})`}} />}
    </AbsoluteFill>
  );
};
