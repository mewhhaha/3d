import * as THREE from 'three';
import {assetInfo} from './rigging.js';
import {pointFields} from './shape-deform.js';
const V=p=>new THREE.Vector3(...p);
const identity=new THREE.Matrix4();
const matrixError=m=>m.elements.every(Number.isFinite)?Math.max(...m.elements.map((v,i)=>Math.abs(v-identity.elements[i]))):Infinity;

/** Refit an OWNED, model-space skin and its captured rest skeleton through one
 * smooth point field. Coordinates are meters in an untransformed model frame.
 * All meshes must be identity-bound skins at rest; author clips AFTER refitting.
 * Same topology/UVs/weights, fresh inverse binds; no animation/morph transfer.
 * Jacobian-transformed normals preserve split shading frames, tangents expire.
 */
export function refitSkinBind(root,field,{step=1e-5}={}){
 if(!root?.isObject3D||typeof field!=='function')throw new Error('Bind refit requires an owned Object3D and point field');
 if(!Number.isFinite(step)||step<1e-7||step>.001)throw new Error('Bind derivative step must be 1e-7..0.001 meters');
 root.updateWorldMatrix(true,true);
 if(matrixError(root.matrixWorld)>1e-10)throw new Error('Refit before placing the model');
 const evaluate=pointFields(field),skins=[],skeletons=new Set(),bones=[],boneSet=new Set();
 root.traverse(o=>{
  if(o.animations?.length)throw new Error('Refit before authoring clips; existing animation needs explicit retargeting');
  if(o.isBone){bones.push(o);boneSet.add(o);}
  if(!o.isMesh)return;
  if(!o.isSkinnedMesh||o.isInstancedMesh)throw new Error('Bind refit accepts ordinary skins only; attachments need rebuilding');
  if(matrixError(o.matrixWorld)>1e-10||matrixError(o.bindMatrix)>1e-10||matrixError(o.bindMatrixInverse)>1e-10)throw new Error('Bind refit requires identity-bound model-space skins');
  const g=o.geometry,p=g?.attributes?.position,n=g?.attributes?.normal;
  if(!g?.index||g.index.count%3||!p||!p.count||p.itemSize!==3||!n||n.itemSize!==3||n.count!==p.count||!g.attributes.skinIndex||!g.attributes.skinWeight)throw new Error('Bind refit needs indexed positions, normals and skin weights');
  if(!g.index.array.every(i=>Number.isInteger(i)&&i>=0&&i<p.count))throw new Error('Invalid skin topology');
  if(Object.values(g.morphAttributes).some(a=>a.length))throw new Error('Morph targets require explicit transfer before bind refit');
  if(p.isInterleavedBufferAttribute||n.isInterleavedBufferAttribute||p.normalized||n.normalized)throw new Error('Bind refit requires uncompressed XYZ buffers');
  for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.normalMap||m.bumpMap||m.displacementMap||m.aoMap||m.lightMap)throw new Error('Rebake dependent surface detail before using a refitted bind');
  skins.push(o);skeletons.add(o.skeleton);
 });
 if(!skins.length||!bones.length)throw new Error('No skinned bind to refit');
 assetInfo(root);
 for(const b of bones)if(!b.matrixAutoUpdate||!Number.isFinite(b.matrixWorld.determinant())||b.matrixWorld.determinant()<=0)throw new Error('Bind hierarchy must have positive nonsingular transforms');
 for(const s of skeletons){
  if(s.bones.length!==s.boneInverses.length)throw new Error('Missing inverse binds');
  s.bones.forEach((b,i)=>{if(!boneSet.has(b)||matrixError(b.matrixWorld.clone().multiply(s.boneInverses[i]))>1e-5)throw new Error('Skeleton must be in its captured rest pose');});
 }
 const previous=bones.map(b=>b.position.clone()),inverses=new Map([...skeletons].map(s=>[s,s.boneInverses]));
 const points=bones.map(b=>evaluate(b.getWorldPosition(new THREE.Vector3()).toArray()));
 const replacements=new Map();let minDet=Infinity,maxMove=0,vertices=0;
 try{
  for(const mesh of skins){
   const source=mesh.geometry;if(replacements.has(source))continue;
   const g=source.clone();replacements.set(source,g);
   const p=g.attributes.position,n=g.attributes.normal;
   for(let i=0;i<p.count;i++){
    const a=[p.getX(i),p.getY(i),p.getZ(i)],b=evaluate(a);
    const columns=[0,1,2].map(axis=>{const lo=a.slice(),hi=a.slice();lo[axis]-=step;hi[axis]+=step;const left=evaluate(lo),right=evaluate(hi);return right.map((v,j)=>(v-left[j])/(2*step));});
    const J=new THREE.Matrix3().set(...[0,1,2].flatMap(row=>columns.map(c=>c[row]))),det=J.determinant();
    if(!Number.isFinite(det)||det<=1e-6)throw new Error('Bind field folds or collapses at a sampled vertex');
    const normal=new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)).applyMatrix3(J.clone().invert().transpose());
    if(!normal.toArray().every(Number.isFinite)||normal.lengthSq()<1e-16)throw new Error('Invalid transformed bind normal');
    normal.normalize();p.setXYZ(i,...b);n.setXYZ(i,...normal.toArray());
    minDet=Math.min(minDet,det);maxMove=Math.max(maxMove,V(a).distanceTo(V(b)));vertices++;
   }
   if(!p.array.every(Number.isFinite)||!n.array.every(Number.isFinite))throw new Error('Bind result exceeds buffer range');
   g.deleteAttribute('tangent');p.needsUpdate=true;n.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
   g.userData.bindRefit={scope:'rest geometry and joint positions; weights/UV/index retained',tangents:'invalidated',highLowCorrespondence:'invalidated'};
  }
  // Traverse order is parent first. Preserve authored local rotations/scales,
  // changing translations only; inverse binds are then derived from new rest.
  bones.forEach((b,i)=>{
   const p=V(points[i]);b.parent?.updateWorldMatrix(true,false);
   if(b.parent)p.applyMatrix4(b.parent.matrixWorld.clone().invert());b.position.copy(p);b.updateWorldMatrix(false,false);
   if(!p.toArray().every(Number.isFinite))throw new Error('Invalid refitted bone position');
  });
  root.updateWorldMatrix(true,true);
  for(const s of skeletons){s.calculateInverses();if(s.boneInverses.some(m=>!m.elements.every(Number.isFinite)))throw new Error('Invalid refitted inverse bind');s.update();}
 }catch(error){
  bones.forEach((b,i)=>b.position.copy(previous[i]));root.updateWorldMatrix(true,true);
  for(const [s,m]of inverses){s.boneInverses=m;s.update();}
  replacements.forEach(g=>g.dispose());throw error;
 }
 for(const mesh of skins){mesh.geometry=replacements.get(mesh.geometry);mesh.boundingBox=null;mesh.boundingSphere=null;}
 for(const old of replacements.keys())old.dispose();
 const report={vertices,bones:bones.length,minSampledJacobianDeterminant:minDet,maxRestDisplacementMeters:maxMove,scope:'sampled local validity, not collision/topology or motion compatibility'};
 root.userData.bindRefit=report;return report;
}
