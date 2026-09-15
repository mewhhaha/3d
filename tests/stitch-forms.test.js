import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {surface,surfaceMesh}from'../src/lib/forms/surface.js';import{stitchFrames}from'../src/lib/forms/stitch.js';import{buildArm}from'../src/lib/forms/arm.js';import{dispose}from'../src/lib/modeling.js';
test('surface stitching shares normals, preserving separate UVs and every vertex position',()=>{
 const a=surfaceMesh('A',surface((u,v)=>[u,v,0]),{mode:'cage',segments:[4,4]});
 const b=surfaceMesh('B',surface((u,v)=>[u,v+1,.2*v]),{mode:'cage',segments:[4,4]});
 const before=[a,b].map(m=>({p:m.geometry.attributes.position.array.slice(),uv:m.geometry.attributes.uv.array.slice()}));
 const report=stitchFrames([a,b],{where:p=>Math.abs(p.y-1)<1e-8});assert.equal(report.sharedPoints,5);
 for(let k=0;k<2;k++){assert.deepEqual([a,b][k].geometry.attributes.position.array,before[k].p);assert.deepEqual([a,b][k].geometry.attributes.uv.array,before[k].uv);}
 dispose(a);dispose(b);
});
test('arm wrist port has identical normals on the hand and arm charts',()=>{
 const root=buildArm(undefined,{mode:'cage'}),lookup=new Map();let shared=0;
 for(const name of ['ArmSkin','Palm']){const g=root.getObjectByName(name).geometry,p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){if(Math.abs(p.getY(i))>1e-7)continue;const key=[p.getX(i),p.getZ(i)].map(v=>Math.round(v/1e-7)).join(',');
   const normal=new THREE.Vector3().fromBufferAttribute(n,i);if(lookup.has(key)){assert.ok(normal.distanceTo(lookup.get(key))<1e-7);shared++;}else lookup.set(key,normal);
  }
 }
 assert.ok(shared>48);assert.equal(root.userData.wristStitch.sharedPoints,48);dispose(root);
});
