import * as THREE from 'three';
import {camAt, phoneAt} from './src/anim.ts';
const fr = [0,20,50,80,100,150,189,215,235,255,290,340,371,385,419];
for (const f of fr) {
  const c = camAt(f), p = phoneAt(f);
  const cam = new THREE.PerspectiveCamera(c.fov, 9/16, 0.05, 100);
  cam.position.set(...c.pos); cam.lookAt(...c.look); cam.updateMatrixWorld();
  const e = new THREE.Euler(-p.lay*Math.PI/2, p.yaw, p.lean,'ZYX');
  const pt = (l:number[])=>{const v=new THREE.Vector3(...l).applyEuler(e).add(new THREE.Vector3(...p.pos)).project(cam);return `(${v.x.toFixed(2)},${v.y.toFixed(2)})`};
  console.log(f, 'base',pt([0,0,0]),'top',pt([0,1.5,0]),'eyes',pt([0,1,0.2]), 'hL',new THREE.Vector3(...p.hL).project(cam).toArray().slice(0,2).map(n=>n.toFixed(2)).join(','));
}
