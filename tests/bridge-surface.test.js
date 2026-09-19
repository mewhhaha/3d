import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {bridgeSurface} from '../src/lib/surface-boundary.js';
import {surface} from '../src/lib/forms/surface.js';
import {ductBoundaries} from '../studies/boundary-duct.js';
const dist=(a,b)=>new T.Vector3(...a).distanceTo(new T.Vector3(...b));
test('bridge has exact, independently owned boundaries and preserves supplied transverse derivatives',()=>{
 const start=u=>[u,0,0],end=u=>[u,.4,.2],ta=u=>[.1*u,.6,.8],tb=u=>[-.2*u,.4,-.2];
 const span=bridgeSurface(start,end,{tangentStart:ta,tangentEnd:tb}),h=1e-6;
 for(const u of [0,.13,.47,.9,1]){
  assert.deepEqual(span(u,0),start(u));assert.deepEqual(span(u,1),end(u));
  const first=span(u,h).map((x,i)=>(x-start(u)[i])/h),last=span(u,1-h).map((x,i)=>(end(u)[i]-x)/h);
  assert.ok(dist(first,ta(u))<3e-6);assert.ok(dist(last,tb(u))<3e-6);
 }
 const constant=[0,0,0],owned=bridgeSurface(()=>constant,()=>[0,1,0]);owned(.2,0)[0]=8;assert.equal(constant[0],0);
});
test('absent tangents give linear interpolation; bad parameters and sampled data throw',()=>{
 const a=u=>[u,0,0],b=u=>[u,1,.5],f=bridgeSurface(a,b);
 assert.deepEqual(f(.3,.4),[.3,.4,.2]);
 for(const x of [-.1,1.1,NaN])assert.throws(()=>f(x,.2));
 assert.throws(()=>bridgeSurface(()=>[1e308,0,0],()=>[-1e308,1,0])(.2,.5));
 assert.throws(()=>bridgeSurface(null,b));assert.throws(()=>bridgeSurface(a,b,{tangentStart:[0,1,0]}));
 assert.throws(()=>bridgeSurface(()=>[0,NaN,0],b)(.2,.3));
 assert.throws(()=>bridgeSurface(a,b,{tangentEnd:()=>[Infinity,0,0]})(.2,.3));
});
test('closed duct edges retain periodic positions/normals and unchanged endpoints in curved or ruled variants',()=>{
 const {start,end,...tangents}=ductBoundaries(),a=bridgeSurface(start,end),b=bridgeSurface(start,end,tangents),s=surface(b,{wrapU:true});
 for(const v of [.1,.5,.9]){assert.ok(dist(b(0,v),b(1,v))<1e-12);assert.ok(s.normal(0,v).distanceTo(s.normal(1,v))<1e-8);}
 for(let i=0;i<=16;i++)for(const v of [0,1])assert.deepEqual(a(i/16,v),b(i/16,v));
 assert.ok(dist(a(.2,.5),b(.2,.5))>.01);
 for(let j=0;j<=12;j++)for(let i=0;i<32;i++){
  const n=s.normal(i/32,j/12);assert.ok(n.toArray().every(Number.isFinite));assert.ok(Math.abs(n.length()-1)<1e-6);
 }
});
