import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {articulatedTorso,torsoSupport,scallopedShoulder} from '../src/lib/cyber/torso-form.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
import {inspect,dispose} from '../src/lib/modeling.js';

test('body replacement leaves head, articulated limbs and reactor transforms unchanged',()=>{
 const a=refinedAndroid({headStyle:'illustrated',bodyStyle:'legacy',cables:false}),b=refinedAndroid({headStyle:'illustrated',bodyStyle:'articulated',cables:false});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const name of ['BodyGesture','HeadMount','Shoulder.Near','Shoulder.Far','Hip.Near','Hip.Far','Knee.Near','Knee.Far','Wrist.Near','Wrist.Far','Pack mount'])assert.deepEqual(a.getObjectByName(name).matrixWorld.elements,b.getObjectByName(name).matrixWorld.elements,name);
 assert.deepEqual(a.userData.poseGuide,b.userData.poseGuide);
 assert.equal(b.getObjectByName('Iliac ceramic girdle'),undefined);assert.ok(b.getObjectByName('Swept iliac rim 1'));assert.ok(b.getObjectByName('Rounded crown'));
 assert.throws(()=>refinedAndroid({bodyStyle:'unknown'}));dispose(a);dispose(b);
});
test('contoured torso and shoulder are deterministic, independently owned named meshes with UVs',()=>{
 for(const build of [articulatedTorso,scallopedShoulder]){
  const a=build(cyberMaterials()),b=build(cyberMaterials());let n=0;
  a.traverse(o=>{if(!o.isMesh)return;n++;assert.ok(o.geometry.attributes.uv);const other=b.getObjectByName(o.name);assert.ok(other);assert.notEqual(o.geometry,other.geometry);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));});
  assert.ok(n>=2);assert.deepEqual(inspect(a),inspect(b));dispose(a);dispose(b);
 }
});
test('body support waist is smaller than rib and pelvis without moving its height interval',()=>{
 const s=torsoSupport();const width=v=>new THREE.Vector3(...s(.75,v)).distanceTo(new THREE.Vector3(...s(.25,v)));
 assert.ok(width(.42)<width(.80)*.7);assert.ok(width(.42)<width(.13)*.7);
 assert.equal(s(.5,0)[1],.935);assert.equal(s(.5,1)[1],1.517);
});
