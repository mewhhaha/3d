/** Snapshot authored LOCAL bone transforms, including non-bone import parents.
 * Skeleton.pose reconstructs root locals from world inverse binds and can lose
 * an imported armature's unit conversion. A fresh builder's local rest data is
 * authoritative for preview reset. No inverse bind/skin buffer is modified.
 */
export function captureBonePose(root){
 if(!root?.isObject3D)throw new Error('Expected an Object3D pose root');
 const bones=[],skeletons=new Set();
 root.traverse(n=>{
  if(n.isBone)bones.push({node:n,position:n.position.clone(),quaternion:n.quaternion.clone(),scale:n.scale.clone()});
  if(n.isSkinnedMesh)skeletons.add(n.skeleton);
 });
 return ()=>{
  for(const {node,position,quaternion,scale}of bones){node.position.copy(position);node.quaternion.copy(quaternion);node.scale.copy(scale);}
  root.updateWorldMatrix(true,true);skeletons.forEach(s=>s.update());
 };
}
