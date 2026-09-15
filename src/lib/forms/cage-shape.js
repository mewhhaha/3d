import { quadCage } from './cage.js';
const pointOK = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);

/** Compose deterministic rest-shape deformations without changing connectivity or UVs. */
export function deformCage(cage, ...operations) {
  if (operations.some(op => typeof op !== 'function')) throw new TypeError('deformCage expects point functions');
  let out = quadCage(cage.points, cage.faces); out.atlas = cage.atlas;
  for (const op of operations) out.points = out.points.map((p, i) => {
    const result = op(p.slice(), i);
    if (!pointOK(result)) throw new Error('A cage deformation returned an invalid point');
    return result.slice();
  });
  return out;
}

/** A smooth localized movement, in meters, for primary anatomical volumes. */
export function softMove({ center, radius, offset }) {
  if (![center, radius, offset].every(pointOK) || radius.some(r => r <= 0)) throw new Error('softMove needs finite vectors and positive radii');
  const c = [...center], r = [...radius], d = [...offset];
  return p => {
    const weight = Math.exp(-2 * p.reduce((s, x, k) => s + ((x - c[k]) / r[k]) ** 2, 0));
    return p.map((x, k) => x + weight * d[k]);
  };
}
