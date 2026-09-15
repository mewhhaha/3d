import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { surfaceFrame, surfaceLayer, attachToSurface } from '../src/lib/surface-frame.js';
import { animePortrait, facialChart } from '../src/lib/cyber/portrait.js';
import { cyberMaterials } from '../src/lib/cyber/mechanics.js';
import { dispose } from '../src/lib/modeling.js';

test('surface layers offset along a differential normal and attach local +Z to it', () => {
  const plane=(u,v)=>[u,v,u*.5+v*.25];
  const f=surfaceFrame(plane,.2,.3),expected=new THREE.Vector3(-.5,-.25,1).normalize();
  assert.ok(f.normal.distanceTo(expected)<1e-10);
  const p=new THREE.Vector3(...surfaceLayer(plane,{offset:.003})(.2,.3));
  assert.ok(p.distanceTo(f.origin.clone().addScaledVector(expected,.003))<1e-12);
  const o=attachToSurface(new THREE.Group(),plane,{u:.2,v:.3,offset:.005});
  assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(o.quaternion).distanceTo(expected)<1e-10);
  assert.ok(Math.abs(o.position.distanceTo(f.origin)-.005)<1e-12);
  assert.throws(()=>surfaceFrame(()=>[0,0,0],0,0),/Degenerate/);
  assert.throws(()=>surfaceLayer(plane,{relief:()=>NaN})(0,0),/Non-finite/);
  assert.throws(()=>surfaceFrame(plane,NaN,0));
});
test('eyes and irises remain within four millimeters of the same facial chart',()=>{
  const root=animePortrait({},cyberMaterials());let tested=0,maxClearance=0;
  root.traverse(o=>{
    if(!['Conforming almond sclera','Surface iris','Surface pupil'].includes(o.name))return;
    const p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const depth=p.getZ(i)-facialChart(p.getX(i),p.getY(i))[2];
      assert.ok(depth>0,`${o.name} penetrates the analytic front surface`);
      assert.ok(depth<.004,`${o.name} floats ${depth} meters above the analytic front surface`);
      maxClearance=Math.max(maxClearance,depth);tested++;
    }
  });
  assert.ok(tested>500);assert.ok(maxClearance>.002);
  assert.throws(()=>facialChart(2,0));dispose(root);
});
test('each portrait owns its procedural iris texture and shares it only within that build',()=>{
  const a=animePortrait({},cyberMaterials()),b=animePortrait({},cyberMaterials());
  const maps=root=>{const result=[];root.traverse(o=>{if(o.name==='Surface iris')result.push(o.material.map);});return result;};
  const am=maps(a),bm=maps(b);assert.equal(am.length,2);assert.equal(am[0],am[1]);assert.notEqual(am[0],bm[0]);
  assert.equal(am[0].image.width,128);assert.equal(am[0].colorSpace,THREE.SRGBColorSpace);dispose(a);dispose(b);
});
