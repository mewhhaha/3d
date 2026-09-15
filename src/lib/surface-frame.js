import * as THREE from 'three';

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
/** Local +X follows du, +Z follows the normal. This is chart-based attachment, not ray projection. */
export function attachToSurface(object, surface, { u, v, offset = 0, epsilon = 1e-5 } = {}) {
  if (!object?.isObject3D || !Number.isFinite(offset)) throw new Error('Invalid surface attachment');
  const f = surfaceFrame(surface, u, v, { epsilon });
  object.position.copy(f.origin).addScaledVector(f.normal, offset);
  object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.tangent, f.bitangent, f.normal));
  return object;
}
