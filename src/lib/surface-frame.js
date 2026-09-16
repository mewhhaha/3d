import * as THREE from 'three';

const finite2=(value,label)=>{
  if(!Array.isArray(value)||value.length!==2||!value.every(Number.isFinite))throw new Error(`${label} must contain two finite numbers`);
  return value;
};
const finite3=(value,label)=>{
  if(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite))throw new Error(`${label} must contain three finite numbers`);
  return value;
};
function point(surface, u, v) {
  if (typeof surface !== 'function' || ![u, v].every(Number.isFinite)) throw new Error('A surface and finite chart coordinates are required');
  const p = surface(u, v);
  if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite)) throw new Error('Surface must return three finite coordinates');
  return new THREE.Vector3(...p);
}
/** Differential frame for a regular two-parameter surface. The cross du x dv sets its outward side. */
export function surfaceFrame(surface, u, v, { epsilon = 1e-5 } = {}) {
  if (!Number.isFinite(epsilon) || epsilon <= 0) throw new Error('Frame epsilon must be positive');
  const origin = point(surface, u, v);
  const tangent = point(surface, u + epsilon, v).sub(point(surface, u - epsilon, v));
  const transverse = point(surface, u, v + epsilon).sub(point(surface, u, v - epsilon));
  const normal = new THREE.Vector3().crossVectors(tangent, transverse);
  if (tangent.lengthSq() < 1e-24 || normal.lengthSq() < 1e-30) throw new Error('Degenerate surface frame');
  tangent.normalize(); normal.normalize();
  const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  return { origin, tangent, bitangent, normal };
}
/** A complete local attachment pose in model space.
 * Local +X follows du, +Y follows the chart bitangent and +Z follows the surface normal.
 * `slide` is tangent/bitangent distance in meters; `rotation` is local XYZ degrees after alignment. */
export function surfaceTransform(surface,{u,v,offset=0,slide=[0,0],rotation=[0,0,0],epsilon=1e-5}={}){
  if(!Number.isFinite(offset))throw new Error('Surface offset must be finite');
  finite2(slide,'surface slide');finite3(rotation,'surface rotation');
  const frame=surfaceFrame(surface,u,v,{epsilon});
  const position=frame.origin.clone().addScaledVector(frame.tangent,slide[0]).addScaledVector(frame.bitangent,slide[1]).addScaledVector(frame.normal,offset);
  const basis=new THREE.Matrix4().makeBasis(frame.tangent,frame.bitangent,frame.normal);
  const quaternion=new THREE.Quaternion().setFromRotationMatrix(basis);
  const local=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation.map(THREE.MathUtils.degToRad),'XYZ'));
  quaternion.multiply(local).normalize();
  const matrix=new THREE.Matrix4().compose(position,quaternion,new THREE.Vector3(1,1,1));
  return {position,quaternion,matrix,frame};
}
/** Sample an authored path in chart coordinates without temporary Object3D allocations.
 * A sample is [u,v] or {u,v,offset?,slide?}; the shared offset is only a default. */
export function surfacePath(surface,samples,{offset=0,epsilon=1e-5}={}){
  if(!Array.isArray(samples)||samples.length<2||!Number.isFinite(offset))throw new Error('surfacePath needs at least two samples and a finite offset');
  return samples.map(sample=>{
    const spec=Array.isArray(sample)?{u:sample[0],v:sample[1]}:sample;
    if(!spec||typeof spec!=='object')throw new Error('Invalid surface path sample');
    return surfaceTransform(surface,{u:spec.u,v:spec.v,offset:spec.offset??offset,slide:spec.slide??[0,0],epsilon}).position.toArray();
  });
}
/** Compose a thin geometric layer on a surface instead of placing flat features in front of it. */
export function surfaceLayer(surface, { offset = 0, relief = () => 0, epsilon = 1e-5 } = {}) {
  if (!Number.isFinite(offset) || typeof relief !== 'function') throw new Error('Invalid surface layer');
  return (u, v) => {
    const height = offset + relief(u, v);
    if (!Number.isFinite(height)) throw new Error('Non-finite relief');
    const f = surfaceFrame(surface, u, v, { epsilon });
    return f.origin.addScaledVector(f.normal, height).toArray();
  };
}
/** Attach an object in the surface's local frame. This is chart-based placement, not nearest-surface projection. */
export function attachToSurface(object, surface, options = {}) {
  if (!object?.isObject3D) throw new Error('Invalid surface attachment');
  const pose=surfaceTransform(surface,options);
  object.position.copy(pose.position);object.quaternion.copy(pose.quaternion);
  return object;
}
