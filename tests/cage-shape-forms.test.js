import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {quadCage,atlasCage} from '../src/lib/forms/cage.js';
import {buildCageHand,handCage} from '../src/lib/forms/cage-hand.js';
import {assetInfo} from '../src/lib/rigging.js';
import {dispose} from '../src/lib/modeling.js';
const cube=()=>quadCage([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]]);

test('localized volume operators compose without changing cage connectivity or UVs',async()=>{
  const {deformCage,softMove}=await import('../src/lib/forms/cage-shape.js');
  const c=atlasCage(cube(),{size:256});
  const a=softMove({center:[1,1,1],radius:[1,1,1],offset:[.05,0,0]});
  const b=softMove({center:[1,1,1],radius:[1,1,1],offset:[0,.08,0]});
  const shaped=deformCage(c,a,b);
  assert.deepEqual(shaped.faces,c.faces);assert.notDeepEqual(shaped.points,c.points);
  assert.deepEqual(deformCage(deformCage(c,a),b),shaped);
  assert.throws(()=>softMove({center:[0,0,0],radius:[0,1,1],offset:[1,0,0]}),/positive/);
  assert.throws(()=>deformCage(c,()=>[NaN,0,0]),/invalid/);
});

test('distal fingertips do not retain wrist influence and nails use the skin weight field',()=>{
  const root=buildCageHand(undefined,{mode:'cage'}),body=root.getObjectByName('ContinuousHand');
  try{
    const {digits}=handCage(),p=body.geometry.attributes.position,ix=body.geometry.attributes.skinIndex,w=body.geometry.attributes.skinWeight;
    const wrist=body.skeleton.bones.findIndex(b=>b.name==='Wrist');let checked=0;
    for(const d of digits)for(let i=0;i<p.count;i++){
      const q=new THREE.Vector3().fromBufferAttribute(p,i).sub(d.origin),along=q.dot(d.direction);
      if(along/d.length<.83||q.clone().addScaledVector(d.direction,-along).length()>d.radius*1.3)continue;
      for(let k=0;k<4;k++)if(ix.array[i*4+k]===wrist)assert.ok(w.array[i*4+k]<1e-5,`${d.name} wrist contamination`);
      checked++;
    }
    assert.ok(checked>100);assert.equal(assetInfo(root).skinnedMeshes,6);
  }finally{dispose(root);}
});

test('editable control source preserves quads, per-corner UVs and normalized named weights',async()=>{
  const {cageHandSource}=await import('../src/lib/forms/cage-hand.js');
  const a=cageHandSource(),b=JSON.parse(JSON.stringify(a));assert.deepEqual(a,b);
  assert.equal(a.faces.length,350);assert.equal(a.points.length,352);assert.equal(a.joints.length,17);
  const names=new Set(a.joints.map(j=>j.name));
  for(const f of a.faces){assert.equal(f.vertices.length,4);assert.equal(f.uv.length,4);}
  for(const weights of a.weights){assert.ok(Math.abs(weights.reduce((s,[,w])=>s+w,0)-1)<1e-8);assert.ok(weights.every(([n,w])=>names.has(n)&&w>=0));}
  assert.equal(a.weights.length,a.points.length);
});
