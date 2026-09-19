import * as THREE from 'three';
/** Explicit export-only layout for model-space skins. In glTF, skinning ignores
 * the mesh node's ancestors. Promote opted-in identity, childless skins to scene
 * roots instead of exporting a misleading group hierarchy. Never bake a live
 * pose or guess how to transfer animated/nonidentity mesh transforms. */
export function promoteExportSkinRoots(scene) {
  if(!scene?.isScene)throw new Error('Skin-root layout requires an export Scene');
  scene.updateMatrixWorld(true);
  const owners=[];scene.traverse(n=>{if(n.userData?.exportSkinRoots===true)owners.push(n);});
  const selected=new Set(),identity=new THREE.Matrix4();
  const tracks=[];scene.traverse(n=>{for(const c of n.animations||[])tracks.push(...c.tracks);});
  for(const root of owners)root.traverse(n=>{if(n.isSkinnedMesh)selected.add(n);});
  for(const mesh of selected){
    if(mesh.children.length||!mesh.matrixWorld.equals(identity)||!mesh.bindMatrix.equals(identity))throw new Error('Skin-root export requires childless identity model-space meshes');
    for(const track of tracks){
      const parsed=THREE.PropertyBinding.parseTrackName(track.name);
      if([mesh.name,mesh.uuid].includes(parsed.nodeName)&&['position','quaternion','rotation','scale','matrix'].includes(parsed.propertyName))throw new Error('Cannot promote a transform-animated skin mesh');
    }
  }
  for(const mesh of selected)scene.add(mesh);
  return selected.size;
}
