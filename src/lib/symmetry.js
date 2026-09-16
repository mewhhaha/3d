import * as THREE from 'three';

const finite3=(value,label)=>{
 if(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite))throw new Error(`${label} must contain three finite numbers`);
 return value.slice();
};

/** Explicit bilateral construction plane. `normal` is normalized; `origin` is in model-local meters. */
export function symmetryPlane({origin=[0,0,0],normal=[1,0,0]}={}){
 const o=finite3(origin,'symmetry origin'),n=new THREE.Vector3(...finite3(normal,'symmetry normal'));
 if(n.lengthSq()<1e-20)throw new Error('Symmetry normal is zero');n.normalize();
 return Object.freeze({origin:Object.freeze(o),normal:Object.freeze(n.toArray())});
}

/** Axis shorthand retained for common center-plane authoring. */
export function axisPlane(axis='x',origin=[0,0,0]){
 if(typeof axis!=='string'||axis.length!==1||!'xyz'.includes(axis))throw new Error('Symmetry axis must be x/y/z');
 const n=[0,0,0];n['xyz'.indexOf(axis)]=1;return symmetryPlane({origin,normal:n});
}

function planeOf(spec){
 if(typeof spec==='string')return axisPlane(spec);
 if(spec&&Array.isArray(spec.origin)&&Array.isArray(spec.normal))return symmetryPlane(spec);
 throw new Error('Expected a symmetry axis or plane');
}

/** Reflect a position across an arbitrary local plane. Inputs are copied. */
export function reflectPoint(point,plane='x'){
 const p=new THREE.Vector3(...finite3(point,'point')),{origin,normal}=planeOf(plane),o=new THREE.Vector3(...origin),n=new THREE.Vector3(...normal);
 return p.addScaledVector(n,-2*p.clone().sub(o).dot(n)).toArray();
}

/** Reflect a direction/normal across a plane through the origin. Translation never affects directions. */
export function reflectDirection(direction,plane='x'){
 const d=new THREE.Vector3(...finite3(direction,'direction')),{normal}=planeOf(plane),n=new THREE.Vector3(...normal);
 return d.addScaledVector(n,-2*d.dot(n)).toArray();
}

/** Mirror a parametric surface while preserving its orientation for downstream normal/thickness evaluation.
 * Reflection reverses handedness, so one parameter is reversed as part of the mirrored construction. */
export function mirrorSurface(surface,plane='x',{reverse='u'}={}){
 if(typeof surface!=='function'||!['u','v'].includes(reverse))throw new Error('mirrorSurface needs a surface and reverse=u/v');
 const resolved=planeOf(plane);
 return (u,v)=>reflectPoint(surface(reverse==='u'?1-u:u,reverse==='v'?1-v:v),resolved);
}

/** Reflect authored samples without mutating them. Useful for guides, sockets and construction landmarks. */
export function mirrorPoints(points,plane='x',{reverse=false}={}){
 if(!Array.isArray(points)||!points.length)throw new Error('mirrorPoints needs authored samples');
 const resolved=planeOf(plane),out=points.map(p=>reflectPoint(p,resolved));return reverse?out.reverse():out;
}
