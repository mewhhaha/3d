import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {skeletonPose} from '../src/lib/skeleton-pose.js';
import {humanoidRig,humanoidProportions,humanoidPose,poseHumanoid} from '../src/lib/humanoid-rig.js';
const V=p=>new T.Vector3(...p),near=(a,b,e=1e-7)=>assert.ok(V(a).distanceTo(V(b))<e,`${a} != ${b}`);
function fixture(){
 const outer=new T.Group();outer.position.set(.2,.1,-.1);outer.rotation.set(.1,-.2,.05);outer.scale.setScalar(.01);
 const hub=new T.Bone();hub.name='Hub';hub.position.set(0,70,0);outer.add(hub);
 for(const [i,x]of [[0,-8],[1,8]]){
  let parent=hub;for(const [j,y]of [[0,0],[1,-34],[2,-29]]){const bone=new T.Bone();bone.name=`B${i}_${j}`;bone.position.set(j===0?x:0,y,0);parent.add(bone);parent=bone;}
 }
 outer.updateWorldMatrix(true,true);return outer;
}
function state(root){const all=[];root.traverse(o=>{if(o.isBone)all.push([o.position.toArray(),o.quaternion.toArray(),o.scale.toArray()]);});return all;}
const chains=[0,1].map(i=>({root:`B${i}_0`,joint:`B${i}_1`,tip:`B${i}_2`,pole:[.6,.3,.4]}));
test('pins retain two world tip transforms under scaled/rotated ancestry while the shared body moves',()=>{
 const root=fixture(),p=skeletonPose(root);p.solve({...chains[0],target:[.14,.27,.04]});p.solve({...chains[1],target:[.29,.29,.05]});
 const end=chains.map(c=>({point:p.position(c.tip),q:p.orientation(c.tip)}));
 const b=state(root);const solved=p.withPins(chains,r=>{r.translateWorld('Hub',[.025,-.012,.018]);r.rotateWorld('Hub',[0,10,-5]);});
 assert.notDeepEqual(state(root),b);assert.equal(solved.length,2);
 chains.forEach((c,i)=>{near(p.position(c.tip),end[i].point);assert.ok(p.orientation(c.tip).angleTo(end[i].q)<1e-7);});
 solved[0].target[0]=999;near(p.position(chains[0].tip),end[0].point);
});
test('multi-pin failure and forbidden link changes roll back every bone, including previously solved branches',()=>{
 const root=fixture(),p=skeletonPose(root);for(const [i,c]of chains.entries())p.solve({...c,target:[.15+i*.12,.26,.03]});
 const b=state(root);
 assert.throws(()=>p.withPins(chains,r=>r.translateWorld('B1_0',[5,0,0])),/unreachable/);assert.deepEqual(state(root),b);
 assert.throws(()=>p.withPins(chains,r=>r.translateWorld('B1_1',[.1,0,0])),/length/);assert.deepEqual(state(root),b);
 assert.throws(()=>p.withPins(chains,()=>{throw new Error('edit failure');}),/edit failure/);assert.deepEqual(state(root),b);
 let called=false;assert.throws(()=>p.withPins([{...chains[0],tip:'missing'}],()=>called=true));assert.equal(called,false);
});
test('pin topology and synchronous edit contracts reject invalid requests before edits',()=>{
 const root=fixture(),p=skeletonPose(root);let ran=false;
 for(const list of [[],[chains[0],chains[0]],[{...chains[0],pole:[0,NaN,0]}],[{...chains[0],orientation:'yes'}],[{...chains[0],swivel:361}]])assert.throws(()=>p.withPins(list,()=>ran=true));
 assert.throws(()=>p.withPins(chains,async()=>{ran=true;}));assert.equal(ran,false);
 // Two chains in series cannot be independently pinned by this one-pass API.
 const tail=new T.Bone();tail.name='Tail';root.getObjectByName('B0_2').add(tail);tail.position.y=-10;
 const next=new T.Bone();next.name='Next';tail.add(next);next.position.y=-10;const tip=new T.Bone();tip.name='Tip';next.add(tip);tip.position.y=-10;
 const q=skeletonPose(root);assert.throws(()=>q.withPins([chains[0],{root:'Tail',joint:'Next',tip:'Tip',pole:[0,0,1]}],()=>ran=true),/independent/);assert.equal(ran,false);
});
test('position-only pin permits tip rotation; hold returns unchanged rest after pin authoring',()=>{
 const root=fixture(),p=skeletonPose(root);p.solve({...chains[0],target:[.15,.26,.03]});
 const point=p.position(chains[0].tip),rotation=p.orientation(chains[0].tip);
 p.withPins([{...chains[0],orientation:false}],r=>r.rotateLocal('B0_2',[15,0,0]));near(p.position('B0_2'),point);assert.ok(p.orientation('B0_2').angleTo(rotation)>.1);
 const before=state(root);const clip=p.hold('test',r=>{
  r.solve({...chains[0],target:[.15,.26,.03]});r.withPins([chains[0]],q=>q.translateWorld('Hub',[0,-.02,.01]));
 });assert.ok(clip.validate());assert.deepEqual(state(root),before);
});
test('same pin control preserves planted feet and hand targets on the independent procedural humanoid',()=>{
 const r=humanoidRig(humanoidProportions({build:'broad'}));poseHumanoid(r,humanoidPose('contrapposto'));
 const p=skeletonPose(r.root),pins=['Left','Right'].flatMap(side=>[
  {root:side+'UpLeg',joint:side+'Leg',tip:side+'Foot',pole:[0,0,1]},
  {root:side+'Arm',joint:side+'ForeArm',tip:side+'Hand',pole:[side==='Left'?1:-1,1,-1]},
 ]),targets=pins.map(c=>p.position(c.tip));
 p.withPins(pins,edit=>edit.rotateWorld('Spine2',[0,4,0]));pins.forEach((c,i)=>near(p.position(c.tip),targets[i]));r.skeleton.dispose();
});
