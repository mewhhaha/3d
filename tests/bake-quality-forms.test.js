import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { surface, tessellate, bakeNormals, layers, crease } from '../src/lib/forms/surface.js';
import { sampleNormalMap, measureBake } from '../src/lib/forms/bake-quality.js';
test('normal texture sampling interpolates linear values and handles repeat seams', () => {
  const t = new THREE.DataTexture(new Uint8Array([255,128,255,255,0,128,255,255]),2,1,THREE.RGBAFormat);
  t.flipY=false;t.wrapS=THREE.RepeatWrapping;
  const n=sampleNormalMap(t,.5,.5);assert.ok(Math.abs(n.x)<1e-9&&n.z>.999);
  assert.ok(sampleNormalMap(t,0,.5).distanceTo(sampleNormalMap(t,1,.5))<1e-9);
  assert.ok(sampleNormalMap(t,.25,.5).x>.7);
  t.colorSpace=THREE.SRGBColorSpace;assert.throws(()=>sampleNormalMap(t,.3,.5));t.dispose();
});
test('independent filtered samples detect both preserved creases and a damaged normal map', () => {
  const chart=surface((u,v)=>[u*.12,v*.12,0],{detail:layers(
    crease({from:[.1,.45],to:[.9,.55],width:.04,depth:.001}),
  )});
  const low=tessellate(chart,{segments:[12,12]}),high=tessellate(chart,{segments:[96,96],detailed:true});
  const texture=bakeNormals(chart,low,{size:128}),r=measureBake(low,high,texture,{samples:512});
  assert.ok(r.baked.p95Degrees<r.base.p95Degrees*.5 && r.baked.maxDegrees<1,JSON.stringify(r));
  assert.deepEqual(r,measureBake(low,high,texture,{samples:512}));
  texture.image.data.fill(128);const bad=measureBake(low,high,texture,{samples:512});
  assert.ok(bad.baked.meanDegrees>r.baked.meanDegrees+20);
  low.dispose();high.dispose();texture.dispose();
});
