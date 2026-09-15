import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildCageHand, handCage } from '../src/lib/forms/cage-hand.js';
import { hand, palm, fingers, opposingThumb } from '../src/lib/forms/hand.js';
import { topology } from '../src/lib/forms/cage.js';
import { auditSeams } from '../src/lib/forms/audit.js';
import { assetInfo } from '../src/lib/rigging.js';
import { inspect, dispose } from '../src/lib/modeling.js';
import { measureBake } from '../src/lib/forms/bake-quality.js';

test('hand grows from a single closed manifold cage across proportion limits',()=>{
  for(const spread of [0,1])for(const breadth of [.8,1.2]){
    const {cage}=handCage(hand(palm({breadth}),fingers({spread}),opposingThumb({reach:breadth}))), t=topology(cage);
    assert.ok([...t.edges.values()].every(e=>e.faces.length===2));
    assert.equal(cage.points.length-t.edges.size+cage.faces.length,2);
  }
});
test('cage/baked geometry is identical; high mesh transfers into one exact-domain atlas',()=>{
  const cage=buildCageHand(undefined,{mode:'cage',textureSize:512}),low=buildCageHand(undefined,{mode:'baked',textureSize:512}),high=buildCageHand(undefined,{mode:'sculpt',textureSize:512});
  try{
    const a=cage.getObjectByName('ContinuousHand'),b=low.getObjectByName('ContinuousHand'),h=high.getObjectByName('ContinuousHand');
    for(const [name,attr]of Object.entries(a.geometry.attributes)) assert.deepEqual(b.geometry.attributes[name].array,attr.array,name);
    assert.equal(assetInfo(low).bones,17);assert.equal(assetInfo(low).textures,1);
    assert.ok(inspect(high).triangles/inspect(low).triangles>14);
    assert.equal(b.material.normalMap.userData.bake.boundaryExtension.edgeSamples,0);
    const quality=measureBake(b.geometry,h.geometry,b.material.normalMap,{samples:2048});
    console.log('CAGE_HAND_FILTERED_QUALITY',JSON.stringify(quality));
    assert.ok(quality.baked.meanDegrees<.8);assert.ok(quality.baked.p95Degrees<2);
    const audit=auditSeams(low);assert.equal(audit.components,1);assert.equal(audit.boundaryEdges,0);assert.equal(audit.nonManifoldEdges,0);assert.equal(audit.inconsistentWinding,0);
    const ix=b.skeleton.bones.find(j=>j.name==='Index_PIP'),index=b.geometry.attributes.position;
    const before=Array.from({length:index.count},(_,i)=>b.getVertexPosition(i,new THREE.Vector3()));
    ix.rotation.x=-.7;low.updateMatrixWorld(true);
    let moved=0;for(let i=0;i<index.count;i++)moved=Math.max(moved,b.getVertexPosition(i,new THREE.Vector3()).distanceTo(before[i]));assert.ok(moved>.02);
    ix.rotation.x=0;low.updateMatrixWorld(true);
    for(let i=0;i<index.count;i++)assert.ok(b.getVertexPosition(i,new THREE.Vector3()).distanceTo(before[i])<1e-7);
  }finally{dispose(cage);dispose(low);dispose(high);}
});
