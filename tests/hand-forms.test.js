import test from 'node:test';import assert from 'node:assert/strict';
import{hand,palm,fingers,opposingThumb,skinDetail,forearm,buildHand}from'../src/lib/forms/hand.js';
import{auditSeams}from'../src/lib/forms/audit.js';import{assetInfo}from'../src/lib/rigging.js';import{THREE,inspect,dispose}from'../src/lib/modeling.js';
test('hand component stages reject duplicate or invalid composition',()=>{assert.throws(()=>hand(palm(),palm()));assert.throws(()=>fingers({spread:2}));assert.throws(()=>forearm({},{}));assert.throws(()=>buildHand(hand(),{side:'unknown'}));});
for(const mode of ['cage','sculpt'])for(const arm of [false,true])test(`${mode} ${arm?'forearm':'hand'}: one closed skin surface across UV/material charts`,()=>{
 const root=buildHand(arm?forearm():hand(),{mode}),report=auditSeams(root);
 assert.equal(report.components,1);assert.equal(report.boundaryEdges,0,JSON.stringify(report));assert.equal(report.nonManifoldEdges,0);assert.equal(report.inconsistentWinding,0);assert.equal(report.degenerateTriangles,0);
 const info=assetInfo(root);assert.equal(info.bones,17);assert.equal(info.skinnedMeshes,info.uvMeshes);dispose(root);
});
test('high detail is optional and the low normal bake records measured errors',()=>{
 const root=buildHand(hand(),{textureSize:64});let maps=0;
 root.traverse(m=>{if(!m.material?.normalMap)return;maps++;const r=m.material.normalMap.userData.bake;assert.ok(r.meanQuantizedErrorDegrees<.3);assert.ok(r.maxQuantizedErrorDegrees<.5);});assert.equal(maps,6);dispose(root);
});
test('finger joints deform actual skin and return to bind pose',()=>{
 const root=buildHand(hand(),{mode:'cage'}),finger=root.getObjectByName('Index'),bone=root.getObjectByName('Index_PIP');
 const p=finger.geometry.attributes.position;let i=0;for(let k=0;k<p.count;k++)if(p.getY(k)>p.getY(i))i=k;
 const before=finger.getVertexPosition(i,new THREE.Vector3());bone.rotation.x=-.8;root.updateMatrixWorld(true);const after=finger.getVertexPosition(i,new THREE.Vector3());assert.ok(before.distanceTo(after)>.015);
 finger.pose();root.updateMatrixWorld(true);assert.ok(before.distanceTo(finger.getVertexPosition(i,new THREE.Vector3()))<1e-7);dispose(root);
});
test('mirroring keeps positive transforms and outward winding',()=>{
 const r=buildHand(hand(),{mode:'cage'}),l=buildHand(hand(),{mode:'cage',side:'left'}),a=inspect(r),b=inspect(l);assert.equal(a.triangles,b.triangles);assert.ok(Math.abs(a.min[0]+b.max[0])<1e-6);assert.equal(auditSeams(l).inconsistentWinding,0);l.traverse(o=>assert.ok(o.scale.x>0));dispose(r);dispose(l);
});
