import * as THREE from 'three';
import {liftPoint} from './reference-shot.js';
const finite=(a,n,label)=>{if(!Array.isArray(a)||a.length!==n||!a.every(Number.isFinite))throw new Error('Invalid '+label);return a;};
const vector=a=>new THREE.Vector3(...finite(a,3,'vector'));
/** Ray/sphere intersection: keep a drawn joint on its image ray AND a fixed bone length.
 * The two depth solutions are ambiguous; choose the one nearest the authored depth hint. */
export function liftOnSphere(camera,pixel,center,length,{width,height,distance,depth=0}={}){
 if(!Number.isFinite(length)||length<=0)throw new Error('Bone length must be positive');finite(pixel,2,'joint pixel');
 const hint=vector(liftPoint(camera,pixel,{width,height,distance,depth})),ray=new THREE.Raycaster();camera.updateMatrixWorld(true);
 ray.setFromCamera(new THREE.Vector2(pixel[0]/width*2-1,1-pixel[1]/height*2),camera);
 const oc=ray.ray.origin.clone().sub(vector(center)),b=oc.dot(ray.ray.direction),disc=b*b-oc.lengthSq()+length*length;
 if(disc < -1e-10)throw new Error('Drawn joint cannot be reached at the requested bone length');
 const candidates=[-b-Math.sqrt(Math.max(0,disc)),-b+Math.sqrt(Math.max(0,disc))].filter(t=>t>camera.near).map(t=>ray.ray.at(t,new THREE.Vector3()));
 if(!candidates.length)throw new Error('Bone solutions are behind the camera');
 candidates.sort((a,b)=>a.distanceToSquared(hint)-b.distanceToSquared(hint));return candidates[0].toArray();
}
