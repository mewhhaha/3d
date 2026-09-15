import * as THREE from 'three';
import { computeTangents } from '../tangents.js';
/** Match shading frames at an explicit shared port without welding UVs or moving skin. */
export function stitchFrames(meshes,{where=()=>true,tolerance=1e-7}={}) {
  if(!Array.isArray(meshes)||meshes.length<2||typeof where!=='function'||!Number.isFinite(tolerance)||tolerance<=0)
    throw new Error('stitchFrames requires meshes, a boundary predicate and positive tolerance');
  const points=new Map(),changed=new Set();
  for(let part=0;part<meshes.length;part++){
    const g=meshes[part].geometry,p=g.attributes.position,n=g.attributes.normal;
    if(!p||!n||!g.attributes.uv)throw new Error('A stitched chart needs position, normal and UV');
    for(let i=0;i<p.count;i++){
      const position=new THREE.Vector3().fromBufferAttribute(p,i);if(!where(position))continue;
      const key=position.toArray().map(v=>Math.round(v/tolerance)).join(',');
      if(!points.has(key))points.set(key,new Map());const parts=points.get(key);
      if(!parts.has(part))parts.set(part,{sum:new THREE.Vector3(),corners:[]});
      const entry=parts.get(part);entry.sum.add(new THREE.Vector3().fromBufferAttribute(n,i));entry.corners.push(i);
    }
  }
  let sharedPoints=0;
  for(const parts of points.values()){
    if(parts.size<2)continue;sharedPoints++;const normal=new THREE.Vector3();
    // One vote per component, not per duplicated triangle corner.
    for(const entry of parts.values())normal.add(entry.sum.normalize());normal.normalize();
    if(normal.lengthSq()<.5)throw new Error('Opposed normals at port: inspect winding before stitching');
    for(const [part,entry] of parts){const g=meshes[part].geometry;for(const i of entry.corners)g.attributes.normal.setXYZ(i,normal.x,normal.y,normal.z);changed.add(g);}
  }
  for(const g of changed){g.attributes.normal.needsUpdate=true;computeTangents(g);}
  return {sharedPoints,changedCharts:changed.size};
}
