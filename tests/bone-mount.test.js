import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {mountOnBone} from '../src/lib/bone-mount.js';import {box,dispose} from '../src/lib/modeling.js';
import {indexedColorTexture} from '../src/lib/indexed-texture.js';
const near=(a,b)=>assert.ok(a.distanceTo(b)<1e-8,`${a.toArray()} != ${b.toArray()}`);
function rig(){const model=new T.Group(),armature=new T.Group(),bone=new T.Bone();bone.name='Joint';model.add(armature);armature.add(bone);armature.scale.setScalar(.01);armature.rotation.y=.3;bone.position.set(10,70,5);bone.rotation.z=.2;return {model,armature,bone};}
test('rigid mount retains model placement and propagates bone motion under imported units',()=>{
 const {model,bone}=rig(),part=box({name:'Guard',position:[.08,-.1,.03]}),g=part.geometry,p=g.attributes.position.array.slice();
 const frame=new T.Matrix4().makeTranslation(.2,.8,.1),expected=new T.Vector3(.28,.7,.13);
 const mounted=mountOnBone(model,bone,part,{frame});model.updateMatrixWorld(true);near(part.getWorldPosition(new T.Vector3()),expected);
 assert.equal(part.geometry,g);assert.deepEqual(g.attributes.position.array,p);assert.equal(mounted.parent,bone);assert.equal(mounted.userData.boneMount.bone,'Joint');
 const before=bone.matrixWorld.clone();bone.rotation.x=.6;model.updateMatrixWorld(true);
 near(part.getWorldPosition(new T.Vector3()),expected.clone().applyMatrix4(before.invert()).applyMatrix4(bone.matrixWorld));dispose(model);
});
test('model placement is separate from component meters and reject invalid mounts without reparenting',()=>{
 const {model,armature,bone}=rig();model.position.set(2,3,4);model.rotation.y=.2;
 const p=box({position:[.2,.8,.1]}),q=p.quaternion.clone();mountOnBone(model,bone,p);model.updateMatrixWorld(true);near(p.getWorldPosition(new T.Vector3()),new T.Vector3(.2,.8,.1).applyMatrix4(model.matrixWorld));
 assert.throws(()=>mountOnBone(model,bone,p),/unparented/);
 const invalid=box();armature.scale.set(.01,.02,.01);assert.throws(()=>mountOnBone(model,bone,invalid),/uniform/);assert.throws(()=>mountOnBone(model,bone,invalid,{frame:new T.Matrix4().makeRotationX(.5)}),/shear/);assert.equal(invalid.parent,null);assert.ok(invalid.quaternion.equals(q));
 assert.throws(()=>mountOnBone(model,new T.Bone(),invalid),/belong/);dispose(invalid);dispose(model);
});
test('indexed image orientation, color space and independent pixel ownership are explicit',()=>{
 const spec={width:2,height:2,palette:['#ff0000','#00ff00','#0000ff'],indices:btoa(String.fromCharCode(0,1,2,0))};
 const a=indexedColorTexture(spec),b=indexedColorTexture(spec);
 assert.deepEqual([...a.image.data.slice(0,8)],[0,0,255,255,255,0,0,255]);assert.equal(a.colorSpace,T.SRGBColorSpace);assert.equal(a.flipY,false);assert.notEqual(a.image.data,b.image.data);
 assert.throws(()=>indexedColorTexture({...spec,indices:'AA=='}));assert.throws(()=>indexedColorTexture({...spec,indices:btoa(String.fromCharCode(0,1,9,0))}));a.dispose();b.dispose();
});
