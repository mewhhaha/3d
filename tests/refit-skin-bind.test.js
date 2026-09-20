import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {refitSkinBind} from '../src/lib/refit-skin-bind.js';
import {skeletonPose} from '../src/lib/skeleton-pose.js';
import {tailBind,tailField} from '../studies/refitted-tail.js';
import {dispose} from '../src/lib/modeling.js';
const V=p=>new T.Vector3(...p),close=(a,b,e=2e-7)=>assert.ok(V(a).distanceTo(V(b))<e,`${a} != ${b}`);
const mesh=r=>r.getObjectByName('Tail skin');
const state=r=>{r.updateMatrixWorld(true);const result=[];r.traverse(o=>{if(o.isBone)result.push(o.matrixWorld.toArray());});return result;};
test('one field refits rest skin and skeleton, retaining topology UVs and weights with fresh inverses',()=>{
 const r=tailBind(),m=mesh(r),old=m.geometry,original=old.clone();r.updateMatrixWorld(true);
 const previousBones=m.skeleton.bones.map(b=>b.getWorldPosition(new T.Vector3()).toArray()),previousInverse=m.skeleton.boneInverses.map(i=>i.toArray());
 const info=refitSkinBind(r,tailField);
 assert.equal(info.bones,4);assert.ok(info.minSampledJacobianDeterminant>0);
 for(const key of ['uv','skinIndex','skinWeight'])assert.deepEqual(m.geometry.attributes[key].array,original.attributes[key].array);
 assert.deepEqual(m.geometry.index.array,original.index.array);assert.deepEqual(old.attributes.position.array,original.attributes.position.array);
 assert.notEqual(m.geometry,old);assert.notDeepEqual(m.skeleton.boneInverses.map(i=>i.toArray()),previousInverse);
 m.skeleton.bones.forEach((b,i)=>close(b.getWorldPosition(new T.Vector3()).toArray(),tailField(previousBones[i])));
 for(let i=0;i<original.attributes.position.count;i++){
  const expected=tailField(new T.Vector3().fromBufferAttribute(original.attributes.position,i).toArray());
  close(m.getVertexPosition(i,new T.Vector3()).toArray(),expected);
 }
 assert.ok(m.geometry.userData.bindRefit);original.dispose();dispose(r);
});
test('affine normal transport preserves split normals; tangent/detail dependencies are explicit',()=>{
 const r=tailBind(),m=mesh(r),g=m.geometry,n=g.attributes.normal.clone();
 g.setAttribute('tangent',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*4),4));
 refitSkinBind(r,([x,y,z])=>[x*.6,y*1.3,z*1.1]);
 assert.equal(m.geometry.attributes.tangent,undefined);
 for(let i=0;i<n.count;i++){
  const expected=new T.Vector3(n.getX(i)/.6,n.getY(i)/1.3,n.getZ(i)/1.1).normalize();
  close(new T.Vector3().fromBufferAttribute(m.geometry.attributes.normal,i).toArray(),expected.toArray());
 }
 const p=skeletonPose(r);p.rotateLocal('Tail1',[0,0,25]);
 assert.throws(()=>refitSkinBind(r,p=>p),/rest pose/);dispose(r);
});
test('field failures leave every bone, inverse and original geometry untouched',()=>{
 for(const field of [()=>[NaN,0,0],([x,y,z])=>[-x,y,z],([x,y,z])=>[x,0,z],([x,y,z])=>y>.8?[Infinity,y,z]:[x,y,z]]){
  const r=tailBind(),before=state(r),g=mesh(r).geometry,binds=mesh(r).skeleton.boneInverses.map(i=>i.toArray());
  assert.throws(()=>refitSkinBind(r,field));assert.deepEqual(state(r),before);assert.equal(mesh(r).geometry,g);
  assert.deepEqual(mesh(r).skeleton.boneInverses.map(i=>i.toArray()),binds);dispose(r);
 }
});
test('explicitly rejects unsupported clips, morphs, detail maps and non-model bindings',()=>{
 const edits=[
  r=>r.animations=[new T.AnimationClip('old',1,[])],
  r=>mesh(r).geometry.morphAttributes.position=[mesh(r).geometry.attributes.position.clone()],
  r=>mesh(r).material.normalMap=new T.Texture(),
  r=>mesh(r).material.aoMap=new T.Texture(),
  r=>mesh(r).position.x=.1,
  r=>mesh(r).bindMatrix.makeTranslation(.1,0,0),
  r=>r.position.x=1,
 ];
 for(const edit of edits){const r=tailBind();edit(r);assert.throws(()=>refitSkinBind(r,p=>p));dispose(r);}
 assert.throws(()=>refitSkinBind(new T.Group(),p=>p),/No skinned/);
 const r=tailBind();assert.throws(()=>refitSkinBind(r,p=>p,{step:0}));dispose(r);
});
test('refitted rig authors fresh clips, preserving bind/export isolation and independent builds',()=>{
 const a=tailBind(),b=tailBind();refitSkinBind(a,tailField);refitSkinBind(b,tailField);
 assert.deepEqual(mesh(a).geometry.attributes.position.array,mesh(b).geometry.attributes.position.array);assert.notEqual(mesh(a).geometry,mesh(b).geometry);
 const rest=state(a),p=skeletonPose(a),clip=p.hold('bend',q=>q.rotateLocal('Tail1',[0,0,30]));assert.deepEqual(state(a),rest);
 const mixer=new T.AnimationMixer(a);mixer.clipAction(clip).play();mixer.setTime(.5);a.updateMatrixWorld(true);mesh(a).skeleton.update();
 const g=mesh(a).geometry,ix=Math.floor(g.attributes.position.count*.4),v=mesh(a).getVertexPosition(ix,new T.Vector3());
 assert.ok(v.distanceTo(new T.Vector3().fromBufferAttribute(g.attributes.position,ix))>.01);
 mixer.stopAllAction();mixer.uncacheRoot(a);dispose(a);dispose(b);
});

test('joint refit respects a scaled non-bone import parent rather than double-applying its units',()=>{
 const root=tailBind(),m=mesh(root),rig=m.skeleton;
 const armature=new T.Group();armature.scale.setScalar(.01);root.add(armature);armature.add(rig.bones[0]);
 for(const b of rig.bones)b.position.multiplyScalar(100);
 root.updateMatrixWorld(true);rig.calculateInverses();
 const before=rig.bones.map(b=>b.getWorldPosition(new T.Vector3()).toArray());
 refitSkinBind(root,tailField);
 rig.bones.forEach((b,i)=>close(b.getWorldPosition(new T.Vector3()).toArray(),tailField(before[i])));
 assert.deepEqual(armature.scale.toArray(),[.01,.01,.01]);
 const pose=skeletonPose(root),clip=pose.hold('bent',p=>p.rotateLocal('Tail1',[0,0,15]));assert.ok(clip.validate());dispose(root);
});
