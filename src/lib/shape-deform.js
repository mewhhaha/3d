import * as THREE from 'three';
const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
/** Compose point fields before sampling a curve/surface. Fields cannot modify their input. */
export function pointFields(...fields){
 if(fields.some(f=>typeof f!=='function'))throw new Error('Point fields must be functions');
 return p=>{if(!point(p))throw new Error('Invalid field input');let q=p.slice();for(const f of fields){q=f(q.slice());if(!point(q))throw new Error('Invalid field result');}return q;};
}
/** A coordinate-independent sculpt pass over an owned static assembly. Returns a copy.
 * Each mesh is evaluated in root-local space; topology, UVs and names survive.
 * Skinning and morphs require their own deformation/normal transfer, so are rejected. */
export function reshapeAssembly(input,...fields){
 if(!input?.isObject3D)throw new Error('An Object3D is required');
 input.traverse(o=>{if(o.isSkinnedMesh||o.isInstancedMesh||o.geometry&&Object.keys(o.geometry.morphAttributes).length)throw new Error('Reshape supports static ordinary meshes only');});
 const field=pointFields(...fields),root=input.clone(true);root.updateMatrixWorld(true);
 const inverseRoot=root.matrixWorld.clone().invert(),textures=new Map(),materials=new Map();
 const ownMaterial=m=>{if(materials.has(m))return materials.get(m);const c=m.clone();for(const k of Object.keys(c))if(c[k]?.isTexture){if(!textures.has(c[k]))textures.set(c[k],c[k].clone());c[k]=textures.get(c[k]);}materials.set(m,c);return c;};
 root.traverse(o=>{
  if(!o.isMesh)return;o.material=Array.isArray(o.material)?o.material.map(ownMaterial):ownMaterial(o.material);
  o.geometry=o.geometry.clone();const g=o.geometry,p=g.attributes.position,toRoot=new THREE.Matrix4().multiplyMatrices(inverseRoot,o.matrixWorld),toLocal=toRoot.clone().invert();
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(toRoot),q=new THREE.Vector3(...field(v.toArray())).applyMatrix4(toLocal);p.setXYZ(i,q.x,q.y,q.z);}
  g.deleteAttribute('tangent');g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 });
 root.userData.reshape={method:'static assembly point fields',normalMaps:'Existing detail maps may require rebaking after nonrigid edits'};return root;
}
