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
  assert.equal(result.userData.attributeTransfer.acceleration,'brute-force');
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

test('BVH and brute-force transfer are value-identical and auto accelerates larger jobs',()=>{
  const source=new THREE.SphereGeometry(1,28,18),position=source.getAttribute('position');
  const field=new Float32Array(position.count);
  for(let i=0;i<position.count;i++)field[i]=position.getX(i)*.7+position.getY(i)*.2-position.getZ(i)*.4;
  source.setAttribute('field',new THREE.Float32BufferAttribute(field,1));
  const target=new THREE.SphereGeometry(1.03,20,14);
  target.deleteAttribute('normal'); target.deleteAttribute('uv');
  const brute=transferSurfaceAttributes(source,target,{attributes:['field'],acceleration:'brute-force'});
  const bvh=transferSurfaceAttributes(source,target,{attributes:['field'],acceleration:'bvh'});
  const auto=transferSurfaceAttributes(source,target,{attributes:['field'],acceleration:'auto'});
  assert.deepEqual(Array.from(bvh.getAttribute('field').array),Array.from(brute.getAttribute('field').array));
  assert.deepEqual(Array.from(auto.getAttribute('field').array),Array.from(brute.getAttribute('field').array));
  assert.equal(auto.userData.attributeTransfer.acceleration,'bvh');
  assert.ok(bvh.userData.attributeTransfer.triangleTests < brute.userData.attributeTransfer.triangleTests * .35);
});

test('transfer can restrict source groups or require target-normal-facing source triangles',()=>{
  const source=new THREE.BufferGeometry();
  source.setAttribute('position',new THREE.Float32BufferAttribute([
    -1,-1,.12,1,-1,.12,1,1,.12,-1,1,.12,
    -1,-1,.04,-1,1,.04,1,1,.04,1,-1,.04,
  ],3));
  source.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);
  source.addGroup(0,6,0);source.addGroup(6,6,1);
  source.setAttribute('field',new THREE.Float32BufferAttribute([1,1,1,1,-1,-1,-1,-1],1));
  const target=new THREE.BufferGeometry();
  target.setAttribute('position',new THREE.Float32BufferAttribute([-.4,-.3,0,.4,-.3,0,0,.4,0],3));
  target.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));
  target.setIndex([0,1,2]);
  const plain=transferSurfaceAttributes(source,target,{attributes:['field'],acceleration:'bvh'});
  const grouped=transferSurfaceAttributes(source,target,{attributes:['field'],acceleration:'bvh',groupIndices:[0]});
  const facing=transferSurfaceAttributes(source,target,{attributes:['field'],acceleration:'bvh',minNormalDot:.5});
  assert.ok([...plain.getAttribute('field').array].every(v=>v<0));
  assert.ok([...grouped.getAttribute('field').array].every(v=>v>0));
  assert.ok([...facing.getAttribute('field').array].every(v=>v>0));
  assert.deepEqual(grouped.userData.attributeTransfer.groupIndices,[0]);
  assert.equal(facing.userData.attributeTransfer.minNormalDot,.5);
});
