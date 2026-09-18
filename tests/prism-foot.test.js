import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {bridgedBoot} from '../src/lib/cyber/foot-form.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {inspect,dispose} from '../src/lib/modeling.js';
const base={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'sculpted',handStyle:'relaxed',panelStyle:'cutaway'};
test('bridged feet have aperture walls, finite UVs and the original planted datum',()=>{
 for(const side of [-1,1]){
  const a=bridgedBoot({side},cyberMaterials()),b=bridgedBoot({side},cyberMaterials());
  assert.deepEqual(inspect(a),inspect(b));assert.ok(Math.abs(new THREE.Box3().setFromObject(a).min.y+.0435)<1e-7);
  assert.ok(a.getObjectByName('Apertured sole carrier 1').geometry.userData.surfaceContour.holes.length===2);
  assert.ok(a.getObjectByName('Open heel buttress 1 / ceramic').geometry.userData.surfaceContour.holes.length===1);
  a.traverse(o=>{if(!o.isMesh)return;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok(o.geometry.attributes.uv);assert.notEqual(o.geometry,b.getObjectByName(o.name).geometry);});
  dispose(a);dispose(b);
 }
 assert.throws(()=>bridgedBoot({side:0},cyberMaterials()));
});
test('new boot variant preserves body, limbs, hand/head buffers and joint frames',()=>{
 const a=refinedAndroid(base),b=refinedAndroid({...base,footStyle:'bridged'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const name of ['HeadMount','BodyGesture','Hip.Near','Knee.Near','Shoulder.Near','Elbow.Near','Wrist.Near','Hip.Far','Knee.Far','Pack mount','Boot.L planted','Boot.R planted'])assert.deepEqual(a.getObjectByName(name).matrixWorld.elements,b.getObjectByName(name).matrixWorld.elements,name);
 for(const name of ['HeadMount','BodyGesture','Wrist.Near','Knee.Near']){
  const left=a.getObjectByName(name),right=b.getObjectByName(name);
  const ga=[],gb=[];left.traverse(o=>{if(o.isMesh)ga.push(o.geometry);});right.traverse(o=>{if(o.isMesh)gb.push(o.geometry);});
  assert.equal(ga.length,gb.length);for(let i=0;i<ga.length;i++){assert.deepEqual(ga[i].attributes.position.array,gb[i].attributes.position.array);assert.deepEqual(ga[i].index?.array,gb[i].index?.array);}
 }
 for(const name of ['Boot.L planted','Boot.R planted'])assert.ok(Math.abs(new THREE.Box3().setFromObject(b.getObjectByName(name)).min.y-.155)<1e-6);
 assert.throws(()=>refinedAndroid({...base,footStyle:'other'}));dispose(a);dispose(b);
});
