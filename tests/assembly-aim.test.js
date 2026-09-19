import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {aimAroundAnchor} from '../src/lib/assembly-aim.js';
const V=p=>new T.Vector3(...p),distance=(a,b)=>a.distanceTo(b);
const anchor=[.14,-.22,.05],direction=[-.4,.3,.8];
function fixture(){
 const ancestor=new T.Group();ancestor.position.set(.4,1,-.3);ancestor.rotation.set(.2,-.4,.1);ancestor.scale.set(1.6,.8,1.2);
 const parent=new T.Group();parent.rotation.set(-.1,.5,.2);parent.scale.set(.7,1.4,1.1);ancestor.add(parent);
 const object=new T.Mesh(new T.BoxGeometry(.3,.2,.1),new T.MeshStandardMaterial());object.position.set(.1,.2,.3);object.rotation.set(.4,-.3,.2);object.scale.set(.8,1.2,.9);parent.add(object);
 const child=new T.Object3D();child.position.set(0,0,.1);object.add(child);ancestor.updateMatrixWorld(true);return{object,child,parent};
}
test('aim retains nonzero anchor and aligns any local axis under nonuniform/sheared parent transform',()=>{
 for(const axis of [[0,0,1],[0,-1,0],[1,.5,.2]]){
  const {object,child}=fixture(),fixed=object.localToWorld(V(anchor)),positions=object.geometry.attributes.position.array.slice(),childPosition=child.position.toArray();
  const geometry=object.geometry,mat=object.material,scale=object.scale.toArray();
  const input={axis,anchor,direction};const saved=structuredClone(input);
  assert.equal(aimAroundAnchor(object,{...input}),object);
  assert.ok(distance(object.localToWorld(V(anchor)),fixed)<1e-12);
  assert.ok(V(axis).transformDirection(object.matrixWorld).angleTo(V(direction).normalize())<3e-8);
  assert.equal(object.geometry,geometry);assert.equal(object.material,mat);assert.deepEqual(object.scale.toArray(),scale);
  assert.deepEqual(object.geometry.attributes.position.array,positions);assert.deepEqual(child.position.toArray(),childPosition);assert.deepEqual(input,saved);
 }
});
test('parent-space and orphan aiming; 180 degree swing is finite; influence is bounded',()=>{
 for(const target of [[0,0,-1],[.3,.4,1]]){
  const object=new T.Group();object.position.set(.2,0,0);const fixed=object.localToWorld(V(anchor));
  aimAroundAnchor(object,{direction:target,anchor});assert.ok(V([0,0,1]).applyQuaternion(object.quaternion).angleTo(V(target).normalize())<3e-8);assert.ok(distance(object.localToWorld(V(anchor)),fixed)<1e-12);
 }
 const {object}=fixture(),before=object.quaternion.clone(),position=object.position.toArray();
 aimAroundAnchor(object,{direction,anchor,influence:0});assert.deepEqual(object.quaternion.toArray(),before.toArray());assert.deepEqual(object.position.toArray(),position);
 const old=V([0,0,1]).multiply(object.scale).applyQuaternion(before).normalize(),a=old.angleTo(V(direction).normalize());
 aimAroundAnchor(object,{direction,anchor,space:'parent',influence:.5});const next=V([0,0,1]).applyQuaternion(object.quaternion);
 assert.ok(Math.abs(next.angleTo(V(direction).normalize())-a/2)<1e-12);
});
test('invalid aim inputs reject without changing local placement',()=>{
 const {object,parent}=fixture(),position=object.position.toArray(),quaternion=object.quaternion.toArray();
 for(const options of [{direction:[0,0,0]},{direction:[1,NaN,1]},{direction,anchor:[1,2]},{direction,axis:[0,0,0]},{direction,space:'camera'},{direction,influence:2}])assert.throws(()=>aimAroundAnchor(object,options));
 assert.deepEqual(object.position.toArray(),position);assert.deepEqual(object.quaternion.toArray(),quaternion);
 parent.scale.x=0;assert.throws(()=>aimAroundAnchor(object,{direction}));parent.scale.x=-1;assert.throws(()=>aimAroundAnchor(object,{direction}));
 const bad=new T.Group();bad.matrixAutoUpdate=false;assert.throws(()=>aimAroundAnchor(bad,{direction}));
});
