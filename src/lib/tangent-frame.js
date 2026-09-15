import { Vector3 } from 'three';
/** Complete an existing tangent attribute, including unused pole vertices.
 * Degenerate UVs have no unique tangent: use a deterministic orthogonal basis there.
 * Positions, UVs, indices, skin weights and valid handedness are preserved.
 */
export function normalizeTangentFrames(geometry) {
  const tangent = geometry.getAttribute('tangent');
  if (!tangent) return geometry;
  const normal = geometry.getAttribute('normal');
  if (!normal || tangent.itemSize !== 4 || normal.count !== tangent.count) throw new Error('Tangent frames require matching normals and VEC4 tangents');
  const n = new Vector3(), t = new Vector3(), axis = new Vector3();
  for (let i = 0; i < tangent.count; i++) {
    n.fromBufferAttribute(normal, i);
    if (![n.x,n.y,n.z].every(Number.isFinite) || n.lengthSq() < 1e-12) throw new Error(`Invalid normal at tangent vertex ${i}`);
    n.normalize(); t.fromBufferAttribute(tangent, i);
    if (![t.x,t.y,t.z].every(Number.isFinite)) t.set(0,0,0);
    t.addScaledVector(n, -t.dot(n));
    if (t.lengthSq() < 1e-12) {
      axis.set(Math.abs(n.x) < .8 ? 1 : 0, Math.abs(n.x) < .8 ? 0 : 1, 0);
      t.crossVectors(axis, n);
    }
    t.normalize(); tangent.setXYZW(i, t.x, t.y, t.z, tangent.getW(i) < 0 ? -1 : 1);
  }
  tangent.needsUpdate = true;
  return geometry;
}
