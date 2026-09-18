import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {radialMass,sectionLoft} from '../src/lib/forms/structure.js';
import {shapeProfile} from '../src/lib/shape-rails.js';
import {surface} from '../src/lib/forms/surface.js';
import {limbFormSupport,scallopedLimb,deltoidMantle} from '../src/lib/cyber/limb-form.js';
import {sculptedTorsoSupport} from '../src/lib/cyber/mass-forms.js';
import {torsoSupport} from '../src/lib/cyber/torso-form.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
import {dispose,inspect} from '../src/lib/modeling.js';
const V=p=>new THREE.Vector3(...p);

test('direction profiles move radial peaks, wrap periodically, pin ends and reject invalid samples',()=>{
 const angle=shapeProfile([[0,0],[1,Math.PI/2]]),f=radialMass({at:.5,span:.4,angle,amount:.01});
 for(const v of [.2,.5,.8]){
  const u=angle(v)/(2*Math.PI);
  assert.ok(f(u,v)>f(u+.25,v));assert.ok(Math.abs(f(u,v)-f(u+1,v))<1e-12);
  assert.equal(f(u,0),0);assert.equal(f(u,1),0);
 }
 const a=radialMass({angle:.7}),b=radialMass({angle:()=>.7});
 for(const u of [.02,.3,.7])for(const v of [0,.35,.6,1])assert.equal(a(u,v),b(u,v));
 assert.throws(()=>radialMass({angle:NaN}));assert.throws(()=>radialMass({angle:()=>Infinity})(.2,.5));
 assert.throws(()=>radialMass({angle:()=>20})(.2,.5));
 const base={from:0,to:1,breadth:()=>.05,depth:()=>.04};
 const loft=sectionLoft({...base,masses:[f]}),plain=sectionLoft(base);
 assert.deepEqual(loft(.13,0),plain(.13,0));assert.deepEqual(loft(.76,1),plain(.76,1));
});
test('anatomical limb supports retain endpoints, seam continuity and finite outward normals',()=>{
 for(const type of ['thigh','shin','upper','forearm'])for(const side of [-1,1]){
  const a=limbFormSupport({type,side}),b=limbFormSupport({type,side,massStyle:'sculpted'}),s=surface(b,{wrapU:true});
  for(const u of [0,.1,.4,.65,1])for(const v of [0,1])assert.ok(V(a(u,v)).distanceTo(V(b(u,v)))<1e-12);
  for(let j=1;j<12;j++){
   const v=j/12;assert.ok(V(b(0,v)).distanceTo(V(b(1,v)))<1e-10);
   const center=V(b(.25,v)).add(V(b(.75,v))).multiplyScalar(.5);
   for(let i=0;i<24;i++){
    const u=i/24,n=s.normal(u,v),p=V(b(u,v));
    assert.ok(p.toArray().every(Number.isFinite));assert.ok(n.dot(p.sub(center))>0,type+' outward');
   }
  }
 }
 assert.throws(()=>limbFormSupport({massStyle:'bad'}));
});
test('posed anatomical torso uses the shared support field, not a baked object warp',()=>{
 const a=torsoSupport(),b=sculptedTorsoSupport(),pose={point:p=>[p[0]+.04,p[1],p[2]]},c=sculptedTorsoSupport({pose});
 for(const u of [.1,.4,.8])for(const v of [0,1])assert.ok(V(a(u,v)).distanceTo(V(b(u,v)))<1e-12);
 for(const u of [0,.3,.6,1])for(const v of [.2,.5,.8])assert.deepEqual(c(u,v),pose.point(b(u,v)));
});
test('new shape preserves pose, head, camera-independent attachments and planted feet',()=>{
 const spec={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',cables:false};
 const a=refinedAndroid(spec),b=refinedAndroid({...spec,massStyle:'sculpted'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const n of ['BodyGesture','HeadMount','Pack mount','Shoulder.Near','Shoulder.Far','Elbow.Near','Wrist.Near','Hip.Near','Hip.Far','Knee.Near','Knee.Far','Boot.L planted','Boot.R planted'])assert.deepEqual(a.getObjectByName(n).matrixWorld.elements,b.getObjectByName(n).matrixWorld.elements,n);
 assert.deepEqual(a.userData.poseGuide,b.userData.poseGuide);
 for(const n of ['Boot.L planted','Boot.R planted'])assert.ok(Math.abs(new THREE.Box3().setFromObject(b.getObjectByName(n)).min.y-.155)<1e-7);
 assert.ok(b.getObjectByName('Deltoid mantle'));assert.equal(a.getObjectByName('Deltoid mantle'),undefined);
 dispose(a);dispose(b);
});
test('sculpted limbs/mantles own deterministic UV geometry; no downstream rig/bake is asserted',()=>{
 for(const make of [()=>scallopedLimb({massStyle:'sculpted'},cyberMaterials()),()=>deltoidMantle({},cyberMaterials())]){
  const a=make(),b=make();assert.deepEqual(inspect(a),inspect(b));
  const peers=[];b.traverse(o=>{if(o.isMesh)peers.push(o);});let index=0;
  a.traverse(o=>{if(!o.isMesh)return;const other=peers[index++];assert.equal(o.name,other.name);assert.notEqual(o.geometry,other.geometry);assert.deepEqual(o.geometry.index.array,other.geometry.index.array);assert.deepEqual(o.geometry.attributes.position.array,other.geometry.attributes.position.array);assert.ok(o.geometry.attributes.uv);});
  dispose(a);dispose(b);
 }
});
