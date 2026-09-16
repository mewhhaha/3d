import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { transferSurfaceAttributes } from '../src/lib/attribute-transfer.js';

function sourceQuad() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3));
  g.setIndex([0,1,2, 0,2,3]);
  g.setAttribute('field', new THREE.Float32BufferAttribute([-2,0,2,0], 1)); // x + y
  g.setAttribute('color', new THREE.Float32BufferAttribute([0,0,1, 1,0,0, 1,1,0, 0,1,1], 3));
  return g;
}
function targetPoints() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0,0,.2, .5,0,-.1, -.5,.25,.05], 3));
  g.setIndex([0,1,2]);
  return g;
}

test('closest-face barycentric transfer reproduces a continuous linear vertex field',()=>{
  const source=sourceQuad(),target=targetPoints(),sourceBefore=Array.from(source.getAttribute('field').array),targetBefore=Object.keys(target.attributes);
  const result=transferSurfaceAttributes(source,target,{attributes:['field','color'],maxDistance:.25});
  const field=result.getAttribute('field');
  assert.ok(Math.abs(field.getX(0)-0)<1e-6);
  assert.ok(Math.abs(field.getX(1)-.5)<1e-6);
  assert.ok(Math.abs(field.getX(2)+.25)<1e-6);
  assert.equal(result.getAttribute('color').count,3);
  assert.deepEqual(Array.from(source.getAttribute('field').array),sourceBefore,'source stays unchanged');
  assert.deepEqual(Object.keys(target.attributes),targetBefore,'target stays unchanged');
  assert.equal(target.getAttribute('field'),undefined);
  assert.equal(result.userData.attributeTransfer.mode,'nearest-face-barycentric');
  assert.ok(result.userData.attributeTransfer.maxDistance<=.2+1e-6);
});

test('transfer rejects discontinuous or domain-specific semantics instead of silently smearing them',()=>{
  const source=sourceQuad(),target=targetPoints();
  source.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  assert.throws(()=>transferSurfaceAttributes(source,target,{attributes:['uv']}),/domain-specific/);
  source.setAttribute('label',new THREE.Uint8BufferAttribute([0,1,2,3],1));
  assert.throws(()=>transferSurfaceAttributes(source,target,{attributes:['label']}),/Float32/);
  assert.throws(()=>transferSurfaceAttributes(source,target,{attributes:['field'],maxDistance:.01}),/beyond maxDistance/);
});

test('transfer requires indexed source triangles and refuses silent overwrite on targets',()=>{
  const source=sourceQuad().toNonIndexed(),target=targetPoints();
  assert.throws(()=>transferSurfaceAttributes(source,target,{attributes:['field']}),/indexed triangles/);
  const indexed=sourceQuad(); target.setAttribute('field',new THREE.Float32BufferAttribute([0,0,0],1));
  assert.throws(()=>transferSurfaceAttributes(indexed,target,{attributes:['field']}),/already has/);
});
