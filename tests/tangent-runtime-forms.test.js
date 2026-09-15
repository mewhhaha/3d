import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {computeTangents,tangentRuntimeStats}from'../src/lib/tangents.js';
import{computeMikkTSpaceTangents}from'three/addons/utils/BufferGeometryUtils.js';import * as original from'three/addons/libs/mikktspace.module.js';
await original.ready;
test('recycling Mikk scratch memory preserves exact tangents and owned result buffers',()=>{
 const expected=new THREE.SphereGeometry(1,32,24);computeMikkTSpaceTangents(expected,original,true);
 let first,firstValues;
 for(let i=0;i<24;i++){
  const g=new THREE.SphereGeometry(1,32,24);computeTangents(g,{memoryBudget:1024*1024});
  assert.deepEqual(g.attributes.tangent.array,expected.attributes.tangent.array);
  if(!first){first=g;firstValues=g.attributes.tangent.array.slice();}else g.dispose();
 }
 assert.ok(tangentRuntimeStats().resets>=20);assert.deepEqual(first.attributes.tangent.array,firstValues);
 assert.ok(tangentRuntimeStats().peakBytes<64*1024*1024,JSON.stringify(tangentRuntimeStats()));
 expected.dispose();first.dispose();
});
