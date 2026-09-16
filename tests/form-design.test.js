import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { box, group, buildModel, inspect, dispose } from '../src/lib/modeling.js';
import { pointFields, weightedTransform, reshapeAssembly } from '../src/lib/shape-deform.js';
import { guidedBob, bobGuides } from '../src/lib/cyber/hair-design.js';
import { limbVolume, armorLeaf, segmentedArmor, limbArmor, sculptedBoot, contouredShield } from '../src/lib/cyber/contour-armor.js';
import { cyberMaterials } from '../src/lib/cyber/mechanics.js';
import { surface } from '../src/lib/forms/surface.js';
import { measureRecipe } from '../scripts/measure-reference.mjs';
import model from '../models/cyber-form-study.js';

test('point fields compose in order, copy inputs and reject invalid results',()=>{
 const p=[1,2,3],f=pointFields(q=>{q[0]+=1;return q;},q=>q.map(v=>v*2));
 assert.deepEqual(f(p),[4,4,6]);assert.deepEqual(p,[1,2,3]);
 assert.throws(()=>pointFields(()=>[1,2,NaN])(p));assert.throws(()=>pointFields(2));
});
test('weighted transforms blend primary-form edits without mutating inputs',()=>{
 const p=[2,3,4],half=weightedTransform(()=>.5,{scale:[.5,1,1.5],offset:[1,-2,0]});
 assert.deepEqual(half(p),[2,2,5]);assert.deepEqual(p,[2,3,4]);
 assert.deepEqual(weightedTransform(()=>0,{scale:[0,0,0],offset:[9,9,9]})(p),p);
 assert.throws(()=>weightedTransform(()=>1.1)(p));assert.throws(()=>weightedTransform(null));
});
test('static assembly sculpt honors nested transforms without changing its source',()=>{
 const input=group('Root',[group('Offset',[box({size:[1,1,1],position:[1,0,0]})],{position:[0,2,0],rotation:[0,20,0]})]);
 input.position.set(4,0,0);input.updateMatrixWorld(true);
 const output=reshapeAssembly(input,p=>[p[0],p[1]*2,p[2]]);output.updateMatrixWorld(true);
 const a=input.children[0].children[0],b=output.children[0].children[0];
 assert.notEqual(a.geometry,b.geometry);assert.notEqual(a.material,b.material);
 const pa=new THREE.Vector3().fromBufferAttribute(a.geometry.attributes.position,0);a.localToWorld(pa);input.worldToLocal(pa);
 const pb=new THREE.Vector3().fromBufferAttribute(b.geometry.attributes.position,0);b.localToWorld(pb);output.worldToLocal(pb);
 assert.ok(pb.distanceTo(new THREE.Vector3(pa.x,pa.y*2,pa.z))<1e-6);assert.equal(a.geometry.attributes.position.getY(0),.5);
 const skin=new THREE.SkinnedMesh();assert.throws(()=>reshapeAssembly(skin));
 dispose(input);dispose(output);
});
test('guide lofts have finite differential frames and do not depend on render resolution',()=>{
 const charts=bobGuides();for(const chart of Object.values(charts))for(let j=0;j<=16;j++)for(let i=0;i<=16;i++){
  const n=surface(chart).normal(i/16,j/16);assert.ok(n.toArray().every(Number.isFinite));assert.ok(Math.abs(n.length()-1)<1e-8);
 }
});
test('physical limb support faces outward and its bounded armor has actual thickness',()=>{
 const support=limbVolume({length:.4,radii:[[0,.07,.08],[.4,.09,.09],[1,.04,.04]]});
 assert.ok(surface(support).normal(.5,.5).z>.9);
 const mats=cyberMaterials(),leaf=armorLeaf(support,{left:[[0,.3],[1,.35]],right:[[0,.7],[1,.65]],material:mats.shell});
 assert.ok(leaf.geometry.index.count>100);assert.equal(leaf.userData.construction.thickness,.004);dispose(leaf);
 assert.throws(()=>limbVolume({length:-1,radii:[[0,.1,.1],[1,.1,.1]]}));
});
test('segmented armor shares one support while preserving authored gaps and independent leaves',()=>{
 const support=limbVolume({length:.42,radii:[[0,.07,.08],[.5,.085,.075],[1,.045,.05]]}),m=cyberMaterials();
 const parts=[
  {label:'lower',start:.08,end:.42,left:[[0,.30],[1,.34]],right:[[0,.48],[1,.49]],material:m.shell},
  {label:'upper',start:.51,end:.90,left:[[0,.52],[1,.51]],right:[[0,.72],[1,.68]],offset:.001,material:m.shell},
 ];
 const set=segmentedArmor(support,{name:'Test plates',parts});
 assert.equal(set.children.length,2);assert.deepEqual(set.userData.construction.parts.map(p=>[p.label,p.start,p.end]),[['lower',.08,.42],['upper',.51,.9]]);
 const boxes=set.children.map(o=>new THREE.Box3().setFromObject(o));assert.ok(boxes[0].max.y<boxes[1].min.y-.01);
 const sparse=segmentedArmor(support,{name:'Sparse plates',parts,segments:[8,12]});
 assert.deepEqual(sparse.userData.construction.segments,[8,12]);assert.ok(inspect(sparse).triangles<inspect(set).triangles*.5);
 assert.throws(()=>segmentedArmor(support,{parts:[parts[0],{...parts[1],label:'lower'}]}));dispose(set);dispose(sparse);
 const thigh=limbArmor({name:'Test thigh',length:.428,radii:[[0,.073,.08],[.22,.088,.081],[.52,.075,.073],[.79,.056,.06],[1,.045,.048]],type:'thigh'},m);
 assert.ok(thigh.getObjectByName('Test thigh / articulated front / main outer leaf'));
 assert.ok(thigh.getObjectByName('Test thigh / articulated front / main inner leaf'));
 assert.ok(thigh.getObjectByName('Test thigh / exposed flex bridge 0'));dispose(thigh);
});
test('boot has a closed toe bumper and shields expose resolution-independent silhouette profiles',()=>{
 const m=cyberMaterials(),boot=sculptedBoot({},m),shield=contouredShield({},m);
 const shifted=contouredShield({width:.1,widthProfile:[[0,.5],[.5,1],[1,.5]],centerProfile:[[0,.2],[1,.2]]},m);
 assert.ok(boot.getObjectByName('Toe bumper'));assert.ok(boot.getObjectByName('Toe outer petal'));assert.ok(boot.getObjectByName('Toe inner petal'));assert.ok(boot.getObjectByName('Segmented ankle cuff'));
 assert.equal(shield.children.length,2);assert.equal(shield.userData.construction.normalClearance,.0015);
 assert.equal(shifted.userData.construction.method,'profiled single-support layered shield');
 const baseX=shield.children[0].geometry.attributes.position.getX(0),shiftX=shifted.children[0].geometry.attributes.position.getX(0);
 assert.ok(shiftX>baseX+.01);
 assert.throws(()=>contouredShield({widthProfile:[[0,.5],[.9,1]]},m));
 dispose(boot);dispose(shield);dispose(shifted);
});
test('scene retains one authored camera and five lights at every construction stage',()=>{
 for(const stage of ['gesture','masses','assembly']){
  const root=buildModel(model,{stage});let cameras=0,lights=0;root.traverse(o=>{if(o.isCamera)cameras++;if(o.isLight)lights++;});
  assert.equal(cameras,1);assert.equal(lights,5);assert.equal(root.getObjectByName('Android').userData.poseGuide.stage,stage);
  if(stage==='assembly'){
   assert.ok(root.getObjectByName('Guided curtain'));assert.ok(root.getObjectByName('Contoured Thigh enclosing panels'));
   assert.equal(root.getObjectByName('Reactor carrier lugs').children.length,12);
   assert.ok(root.getObjectByName('Shoulder joint ball').scale.x<.9);
   assert.ok(root.getObjectByName('Contoured Thigh enclosing panels / articulated front / main outer leaf'));
   assert.ok(root.getObjectByName('Contoured Thigh enclosing panels / knee bracket stack / outer knee ear'));
   assert.ok(inspect(root).triangles<560000,'baked/cage default must keep headroom under the fixed form-study budget');
  }
  dispose(root);
 }
});
test('form edits preserve observed pose landmarks and improve the separate coarse hair envelope',async()=>{
 const before=await measureRecipe('models/cyber-pose-study.js'),after=await measureRecipe('models/cyber-form-study.js');
 assert.ok(Math.abs(before.rmsPixels-after.rmsPixels)<1e-5);
 assert.ok(after.regions.hair.envelope.iou>.85);assert.ok(after.regions.hair.envelope.iou>before.regions.hair.envelope.iou+.2);
 assert.equal(after.visualAcceptance,'not-assessed');
});
