import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { surfaceBoundaryLoops, roundBoundaryProfile, boundaryProfileGeometry } from '../src/lib/surface-boundary-profile.js';

function quad(){ const g=new THREE.PlaneGeometry(2,1,2,1); return g; }
function annulus(){
  const positions=[-2,-2,0, 2,-2,0, 2,2,0, -2,2,0, -.7,-.7,0, -.7,.7,0, .7,.7,0, .7,-.7,0];
  const indices=[0,1,7,0,7,4, 1,2,6,1,6,7, 2,3,5,2,5,6, 3,0,4,3,4,5];
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

test('surfaceBoundaryLoops returns ordered source loops without moving source geometry',()=>{
  const source=quad(), before=Array.from(source.attributes.position.array), loops=surfaceBoundaryLoops(source);
  assert.equal(loops.length,1); assert.equal(loops[0].indices.length,6); assert.deepEqual(Array.from(source.attributes.position.array),before); source.dispose();
});
test('boundary profile builds actual indexed trim with UVs',()=>{
  const source=quad(), trim=boundaryProfileGeometry(source,{profile:roundBoundaryProfile({radius:.08,segments:6})});
  assert.ok(trim.index.count>0); assert.equal(trim.getAttribute('uv').count,trim.getAttribute('position').count); assert.equal(trim.userData.boundaryProfile.sourceUnchanged,true);
  assert.equal(trim.userData.boundaryProfile.profilePoints,6); trim.dispose(); source.dispose();
});
test('outer and hole boundaries keep opposite outward directions',()=>{
  const source=annulus(), loops=surfaceBoundaryLoops(source); assert.equal(loops.length,2);
  const trim=boundaryProfileGeometry(source,{profile:[[.2,-.05],[.2,.05],[0,.05],[0,-.05]]});
  trim.computeBoundingBox(); assert.ok(trim.boundingBox.max.x>2.13); // outer loop grows away from panel
  const positions=trim.getAttribute('position'); let nearHole=false;
  for(let i=0;i<positions.count;i++) if(Math.abs(positions.getX(i))<.57||Math.abs(positions.getY(i))<.57){nearHole=true;break;}
  assert.equal(nearHole,true); trim.dispose(); source.dispose();
});
test('profile and input validation reject ambiguous construction',()=>{
  assert.throws(()=>roundBoundaryProfile({segments:2}),/3\.\.64/);
  const nonIndexed=new THREE.PlaneGeometry(1,1).toNonIndexed(); assert.throws(()=>surfaceBoundaryLoops(nonIndexed),/indexed triangle/); nonIndexed.dispose();
  const source=quad(); assert.throws(()=>boundaryProfileGeometry(source,{profile:[[0,0],[1,0]]}),/at least three/); source.dispose();
});
