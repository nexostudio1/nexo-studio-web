import React, {useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {camAt, ownerAt, phoneAt, SEAT_TOP, CHAIR_Z, BED_TOP, Phone} from './anim';

const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 180, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const Toon: React.FC<{c: string}> = ({c}) => <meshToonMaterial color={c} gradientMap={GRAD} />;
type V = [number, number, number];
const Box: React.FC<{p: V; s: V; c: string; r?: V}> = ({p, s, c, r = [0, 0, 0]}) => (
  <mesh position={p} scale={s} rotation={r} castShadow receiveShadow>
    <boxGeometry args={[1, 1, 1]} />
    <Toon c={c} />
  </mesh>
);
const Ball: React.FC<{p: V; s: V; c: string}> = ({p, s, c}) => (
  <mesh position={p} scale={s} castShadow receiveShadow>
    <sphereGeometry args={[1, 24, 16]} />
    <Toon c={c} />
  </mesh>
);

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rep: [number, number] = [1, 1]) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const CamRig: React.FC<{f: number}> = ({f}) => {
  const {camera} = useThree();
  const c = camAt(f);
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(...c.look);
    cam.rotateZ(c.roll);
    cam.fov = c.fov;
    cam.near = 0.05; cam.far = 120;
    cam.updateProjectionMatrix();
  }, [f]);
  return null;
};

// ---------- Limbo con IK de 2 huesos ----------
const L1 = 0.95, L2 = 0.95;
function ik(S: THREE.Vector3, T: THREE.Vector3, pole: THREE.Vector3) {
  const d0 = T.clone().sub(S);
  let d = d0.length();
  const dir = d0.clone().normalize();
  d = Math.min(Math.max(d, 0.25), L1 + L2 - 0.001);
  const hand = S.clone().add(dir.clone().multiplyScalar(d));
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
  if (p.lengthSq() < 1e-6) p.set(0, 0, -1);
  p.normalize();
  const elbow = S.clone().add(dir.clone().multiplyScalar(a)).add(p.multiplyScalar(h));
  return {elbow, hand};
}
const Seg: React.FC<{a: THREE.Vector3; b: THREE.Vector3; r: number; c: string}> = ({a, b, r, c}) => {
  const d = b.clone().sub(a);
  const len = Math.max(d.length(), 1e-4);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return (
    <mesh position={a.clone().add(b).multiplyScalar(0.5)} quaternion={q} scale={[1, len, 1]} castShadow>
      <cylinderGeometry args={[r, r, 1, 10]} />
      <Toon c={c} />
    </mesh>
  );
};
const ARM = '#ffe6a8';
const Arm: React.FC<{S: THREE.Vector3; T: THREE.Vector3; pole: THREE.Vector3; side: number}> = ({S, T, pole, side}) => {
  const {elbow, hand} = ik(S, T, pole);
  return (
    <group>
      <Seg a={S} b={elbow} r={0.075} c={ARM} />
      <Seg a={elbow} b={hand} r={0.07} c={ARM} />
      <Ball p={[elbow.x, elbow.y, elbow.z]} s={[0.085, 0.085, 0.085]} c={ARM} />
      <Ball p={[hand.x, hand.y, hand.z]} s={[0.17, 0.17, 0.17]} c="#ffffff" />
      <Ball p={[hand.x + side * 0.12, hand.y + 0.1, hand.z + 0.08]} s={[0.075, 0.075, 0.075]} c="#ffffff" />
      <Ball p={[hand.x - side * 0.02, hand.y + 0.16, hand.z + 0.06]} s={[0.07, 0.07, 0.07]} c="#ffffff" />
    </group>
  );
};

// ---------- Teléfono ----------
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
const BODY_GEO = new THREE.ExtrudeGeometry(rrect(W, H, 0.15, -W / 2, 0), {depth: D, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 8});
const SCREEN_GEO = new THREE.ShapeGeometry(rrect(W - 0.1, H - 0.14, 0.1, -(W - 0.1) / 2, 0.07), 8);
const SCREEN = '#0d1428';
const FZ = D + 0.034;

