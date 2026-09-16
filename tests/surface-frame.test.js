import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachToSurface,surfaceFrame,surfaceLayer,surfacePath,surfaceTransform} from '../src/lib/surface-frame.js';

const plane=(u,v)=>[u,v,u*.5+v*.25];

test('surfaceTransform exposes a stable local frame with tangent slides and normal offset',()=>{
 const pose=surfaceTransform(plane,{u:.2,v:.3,offset:.005,slide:[.012,-.007]});
 const f=surfaceFrame(plane,.2,.3),expected=f.origin.clone().addScaledVector(f.tangent,.012).addScaledVector(f.bitangent,-.007).addScaledVector(f.normal,.005);
 assert.ok(pose.position.distanceTo(expected)<1e-12);
 assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(pose.quaternion).distanceTo(f.normal)<1e-10);
 assert.ok(new THREE.Vector3(1,0,0).applyQuaternion(pose.quaternion).distanceTo(f.tangent)<1e-10);
});

test('local rotation twists an attachment around the surface normal without changing its position',()=>{
 const base=surfaceTransform(plane,{u:.2,v:.3,offset:.004}),twisted=surfaceTransform(plane,{u:.2,v:.3,offset:.004,rotation:[0,0,90]});
 assert.ok(base.position.distanceTo(twisted.position)<1e-12);
 const normal=new THREE.Vector3(0,0,1).applyQuaternion(twisted.quaternion);
 assert.ok(normal.distanceTo(base.frame.normal)<1e-10);
 const x=new THREE.Vector3(1,0,0).applyQuaternion(twisted.quaternion);
 assert.ok(Math.abs(x.dot(base.frame.bitangent)-1)<1e-10);
 const object=attachToSurface(new THREE.Group(),plane,{u:.2,v:.3,rotation:[0,0,-35]});
 assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(object.quaternion).distanceTo(base.frame.normal)<1e-10);
});

test('surfacePath maps chart-authored routes with per-sample overrides',()=>{
 const samples=[[.1,.2],{u:.3,v:.4,offset:.007,slide:[.002,0]},[.6,.7]];
 const path=surfacePath(plane,samples,{offset:.003});
 assert.equal(path.length,3);
 assert.ok(new THREE.Vector3(...path[0]).distanceTo(surfaceTransform(plane,{u:.1,v:.2,offset:.003}).position)<1e-12);
 assert.ok(new THREE.Vector3(...path[1]).distanceTo(surfaceTransform(plane,{u:.3,v:.4,offset:.007,slide:[.002,0]}).position)<1e-12);
 assert.deepEqual(samples[0],[.1,.2]);
 assert.throws(()=>surfacePath(plane,[[0,0]]),/at least two/);
 assert.throws(()=>surfaceTransform(plane,{u:0,v:0,rotation:[0,0,NaN]}),/surface rotation/);
});

test('surface layers retain differential-normal offset behavior',()=>{
 const f=surfaceFrame(plane,.2,.3),p=new THREE.Vector3(...surfaceLayer(plane,{offset:.003})(.2,.3));
 assert.ok(p.distanceTo(f.origin.clone().addScaledVector(f.normal,.003))<1e-12);
 assert.throws(()=>surfaceFrame(()=>[0,0,0],0,0),/Degenerate/);
});
