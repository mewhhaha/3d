import * as THREE from 'three';
const vector=(value,label)=>{
 if(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite))throw new TypeError(`${label} must be a finite 3-vector`);
 return new THREE.Vector3(...value);
};
/** Aim a rigid object's local axis while retaining a selected local anchor.
 * Directions are in world or parent space, not points or surface normals.
 * The shortest swing preserves the old roll as far as one-axis aiming permits.
 * Geometry/material ownership and descendants' local transforms are untouched.
 */
export function aimAroundAnchor(object,{direction,axis=[0,0,1],anchor=[0,0,0],space='world',influence=1}={}){
 if(!object?.isObject3D||!object.matrixAutoUpdate)throw new TypeError('Aim requires an auto-updating Object3D');
 if(!['world','parent'].includes(space))throw new Error('Aim space must be world or parent');
 if(!Number.isFinite(influence)||influence<0||influence>1)throw new RangeError('Aim influence must be 0..1');
 const desired=vector(direction,'Aim direction'),localAxis=vector(axis,'Aim axis'),at=vector(anchor,'Aim anchor');
 if(!Number.isFinite(desired.lengthSq())||!Number.isFinite(localAxis.lengthSq())||desired.lengthSq()<1e-16||localAxis.lengthSq()<1e-16)throw new RangeError('Aim direction/axis must be nonzero');
 if(!object.scale.toArray().every(x=>Number.isFinite(x)&&x>0)||!object.position.toArray().every(Number.isFinite)||
   !object.quaternion.toArray().every(Number.isFinite)||Math.abs(object.quaternion.lengthSq()-1)>1e-6)throw new Error('Aim requires finite TRS, a unit quaternion and positive scale');
 object.updateWorldMatrix(true,false);
 if(object.parent){
  const matrix=object.parent.matrixWorld;
  if(!matrix.elements.every(Number.isFinite)||matrix.determinant()<=1e-15)throw new Error('Aim parent transform must be finite, invertible and orientation preserving');
  if(space==='world')desired.transformDirection(matrix.clone().invert());
 }
 desired.normalize();
 if(influence===0)return object;
 const scaledAnchor=at.multiply(object.scale);
 const pinned=scaledAnchor.clone().applyQuaternion(object.quaternion).add(object.position);
 const current=localAxis.multiply(object.scale).normalize().applyQuaternion(object.quaternion);
 const swing=new THREE.Quaternion().setFromUnitVectors(current,desired);
 const turn=new THREE.Quaternion().slerp(swing,influence);
 const next=turn.multiply(object.quaternion);
 const position=pinned.sub(scaledAnchor.applyQuaternion(next));
 if(!position.toArray().every(Number.isFinite))throw new Error('Aim overflow');
 object.quaternion.copy(next);object.position.copy(position);object.updateMatrix();
 object.updateWorldMatrix(false,true);
 return object;
}
