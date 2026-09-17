import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
import {faceRegionNames} from '../src/lib/face-regions.js';
const outline=[[.1,.1],[.9,.1],[.9,.9],[.6,.9],[.6,.4],[.4,.4],[.4,.9],[.1,.9]];
const plane=(u,v)=>[u,v,0],dome=(u,v)=>[(u-.5)*.4,(v-.5)*.6,.08*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)];
function audit(g){
 const p=g.attributes.position,uv=g.attributes.uv,ix=g.index;let a=0;const edges=new Map();
 for(let i=0;i<ix.count;i+=3){
  const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],q=ids.map(i=>new THREE.Vector3().fromBufferAttribute(p,i));
  assert.ok(q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])).length()>1e-12);
  const x=ids.map(i=>[uv.getX(i),uv.getY(i)]);a+=((x[1][0]-x[0][0])*(x[2][1]-x[0][1])-(x[1][1]-x[0][1])*(x[2][0]-x[0][0]))/2;
  for(let j=0;j<3;j++){const aa=q[j].toArray().map(x=>x.toFixed(7)).join(','),bb=q[(j+1)%3].toArray().map(x=>x.toFixed(7)).join(','),k=[aa,bb].sort().join('|'),r=edges.get(k)||{n:0,w:0};r.n++;r.w+=aa<bb?1:-1;edges.set(k,r);}
 }
 return {area:a,edges};
}
test('concave chart has exact domain area, consistent winding, no bridged notch',()=>{
 for(const refinement of [0,2,3]){const g=surfaceContourGeometry(plane,{outline,refinement});assert.ok(Math.abs(audit(g).area-.54)<1e-7);
 for(let i=0;i<g.index.count;i+=3){let u=0,v=0;for(let j=0;j<3;j++){const k=g.index.getX(i+j);u+=g.attributes.uv.getX(k)/3;v+=g.attributes.uv.getY(k)/3;}assert.ok(!(u>.400001&&u<.599999&&v>.400001),'notch must remain open');}g.dispose();}
});
test('refinement evaluates curved support after subdivision; normals stay unit and forward',()=>{
 const g=surfaceContourGeometry(dome,{outline,refinement:3});const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const expected=new THREE.Vector3(...dome(uv.getX(i),uv.getY(i)));assert.ok(expected.distanceTo(new THREE.Vector3().fromBufferAttribute(p,i))<1e-7);assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n,i).length()-1)<1e-6);assert.ok(n.getZ(i)>0);}
 g.dispose();
});
test('rounding is independent of tessellation; source data unchanged and builds own buffers',()=>{
 const original=JSON.stringify(outline),a=surfaceContourGeometry(dome,{outline,rounding:.15,refinement:2}),b=surfaceContourGeometry(dome,{outline:[...outline].reverse(),rounding:.15,refinement:2});
 assert.equal(JSON.stringify(outline),original);assert.notEqual(a.attributes.position.array,b.attributes.position.array);assert.equal(a.index.count,b.index.count);
 const c=surfaceContourGeometry(dome,{outline,rounding:.15,refinement:3});for(let i=0;i<a.userData.surfaceContour.boundaryCount;i++)assert.deepEqual(Array.from(a.attributes.position.array.slice(i*3,i*3+3)),Array.from(c.attributes.position.array.slice(i*3,i*3+3)));
 a.dispose();b.dispose();c.dispose();
});
test('contour composes with solidify: closed geometric edges and semantic skins/rim',()=>{
 const a=surfaceContourGeometry(dome,{outline,rounding:.12,refinement:2}),b=solidifyGeometry(a,{thickness:.006,offset:-1,regionPrefix:'cover'});
 for(const r of audit(b).edges.values()){assert.equal(r.n,2);assert.equal(r.w,0);}
 assert.deepEqual(faceRegionNames(b).sort(),['cover.inner','cover.outer','cover.rim']);a.dispose();b.dispose();
});
test('invalid contours and singular supports fail instead of generating corrupt shells',()=>{
 for(const points of [[[0,0],[1,1],[0,1],[1,0]],[[0,0],[1,0],[1,0],[0,1]],[[0,0],[.5,0],[1,0]],[[-.1,0],[1,0],[0,1]]])assert.throws(()=>surfaceContourGeometry(plane,{outline:points}));
 for(const options of [{refinement:7},{refinement:1.1},{rounding:.5},{offset:NaN},{cornerSegments:0}])assert.throws(()=>surfaceContourGeometry(plane,{outline,...options}));
 assert.throws(()=>surfaceContourGeometry(()=>[0,0,0],{outline}));
});
