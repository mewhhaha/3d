import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {humanoidRig,humanoidProportions,humanoidPose,poseHumanoid} from '../src/lib/humanoid-rig.js';
import {humanoidMannequin} from '../src/lib/humanoid-mannequin.js';
import {shotProportions,shotPose} from '../studies/prism-mannequin-pose.js';
import {dispose,inspect} from '../src/lib/modeling.js';
const V=p=>new T.Vector3(...p),at=(r,n)=>r.bones[n].getWorldPosition(new T.Vector3());
const q=a=>new T.Quaternion().setFromEuler(new T.Euler(...a.map(T.MathUtils.degToRad),'XYZ'));
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
test('shot reach, ground contact and head direction are exact without bone stretching',()=>{
 const d=humanoidProportions(shotProportions),r=humanoidRig(d),before=r.skeleton.bones.map(b=>b.position.clone());
 const result=poseHumanoid(r,shotPose);
 for(const side of ['Left','Right']){
  assert.ok(at(r,side+'Hand').distanceTo(V(shotPose.targets[side].wrist).multiplyScalar(d.height))<1e-8);
  assert.ok(at(r,side+'Foot').distanceTo(V(shotPose.targets[side].ankle).multiplyScalar(d.height))<1e-8);
  near(at(r,side+'Arm').distanceTo(at(r,side+'ForeArm')),d.upperArm);
  near(at(r,side+'ForeArm').distanceTo(at(r,side+'Hand')),d.forearm);
  near(at(r,side+'UpLeg').distanceTo(at(r,side+'Leg')),d.thigh);
  near(at(r,side+'Leg').distanceTo(at(r,side+'Foot')),d.shin);
  assert.ok(result[side].leg.joint.every(Number.isFinite));
 }
 near(Math.abs(r.bones.Head.getWorldQuaternion(new T.Quaternion()).dot(q(shotPose.headWorld))),1);
 r.skeleton.bones.forEach((b,i)=>{if(b.name!=='Hips')assert.deepEqual(b.position.toArray(),before[i].toArray());});
 r.skeleton.dispose();
});
test('normalized controls scale with stature and work on broad as well as slender figures',()=>{
 let reference;
 for(const height of [1.4,1.8,2.1])for(const build of ['slender','broad']){
  const scale=height/shotProportions.height;
  const d=humanoidProportions({...shotProportions,build,height,legLength:shotProportions.legLength*scale,shoulderSpan:shotProportions.shoulderSpan*scale,hipSpan:shotProportions.hipSpan*scale,shoulderHeight:shotProportions.shoulderHeight*scale,ankleHeight:shotProportions.ankleHeight*scale});
  const r=humanoidRig(d);poseHumanoid(r,shotPose);const normalized=r.skeleton.bones.map(b=>b.getWorldPosition(new T.Vector3()).divideScalar(height));
  if(reference)normalized.forEach((p,i)=>assert.ok(p.distanceTo(reference[i])<1e-8));else reference=normalized;
  r.skeleton.dispose();
 }
});
test('invalid reach controls throw and unreachable pose restores the previously accepted state',()=>{
 const r=humanoidRig(humanoidProportions(shotProportions));poseHumanoid(r,shotPose);
 const before=r.skeleton.bones.map(b=>b.matrixWorld.toArray());
 for(const change of [{waist:[0,NaN,0]},{headWorld:[0,1]},{targets:{Wrong:{wrist:[0,0,0]}}},{targets:{Left:{wrong:[0,1,0]}}},{targets:{Left:{wrist:[9,0,0]}}}]){
  assert.throws(()=>poseHumanoid(r,{...shotPose,...change}));
  assert.deepEqual(r.skeleton.bones.map(b=>b.matrixWorld.toArray()),before);
 }
 for(const p of [{legLength:-1},{shinShare:1},{shoulderHeight:NaN},{ankleHeight:1}])assert.throws(()=>humanoidProportions(p));
 r.skeleton.dispose();
});
test('pose clips retain all mesh buffers and both feet planted, on a modest plain mesh',()=>{
 const a=humanoidMannequin({...shotProportions,poses:{baseline:humanoidPose('lookback'),shot:shotPose}}),b=humanoidMannequin({...shotProportions,poses:{baseline:humanoidPose('lookback'),shot:shotPose}});
 assert.equal(inspect(a).triangles,11968);assert.equal(inspect(a).materials,2);
 const buffers=[];a.traverse(n=>{if(n.isMesh)buffers.push({g:n.geometry,p:[...n.geometry.attributes.position.array],n:[...n.geometry.attributes.normal.array],uv:[...n.geometry.attributes.uv.array],i:[...n.geometry.index.array]});});
 const mixer=new T.AnimationMixer(a);mixer.clipAction(a.animations.find(c=>c.name==='shot')).play();mixer.setTime(.5);a.updateMatrixWorld(true);a.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
 for(const side of ['Left','Right']){const foot=a.getObjectByName(side+' foot');let min=Infinity;for(let i=0;i<foot.geometry.attributes.position.count;i++)min=Math.min(min,foot.getVertexPosition(i,new T.Vector3()).y);near(min,0,3e-7);}
 for(const {g,p,n,uv,i}of buffers){assert.deepEqual([...g.attributes.position.array],p);assert.deepEqual([...g.attributes.normal.array],n);assert.deepEqual([...g.attributes.uv.array],uv);assert.deepEqual([...g.index.array],i);}
 mixer.stopAllAction();mixer.uncacheRoot(a);dispose(a);dispose(b);
});
