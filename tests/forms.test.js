import test from 'node:test';
import assert from 'node:assert/strict';
import { surface, profile, layers, mound, crease, grain, tessellate, bakeNormals, surfaceMesh } from '../src/lib/forms/surface.js';
import { dispose } from '../src/lib/modeling.js';
const plane = detail => surface((u, v) => [u, v, 0], { detail });
test('profiles interpolate without overshoot and reject malformed stations', () => {
  const p = profile([[0, 0], [.3, 1], [1, .2]]);
  assert.equal(p(.3), 1); assert.equal(p(-1), 0); assert.equal(p(2), .2);
  for (let i=0;i<100;i++) assert.ok(p(i/100)>=0 && p(i/100)<=1);
  assert.throws(()=>profile([[0,0],[0,1]]));
});
test('shape fields compose rather than specifying vertex coordinates', () => {
  const a=mound({height:.01}), b=crease({from:[.2,.4],to:[.8,.5]});
  assert.equal(layers(a,b)(.4,.5),a(.4,.5)+b(.4,.5));
  assert.equal(grain({seed:4})(.2,.3),grain({seed:4})(.2,.3));
  assert.throws(()=>crease({from:[0,0],to:[0,0]}));
});
test('surface samples have UVs, outward normals and finite Mikk tangents', () => {
  const g=tessellate(plane(()=>0),{segments:[8,8]});
  assert.equal(g.attributes.position.count,8*8*6);
  for(let i=0;i<g.attributes.normal.count;i++) assert.ok(g.attributes.normal.getZ(i)>.999);
  assert.ok(g.attributes.tangent.array.every(Number.isFinite)); g.dispose();
  assert.throws(()=>tessellate(plane(()=>0),{segments:[1,4]}));
});
test('high-to-low bake reconstructs slope, not a generic noise normal map', () => {
  const chart=plane(layers(mound({height:.05,radius:[.12,.18]}),grain({amplitude:.001,frequency:12})));
  const low=tessellate(chart,{segments:[8,8]}),tex=bakeNormals(chart,low,{size:64}),r=tex.userData.bake;
  assert.equal(r.samples,4096); assert.ok(r.meanBaseErrorDegrees>2);
  assert.ok(r.meanQuantizedErrorDegrees<.3); assert.ok(r.maxQuantizedErrorDegrees<.5);
  assert.equal(tex.colorSpace,''); assert.equal(tex.flipY,false);
  low.dispose();tex.dispose();
});
test('lower detail saves real triangles and owns its normal texture', () => {
  const chart=plane(mound());
  const hi=surfaceMesh('Hi',chart,{mode:'sculpt',segments:[8,8]}),lo=surfaceMesh('Lo',chart,{segments:[8,8],textureSize:32});
  assert.equal(hi.geometry.attributes.position.count/lo.geometry.attributes.position.count,16);
  assert.ok(lo.material.normalMap);assert.equal(hi.material.normalMap,null);
  const other=surfaceMesh('Other',chart,{segments:[8,8],textureSize:32}); assert.notEqual(lo.material.normalMap,other.material.normalMap);
  dispose(hi);dispose(lo);dispose(other);
});
