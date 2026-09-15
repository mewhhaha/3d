import test from 'node:test';import assert from 'node:assert/strict';
import {cacheSurface,measureSurfaceCache} from '../src/lib/surface-cache.js';
import {guideCurve,railSurface} from '../src/lib/shape-rails.js';
import {prismHairGuides} from '../src/lib/cyber/hair-guides.js';
test('cache reproduces affine supports including boundaries and endpoints',()=>{
 const fn=(u,v)=>[u+2*v,3*u-v,2],c=cacheSurface(fn,{segments:[8,8]});
 for(const u of[0,.123,.98,1])for(const v of[0,.314,.999,1])assert.ok(Math.hypot(...fn(u,v).map((p,i)=>p-c(u,v)[i]))<1e-12);
 assert.ok(measureSurfaceCache(fn,c).maxMeters<1e-12);
});
test('periodic value and first derivative agree at the seam',()=>{
 const c=cacheSurface((u,v)=>[Math.cos(u*2*Math.PI),v,Math.sin(u*2*Math.PI)],{segments:[64,16],wrapU:true}),h=1e-6;
 assert.deepEqual(c(0,.5),c(1,.5));
 const a=c(h,.5),b=c(-h,.5),s=c(0,.5);for(let k=0;k<3;k++)assert.ok(Math.abs((a[k]-s[k])/h-(s[k]-b[k])/h)<.0001);
});
test('hair primary-support cache has an independently measured spatial error bound',()=>{
 const source=railSurface(Object.values(prismHairGuides).map(p=>guideCurve(p))),c=cacheSurface(source,{segments:[192,192]}),r=measureSurfaceCache(source,c,{samples:2048});
 assert.ok(r.maxMeters<.00005,JSON.stringify(r));
});
test('invalid caches are rejected and no source is sampled at render time',()=>{
 let samples=0;const c=cacheSurface((u,v)=>{samples++;return[u,v,0];},{segments:[8,8]});const before=samples;c(.11,.37);assert.equal(samples,before);
 assert.throws(()=>cacheSurface(()=>[NaN,0,0]));assert.throws(()=>cacheSurface((u,v)=>[u,v,0],{segments:[2,8]}));assert.throws(()=>c(-.1,.5));
});
