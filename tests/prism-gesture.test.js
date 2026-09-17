import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {prismGuide} from '../src/lib/cyber/reference-layout.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {torsoGesture} from '../src/lib/cyber/body-gesture.js';
import {torsoSupport} from '../src/lib/cyber/torso-form.js';
import {jointSocketShell} from '../src/lib/cyber/joint-housings.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
import {dispose} from '../src/lib/modeling.js';
const V=p=>new T.Vector3(...p);
test('body counterpose moves pelvis/ribs, not targets; chains stay connected at exact lengths',()=>{
 for(const poseStyle of ['reference','relaxed']){
  const a=prismGuide({poseStyle}),b=prismGuide({poseStyle,gestureStyle:'counterpose'});
  for(const n of ['ankleNear','ankleFar','wristNear','wristFar','head','reactor'])assert.deepEqual(a.point(n),b.point(n),n);
  assert.notDeepEqual(a.point('pelvis'),b.point('pelvis'));assert.notDeepEqual(a.point('shoulderNear'),b.point('shoulderNear'));
  for(const side of ['Near','Far'])for(const [r,j,len] of [['hip','knee',.43],['knee','ankle',.45],['shoulder','elbow',.25],['elbow','wrist',.30]])assert.ok(Math.abs(V(b.point(r+side)).distanceTo(V(b.point(j+side)))-len)<1e-10);
 }
 assert.throws(()=>prismGuide({gestureStyle:'oops'}));
});
test('posed support and shared frame agree, with a fixed neck endpoint and owned stations',()=>{
 const f=torsoGesture('counterpose'),s=torsoSupport(),p=torsoSupport({pose:f});
 for(const u of [0,.2,.5,.8,1])for(const v of [0,.15,.42,.75,1])assert.deepEqual(p(u,v),f.point(s(u,v)));
 assert.deepEqual(f.point([0,1.619,-.011]),[0,1.619,-.011]);
});
test('new pose preserves foot contact, targets/head orientation, base body mount and attachment continuity',()=>{
 const spec={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',cables:false};
 const a=refinedAndroid(spec),b=refinedAndroid({...spec,gestureStyle:'counterpose'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const name of ['BodyGesture','HeadMount','Boot.L planted','Boot.R planted','Pack mount'])assert.deepEqual(a.getObjectByName(name).matrixWorld.elements,b.getObjectByName(name).matrixWorld.elements,name);
 // Wrist position stays fixed, but hand orientation follows the re-solved forearm.
 for(const side of ['Near','Far'])for(const [r,j,len] of [['Shoulder','Elbow',.242],['Elbow','Wrist',.225],['Hip','Knee',.428]]){
  const end=b.getObjectByName(r+'.'+side+' fitted length').localToWorld(new T.Vector3(0,-len,0));
  assert.ok(end.distanceTo(b.getObjectByName(j+'.'+side).getWorldPosition(new T.Vector3()))<1e-10,r+side);
 }
 for(const name of ['Boot.L planted','Boot.R planted'])assert.ok(Math.abs(new T.Box3().setFromObject(b.getObjectByName(name)).min.y-.155)<1e-7);
 dispose(a);dispose(b);
});

test('joint cowls have outward normals, owned UV geometry and never relocate the hinge',()=>{
 for(const side of [-1,1])for(const radius of [.037,.071]){
  const a=jointSocketShell({side,radius},cyberMaterials()),b=jointSocketShell({side,radius},cyberMaterials());
  const mesh=a.getObjectByName('Joint socket shell cowl / ceramic');
  assert.ok(mesh.geometry.attributes.normal.getX(0)*side>0);
  assert.ok(mesh.geometry.index);assert.ok(mesh.geometry.attributes.uv);
  assert.notEqual(mesh.geometry,b.getObjectByName(mesh.name).geometry);
  assert.deepEqual(a.position.toArray(),[0,0,0]);dispose(a);dispose(b);
 }
 const base={limbStyle:'scalloped',bodyStyle:'articulated',cables:false};
 const a=refinedAndroid(base),b=refinedAndroid({...base,jointStyle:'housed'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const n of ['Hip.L','Hip.R','Elbow.L','Elbow.R','Shoulder.L','Shoulder.R'])assert.deepEqual(a.getObjectByName(n).matrixWorld.elements,b.getObjectByName(n).matrixWorld.elements,n);
 assert.ok(b.getObjectByName('Iliac socket L'));assert.ok(b.getObjectByName('Elbow clevis R'));dispose(a);dispose(b);
});
