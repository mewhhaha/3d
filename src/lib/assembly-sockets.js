import * as THREE from 'three';
const v=a=>{if(!Array.isArray(a)||a.length!==3||!a.every(Number.isFinite))throw new Error('Socket needs a finite vector');return new THREE.Vector3(...a);};
/** Resolve only when building the route, so callers can move either assembly first. */
export function worldSocket(object,{at=[0,0,0],normal=[0,0,1]}={}){
 if(!object?.isObject3D)throw new Error('Socket owner must be an Object3D');const p=v(at),n=v(normal);if(n.lengthSq()<1e-12)throw new Error('Socket normal cannot be zero');
 object.updateWorldMatrix(true,false);return {owner:object.name,position:object.localToWorld(p).toArray(),direction:n.transformDirection(object.matrixWorld).normalize().toArray()};
}
export function routeSockets(start,end,{via=[],lead=.025}={}){
 if(!Number.isFinite(lead)||lead<=0)throw new Error('Socket lead must be positive');const a=v(start.position),b=v(end.position),na=v(start.direction),nb=v(end.direction);
 if(na.lengthSq()<1e-12||nb.lengthSq()<1e-12||a.distanceTo(b)<1e-7)throw new Error('Invalid socket pair');
 return [a.toArray(),a.clone().addScaledVector(na.normalize(),lead).toArray(),...via.map(p=>v(p).toArray()),b.clone().addScaledVector(nb.normalize(),lead).toArray(),b.toArray()];
}
