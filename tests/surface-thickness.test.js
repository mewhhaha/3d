import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { creaseNormals, solidifyGeometry } from '../src/lib/surface-thickness.js';

function quad() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  g.setIndex([0,1,2,0,2,3]);
  return g;
}
const zAt=(g,i)=>g.getAttribute('position').getZ(i);

test('solidify centers a simple indexed sheet and closes its boundary',()=>{
  const source=quad(), before=Array.from(source.getAttribute('position').array);
  const result=solidifyGeometry(source,{thickness:.2,offset:0,rim:'sharp'});
  assert.deepEqual(Array.from(source.getAttribute('position').array),before,'source stays immutable');
  assert.equal(result.userData.solidify.boundaryEdges,4);
  assert.equal(result.userData.solidify.boundaryLoops,1);
  assert.equal(result.index.count/3,12,'2 outer + 2 inner + 8 rim triangles');
  assert.equal(result.getAttribute('position').count,24,'shell copies plus four independent vertices per sharp rim edge');
  for(let i=0;i<4;i++){assert.ok(Math.abs(zAt(result,i)-.1)<1e-6);assert.ok(Math.abs(zAt(result,4+i)+.1)<1e-6);}
  assert.equal(result.getAttribute('uv').count,result.getAttribute('position').count);
});

test('offset chooses which authored surface stays fixed',()=>{
  const outside=solidifyGeometry(quad(),{thickness:.2,offset:-1,rim:false});
  const inside=solidifyGeometry(quad(),{thickness:.2,offset:1,rim:false});
  assert.ok(Math.abs(zAt(outside,0))<1e-7);assert.ok(Math.abs(zAt(outside,4)+.2)<1e-6);
  assert.ok(Math.abs(zAt(inside,0)-.2)<1e-6);assert.ok(Math.abs(zAt(inside,4))<1e-7);
});

test('smooth rims share their loop side vertices while keeping a UV seam',()=>{
  const result=solidifyGeometry(quad(),{thickness:.08,rim:'smooth'});
  assert.equal(result.index.count/3,12);
  assert.equal(result.getAttribute('position').count,18,'8 shell + 10 rim vertices including the repeated UV seam pair');
  const uv=result.getAttribute('uv');
  assert.ok(Math.abs(uv.getX(8))<1e-7);
  assert.ok(Math.abs(uv.getX(16)-1)<1e-7);
});

test('variable thickness fields are evaluated per source vertex',()=>{
  const result=solidifyGeometry(quad(),{thickness:(i)=>.02+.01*i,rim:false,offset:1});
  assert.ok(Math.abs(zAt(result,0)-.02)<1e-6);
  assert.ok(Math.abs(zAt(result,3)-.05)<1e-6);
  assert.equal(result.userData.solidify.variableThickness,true);
});

test('topology-changing dependencies are rejected or explicitly invalidated',()=>{
  const skinned=quad();skinned.setAttribute('skinWeight',new THREE.Float32BufferAttribute(new Array(16).fill(.25),4));
  assert.throws(()=>solidifyGeometry(skinned),/skin weights/);
  const tangent=quad();tangent.setAttribute('tangent',new THREE.Float32BufferAttribute(new Array(16).fill(0),4));
  const thick=solidifyGeometry(tangent);
  assert.deepEqual(thick.userData.solidify.invalidatedAttributes,['tangent']);
  assert.equal(thick.getAttribute('tangent'),undefined);
});

test('creaseNormals splits indexed topology by angle and drops stale tangents',()=>{
  const source=new THREE.BoxGeometry(1,1,1);
  source.setAttribute('tangent',new THREE.Float32BufferAttribute(new Array(source.getAttribute('position').count*4).fill(0),4));
  const result=creaseNormals(source,{angle:35});
  assert.equal(result.index,null);
  assert.equal(result.getAttribute('tangent'),undefined);
  assert.deepEqual(result.userData.creaseNormals.invalidatedAttributes,['tangent']);
  assert.equal(result.userData.creaseNormals.angleDegrees,35);
});

test('solidify rejects ambiguous topology and invalid controls',()=>{
  const nonIndexed=quad().toNonIndexed();
  assert.throws(()=>solidifyGeometry(nonIndexed),/indexed triangle/);
  assert.throws(()=>solidifyGeometry(quad(),{thickness:0}),/positive/);
  assert.throws(()=>solidifyGeometry(quad(),{offset:2}),/-1\.\.1/);
  assert.throws(()=>solidifyGeometry(quad(),{rim:'round'}),/rim/);
});
