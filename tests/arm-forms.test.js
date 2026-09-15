import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {arm,upperArm,elbow,buildArm} from '../src/lib/forms/arm.js';
import {hand,forearm} from '../src/lib/forms/hand.js';import{auditSeams}from'../src/lib/forms/audit.js';import{assetInfo}from'../src/lib/rigging.js';import{inspect,dispose}from'../src/lib/modeling.js';
test('arm composition rejects invalid parts without silently inventing geometry',()=>{assert.throws(()=>arm(upperArm(),upperArm()));assert.throws(()=>upperArm({length:-1}));assert.throws(()=>arm(hand()));assert.throws(()=>elbow({definition:4}));});
test('continuous arm and hand share one closed rest surface and one 19-joint rig',()=>{
 const r=buildArm(arm(),{mode:'cage'}),a=auditSeams(r),info=assetInfo(r);
 assert.equal(a.components,1,JSON.stringify(a));assert.equal(a.boundaryEdges,0,JSON.stringify(a));assert.equal(a.nonManifoldEdges,0);assert.equal(a.inconsistentWinding,0);assert.equal(a.degenerateTriangles,0);assert.equal(info.bones,19);assert.equal(info.skinnedMeshes,info.uvMeshes);dispose(r);
});
test('elbow and twist deform actual vertices while the proximal shoulder stays fixed',()=>{
 const r=buildArm(arm(),{mode:'cage'}),m=r.getObjectByName('ArmSkin'),p=m.geometry.attributes.position;let proximal=0,distal=0;
 for(let i=0;i<p.count;i++){if(p.getY(i)<p.getY(proximal))proximal=i;if(p.getY(i)>p.getY(distal))distal=i;}
 const a=m.getVertexPosition(proximal,new THREE.Vector3()),b=m.getVertexPosition(distal,new THREE.Vector3());r.getObjectByName('Elbow').rotation.x=-Math.PI/2;r.updateMatrixWorld(true);
 assert.ok(b.distanceTo(m.getVertexPosition(distal,new THREE.Vector3()))>.3);assert.ok(a.distanceTo(m.getVertexPosition(proximal,new THREE.Vector3()))<1e-7);
 m.pose();r.updateMatrixWorld(true);assert.ok(b.distanceTo(m.getVertexPosition(distal,new THREE.Vector3()))<1e-7);
 r.getObjectByName('ForearmTwist').rotation.y=.8;r.updateMatrixWorld(true);assert.ok(b.distanceTo(m.getVertexPosition(distal,new THREE.Vector3()))>.005);dispose(r);
});
test('length composition moves the elbow and root together without moving wrist or fingers',()=>{
 const a=buildArm(arm(),{mode:'cage'}),b=buildArm(arm(upperArm({length:.34}),forearm({length:.28})),{mode:'cage'});
 assert.ok(Math.abs(a.userData.landmarks.Wrist[1])<1e-9);assert.ok(Math.abs(b.userData.landmarks.Wrist[1])<1e-9);assert.ok(Math.abs(b.userData.landmarks.Elbow[1]+.28)<1e-9);assert.ok(inspect(b).dimensions[1]>inspect(a).dimensions[1]);dispose(a);dispose(b);
});
