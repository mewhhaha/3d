import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {articulatedHand} from '../src/lib/cyber/hand-form.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {inspect,dispose} from '../src/lib/modeling.js';
const meshes=r=>{const out=[];r.traverse(o=>{if(o.isMesh)out.push(o);});return out;};

test('mechanical digits have fixed lengths across poses and mirrored root/tip locations',()=>{
 for(const pose of ['open','relaxed','grasp']){
  const hands=[1,-1].map(side=>articulatedHand({side,pose},cyberMaterials()));hands.forEach(h=>h.updateMatrixWorld(true));
  for(const name of ['Digit 1','Digit 2','Digit 3','Digit 4','Opposing thumb']){
   const chains=hands.map(h=>h.getObjectByName(name));
   chains.forEach(chain=>{const {lengths,joints,tip}=chain.userData.rigidChain;for(let i=0;i<lengths.length;i++){const a=chain.getObjectByName(joints[i]).getWorldPosition(new THREE.Vector3()),b=chain.getObjectByName(joints[i+1]||tip).getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(a.distanceTo(b)-lengths[i])<1e-10);}});
   const tips=hands.map(h=>h.getObjectByName(name+' tip').getWorldPosition(new THREE.Vector3()));assert.ok(tips[0].clone().multiply(new THREE.Vector3(-1,1,1)).distanceTo(tips[1])<1e-10);
  }
  hands.forEach(dispose);
 }
});

test('hand geometry is deterministic, finite, UV-equipped and independently owned',()=>{
 const a=articulatedHand({},cyberMaterials()),b=articulatedHand({},cyberMaterials()),aa=meshes(a),bb=meshes(b);
 assert.equal(aa.length,bb.length);
 aa.forEach((o,i)=>{assert.equal(o.name,bb[i].name);assert.notEqual(o.geometry,bb[i].geometry);assert.notEqual(o.material,bb[i].material);for(const key of ['position','normal','uv']){assert.ok(o.geometry.attributes[key].array.every(Number.isFinite));assert.deepEqual(o.geometry.attributes[key].array,bb[i].geometry.attributes[key].array);}});
 assert.deepEqual(inspect(a),inspect(b));dispose(a);dispose(b);
 assert.throws(()=>articulatedHand({pose:'bad'},cyberMaterials()));assert.throws(()=>articulatedHand({side:0},cyberMaterials()));
});

test('new hand and cutaway plates leave pose, contact and scored emitter transforms unchanged',()=>{
 const values={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'sculpted',cables:false};
 const a=refinedAndroid(values),b=refinedAndroid({...values,handStyle:'relaxed',panelStyle:'cutaway'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const name of ['BodyGesture','HeadMount','Hip.Near','Hip.Far','Knee.Near','Knee.Far','Shoulder.Near','Shoulder.Far','Elbow.Near','Elbow.Far','Wrist.Near','Wrist.Far','Pack mount','Boot.L planted','Boot.R planted','Palm status port'])assert.deepEqual(a.getObjectByName(name).matrixWorld.elements,b.getObjectByName(name).matrixWorld.elements,name);
 for(const name of ['Rounded crown','Swept toe cap']){const aa=meshes(a.getObjectByName(name)),bb=meshes(b.getObjectByName(name));assert.ok(aa.length>0);assert.equal(aa.length,bb.length);aa.forEach((o,i)=>assert.deepEqual(o.geometry.attributes.position.array,bb[i].geometry.attributes.position.array));}
 assert.equal(a.getObjectByName('Digit 1'),undefined);assert.ok(b.getObjectByName('Digit 1'));assert.ok(b.getObjectByName('Clavicular sweep 1'));
 dispose(a);dispose(b);
});

test('FK pose changes only transforms, not owned phalanx topology, UVs or material assignments',()=>{
 const a=articulatedHand({pose:'open'},cyberMaterials()),b=articulatedHand({pose:'grasp'},cyberMaterials()),aa=meshes(a),bb=meshes(b);
 assert.equal(aa.length,bb.length);aa.forEach((o,i)=>{assert.equal(o.name,bb[i].name);assert.deepEqual(o.geometry.index?.array,bb[i].geometry.index?.array);for(const key of ['position','normal','uv'])assert.deepEqual(o.geometry.attributes[key].array,bb[i].geometry.attributes[key].array);});
 assert.ok(a.getObjectByName('Dorsal digit ceramic 0').geometry.attributes.normal.getZ(0)>.8,'dorsal plate faces away from the palm');
 a.updateMatrixWorld(true);b.updateMatrixWorld(true);assert.ok(a.getObjectByName('Digit 2 tip').getWorldPosition(new THREE.Vector3()).distanceTo(b.getObjectByName('Digit 2 tip').getWorldPosition(new THREE.Vector3()))>.03);
 dispose(a);dispose(b);
});
