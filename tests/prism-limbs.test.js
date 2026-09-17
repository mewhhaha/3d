import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {prismGuide} from '../src/lib/cyber/reference-layout.js';import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {scallopedLimb,articulatedBoot} from '../src/lib/cyber/limb-form.js';import {cyberMaterials} from '../src/lib/cyber/mechanics.js';import {inspect,dispose} from '../src/lib/modeling.js';
const V=p=>new T.Vector3(...p);
test('relaxed pose keeps feet, hip, shoulder, head and reactor anchors; both links retain exact lengths',()=>{
 const a=prismGuide(),b=prismGuide({poseStyle:'relaxed'});
 for(const n of ['head','chest','pelvis','reactor','ankleNear','ankleFar','hipNear','hipFar','shoulderNear','shoulderFar','wristFar'])assert.deepEqual(a.point(n),b.point(n),n);
 for(const side of ['Near','Far'])for(const [start,end,len]of [['shoulder','elbow',.25],['elbow','wrist',.30],['hip','knee',.43],['knee','ankle',.45]])assert.ok(Math.abs(V(b.point(start+side)).distanceTo(V(b.point(end+side)))-len)<1e-9);
 assert.ok(V(a.point('wristNear')).distanceTo(V(b.point('wristNear')))>.0089);
 assert.throws(()=>prismGuide({poseStyle:'wrong'}));
});
test('scalloped shape changes do not move mounts or replace the head/torso when pose stays fixed',()=>{
 const opts={headStyle:'illustrated',bodyStyle:'articulated',cables:false};const a=refinedAndroid(opts),b=refinedAndroid({...opts,limbStyle:'scalloped'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const n of ['BodyGesture','HeadMount','Shoulder.Near','Elbow.Near','Wrist.Near','Hip.Near','Knee.Near','Hip.Far','Knee.Far','Boot.L planted','Boot.R planted','Pack mount'])assert.deepEqual(a.getObjectByName(n).matrixWorld.elements,b.getObjectByName(n).matrixWorld.elements,n);
 assert.deepEqual(a.userData.poseGuide,b.userData.poseGuide);assert.ok(b.getObjectByName('Calf lateral emitter'));assert.equal(b.getObjectByName('Shin neon inset'),undefined);dispose(a);dispose(b);
});
test('limb shells own buffers and UVs; boots preserve the physical planted sole datum',()=>{
 for(const fn of [m=>scallopedLimb({type:'thigh'},m),m=>scallopedLimb({type:'shin',side:-1},m),m=>articulatedBoot({},m)]){
  const a=fn(cyberMaterials()),b=fn(cyberMaterials());assert.deepEqual(inspect(a),inspect(b));
  a.traverse(o=>{if(!o.isMesh)return;assert.ok(o.geometry.index);assert.ok(o.geometry.attributes.uv);assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));assert.notEqual(o.geometry,b.getObjectByName(o.name).geometry);});
  if(a.name==='Boot.L'){for(const side of [-1,1])assert.ok(a.getObjectByName('Ankle fork '+side+' / ceramic').geometry.attributes.normal.getX(0)*side>.8,'fork normal must face outside the boot');a.updateMatrixWorld(true);assert.ok(Math.abs(new T.Box3().setFromObject(a).min.y+.0435)<1e-7);}
  dispose(a);dispose(b);
 }
});
test('relaxed segment endpoints mate exactly and new soles contact the unchanged deck height',()=>{
 const r=refinedAndroid({headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',cables:false});r.updateMatrixWorld(true);
 for(const side of ['Near','Far'])for(const [parent,child,length]of [['Shoulder','Elbow',.242],['Elbow','Wrist',.225],['Hip','Knee',.428]]){
  const end=r.getObjectByName(parent+'.'+side+' fitted length').localToWorld(new T.Vector3(0,-length,0));
  const start=r.getObjectByName(child+'.'+side).getWorldPosition(new T.Vector3());assert.ok(end.distanceTo(start)<1e-10,parent+side+' is disconnected');
 }
 for(const n of ['Boot.L planted','Boot.R planted'])assert.ok(Math.abs(new T.Box3().setFromObject(r.getObjectByName(n)).min.y-.155)<1e-7,n+' not planted');
 dispose(r);
});
