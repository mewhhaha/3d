import * as THREE from 'three';
import {skin} from './rigging.js';

/** Author a new deforming part in the CURRENT posed model-space coordinates.
 * Explicit weights invert each vertex's blended joint matrix to recover a bind
 * mesh. Call before scene placement, with up-to-date bones and existing inverse
 * binds. No source mesh, skeleton, clip or material is mutated. The result owns
 * its cloned geometry but deliberately shares the caller's skeleton/material.
 * Normals invert the linear normal transform used by Three.js r186 skinning;
 * this is not a geometric normal bake or inverse-transpose shading guarantee.
 */
export function skinInPose(geometry,material,skeleton,weights,{name='Posed part',minDeterminant=.05}={}){
 const p=geometry?.attributes?.position,n=geometry?.attributes?.normal;
 if(!geometry?.isBufferGeometry||!p||!n||p.itemSize!==3||n.itemSize!==3||n.count!==p.count||!p.count||!geometry.index||geometry.index.count%3||typeof weights!=='function')throw new Error('Pose skin needs indexed XYZ geometry, normals and explicit weights');
 if(!(skeleton instanceof THREE.Skeleton)||!skeleton.bones.length||skeleton.bones.length!==skeleton.boneInverses.length)throw new Error('Pose skin needs a bound skeleton');
 if(!Number.isFinite(minDeterminant)||minDeterminant<=0||minDeterminant>1)throw new Error('Invalid skin determinant bound');
 if(geometry.attributes.skinIndex||geometry.attributes.skinWeight||Object.values(geometry.morphAttributes).some(a=>a.length))throw new Error('Existing skin/morph data requires explicit transfer');
 const mats=Array.isArray(material)?material:[material];
 if(mats.some(m=>!m?.isMaterial||m.normalMap||m.bumpMap||m.displacementMap))throw new Error('Pose skin requires materials without dependent relief maps');
 if(p.isInterleavedBufferAttribute||n.isInterleavedBufferAttribute||p.normalized||n.normalized)throw new Error('Pose skin needs uncompressed XYZ buffers');
 if(!p.array.every(Number.isFinite)||!n.array.every(Number.isFinite)||!geometry.index.array.every(i=>Number.isInteger(i)&&i>=0&&i<p.count))throw new Error('Invalid posed geometry data');
 const indices=Object.create(null),matrices=skeleton.bones.map((bone,i)=>{
  if(!bone?.isBone||!bone.name||Object.hasOwn(indices,bone.name))throw new Error('Skeleton names must be unique');
  indices[bone.name]=i;bone.updateWorldMatrix(true,false);
  const matrix=bone.matrixWorld.clone().multiply(skeleton.boneInverses[i]);
  if(!matrix.elements.every(Number.isFinite)||matrix.determinant()<=0)throw new Error('Invalid joint deformation');
  return matrix;
 });
 const g=geometry.clone();let result;
 try{
  // Reuse the existing merge/normalization/maximum-four influence contract.
  result=skin(g,material,{skeleton,indices},weights,name);
  const ix=g.attributes.skinIndex,w=g.attributes.skinWeight;
  const matrix=new THREE.Matrix4(),point=new THREE.Vector3(),normal=new THREE.Vector3();let minimum=Infinity,maxCondition=0;
  for(let i=0;i<p.count;i++){
   matrix.elements.fill(0);
   for(let k=0;k<4;k++){
    const value=w.array[i*4+k],m=matrices[ix.array[i*4+k]].elements;
    for(let j=0;j<16;j++)matrix.elements[j]+=value*m[j];
   }
   // Stored Float32 weights may sum to 1 +/- epsilon. Skinning XYZ is affine;
   // Matrix4.applyMatrix4 must not divide by that incidental homogeneous sum.
   matrix.elements[3]=matrix.elements[7]=matrix.elements[11]=0;matrix.elements[15]=1;
   const linear=new THREE.Matrix3().setFromMatrix4(matrix),det=linear.determinant();
   if(!Number.isFinite(det)||det<minDeterminant)throw new Error('Blended skin transform is collapsed or ill-conditioned');
   const inverse=matrix.clone().invert(),invLinear=new THREE.Matrix3().setFromMatrix4(inverse);
   const norm=m=>Math.sqrt(m.elements.reduce((s,x)=>s+x*x,0));
   const condition=norm(linear)*norm(invLinear);
   if(!Number.isFinite(condition)||condition>100)throw new Error('Blended skin transform is ill-conditioned');
   point.fromBufferAttribute(p,i).applyMatrix4(inverse);
   normal.fromBufferAttribute(n,i).applyMatrix3(invLinear);
   if(normal.lengthSq()<1e-18||!point.toArray().every(Number.isFinite)||!normal.toArray().every(Number.isFinite))throw new Error('Invalid inverse-skinned vertex');
   normal.normalize();g.attributes.position.setXYZ(i,...point.toArray());g.attributes.normal.setXYZ(i,...normal.toArray());
   minimum=Math.min(minimum,det);maxCondition=Math.max(maxCondition,condition);
  }
  if(!g.attributes.position.array.every(Number.isFinite))throw new Error('Bind vertices exceed buffer range');
  g.deleteAttribute('tangent');g.computeBoundingBox();g.computeBoundingSphere();
  g.userData.poseSkin={vertices:p.count,minDeterminant:minimum,maxFrobeniusCondition:maxCondition,scope:'new pose-authored skin; explicit weights, no collision or motion-quality guarantee',tangents:'invalidated',highLowCorrespondence:'invalidated'};
  return result;
 }catch(error){g.dispose();throw error;}
}
