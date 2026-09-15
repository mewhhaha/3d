import { THREE, group } from '../modeling.js';
import { patch, sweep } from '../surfaces.js';

/** Compose scalar displacement operations, independent of the garment or mesh. */
export function sumFields(...fields) {
  if (!fields.every(f => typeof f === 'function')) throw new TypeError('Fields must be functions');
  return (u, v) => fields.reduce((sum, field) => sum + field(u, v), 0);
}
export function foldWaves({ count = 6, amplitude = .003, skew = .7, phase = 0 } = {}) {
  if (![count, amplitude, skew, phase].every(Number.isFinite) || count < 1 || count > 80 || amplitude < 0 || amplitude > .03) throw new RangeError('Invalid fold field');
  return (u, v) => amplitude * Math.sin(2 * Math.PI * (count * v + skew * u) + phase);
}
export function fadeEdges(field, margin = .12) {
  if (typeof field !== 'function' || !Number.isFinite(margin) || margin <= 0 || margin > .5) throw new TypeError('Invalid edge fade');
  return (u, v) => field(u, v) * THREE.MathUtils.smoothstep(v, 0, margin) * THREE.MathUtils.smoothstep(1 - v, 0, margin);
}
/** Drapes a sheet along a guide. Useful for scarves, sashes, straps and loose fabric. */
export function drapeRibbon({ name = 'DrapedFabric', path, width = .06, across = [0, 1, 0], folds = () => 0, material, segments = 128, crossSegments = 20, hem = true } = {}) {
  if (typeof path !== 'function' || typeof folds !== 'function') throw new TypeError('Ribbon needs path and fold functions');
  const point = u => new THREE.Vector3(...path(THREE.MathUtils.clamp(u, 0, 1)));
  const sample = (u, v) => {
    const p = point(u), tangent = point(u + .0001).sub(point(u - .0001)).normalize();
    const axis = new THREE.Vector3(...(typeof across === 'function' ? across(u) : across));
    axis.addScaledVector(tangent, -axis.dot(tangent)).normalize();
    if (axis.lengthSq() < .5) throw new Error('Across direction is parallel to the guide');
    const normal = tangent.clone().cross(axis).normalize();
    const w = typeof width === 'function' ? width(u) : width, displacement = folds(u, v);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(displacement)) throw new Error('Invalid ribbon width or displacement');
    return p.addScaledVector(axis, (v - .5) * w).addScaledVector(normal, displacement).toArray();
  };
  const surface = patch({ name, sample, uSegments: segments, vSegments: crossSegments, material });
  const pieces = [surface];
  if (hem) for (const edge of [0, 1]) pieces.push(sweep({ name: `${name}Hem${edge}`, points: Array.from({ length: 65 }, (_, i) => sample(i / 64, edge)), radii: .00065, segments, sides: 5, material }));
  return group(name, pieces);
}
