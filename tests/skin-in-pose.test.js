import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {skeleton} from '../src/lib/rigging.js';
import {skinInPose} from '../src/lib/skin-in-pose.js';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import {dispose} from '../src/lib/modeling.js';
function fixture(){
 const r=skeleton([{name:'Root',position:[0,0,0]},{name:'Bend',parent:'Root',position:[0,.5,0]}]);
 const parent=new T.Group();parent.add(r.root);parent.scale.setScalar(.01);r.root.children[0].position.multiplyScalar(100);r.root.updateWorldMatrix(true,true);r.skeleton.calculateInverses();
 r.bones.Root.rotation.z=-.15;r.bones.Bend.rotation.z=.65;r.root.updateWorldMatrix(true,true);
 return r;
}
const weights=p=>{const v=T.MathUtils.clamp(p.y,0,1);return [['Root',1-v],['Bend',v]];};
const normals=(m,i)=>m.applyBoneTransform(i,new T.Vector4(...new T.Vector3().fromBufferAttribute(m.geometry.attributes.normal,i).toArray(),0));
test('pose-authored skin reproduces vertices and linear-shader normals with unchanged topology and UVs',()=>{
 const r=fixture(),g=new T.CylinderGeometry(.10,.16,.75,16,12);g.translate(.10,.48,0);
 g.setAttribute('tangent',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*4),4));
 const inverse=r.skeleton.boneInverses.map(m=>m.toArray()),position=g.attributes.position.array.slice(),normal=g.attributes.normal.array.slice();
 const result=skinInPose(g,new T.MeshStandardMaterial(),r.skeleton,weights);result.updateMatrixWorld(true);
 assert.equal(result.skeleton,r.skeleton);assert.notEqual(result.geometry,g);assert.deepEqual(g.attributes.position.array,position);assert.deepEqual(g.attributes.normal.array,normal);
 assert.deepEqual(result.geometry.index.array,g.index.array);assert.deepEqual(result.geometry.attributes.uv.array,g.attributes.uv.array);assert.equal(result.geometry.attributes.tangent,undefined);
 for(let i=0;i<g.attributes.position.count;i++){
  const a=new T.Vector3().fromBufferAttribute(g.attributes.position,i),b=result.getVertexPosition(i,new T.Vector3());assert.ok(a.distanceTo(b)<2e-7);
  const v=normals(result,i),n=new T.Vector3(v.x,v.y,v.z).normalize();assert.ok(n.distanceTo(new T.Vector3().fromBufferAttribute(g.attributes.normal,i))<2e-6);
 }
 assert.deepEqual(r.skeleton.boneInverses.map(m=>m.toArray()),inverse);result.geometry.dispose();g.dispose();result.material.dispose();r.skeleton.dispose();
});
test('restoring original bones changes the new skin but returning to the authoring pose is exact',()=>{
 const r=fixture(),g=new T.PlaneGeometry(.2,.8,3,12),mat=new T.MeshStandardMaterial();g.translate(0,.5,0);
 const restore=captureBonePose(r.root),m=skinInPose(g,mat,r.skeleton,weights),i=20,posed=m.getVertexPosition(i,new T.Vector3());
 r.bones.Bend.rotation.z=0;r.bones.Root.rotation.z=0;r.root.updateWorldMatrix(true,true);
 assert.ok(m.getVertexPosition(i,new T.Vector3()).distanceTo(posed)>.02);restore();assert.ok(m.getVertexPosition(i,new T.Vector3()).distanceTo(posed)<1e-10);
 const n=skinInPose(g,mat,r.skeleton,weights);assert.notEqual(m.geometry,n.geometry);assert.deepEqual(m.geometry.attributes.position.array,n.geometry.attributes.position.array);
 m.geometry.dispose();n.geometry.dispose();g.dispose();mat.dispose();r.skeleton.dispose();
});
test('a collapsed blend is rejected without modifying the source or skeleton',()=>{
 const r=skeleton([{name:'Root',position:[0,0,0]},{name:'Bend',parent:'Root',position:[0,0,0]}]),g=new T.PlaneGeometry(),mat=new T.MeshStandardMaterial();
 r.bones.Bend.rotation.z=Math.PI;r.root.updateMatrixWorld(true);const before=g.clone(),inverses=r.skeleton.boneInverses.map(m=>m.toArray());
 assert.throws(()=>skinInPose(g,mat,r.skeleton,()=>[['Root',.5],['Bend',.5]]),/collapsed|ill-conditioned/);
 assert.deepEqual(g.attributes.position.array,before.attributes.position.array);assert.deepEqual(r.skeleton.boneInverses.map(m=>m.toArray()),inverses);g.dispose();before.dispose();mat.dispose();r.skeleton.dispose();
});
test('existing binding, morphs, relief maps and invalid explicit weights fail instead of being guessed',()=>{
 const r=fixture(),g=new T.PlaneGeometry(),mat=new T.MeshStandardMaterial();
 for(const f of [()=>[['no-bone',1]],()=>[['Root',-1]],()=>[],()=>[['Root',Infinity]]])assert.throws(()=>skinInPose(g,mat,r.skeleton,f));
 assert.throws(()=>skinInPose(g,mat,r.skeleton,weights,{minDeterminant:0}));
 g.morphAttributes.position=[g.attributes.position.clone()];assert.throws(()=>skinInPose(g,mat,r.skeleton,weights),/morph/);g.morphAttributes={};
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute([0,0,0,0],4));assert.throws(()=>skinInPose(g,mat,r.skeleton,weights),/skin/);g.deleteAttribute('skinIndex');
 mat.normalMap=new T.Texture();assert.throws(()=>skinInPose(g,mat,r.skeleton,weights),/relief/);mat.normalMap.dispose();g.dispose();mat.dispose();r.skeleton.dispose();
});
test('independent tail cuff is a real additional skin that follows both rest and bent clips',async()=>{
 const {default:recipe}=await import('../studies/posed-tail-sleeve.js');const root=recipe.build({sleeve:true}),m=root.getObjectByName('Flexible tail cuff');
 assert.ok(m.isSkinnedMesh);assert.equal(m.skeleton,root.getObjectByName('Tail skin').skeleton);
 const restore=captureBonePose(root),mixer=new T.AnimationMixer(root),points=[];
 for(const clip of root.animations){mixer.clipAction(clip).play();mixer.setTime(.5);root.updateMatrixWorld(true);points.push(m.getVertexPosition(500,new T.Vector3()));mixer.stopAllAction();mixer.uncacheRoot(root);restore();}
 assert.ok(points[0].distanceTo(points[1])>.05);dispose(root);
});