const Eye: React.FC<{sx: number; ph: Phone}> = ({sx, ph}) => {
  const r = 0.19;
  const lid = ph.lid + 0.0;
  const lineY = r * (1 - 2 * Math.min(1, lid)) - 0.0;
  const tilt = ph.anger * 0.5 * (sx < 0 ? -1 : 1);
  const px = ph.look[0] * 0.085, py = ph.look[1] * 0.08;
  return (
    <group position={[sx * 0.2, 1.0, FZ]}>
      <mesh scale={[r, r * 1.1, 0.07]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[px, py, 0.06]} scale={[ph.pupil, ph.pupil * 1.15, 0.03]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#10101a" />
      </mesh>
      <mesh position={[px + 0.03, py + 0.035, 0.09]} scale={[0.025, 0.025, 0.01]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {(() => {
        const top = r * 1.25;
        const hgt = top - lineY;
        if (hgt <= 0.01) return null;
        return (
          <group rotation={[0, 0, tilt]} position={[0, 0, 0.1]}>
            <mesh position={[0, (top + lineY) / 2, 0]}>
              <boxGeometry args={[0.46, hgt, 0.01]} />
              <meshBasicMaterial color={SCREEN} />
            </mesh>
          </group>
        );
      })()}
    </group>
  );
};

const PhoneMesh: React.FC<{ph: Phone}> = ({ph}) => {
  const q = new THREE.Euler(-ph.lay * Math.PI / 2, ph.yaw, ph.lean, 'ZYX');
  const sx = 1 / Math.sqrt(Math.max(ph.sq, 0.3));
  const R = new THREE.Matrix4().compose(new THREE.Vector3(...ph.pos), new THREE.Quaternion().setFromEuler(q), new THREE.Vector3(1, 1, 1));
  const inv = R.clone().invert();
  const rot = new THREE.Matrix4().extractRotation(R).invert();
  const loc = (v: V) => new THREE.Vector3(...v).applyMatrix4(inv);
  const out = (s: number) => new THREE.Vector3(s, 0, 0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().extractRotation(R))).setY(0).normalize();
  const poleW = (s: number) => out(s).multiplyScalar(0.7).add(new THREE.Vector3(0, 0.8, 0));
  const poleL = (s: number) => poleW(s).applyMatrix4(rot);
  const shL = new THREE.Vector3(-0.43 * sx, 0.95 * ph.sq, 0.08);
  const shR = new THREE.Vector3(0.43 * sx, 0.95 * ph.sq, 0.08);
  const sad = ph.anger;
  const lightCol = new THREE.Color('#8fb8ff').lerp(new THREE.Color('#ff4a36'), sad);
  const mouthY = 0.52, my = ph.sq;
  return (
    <group position={ph.pos} rotation={q}>
      <group scale={[sx, ph.sq, sx]}>
        <mesh geometry={BODY_GEO} castShadow>
          <Toon c="#ff7a2f" />
        </mesh>
        <mesh geometry={BODY_GEO} position={[0, H / 2 * (1 - 1.05), D / 2 * (1 - 1.7)]} scale={[1.07, 1.05, 1.7]}>
          <meshBasicMaterial color="#1c1022" side={THREE.BackSide} />
        </mesh>
        <mesh geometry={SCREEN_GEO} position={[0, 0, D + 0.036]}>
          <meshBasicMaterial color={SCREEN} />
        </mesh>
        <mesh position={[0, 1.4, FZ]}>
          <capsuleGeometry args={[0.025, 0.12, 4, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh position={[0, 1.4, FZ]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.028, 0.14, 4, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* batería casi vacía */}
        <mesh position={[0.26, 1.38, FZ]}>
          <boxGeometry args={[0.12, 0.05, 0.005]} />
          <meshBasicMaterial color={Math.floor(ph.pos[0] * 3) % 2 ? '#ff3b30' : '#a02620'} />
        </mesh>
        <Eye sx={-1} ph={ph} />
        <Eye sx={1} ph={ph} />
        {/* boca */}
        {ph.mouth < 0.5 ? (
          <mesh position={[0, mouthY - 0.02, FZ]} scale={[1, 0.9, 1]}>
            <torusGeometry args={[0.15, 0.028, 8, 20, Math.PI]} />
            <meshBasicMaterial color="#f5d6c0" />
          </mesh>
        ) : (
          <group position={[0, mouthY, FZ]}>
            <mesh scale={[0.17, 0.2, 0.02]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial color="#1a0a10" />
            </mesh>
            <mesh position={[0, -0.07, 0.03]} scale={[0.1, 0.06, 0.01]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshBasicMaterial color="#e0455a" />
            </mesh>
          </group>
        )}
        <pointLight position={[0, 0.9, 0.9]} color={lightCol} intensity={ph.glow * 7} distance={9} decay={2} />
      </group>
      {/* brazos (sin escala de aplaste) */}
      <Arm S={shL} T={loc(ph.hL)} pole={poleL(-1)} side={-1} />
      <Arm S={shR} T={loc(ph.hR)} pole={poleL(1)} side={1} />
    </group>
  );
};

// ---------- Cuarto ----------
const Zzz: React.FC<{f: number}> = ({f}) => {
  const tex = useMemo(() => canvasTex(128, 128, (g) => {
    g.font = 'bold 110px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 14; g.strokeStyle = '#1a2150'; g.strokeText('Z', 64, 70);
    g.fillStyle = '#ffffff'; g.fillText('Z', 64, 70);
  }), []);
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const t = (((f + i * 28) % 84) / 84);
        return (
          <sprite key={i} position={[16.9 + t * 1.4, 5.5 + t * 1.8, -0.9]} scale={[0.6 + t * 0.7, 0.6 + t * 0.7, 1]}>
            <spriteMaterial map={tex} transparent opacity={Math.sin(Math.PI * t) * 0.95} depthWrite={false} />
          </sprite>
        );
      })}
    </group>
  );
};

const Room: React.FC<{f: number}> = ({f}) => {
  const floor = useMemo(() => canvasTex(512, 512, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#6a4636' : '#5e3d30';
      g.fillRect(0, i * 64, 512, 64);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, i * 64, 512, 3);
      g.fillRect((i * 173) % 512, i * 64, 3, 64);
    }
  }, [8, 5]), []);
  const wall = useMemo(() => canvasTex(256, 256, (g) => {
    g.fillStyle = '#3a4691'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#34408a'; for (let i = 0; i < 8; i++) g.fillRect(i * 32, 0, 16, 256);
  }, [10, 3]), []);
  const o = ownerAt(f);
  const cable = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, 0.9, -5.1), new THREE.Vector3(-4.0, 0.2, -4.2), new THREE.Vector3(-3.0, 0.045, -2.5),
    new THREE.Vector3(-2.2, 0.045, -0.3), new THREE.Vector3(-1.3, 0.045, 0.6), new THREE.Vector3(-0.9, 0.045, 1.5),
  ]), 40, 0.045, 8), []);
  const BZ = -1.5;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0, 2]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshToonMaterial map={floor} gradientMap={GRAD} />
      </mesh>
      <mesh position={[8, 6, -5.2]} receiveShadow>
        <planeGeometry args={[60, 14]} />
        <meshToonMaterial map={wall} gradientMap={GRAD} />
      </mesh>
      <mesh position={[-9, 6, 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[30, 14]} />
        <meshToonMaterial map={wall} gradientMap={GRAD} />
      </mesh>
      <mesh position={[8, 13, 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 30]} />
        <meshBasicMaterial color="#1b2258" />
      </mesh>
      {/* ventana de luna */}
      <mesh position={[5.8, 6.4, -5.15]}><planeGeometry args={[3.2, 4.2]} /><meshBasicMaterial color="#cfe2ff" /></mesh>
      <Box p={[5.8, 4.3, -5.1]} s={[3.6, 0.2, 0.3]} c="#242a58" />
      <Box p={[5.8, 8.5, -5.1]} s={[3.6, 0.2, 0.3]} c="#242a58" />
      <Box p={[4.1, 6.4, -5.1]} s={[0.2, 4.4, 0.3]} c="#242a58" />
      <Box p={[7.5, 6.4, -5.1]} s={[0.2, 4.4, 0.3]} c="#242a58" />
      <Box p={[5.8, 6.4, -5.05]} s={[0.12, 4.2, 0.2]} c="#242a58" />
      <Box p={[5.8, 6.4, -5.05]} s={[3.2, 0.12, 0.2]} c="#242a58" />
      <mesh position={[5.3, 7.4, -5.12]}><circleGeometry args={[0.55, 24]} /><meshBasicMaterial color="#fffbe0" /></mesh>
      {/* alfombra */}
      <mesh position={[1.0, 0.012, 1.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.4, 48]} /><meshToonMaterial color="#b84a74" gradientMap={GRAD} />
      </mesh>
      <mesh position={[1.0, 0.014, 1.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.5, 48]} /><meshToonMaterial color="#f2c4d4" gradientMap={GRAD} />
      </mesh>
      {/* cable del cargador abandonado */}
      <mesh geometry={cable} castShadow><Toon c="#f2f2f2" /></mesh>
      <Box p={[-0.85, 0.1, 1.55]} s={[0.22, 0.14, 0.3]} c="#f2f2f2" />
      {/* silla */}
      <Box p={[5.5, 2.475, CHAIR_Z]} s={[2.0, 0.25, 2.0]} c="#c98a3d" />
      {[[4.65, 1.55], [6.35, 1.55], [4.65, -0.55], [6.35, -0.55]].map(([lx, lz], i) => (
        <Box key={i} p={[lx, 1.18, lz]} s={[0.2, 2.35, 0.2]} c="#a86d2c" />
      ))}
      <Box p={[5.5, 3.65, -0.5]} s={[2.0, 2.2, 0.16]} c="#c98a3d" />
      <Box p={[5.5, 3.65, -0.4]} s={[1.5, 1.6, 0.06]} c="#a86d2c" />
      {/* cama */}
      <Box p={[12.9, 1.4, BZ]} s={[10.2, 2.0, 7.0]} c="#6d3f27" />
      <Box p={[12.9, 2.8, BZ]} s={[10.0, 0.8, 6.8]} c="#f2ece0" />
      <Box p={[18.1, 3.8, BZ]} s={[0.4, 3.6, 7.0]} c="#5a3220" />
      <Box p={[16.3, 3.45, BZ]} s={[3.0, 0.5, 3.2]} c="#ffffff" />
      {/* cobija con el dueño debajo */}
      <group position={[11.3, 3.25, BZ]} scale={[1, 1 + 0.05 * o.breath, 1 + 0.03 * o.breath]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <capsuleGeometry args={[1.35, 5.2, 8, 20]} />
          <Toon c="#e0a63a" />
        </mesh>
        <Box p={[0, 0.2, 1.1]} s={[6.0, 0.45, 0.25]} c="#c0482f" />
      </group>
      {/* pies con calcetines a rayas */}
      {[-0.6, 0.6].map((dz, i) => (
        <group key={i} position={[8.0, 3.85, BZ + dz]} rotation={[0, 0, 0.25]}>
          <Box p={[0, 0, 0]} s={[0.6, 0.5, 0.7]} c="#ffffff" />
          <Box p={[0, 0.22, 0]} s={[0.62, 0.14, 0.72]} c="#d63f3f" />
        </group>
      ))}
      {/* cabeza */}
      <group position={[16.2, 4.45, BZ]} scale={[1, 1 + 0.02 * o.breath, 1]}>
        <Ball p={[0, 0, 0]} s={[1.0, 0.95, 0.95]} c="#f1c7a0" />
        <Ball p={[0.1, 0.3, -0.15]} s={[1.05, 0.78, 1.0]} c="#3a2418" />
        <Ball p={[-0.35, 0.05, 0.9]} s={[0.12, 0.12, 0.12]} c="#e8a98c" />
        <Box p={[-0.38, 0.18, 0.88]} s={[0.3, 0.05, 0.05]} c="#2a1a14" />
        <Box p={[0.38, 0.18, 0.88]} s={[0.3, 0.05, 0.05]} c="#2a1a14" />
        <Ball p={[-0.55, -0.1, 0.8]} s={[0.17, 0.1, 0.05]} c="#f09a96" />
        <Ball p={[0.55, -0.1, 0.8]} s={[0.17, 0.1, 0.05]} c="#f09a96" />
        <Ball p={[0, -0.38, 0.85]} s={[0.14 + 0.06 * o.mouth, 0.07 + 0.1 * o.mouth, 0.05]} c="#6a1f2a" />
      </group>
      <Zzz f={f} />
      {/* pantuflas */}
      <Ball p={[8.4, 0.18, 3.0]} s={[0.55, 0.2, 0.3]} c="#e888a8" />
      <Ball p={[9.4, 0.18, 2.7]} s={[0.55, 0.2, 0.3]} c="#e888a8" />
    </group>
  );
};

const World: React.FC = () => {
  const f = useCurrentFrame();
  const ph = phoneAt(f);
  return (
    <>
      <color attach="background" args={['#1b2150']} />
      <CamRig f={f} />
      <ambientLight color="#5a62b0" intensity={0.9} />
      <hemisphereLight args={['#7c8cd8', '#3a2a3a', 1.2]} />
      <directionalLight position={[-6, 10, 12]} color="#a9bcff" intensity={2.2} castShadow
        shadow-mapSize={[4096, 4096]} shadow-camera-left={-22} shadow-camera-right={22}
        shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={50}
        shadow-bias={-0.0005} shadow-normalBias={0.03} />
      <directionalLight position={[6, 6, -8]} color="#cfe0ff" intensity={1.2} />
      <pointLight position={[11, 7, 3]} color="#ffb36b" intensity={30} distance={16} decay={2} />
      <Room f={f} />
      <PhoneMesh ph={ph} />
    </>
  );
};

export const Scene: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#1b2150'}}>
    <ThreeCanvas width={1080} height={1920} shadows flat camera={{fov: 50, position: [0, 2, 8], near: 0.05, far: 120}}>
      <World />
    </ThreeCanvas>
  </AbsoluteFill>
);
