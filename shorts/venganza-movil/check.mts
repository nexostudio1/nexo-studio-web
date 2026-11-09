import * as THREE from 'three';
import {camAt, phoneAt} from './src/anim.ts';
const fr = [0,20,80,100,130,160,189,215,235,255,290,340,371,385,400,419];
for (const f of fr) {
  const c = camAt(f), p = phoneAt(f);
  const cam = new THREE.PerspectiveCamera(c.fov, 9/16, 0.05, 100);
  cam.position.set(...c.pos); cam.lookAt(...c.look); cam.updateMatrixWorld();
  const e = new THREE.Euler(-p.lay*Math.PI/2, p.yaw, p.lean,'ZYX');
  const pt = (l:number[])=>{const v=new THREE.Vector3(...l).applyEuler(e).add(new THREE.Vector3(...p.pos)).project(cam);return `(${v.x.toFixed(2)},${v.y.toFixed(2)})`};
  const w=(v:number[])=>{const q=new THREE.Vector3(...v).project(cam);return `(${q.x.toFixed(2)},${q.y.toFixed(2)})`};
  console.log(f, 'base',pt([0,0,0]),'top',pt([0,1.5,0]),'eyes',pt([0,1,0.2]),'hL',w(p.hL),'hR',w(p.hR));
}
