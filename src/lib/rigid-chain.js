import * as THREE from 'three';

/** Connected build-time FK chain. Each link extends along its own local -Y.
 * Angles are XYZ Euler degrees relative to the preceding link, not world angles.
 * The builder supplies independently owned link geometry; pose never edits it.
 * Ordinary Group nodes export as rigid transforms. No skinning/IK/collision claim.
 */
export function rigidChain({name='Rigid chain',lengths,rotations=[]}={},build=()=>null){
 if(typeof name!=='string'||!name.trim())throw new Error('Chain name must be nonempty');
 if(!Array.isArray(lengths)||!lengths.length||lengths.length>64||!lengths.every(x=>Number.isFinite(x)&&x>0))throw new Error('Chain needs 1..64 positive lengths');
 if(!Array.isArray(rotations)||(rotations.length!==0&&rotations.length!==lengths.length)||!rotations.every(r=>Array.isArray(r)&&r.length===3&&r.every(Number.isFinite)))throw new Error('Chain rotations must match lengths and contain XYZ degrees');
 if(typeof build!=='function')throw new Error('Chain builder must be a function');
 // Validate all returned objects before changing any ownership.
 const parts=lengths.map((length,i)=>build(length,i)),seen=new Set();
 for(const part of parts){
  if(part==null)continue;
  if(!part.isObject3D||part.parent||seen.has(part))throw new Error('Each chain link must be an unparented, distinct Object3D');
  seen.add(part);
 }
 const root=new THREE.Group();root.name=name;let parent=root;
 const joints=[];
 for(let i=0;i<lengths.length;i++){
  const joint=new THREE.Group();joint.name=`${name} joint ${i}`;
  if(i)joint.position.y=-lengths[i-1];
  joint.rotation.set(...(rotations[i]||[0,0,0]).map(THREE.MathUtils.degToRad),'XYZ');
  parent.add(joint);if(parts[i])joint.add(parts[i]);parent=joint;joints.push(joint.name);
 }
 const tip=new THREE.Group();tip.name=`${name} tip`;tip.position.y=-lengths.at(-1);parent.add(tip);
 root.userData.rigidChain={schema:1,axis:[0,-1,0],lengths:[...lengths],rotations:lengths.map((_,i)=>[...(rotations[i]||[0,0,0])]),joints,tip:tip.name};
 return root;
}
