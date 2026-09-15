import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {contourVolume} from '../src/lib/contour-volume.js';
import {dispose} from '../src/lib/modeling.js';
const outline=[[-.08,-.1],[.08,-.1],[.1,.12],[-.1,.12]];
const sections=[{height:0,scale:[.8,.9]},{height:.03,scale:[1,1]},{height:.07,scale:[.9,.8]}];
function audit(g){
 const p=g.attributes.position,ix=g.index.array,ids=[],edges=new Map();let volume=0;
 // Material/UV corners can split vertices: compare their actual shared geometric positions.
 for(let i=0;i<p.count;i++)ids.push([p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e7)).join(','));
 for(let i=0;i<ix.length;i+=3){
  const tri=Array.from(ix.slice(i,i+3));
  const a=new THREE.Vector3().fromBufferAttribute(p,tri[0]),b=new THREE.Vector3().fromBufferAttribute(p,tri[1]),c=new THREE.Vector3().fromBufferAttribute(p,tri[2]);
  assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length()>1e-12,'nondegenerate triangles');
  volume+=a.dot(b.clone().cross(c))/6;
  for(let j=0;j<3;j++){const x=ids[tri[j]],y=ids[tri[(j+1)%3]],key=[x,y].sort().join('|'),record=edges.get(key)||{count:0,winding:0};record.count++;record.winding+=x<y?1:-1;edges.set(key,record);}
 }
 return{edges,volume};
}
test('capped contour volume has two opposite faces per geometric edge and positive volume',()=>{
 const obj=contourVolume({outline,sections});
 const r=audit(obj.geometry);assert.ok(r.volume>0);
 for(const edge of r.edges.values()){assert.equal(edge.count,2);assert.equal(edge.winding,0);}
 for(const key of ['position','normal','uv'])assert.ok(obj.geometry.attributes[key].array.every(Number.isFinite));
 dispose(obj);
});
test('caps face outwards and UV seam keeps continuous shading',()=>{
 const segments=32,layers=5,o=contourVolume({outline,sections,segments,layers}),g=o.geometry,n=g.attributes.normal,p=g.attributes.position;
 const bottom=(segments+1)*(layers+1),top=bottom+segments+1;
 assert.ok(n.getY(bottom)<-.99);assert.ok(n.getY(top)>.99);
 for(let j=0;j<=layers;j++){
  const a=j*(segments+1),b=a+segments;
  for(const attr of [n,p])assert.ok(new THREE.Vector3().fromBufferAttribute(attr,a).distanceTo(new THREE.Vector3().fromBufferAttribute(attr,b))<1e-7);
  assert.equal(g.attributes.uv.getX(a),0);assert.equal(g.attributes.uv.getX(b),1);
 }
 dispose(o);
});
test('reversed footprint input is normalized without mutating the caller',()=>{
 const original=JSON.stringify(outline),a=contourVolume({outline,sections}),b=contourVolume({outline:[...outline].reverse(),sections});
 assert.deepEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);assert.equal(JSON.stringify(outline),original);dispose(a);dispose(b);
});
test('invalid shapes, stations and resolution fail early',()=>{
 assert.throws(()=>contourVolume({outline:[[0,0],[1,1],[2,2]],sections}));
 assert.throws(()=>contourVolume({outline,sections:[{height:1},{height:0}]}));
 assert.throws(()=>contourVolume({outline,sections:[{height:0,scale:[0,1]},{height:1}]}));
 assert.throws(()=>contourVolume({outline,sections,segments:2}));
 assert.throws(()=>contourVolume({outline,sections,layers:0}));
});
