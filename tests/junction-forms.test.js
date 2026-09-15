import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fairJoin, normalSampler } from '../src/lib/forms/fair.js';

test('junction relaxation is explicit and differs from shape-preserving fairing',()=>{
  const make=()=>new THREE.Mesh(new THREE.BoxGeometry(1,1,1).toNonIndexed());
  const fair=make(),relaxed=make();
  fairJoin([fair],{iterations:2});
  const report=fairJoin([relaxed],{iterations:2,method:'relax'});
  assert.equal(report.method,'relax');
  assert.ok(relaxed.geometry.boundingBox.getSize(new THREE.Vector3()).length()<fair.geometry.boundingBox.getSize(new THREE.Vector3()).length());
  assert.throws(()=>fairJoin([relaxed],{method:'unknown'}));
  for(const m of [fair,relaxed]){m.geometry.dispose();m.material.dispose();}
});
test('LOD edge extension uses nearby high mesh normals and rejects larger UV gaps',()=>{
  const g=new THREE.BufferGeometry();
  g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));
  g.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));
  const strict=normalSampler(g),padded=normalSampler(g,{edgePadding:.02});
  assert.throws(()=>strict(.51,.51));
  assert.ok(padded(.51,.51).distanceTo(new THREE.Vector3(0,0,1))<1e-8);
  assert.equal(padded.stats.edgeSamples,1);
  assert.ok(padded.stats.maxEdgeDistance<.02);
  assert.throws(()=>padded(.6,.6));assert.throws(()=>normalSampler(g,{edgePadding:.1}));
  g.dispose();
});
