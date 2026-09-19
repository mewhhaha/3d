import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {humanoidProportions,humanoidRig,humanoidPose,poseHumanoid,humanoidPoseClips} from '../src/lib/humanoid-rig.js';
import {humanoidMannequin} from '../src/lib/humanoid-mannequin.js';
import {inspect,dispose} from '../src/lib/modeling.js';
import {assetInfo} from '../src/lib/rigging.js';
const V=p=>new T.Vector3(...p);
const joint=(r,n)=>r.bones[n].getWorldPosition(new T.Vector3());
const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
function apply(root,clip){const m=new T.AnimationMixer(root);m.clipAction(root.animations.find(c=>c.name===clip)).play();m.setTime(.5);root.updateMatrixWorld(true);root.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});return m;}

test('one conventional skeleton serves different proportions with no reference data',()=>{
 for(const build of ['slender','broad'])for(const height of [1.4,1.72,2.1]){
  const d=humanoidProportions({build,height}),r=humanoidRig(d);
  assert.equal(r.skeleton.bones.length,28);assert.equal(r.bones.LeftArm.parent.name,'LeftShoulder');
  assert.equal(r.bones.LeftShoulder.parent.name,'Spine2');assert.equal(r.bones.LeftUpLeg.parent.name,'Hips');
  near(joint(r,'HeadTop').y,height);near(joint(r,'LeftArm').distanceTo(joint(r,'RightArm')),d.shoulderSpan);
  near(joint(r,'LeftArm').distanceTo(joint(r,'LeftForeArm')),d.upperArm);
  r.skeleton.dispose();
 }
 const a=humanoidProportions(),b=humanoidProportions({build:'broad'});assert.ok(b.shoulderSpan>a.shoulderSpan);assert.ok(b.hipSpan<a.hipSpan);
 const changed=humanoidProportions({shoulderSpan:.43});assert.equal(changed.shoulderSpan,.43);assert.equal(changed.hipSpan,a.hipSpan);
});

test('all pose presets preserve link lengths and reach planted targets without independent plate transforms',()=>{
 for(const build of ['slender','broad'])for(const height of [1.4,1.72,2.1])for(const pose of ['neutral','contrapposto','lookback']){
  const d=humanoidProportions({build,height}),r=humanoidRig(d),positions=r.skeleton.bones.map(b=>b.position.clone());
  const targets=poseHumanoid(r,humanoidPose(pose));
  for(const side of ['Left','Right']){
   near(joint(r,side+'UpLeg').distanceTo(joint(r,side+'Leg')),d.thigh);
   near(joint(r,side+'Leg').distanceTo(joint(r,side+'Foot')),d.shin);
   near(joint(r,side+'Arm').distanceTo(joint(r,side+'ForeArm')),d.upperArm);
   near(joint(r,side+'ForeArm').distanceTo(joint(r,side+'Hand')),d.forearm);
   assert.ok(joint(r,side+'Hand').distanceTo(V(targets[side].wrist))<1e-8);
   assert.ok(joint(r,side+'Foot').distanceTo(V(targets[side].ankle))<1e-8);
  }
  r.skeleton.bones.forEach((b,i)=>{if(b.name!=='Hips')assert.deepEqual(b.position.toArray(),positions[i].toArray());});
  r.skeleton.dispose();
 }
});

test('a failed custom pose restores the previous state; invalid inputs and placed rigs fail explicitly',()=>{
 for(const options of [{height:NaN},{build:'wrong'},{shoulderSpan:-2}])assert.throws(()=>humanoidProportions(options));
 assert.throws(()=>humanoidRig({height:1}));assert.throws(()=>humanoidPose('walk'));
 const r=humanoidRig();poseHumanoid(r,humanoidPose('lookback'));
 const before=r.skeleton.bones.map(b=>b.matrixWorld.toArray());
 assert.throws(()=>poseHumanoid(r,{...humanoidPose(),feet:[[4,0],[4,0]]}),/unreachable/);
 assert.deepEqual(r.skeleton.bones.map(b=>b.matrixWorld.toArray()),before);
 assert.throws(()=>poseHumanoid(r,{...humanoidPose(),turn:NaN}));
 const parent=new T.Group();parent.position.x=3;parent.add(r.root);assert.throws(()=>poseHumanoid(r),/model space/);
 r.skeleton.dispose();
});

test('plain proxy is deterministic, owned, weighted, low resolution and actually deforming',()=>{
 const a=humanoidMannequin(),b=humanoidMannequin();
 assert.deepEqual(inspect(a),inspect(b));assert.ok(inspect(a).triangles<12500);assert.equal(inspect(a).materials,2);
 const info=assetInfo(a);assert.equal(info.bones,28);assert.equal(info.skinnedMeshes,34);assert.equal(info.textures,0);
 assert.deepEqual(info.animations.map(c=>c.name),['neutral','contrapposto','lookback']);
 let count=0;a.traverse(n=>{if(!n.isMesh)return;count++;const other=b.getObjectByName(n.name);assert.notEqual(n.geometry,other.geometry);assert.notEqual(n.material,other.material);assert.ok(n.geometry.attributes.uv);});assert.equal(count,34);
 const mesh=a.getObjectByName('Left hand mitten'),old=mesh.getVertexPosition(50,new T.Vector3()).clone();
 const arrays=[...mesh.geometry.attributes.position.array],m=apply(a,'lookback');
 assert.ok(mesh.getVertexPosition(50,new T.Vector3()).distanceTo(old)>.20);assert.deepEqual([...mesh.geometry.attributes.position.array],arrays);
 for(const side of ['Left','Right']){
  const foot=a.getObjectByName(side+' foot');let minimum=Infinity;
  for(let i=0;i<foot.geometry.attributes.position.count;i++)minimum=Math.min(minimum,foot.getVertexPosition(i,new T.Vector3()).y);
  near(minimum,0,2e-7);
 }
 m.stopAllAction();m.uncacheRoot(a);dispose(a);dispose(b);
});

test('clip construction restores bind and rest positions do not drift between poses',()=>{
 const r=humanoidRig(),original=r.skeleton.bones.map(b=>b.matrixWorld.toArray());
 const first=humanoidPoseClips(r);assert.deepEqual(r.skeleton.bones.map(b=>b.matrixWorld.toArray()),original);
 const second=humanoidPoseClips(r);for(let j=0;j<first.length;j++)for(let k=0;k<first[j].tracks.length;k++)assert.deepEqual(first[j].tracks[k].values,second[j].tracks[k].values);
 r.skeleton.dispose();
});


test('custom named pose clips share the rig and failures return to the clean bind pose',()=>{
 const r=humanoidRig(),bind=r.skeleton.bones.map(b=>b.matrixWorld.toArray());
 const pose={...humanoidPose('contrapposto'),head:[4,22,-8]};
 const clips=humanoidPoseClips(r,{study:pose});
 assert.equal(clips.length,1);assert.equal(clips[0].name,'study');
 assert.equal(clips[0].tracks.length,56);assert.deepEqual(r.skeleton.bones.map(b=>b.matrixWorld.toArray()),bind);
 assert.throws(()=>humanoidPoseClips(r,{}),/named humanoid poses/);
 assert.throws(()=>humanoidPoseClips(r,{bad:{...pose,feet:[[5,0],[5,0]]}}),/unreachable/);
 assert.deepEqual(r.skeleton.bones.map(b=>b.matrixWorld.toArray()),bind);
 const model=humanoidMannequin({poses:{study:pose}});
 assert.deepEqual(model.animations.map(c=>c.name),['study']);
 dispose(model);r.skeleton.dispose();
});
