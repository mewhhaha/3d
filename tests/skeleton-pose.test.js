import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {skeletonPose} from '../src/lib/skeleton-pose.js';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import {humanoidRig,humanoidProportions} from '../src/lib/humanoid-rig.js';
const V=p=>new T.Vector3(...p);
const near=(a,b,e=1e-7)=>assert.ok(V(a).distanceTo(V(b))<e,`${a} != ${b}`);
function fixture(){
 const root=new T.Group(),armature=new T.Group();root.add(armature);armature.scale.setScalar(.01);armature.rotation.set(.1,-.2,.15);
 const a=new T.Bone(),b=new T.Bone(),c=new T.Bone();a.name='ImportedHip';b.name='ImportedKnee';c.name='ImportedFoot';armature.add(a);a.add(b);b.add(c);
 a.position.set(0,90,0);a.rotation.z=.35;b.position.set(0,-45,0);b.rotation.x=.10;c.position.set(0,-42,0);
 root.updateMatrixWorld(true);const skeleton=new T.Skeleton([a,b,c]);
 return {root,armature,a,b,c,skeleton};
}
test('local rest restoration retains imported non-bone parent scale instead of applying it twice',()=>{
 const {root,a,b,c,skeleton}=fixture();const before=[a,b,c].map(b=>b.matrixWorld.toArray()),inverse=skeleton.boneInverses.map(m=>m.toArray());
 const restore=captureBonePose(root);skeleton.pose();root.updateMatrixWorld(true);
 assert.notDeepEqual(a.matrixWorld.toArray(),before[0],'fixture exposes Skeleton.pose root-parent limitation');
 restore();assert.deepEqual([a,b,c].map(b=>b.matrixWorld.toArray()),before);
 assert.deepEqual(skeleton.boneInverses.map(m=>m.toArray()),inverse);restore();assert.deepEqual(a.matrixWorld.toArray(),before[0]);
});
test('mapped existing skeleton solves world targets under an imported .01 armature, including nontrivial bind axes',()=>{
 const {root,a,b,c}=fixture(),p=skeletonPose(root,{names:{hip:'ImportedHip',knee:'ImportedKnee',foot:'ImportedFoot'}});
 const target=[.12,.15,.20],pole=[0,.5,1],lengths=[V(p.position('hip')).distanceTo(V(p.position('knee'))),V(p.position('knee')).distanceTo(V(p.position('foot')))];
 const solved=p.solve({root:'hip',joint:'knee',tip:'foot',target,pole});near(p.position('foot'),target);near(p.position('knee'),solved.joint);
 assert.deepEqual(b.position.toArray(),[0,-45,0]);assert.deepEqual(c.position.toArray(),[0,-42,0]);
 lengths.forEach((n,i)=>assert.ok(Math.abs(n-solved.lengths[i])<1e-9));
 const beforeTip=p.position('foot');p.twist('knee','foot',32);near(p.position('foot'),beforeTip);
 const offset=[.02,-.01,.03],before=p.position('hip');p.translateWorld('hip',offset);near(p.position('hip'),before.map((x,i)=>x+offset[i]));
 p.reset();assert.deepEqual(a.position.toArray(),[0,90,0]);
});
test('hold clips restore prior local state and inverse binds after success or failed multi-step posing',()=>{
 const {root,skeleton}=fixture(),p=skeletonPose(root);p.rotateLocal('ImportedHip',[3,2,1]);
 const state=()=>{root.updateMatrixWorld(true);return skeleton.bones.map(b=>b.matrixWorld.toArray());},before=state(),inverses=skeleton.boneInverses.map(m=>m.toArray());
 const clip=p.hold('candidate',c=>{c.translateWorld('ImportedHip',[0,.05,0]);c.solve({root:'ImportedHip',joint:'ImportedKnee',tip:'ImportedFoot',target:[0,.2,0],pole:[0,.3,1]});});
 assert.equal(clip.tracks.length,9);assert.deepEqual(state(),before);assert.ok(clip.validate());
 assert.throws(()=>p.hold('bad',c=>{c.rotateWorld('ImportedHip',[10,0,0]);c.solve({root:'ImportedHip',joint:'ImportedKnee',tip:'ImportedFoot',target:[10,0,0],pole:[0,1,0]});}),/unreachable/);
 assert.deepEqual(state(),before);assert.deepEqual(skeleton.boneInverses.map(m=>m.toArray()),inverses);
});
test('same existing-skeleton controls work on the original humanoid with a different T bind layout',()=>{
 const r=humanoidRig(humanoidProportions({build:'broad'})),p=skeletonPose(r.root);
 const shoulder=p.position('LeftArm'),target=shoulder.map((v,i)=>v+[.04,-.48,.03][i]);
 p.solve({root:'LeftArm',joint:'LeftForeArm',tip:'LeftHand',target,pole:[.4,1,-.5]});near(p.position('LeftHand'),target);
 const q=p.orientation('LeftHand');q.identity();assert.notDeepEqual(p.orientation('LeftHand').toArray(),q.toArray());r.skeleton.dispose();
});
test('bad names, disconnected chains, nonuniform parent scale and invalid inputs fail without silent stretching',()=>{
 const {root,armature}=fixture(),p=skeletonPose(root);const first=p.position('ImportedHip');
 assert.throws(()=>skeletonPose(new T.Group()),/No bones/);assert.throws(()=>skeletonPose(root,{names:{missing:'Nope'}}),/Unknown/);
 assert.throws(()=>p.rotateWorld('Nope',[1,2,3]));assert.throws(()=>p.twist('ImportedHip','ImportedKnee',NaN));
 assert.throws(()=>p.solve({root:'ImportedHip',joint:'ImportedFoot',tip:'ImportedKnee',target:[0,0,0],pole:[0,0,1]}),/connected/);
 assert.throws(()=>p.solve({root:'ImportedHip',joint:'ImportedKnee',tip:'ImportedFoot',target:[0,100,0],pole:[0,0,1]}),/unreachable/);near(p.position('ImportedHip'),first);
 armature.scale.set(.01,.02,.01);root.updateMatrixWorld(true);const q=root.getObjectByName('ImportedHip').quaternion.toArray();
 assert.throws(()=>p.orientWorld('ImportedHip',[0,10,0]),/uniform/);assert.deepEqual(root.getObjectByName('ImportedHip').quaternion.toArray(),q);
});
