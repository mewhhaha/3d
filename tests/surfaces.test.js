import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {THREE,buildModel,inspect,dispose} from '../src/lib/modeling.js';
import {patchGeometry,loft,sweep,displace,detail} from '../src/lib/surfaces.js';
import {pbrMaterial,noise} from '../src/lib/textures.js';
import {auditUV,projectUV,packUV,uvSVG} from '../src/lib/uv.js';
import bust from '../models/atelier-bust.js';
import explorer from '../models/field-explorer.js';
const digest=a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
test('surface input validation and winding',()=>{
  assert.throws(()=>patchGeometry({sample:()=>[NaN,0,0]}));assert.throws(()=>detail('unbounded'));
  assert.throws(()=>loft({sections:[[1,1,1],[0,1,1]]}));
  const tube=sweep({points:[[0,0,0],[0,1,0]],radii:.1});
  const p=tube.geometry.attributes.position,n=tube.geometry.attributes.normal;
  for(let i=0;i<p.count;i++) assert.ok(p.getX(i)*n.getX(i)+p.getZ(i)*n.getZ(i)>.09,'Tube normals face outward');
  const shape=loft({sections:[[0,.5,.5],[1,.5,.5]],radialSegments:16,heightSegments:8});
  const g=shape.geometry,idx=g.index,positions=g.attributes.position,normals=g.attributes.normal;
  for(let i=0;i<idx.count;i+=3){const v=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(positions,idx.getX(i+k)));const normal=v[1].sub(v[0]).cross(v[2].sub(v[0])).normalize();assert.ok(normal.dot(new THREE.Vector3().fromBufferAttribute(normals,idx.getX(i)))>.7);}
  dispose(tube);dispose(shape);
});
test('maps deterministic, correctly tagged, and packed for portable GLB export',()=>{
  for(const kind of ['skin','cloth','leather','hair','marble','bronze']){
    const a=pbrMaterial(kind,{size:64,seed:7}),b=pbrMaterial(kind,{size:64,seed:7});
    assert.equal(digest(a.map.image.data),digest(b.map.image.data));
    assert.equal(a.map.colorSpace,THREE.SRGBColorSpace);assert.equal(a.normalMap.colorSpace,THREE.NoColorSpace);
    assert.equal(a.roughnessMap,a.metalnessMap,'Shared packed texture avoids incompatible DataTexture merge');
    for(let i=0;i<a.normalMap.image.data.length;i+=4){const d=a.normalMap.image.data;const length=Math.hypot(...[0,1,2].map(c=>d[i+c]/255*2-1));assert.ok(Math.abs(length-1)<.015);}
    for(const mat of [a,b]){new Set([mat.map,mat.normalMap,mat.roughnessMap]).forEach(t=>t.dispose());mat.dispose();}
  }
  assert.equal(noise(.25,.42,32,4),noise(1.25,.42,32,4));
  assert.throws(()=>pbrMaterial('skin',{size:99999}));
});
test('UV projections, atlas chart placement, and true geometry displacement',()=>{
  const g=projectUV(new THREE.BoxGeometry(),{mode:'box'});assert.ok(g.attributes.uv.array.every(Number.isFinite));
  const [a,b]=packUV([new THREE.Mesh(g),new THREE.Mesh(g)]);assert.ok(Math.max(...Array.from({length:a.attributes.uv.count},(_,i)=>a.attributes.uv.getX(i)))<.5);
  assert.ok(Math.min(...Array.from({length:b.attributes.uv.count},(_,i)=>b.attributes.uv.getX(i)))>.5);
  assert.match(uvSVG(a),/<svg/);
  const d=displace(new THREE.SphereGeometry(1,16,8),()=>1,.1);d.computeBoundingSphere();assert.ok(Math.abs(d.boundingSphere.radius-1.1)<1e-5);
});
for(const model of [bust,explorer]) for(const quality of ['draft','studio','fine']) test(`${model.id} ${quality}: complete UVs, normals, texture ownership and scale`,()=>{
  const root=buildModel(model,{quality}),stats=inspect(root),audit=auditUV(root);
  assert.equal(audit.missing.length,0);assert.equal(audit.invalid.length,0);assert.ok(audit.textures>=3);
  assert.ok(stats.triangles<1e6);assert.ok(Math.abs(stats.dimensions[1]-model.parameters.height.default)<1e-6);
  root.traverse(o=>{if(o.isMesh){const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-4,`${o.name} unit normals`);}});
  dispose(root);
});
