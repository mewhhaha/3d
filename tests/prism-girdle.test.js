import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {torsoGesture} from '../src/lib/cyber/body-gesture.js';
import {torsoSupport} from '../src/lib/cyber/torso-form.js';
import {dispose,inspect} from '../src/lib/modeling.js';
const values={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged',emitterStyle:'mapped',cables:false};
const V=p=>new T.Vector3(...p),distance=(a,b)=>V(a).distanceTo(V(b));
test('girdle keeps all pose anchors, emitters and unaffected geometry; old defaults remain explicit',()=>{
 const a=refinedAndroid(values),b=refinedAndroid({...values,girdleStyle:'connected'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const name of ['BodyGesture','HeadMount','Shoulder.Near','Shoulder.Far','Hip.Near','Hip.Far','Knee.Near','Knee.Far','Wrist.Near','Wrist.Far','Pack mount','Boot.L planted','Boot.R planted'])assert.deepEqual(a.getObjectByName(name).matrixWorld.elements,b.getObjectByName(name).matrixWorld.elements,name);
 assert.deepEqual(a.userData.poseGuide,b.userData.poseGuide);
 for(const name of ['HeadMount','Wrist.Near','Wrist.Far','Hip.Near','Knee.Near','Boot.L planted','Boot.R planted','Shoulder neon module']){
  const list=root=>{const out=[];root.getObjectByName(name).traverse(o=>{if(o.isMesh)out.push(o.geometry);});return out;};
  const aa=list(a),bb=list(b);assert.equal(aa.length,bb.length);
  aa.forEach((g,i)=>{assert.deepEqual(g.index?.array,bb[i].index?.array);for(const key of ['position','normal','uv','tangent'])assert.deepEqual(g.attributes[key]?.array,bb[i].attributes[key]?.array);});
 }
 assert.ok(a.getObjectByName('Cervical column'));assert.equal(b.getObjectByName('Cervical column'),undefined);
 assert.ok(b.getObjectByName('Connected shoulder girdle'));assert.throws(()=>refinedAndroid({girdleStyle:'wrong'}));
 dispose(a);dispose(b);
});
test('bridge ends lie on posed shoulder balls and the cervical connector reaches the head-local saddle',()=>{
 for(const gestureStyle of ['fixed','counterpose']){
 const root=refinedAndroid({...values,girdleStyle:'connected',gestureStyle});root.updateMatrixWorld(true);
 const torso=root.getObjectByName('Torso'),g=root.getObjectByName('Connected shoulder girdle'),data=g.userData.girdle;
 assert.equal(data.bindings.length,6);
 const transform=owner=>torso.matrixWorld.clone().invert().multiply(owner.matrixWorld);
 const head=root.getObjectByName('HeadMount'),expected=V([0,-.112,0]).applyMatrix4(transform(head)).toArray();assert.ok(distance(expected,data.neckEnd)<1e-12);
 const support=torsoSupport({pose:gestureStyle==='fixed'?null:torsoGesture(gestureStyle),massStyle:'structured'});
 const collar=root.getObjectByName('Cervical collar transition').geometry.attributes.position;
 for(let i=0;i<=48;i++)assert.ok(distance([collar.getX(i),collar.getY(i),collar.getZ(i)],support(i/48,1))<1e-7,'torso/collar shared boundary');
 for(const binding of data.bindings){
  const shoulder=root.getObjectByName(binding.to),local=V(binding.end).applyMatrix4(transform(shoulder).invert());
  assert.ok(Math.abs(local.length()-.069*.82)<1e-12,'shoulder contact');
  if(binding.name.startsWith('Clavicular'))assert.ok(distance(binding.start,support(binding.to.endsWith('L')?.543:.457,.957))<1e-12);
  const geometry=root.getObjectByName(binding.name+' / flex').geometry,p=geometry.attributes.position;
  const nu=10,nv=14;const at=i=>[p.getX(i),p.getY(i),p.getZ(i)];
  assert.ok(distance(at(5),binding.start)<1e-7);assert.ok(distance(at(nv*(nu+1)+5),binding.end)<1e-7);
 }
 dispose(root);
 }
});
test('girdle has independent finite geometry, named UVs and real shoulder apertures',()=>{
 const a=refinedAndroid({...values,girdleStyle:'connected'}),b=refinedAndroid({...values,girdleStyle:'connected'});
 assert.deepEqual(inspect(a),inspect(b));
 const geometryList=root=>{const out=[];root.getObjectByName('Connected shoulder girdle').traverse(o=>{if(o.isMesh)out.push(o.geometry);});return out;};
 const aa=geometryList(a),bb=geometryList(b);aa.forEach((g,i)=>{assert.notEqual(g,bb[i]);assert.ok(g.attributes.uv);assert.ok([...g.attributes.position.array].every(Number.isFinite));});
 for(const suffix of ['L','R']){
  const cowl=a.getObjectByName('Shoulder.'+suffix).getObjectByName('Scalloped shoulder shell');assert.equal(cowl.userData.construction.outline.length,14);
  assert.equal(cowl.userData.socketCover.apertureRadius,.040);
 }
 dispose(a);dispose(b);
});
