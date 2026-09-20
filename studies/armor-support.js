import * as THREE from 'three';
import {cacheSurface} from '../src/lib/surface-cache.js';
/** Rest-fit one limb support to the selected source skin's bone-influence region.
 * Source filtering is a project-specific ownership hypothesis, NOT retopology.
 * Radial first hits are cached; misses explicitly use the coarse authored support.
 * The result is a fresh garment surface, with no copied source topology/weights.
 */
export function fittedLimbSupport(skin,bone,frame,base,{length,clearance=.014}={}){
 const g=skin.geometry,boneIndex=skin.skeleton.bones.indexOf(bone),si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
 if(boneIndex<0)throw new Error('Support bone is not in skin');
 const influences=i=>{let w=0;for(let j=0;j<4;j++)if(si.array[i*4+j]===boneIndex)w+=sw.array[i*4+j];return w;};
 const indices=[];for(let i=0;i<g.index.count;i+=3){const tri=[0,1,2].map(j=>g.index.getX(i+j));if(tri.some(v=>influences(v)>.25))indices.push(...tri);}
 const source=new THREE.BufferGeometry();source.setAttribute('position',g.attributes.position.clone());source.setIndex(indices);source.applyMatrix4(frame.clone().invert());
 const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),target=new THREE.Mesh(source,mat);target.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),direction=new THREE.Vector3();let misses=0,samples=0;
 const fit=(u,v)=>{
  const a=(u-.5)*2*Math.PI,y=-length*(1-v);direction.set(Math.sin(a),0,Math.cos(a));
  ray.set(direction.clone().multiplyScalar(.28).add(new THREE.Vector3(0,y,0)),direction.clone().negate());ray.near=0;ray.far=.56;
  const hit=ray.intersectObject(target,false).find(h=>h.point.dot(direction)>0);
  samples++;if(!hit){misses++;return base(u,v);}
  return hit.point.clone().addScaledVector(direction,clearance).toArray();
 };
 const cached=cacheSurface(fit,{segments:[40,32],wrapU:true});source.dispose();mat.dispose();
 cached.fit={method:'radial rest-skin samples with authored miss fallback',samples,misses,clearance,sourceBone:bone.name};return cached;
}
