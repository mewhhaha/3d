import test from 'node:test';
import assert from 'node:assert/strict';
import { ellipsoidCage, sculpt, ball, stroke, facing, region, intersect, union, invert, mirrorMask, pull, inflate, flatten, relax } from '../src/lib/forms/sculpt.js';
import { topology, atlasCage, quadCage } from '../src/lib/forms/cage.js';
import { cageAsset } from '../src/lib/forms/cage-asset.js';
import { dispose } from '../src/lib/modeling.js';
const seed=()=>ellipsoidCage({radii:[.04,.06,.02],level:2});
test('compact masks are bounded, combine predictably, and do not move outside their support',()=>{
  const m=ball({radius:1});assert.equal(m([0,0,0]),1);assert.equal(m([1,0,0]),0);assert.equal(m([3,0,0]),0);
  assert.equal(intersect(m,invert(m))([0,0,0]),0);assert.equal(union(m,invert(m))([0,0,0]),1);
  const c=seed(),d=sculpt(c,pull(ball({at:[.04,0,0],radius:.01}),[.001,0,0]));
  c.points.forEach((p,i)=>{if(p[0]<.02)assert.deepEqual(p,d.points[i]);});assert.notDeepEqual(c.points,d.points);
});
test('sculpt composes changes without mutating the input, topology, tags or UVs',()=>{
  const a=atlasCage(seed(),{size:512}),before=JSON.stringify(a);
  const b=sculpt(a,inflate(intersect(region('Front'),facing()),.001),relax(ball({radius:1}),{iterations:2}));
  assert.equal(JSON.stringify(a),before);assert.deepEqual(b.faces,a.faces);assert.deepEqual(b.atlas,a.atlas);
  assert.notDeepEqual(b.points,a.points);assert.equal(topology(b).edges.size,topology(a).edges.size);
});
test('polyline strokes are continuous at joins, projected selection ignores depth',()=>{
  const mask=stroke([[0,0,0],[1,0,0],[1,1,0]],{radius:.1,plane:'xy'});
  assert.equal(mask([1,0,10]),1);assert.equal(mask([1,.5,-3]),1);assert.equal(mask([.5,.5,0]),0);
  assert.ok(Math.abs(mask([.99,.01,0])-mask([1.01,.01,0]))<.00001);
});
test('mirror selection does not double strength on the symmetry plane',()=>{
  const m=mirrorMask(ball({at:[.01,0,0],radius:.04}));assert.equal(m([0,0,0],[0,0,1],{}),ball({at:[.01,0,0],radius:.04})([0,0,0]));
  assert.equal(m([.02,0,0],[0,0,1],{}),m([-.02,0,0],[0,0,1],{}));
});
test('flatten moves toward its plane; relax preserves open boundaries',()=>{
  const c=seed(),d=sculpt(c,flatten(facing(),{at:[0,0,.005],normal:[0,0,1],strength:.8}));
  assert.ok(Math.max(...d.points.map(p=>p[2]))<Math.max(...c.points.map(p=>p[2])));
  const points=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3),i===4?.2:0]);
  const plane=quadCage(points,[[0,1,4,3],[1,2,5,4],[3,4,7,6],[4,5,8,7]]);
  const smoothed=sculpt(plane,relax(()=>1,{iterations:2}));
  points.forEach((p,i)=>{if(i!==4)assert.deepEqual(smoothed.points[i],p);});
  assert.ok(smoothed.points[4][2]<points[4][2]);
});
test('bad brushes and zero-radius or repeated stroke inputs fail explicitly',()=>{
  assert.throws(()=>ball({radius:0}),/positive/);assert.throws(()=>stroke([[0,0,0],[0,0,0]]),/Repeated/);
  assert.throws(()=>sculpt(seed(),{kind:'unknown'}),/Unknown/);assert.throws(()=>sculpt(seed(),inflate(()=>NaN,.01)),/Selection/);
  assert.throws(()=>relax(()=>1,{iterations:1000}),/Invalid/);assert.throws(()=>facing([0,0,0]),/zero/);
});
test('generic cage compiler keeps low and baked positions identical and owns its normal map',()=>{
  const c=sculpt(seed(),inflate(intersect(facing(),ball({radius:.1})),.002));
  const a=cageAsset(c,{mode:'cage',lowLevel:1,highLevel:2,textureSize:512});
  const b=cageAsset(c,{mode:'baked',lowLevel:1,highLevel:2,textureSize:512,detail:[inflate(ball({at:[0,.02,.02],radius:.018}),.0004)]});
  assert.deepEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);
  assert.deepEqual(a.geometry.attributes.tangent.array,b.geometry.attributes.tangent.array);
  assert.ok(b.material.normalMap.isDataTexture);assert.equal(b.material.normalMap.userData.correspondence.edgeSamples,0);
  dispose(a);dispose(b);
});
