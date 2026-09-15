import * as THREE from 'three';
/** Return an owned diagnostic scene. Black = named component; white = everything else.
 * White occluders KEEP depth writes. An isolated hull is not the visible silhouette.
 * Alpha/transmission are deliberately treated as opaque for this geometric pass. */
export function regionMask(input,{select,occlusion=true}={}){
 if(!input?.isObject3D||typeof select!=='string'||!select)throw new Error('Region mask needs a scene and exact component name');
 const root=input.clone(true),selected=root.getObjectByName(select);if(!selected)throw new Error(`Missing mask component: ${select}`);
 const members=new Set();selected.traverse(o=>members.add(o));let meshes=0;
 root.traverse(o=>{
  if(!o.isMesh)return;const isTarget=members.has(o);if(isTarget)meshes++;
  o.geometry=o.geometry.clone();const old=Array.isArray(o.material)?o.material[0]:o.material;
  o.material=new THREE.MeshBasicMaterial({color:isTarget?0x000000:0xffffff,side:old.side,toneMapped:false});
  if(!isTarget&&!occlusion)o.visible=false;
 });
 if(!meshes)throw new Error('Mask selection contains no mesh');
 root.traverse(o=>{if(o.userData.sceneRecipe){Object.assign(o.userData.sceneRecipe,{background:'#ffffff',fog:{near:1000000,far:2000000},bloom:{strength:0},depthOfField:null});}});
 root.userData.diagnostic={type:'opaque visible region mask',select,meshes,occlusion,notForAssetExport:true};return root;
}
