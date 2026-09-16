import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { shapeProfile, guideCurve, railSurface, surfaceBand, compileSurface, thickenSurface, loopCap } from '../src/lib/shape-rails.js';
import { dispose } from '../src/lib/modeling.js';
const plane=(u,v)=>[u,v,0];
test('shape-preserving profiles interpolate keys without overshoot and reject bad input',()=>{
 const p=shapeProfile([[0,1],[.2,3],[.6,2],[1,5]]);
 for(const [t,x]of[[0,1],[.2,3],[.6,2],[1,5]])assert.equal(p(t),x);
 for(let i=0;i<=1000;i++){const t=i/1000,v=p(t);assert.ok(v>=1&&v<=5);if(t>=.2&&t<=.6)assert.ok(v>=2&&v<=3);}
 assert.throws(()=>p(NaN));assert.throws(()=>shapeProfile([[0,0],[0,1],[1,2]]));
});
test('guide input is copied and endpoints remain exact',()=>{
 const pts=[[0,0,0],[0,.5,.2],[0,1,0]],c=guideCurve(pts);pts[0][0]=9;
 assert.deepEqual(c(0),[0,0,0]);assert.deepEqual(c(1),[0,1,0]);assert.throws(()=>guideCurve([[0,0,0],[0,0,0]]));
});
test('lofts interpolate every guide and close the seam',()=>{
 const rails=[0,1,2].map(x=>v=>[x,v,0]),s=railSurface(rails);
 assert.deepEqual(s(.5,.3),[1,.3,0]);assert.deepEqual(s(1,1),[2,1,0]);
 const c=railSurface([v=>[1,v,0],v=>[0,v,1],v=>[-1,v,0],v=>[0,v,-1]],{closed:true});
 assert.deepEqual(c(0,.5),c(1,.5));
});
test('curved chart boundaries compose and cannot cross',()=>{
 const band=surfaceBand(plane,{left:v=>.1+.1*v,right:v=>.9-.2*v});
 assert.deepEqual(band(0,1),[.2,1,0]);assert.deepEqual(band(1,1),[.7,1,0]);
 assert.throws(()=>surfaceBand(plane,{left:()=>.9,right:()=>.1})(.5,.5));
});
test('low and baked attributes stay identical and all normal texels are non-color',()=>{
 const options={segments:[8,8],textureSize:32,detail:(u,v)=>.01*Math.sin(u*12)*Math.sin(v*9)};
 const low=compileSurface('Low',plane,{...options,mode:'cage'}),baked=compileSurface('Baked',plane,{...options,mode:'baked'});
 for(const key of ['position','normal','tangent','uv'])assert.deepEqual(low.geometry.attributes[key].array,baked.geometry.attributes[key].array);
 assert.equal(baked.material.normalMap.colorSpace,'');assert.ok(baked.material.normalMap.userData.bake.samples>0);dispose(low);dispose(baked);
});
test('offset shell preserves thickness and is closed after geometric seam welding',()=>{
 const o=thickenSurface('Shell',plane,{segments:[4,4],thickness:.02}),g=o.geometry,p=g.attributes.position,edges=new Map(),directions=new Map();
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(6)).join(',');
 for(let i=0;i<g.index.count;i+=3)for(let k=0;k<3;k++){const a=key(g.index.getX(i+k)),b=key(g.index.getX(i+(k+1)%3)),e=[a,b].sort().join('|');edges.set(e,(edges.get(e)||0)+1);directions.set(e,(directions.get(e)||0)+(a<b?1:-1));}
 assert.ok([...edges.values()].every(n=>n===2));assert.ok([...directions.values()].every(n=>n===0));assert.ok(Math.abs(p.getZ(25)+.02)<1e-8);dispose(o);
});

test('loop caps preserve their boundary while replacing a flat fan with a smooth dome',()=>{
 const ring=Array.from({length:17},(_,i)=>{const a=i/16*Math.PI*2;return[.05*Math.cos(a),0,.04*Math.sin(a)];});
 const cap=loopCap('Test cap',ring,{lift:.012,rings:4,material:new THREE.MeshStandardMaterial()});
 const p=cap.geometry.attributes.position,meta=cap.userData.construction;
 assert.equal(meta.boundaryPoints,16);assert.equal(meta.rings,4);assert.equal(p.count,65);
 assert.ok(Math.abs(p.getX(0)-.05)<1e-6);assert.ok(Math.abs(p.getY(0))<1e-6);
 assert.ok(p.getY(p.count-1)>.0119);assert.ok(cap.geometry.index.count>16*3);
 for(let i=0;i<p.count;i++)assert.ok([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));
 dispose(cap);
 assert.throws(()=>loopCap('Bad',[[0,0,0],[1,0,0]],{}));
});
