import * as THREE from 'three';
/** Parent an owned rigid component to a bone, preserving its authored model-space
 * placement. frame maps component coordinates (meters) into model coordinates.
 * Resolve in REST after proportion edits; future pose clips drive the mount.
 * Never rewrites skin buffers or binds. Sheared/reflected locals are rejected.
 */
export function mountOnBone(model, bone, component, {frame=new THREE.Matrix4()}={}) {
 if(!model?.isObject3D||!bone?.isBone||!component?.isObject3D||!component.matrixAutoUpdate||component.parent||!frame?.isMatrix4)throw new Error('Expected model, bone, unparented component and frame');
 let parent=bone;while(parent&&parent!==model)parent=parent.parent;
 if(!parent)throw new Error('Bone must belong to model');
 let invalid=false;component.traverse(n=>{if(n===model||n===bone||n.isBone||n.isSkinnedMesh)invalid=true;});
 if(invalid)throw new Error('Rigid components cannot contain bones or skins');
 model.updateWorldMatrix(true,true);component.updateMatrix();
 const boneModel=model.matrixWorld.clone().invert().multiply(bone.matrixWorld);
 const inherited=boneModel.getMaxScaleOnAxis();
 const columnLengths=[0,1,2].map(i=>new THREE.Vector3().setFromMatrixColumn(boneModel,i).length());
 if(!Number.isFinite(inherited)||inherited<=0||columnLengths.some(n=>Math.abs(n-inherited)>1e-7*inherited))throw new Error('Rigid bone mounts require uniform model-relative scale; shear is unsupported');
 const target=frame.clone().multiply(component.matrix);
 const local=boneModel.clone().invert().multiply(target);
 const position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();local.decompose(position,quaternion,scale);
 const rebuilt=new THREE.Matrix4().compose(position,quaternion,scale);
 if(!local.elements.every(Number.isFinite)||boneModel.determinant()<=0||scale.toArray().some(x=>!Number.isFinite(x)||x<=0)||local.elements.some((x,i)=>Math.abs(x-rebuilt.elements[i])>1e-7*Math.max(1,Math.abs(x))))throw new Error('Bone mount needs nonsingular positive TRS, without shear');
 const holder=new THREE.Group();holder.name=component.name+' mount';
 holder.position.copy(position);holder.quaternion.copy(quaternion);holder.scale.copy(scale);
 component.position.set(0,0,0);component.quaternion.identity();component.scale.set(1,1,1);component.updateMatrix();
 holder.add(component);bone.add(holder);
 holder.userData.boneMount={bone:bone.name,modelFrame:target.toArray(),scope:'rigid rest attachment; rebuild after bind edits'};
 return holder;
}
