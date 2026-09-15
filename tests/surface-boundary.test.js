import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceEdge, matchBoundary, boundaryGap, partitionSurface} from '../src/lib/surface-boundary.js';
import {bobGuides} from '../src/lib/cyber/hair-design.js';
const plane=(u,v)=>[u,v,0];
test('shared-edge constraint is exact and compactly supported',()=>{
 const target=t=>[0,t,t*t],patch=matchBoundary(plane,{edge:'u0',curve:target,width:.2});
 assert.equal(boundaryGap(surfaceEdge(patch,'u0'),target).maxMeters,0);
 for(const u of [.2,.5,1])assert.deepEqual(patch(u,.3),plane(u,.3));
 assert.deepEqual(plane(0,1),[0,1,0]);assert.ok(patch(.1,.5)[2]>0);
});
test('all edge orientations and reversed partial curves work',()=>{
 for(const edge of ['u0','u1','v0','v1']){
  const target=t=>[t,t*t,2],p=matchBoundary(plane,{edge,curve:target});
  assert.ok(boundaryGap(surfaceEdge(p,edge),target).maxMeters<1e-12);
 }
 assert.deepEqual(surfaceEdge(plane,'v1',{from:.8,to:.2})(.5),[.5,1,0]);
});
test('invalid constraints fail before producing nonfinite geometry',()=>{
 assert.throws(()=>surfaceEdge(plane,'x0'));assert.throws(()=>surfaceEdge(plane,'u0',{from:.2,to:.2}));
 assert.throws(()=>matchBoundary(plane,{edge:'u0',curve:t=>[0,t,1],width:0}));
 assert.throws(()=>matchBoundary(plane,{edge:'u0',curve:t=>[0,t,NaN]})(0,.3));
 assert.throws(()=>boundaryGap(plane,plane,{samples:1}));
});
test('periodic hair charts meet at both exact shared boundaries',()=>{
 const {curtain,fringe}=bobGuides();
 assert.ok(boundaryGap(surfaceEdge(curtain,'u1',{to:.47}),surfaceEdge(fringe,'u0')).maxMeters<1e-12);
 assert.ok(boundaryGap(surfaceEdge(curtain,'u0',{to:.47}),surfaceEdge(fringe,'u1')).maxMeters<1e-12);
});
test('partitioned material charts share one support and validate ranges',()=>{
 const p=partitionSurface(plane,[{name:'a',end:.4},{name:'b',end:1}]);
 assert.deepEqual(p.a(1,.3),p.b(0,.3));assert.deepEqual(p.b(1,.7),[1,.7,0]);
 assert.throws(()=>partitionSurface(plane,[{name:'a',end:.8}]));
 assert.throws(()=>partitionSurface(plane,[{name:'a',end:.8},{name:'a',end:1}]));
 assert.throws(()=>partitionSurface(plane,[{name:'a',end:1.1}]));
});
test('transverse derivative matches a supplied smooth continuation',()=>{
 const target=t=>[0,t,1],patch=matchBoundary(plane,{edge:'u0',curve:target,inward:()=>[1,0,.4],width:.3});
 const h=1e-6,a=patch(0,.5),b=patch(h,.5),d=b.map((x,i)=>(x-a[i])/h);
 d.forEach((x,i)=>assert.ok(Math.abs(x-[1,0,.4][i])<1e-5));
 assert.deepEqual(patch(.3,.5),[.3,.5,0]);
});
