import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {slideRootForBend,twoLinkPose} from '../src/lib/two-link-pose.js';
import {humanoidProportions,humanoidRig,humanoidPose,poseHumanoid} from '../src/lib/humanoid-rig.js';
import {humanoidMannequin} from '../src/lib/humanoid-mannequin.js';
import {shotProportions,shotPose,stancePose} from '../studies/prism-mannequin-pose.js';
import {dispose} from '../src/lib/modeling.js';
const V=p=>new T.Vector3(...p),close=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const at=(rig,name)=>rig.bones[name].getWorldPosition(new T.Vector3());

test('root slide hits authored flexion with fixed endpoint, lengths and independent bend plane',()=>{
 for(const scale of [.01,1,3])for(const bendDegrees of [0,8,35,100,160]){
  const args={root:[.015*scale,.40*scale,0],target:[0,0,0],lengths:[.30*scale,.27*scale],bendDegrees,maxSlide:scale};
  const original=structuredClone(args),s=slideRootForBend(args);
  const pose=twoLinkPose({...s,pole:[0,0,scale]});
  close(pose.bendDegrees,bendDegrees,2e-5);assert.deepEqual(args,original);assert.deepEqual(s.target,args.target);
  close(s.root[0],args.root[0]);close(s.root[2],args.root[2]);
  close(V(pose.joint).distanceTo(V(s.root)),args.lengths[0]);
  close(V(pose.joint).distanceTo(V(s.target)),args.lengths[1]);
 }
});
test('slide works along a nonvertical fixture axis and selects the nearest branch',()=>{
 const s=slideRootForBend({root:[-.5,.02,0],target:[0,0,0],direction:[2,0,0],lengths:[.4,.3],bendDegrees:35,maxSlide:.3});
 assert.ok(s.root[0]<0);close(s.root[1],.02);close(s.offset[1],0);
 const solved=twoLinkPose({...s,pole:[0,0,1]});close(solved.bendDegrees,35);
 s.target[0]=9;const b=slideRootForBend({root:[.5,0,0],target:[0,0,0],lengths:[.3,.3],bendDegrees:0,direction:[1,0,0],maxSlide:.2});close(b.root[0],.6);
});
test('unreachable, unbounded, singular and overflowing slide data fail explicitly',()=>{
 const p={root:[0,1,0],target:[0,0,0],lengths:[.6,.6],bendDegrees:10,maxSlide:.5};
 for(const opts of [{bendDegrees:180},{bendDegrees:-1},{direction:[0,0,0]},{direction:[Infinity,0,0]},{maxSlide:Infinity},{maxSlide:-1},{maxSlide:0},{lengths:[0,.6]},{root:[4,1,0]},{lengths:[1e308,1e308]}])assert.throws(()=>slideRootForBend({...p,...opts}));
});
test('support control generalizes across slender/broad proportions and scale without stretching',()=>{
 for(const build of ['slender','broad'])for(const height of [1.4,1.72,2.1]){
  const r=humanoidRig(humanoidProportions({build,height}));
  const definition={...humanoidPose('contrapposto'),support:{side:'Right',bend:12,maxShift:.08}};
  const result=poseHumanoid(r,definition);close(result.Right.leg.bendDegrees,12);
  for(const side of ['Left','Right']){
   close(at(r,side+'UpLeg').distanceTo(at(r,side+'Leg')),r.proportions.thigh);
   close(at(r,side+'Leg').distanceTo(at(r,side+'Foot')),r.proportions.shin);
   assert.ok(at(r,side+'Foot').distanceTo(V(result[side].ankle))<1e-8);
   assert.ok(at(r,side+'Hand').distanceTo(V(result[side].wrist))<1e-8);
  }
  r.skeleton.dispose();
 }
});
test('shot support holds wrist/ankle targets and restores the entire rig if the other leg cannot reach',()=>{
 const r=humanoidRig(humanoidProportions(shotProportions));
 const prior=poseHumanoid(r,shotPose),next=poseHumanoid(r,stancePose);
 close(next.Left.leg.bendDegrees,14);assert.ok(next.Right.leg.bendDegrees>20);
 for(const side of ['Left','Right'])for(const key of ['wrist','ankle'])assert.deepEqual(next[side][key],prior[side][key]);
 const before=r.skeleton.bones.map(b=>b.matrixWorld.toArray());
 assert.throws(()=>poseHumanoid(r,{...shotPose,support:{side:'Left',bend:5,maxShift:.1}}),/unreachable/);
 assert.deepEqual(r.skeleton.bones.map(b=>b.matrixWorld.toArray()),before);
 for(const support of [null,{side:'other',bend:12,maxShift:.08},{side:'Left',bend:NaN,maxShift:.1}])assert.throws(()=>poseHumanoid(r,{...shotPose,support}));
 assert.deepEqual(r.skeleton.bones.map(b=>b.matrixWorld.toArray()),before);r.skeleton.dispose();
});
test('same simple skins and T bind serve before/after stance clips; both soles remain planted',()=>{
 const a=humanoidMannequin({...shotProportions,poses:{shot:shotPose}}),b=humanoidMannequin({...shotProportions,poses:{stance:stancePose}});
 a.traverse(o=>{if(!o.isSkinnedMesh)return;const n=b.getObjectByName(o.name);
  assert.notEqual(o.geometry,n.geometry);assert.deepEqual(o.geometry.index.array,n.geometry.index.array);
  for(const attr of ['position','normal','uv','skinIndex','skinWeight'])assert.deepEqual(o.geometry.attributes[attr].array,n.geometry.attributes[attr].array);
 });
 const mixer=new T.AnimationMixer(b);mixer.clipAction(b.animations[0]).play();mixer.setTime(.5);b.updateMatrixWorld(true);b.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 for(const side of ['Left','Right']){
  const foot=b.getObjectByName(side+' foot');let minimum=Infinity;
  for(let i=0;i<foot.geometry.attributes.position.count;i++)minimum=Math.min(minimum,foot.getVertexPosition(i,new T.Vector3()).y);
  close(minimum,0,2e-7);
 }
 mixer.stopAllAction();mixer.uncacheRoot(b);dispose(a);dispose(b);
});
