import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {dispose,inspect} from '../src/lib/modeling.js';
const V=p=>new T.Vector3(...p),values={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged',emitterStyle:'mapped',girdleStyle:'connected',cables:false};
const geometries=o=>{const out=[];o.traverse(n=>{if(n.isMesh)out.push(n.geometry);});return out;};
function sameBuffers(a,b){assert.equal(a.length,b.length);a.forEach((g,i)=>{assert.deepEqual(g.index?.array,b[i].index?.array);for(const key of ['position','normal','uv','tangent'])assert.deepEqual(g.attributes[key]?.array,b[i].attributes[key]?.array);});}
test('seated modules pin emitter centers while preserving skeletal pose and all unrelated mesh buffers',()=>{
 const a=refinedAndroid(values),b=refinedAndroid({...values,shoulderStyle:'seated'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 assert.deepEqual(a.userData.poseGuide,b.userData.poseGuide);
 for(const name of ['HeadMount','BodyGesture','Shoulder.Near','Shoulder.Far','Elbow.Near','Elbow.Far','Hip.Near','Hip.Far','Knee.Near','Knee.Far','Wrist.Near','Wrist.Far','Pack mount','Boot.L planted','Boot.R planted'])assert.deepEqual(a.getObjectByName(name).matrixWorld.elements,b.getObjectByName(name).matrixWorld.elements,name);
 for(const name of ['HeadMount','Wrist.Near','Wrist.Far','Boot.L planted','Boot.R planted','Torso','Hip.Near','Knee.Near'])sameBuffers(geometries(a.getObjectByName(name)),geometries(b.getObjectByName(name)));
 for(const suffix of ['L','R']){
  const old=a.getObjectByName('Shoulder.'+suffix).getObjectByName('Shoulder neon module'),next=b.getObjectByName('Shoulder.'+suffix).getObjectByName('Shoulder neon module');
  sameBuffers(geometries(old),geometries(next));assert.ok(old.getWorldPosition(new T.Vector3()).distanceTo(next.getWorldPosition(new T.Vector3()))<1e-12);
  const seat=next.parent;assert.equal(seat.name,'Shoulder optical seat');
  assert.ok(V([0,0,1]).transformDirection(seat.matrixWorld).angleTo(V(seat.userData.aim.direction).normalize())<3e-8);
 }
 assert.throws(()=>refinedAndroid({...values,shoulderStyle:'invalid'}));dispose(a);dispose(b);
});
test('sleeve reaches sphere and aimed back ring; cowl vertices stay outside the shoulder core',()=>{
 for(const gestureStyle of ['fixed','counterpose']){
 const root=refinedAndroid({...values,gestureStyle,shoulderStyle:'seated'});root.updateMatrixWorld(true);
 for(const suffix of ['L','R']){
  const shoulder=root.getObjectByName('Shoulder.'+suffix),seat=shoulder.getObjectByName('Shoulder optical seat'),sleeve=shoulder.getObjectByName('Shoulder optical seat sleeve');
  const p=sleeve.geometry.attributes.position,R=seat.userData.aim.ballRadius;
  const intoSeat=seat.matrix.clone().invert();
  for(let i=0;i<=40;i++){
   assert.ok(Math.abs(V([p.getX(i),p.getY(i),p.getZ(i)]).length()-R)<1e-7);
   const j=5*41+i,q=V([p.getX(j),p.getY(j),p.getZ(j)]).applyMatrix4(intoSeat);
   assert.ok(Math.abs(q.z+.014)<1e-7);assert.ok(Math.abs(Math.hypot(q.x,q.y)-.035)<1e-7);
  }
  const cowl=seat.getObjectByName('Scalloped shoulder shell');let minimum=Infinity;
  cowl.traverse(o=>{if(!o.isMesh)return;const m=shoulder.matrixWorld.clone().invert().multiply(o.matrixWorld),a=o.geometry.attributes.position;
   for(let i=0;i<a.count;i++){const q=V([a.getX(i),a.getY(i),a.getZ(i)]).applyMatrix4(m);minimum=Math.min(minimum,q.length());}
  });assert.ok(minimum>R,`cowl/core vertex clearance ${minimum-R}`);
 }
 dispose(root);
 }
});
test('new assemblies are deterministic and independently owned',()=>{
 const a=refinedAndroid({...values,shoulderStyle:'seated'}),b=refinedAndroid({...values,shoulderStyle:'seated'});assert.deepEqual(inspect(a),inspect(b));
 const x=geometries(a),y=geometries(b);x.forEach((g,i)=>{assert.notEqual(g,y[i]);assert.ok(g.attributes.position.array.every(Number.isFinite));});dispose(a);dispose(b);
});
