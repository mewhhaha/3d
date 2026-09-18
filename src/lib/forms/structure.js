import * as THREE from 'three';
import { smooth } from './surface.js';
const finite = (n, min, max, label) => {
  if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(`${label}: expected ${min}..${max}`);
  return n;
};
const vector = (p, label) => {
  if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite)) throw new TypeError(`${label}: expected a finite 3-vector`);
  return new THREE.Vector3(...p);
};
const name = n => { if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(n)) throw new Error('Invalid joint name'); return n; };
/** A link supplies a relationship; the compiler computes positions and parentage once. */
export function link(joint, { length, direction = [0, 1, 0] } = {}) {
  const d = vector(direction, 'link direction');
  if (d.lengthSq() < 1e-12) throw new Error('A link needs a nonzero direction');
  return Object.freeze({ name: name(joint), length: finite(length, .001, 10, 'link length'), direction: Object.freeze(d.normalize().toArray()) });
}
export function jointChain({ root = 'Root', origin = [0, 0, 0] } = {}, ...links) {
  name(root);
  if (!links.length || links.length > 255) throw new Error('A chain needs 1..255 links');
  const point = vector(origin, 'chain origin'), spec = [{ name: root, position: point.toArray() }];
  const landmarks = { [root]: point.clone() }, stations = { [root]: 0 };
  let distance = 0, parent = root;
  for (const item of links) {
    if (!item || Object.hasOwn(landmarks, item.name)) throw new Error('Duplicate or invalid chain link');
    const checked = link(item.name, item);
    point.addScaledVector(vector(checked.direction, 'direction'), checked.length);
    distance += checked.length;
    spec.push({ name: checked.name, parent, position: point.toArray() });
    landmarks[checked.name] = point.clone(); stations[checked.name] = distance; parent = checked.name;
  }
  for (const key of Object.keys(stations)) stations[key] /= distance;
  return { spec, length: distance, at: joint => {
    if (!Object.hasOwn(landmarks, joint)) throw new Error(`Unknown landmark: ${joint}`);
    return landmarks[joint].clone();
  }, station: joint => {
    if (!Object.hasOwn(stations, joint)) throw new Error(`Unknown landmark: ${joint}`);
    return stations[joint];
  } };
}
/** Shape-preserving cubic Hermite interpolation: smooth slopes without overshooting sections. */
export function contour(stations) {
  if (!Array.isArray(stations) || stations.length < 2 || stations[0][0] !== 0 || stations.at(-1)[0] !== 1) throw new Error('Contour needs endpoints at 0 and 1');
  const keys = stations.map(([t, value], i) => {
    finite(t, 0, 1, 'station'); finite(value, -100, 100, 'contour value');
    if (i && t <= stations[i - 1][0]) throw new Error('Contour stations must increase');
    return [t, value];
  });
  const h = keys.slice(1).map((p, i) => p[0] - keys[i][0]);
  const slopes = keys.slice(1).map((p, i) => (p[1] - keys[i][1]) / h[i]);
  const derivatives = [slopes[0]];
  for (let i = 1; i < keys.length - 1; i++) {
    const a = slopes[i - 1], b = slopes[i];
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
    derivatives.push(a * b <= 0 ? 0 : (w1 + w2) / (w1 / a + w2 / b));
  }
  derivatives.push(slopes.at(-1));
  return t => {
    t = finite(t, 0, 1, 'contour sample');
    const i = Math.min(keys.length - 2, Math.max(0, keys.findIndex(p => p[0] >= t) - 1));
    const u = (t - keys[i][0]) / h[i], u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * keys[i][1] + (u3 - 2 * u2 + u) * h[i] * derivatives[i]
      + (-2 * u3 + 3 * u2) * keys[i + 1][1] + (u3 - u2) * h[i] * derivatives[i + 1];
  };
}
/** A broad radial mass changes silhouette. Angle may be a constant (radians) or
 * an authored function of longitudinal v, allowing spiral/sweeping volume groups.
 * Fine skin relief belongs in a separate detail field. End rings stay pinned. */
export function radialMass({ at = .5, span = .2, angle = 0, spread = .7, amount = .005 } = {}) {
  finite(at, 0, 1, 'mass station'); finite(span, .001, 1, 'mass span');
  const direction = typeof angle === 'function' ? angle : () => angle;
  if (typeof angle !== 'function') finite(angle, -Math.PI * 4, Math.PI * 4, 'mass angle');
  finite(spread, .05, Math.PI * 2, 'mass spread'); finite(amount, -.05, .05, 'mass amount');
  return (u, v) => {
    const theta = finite(direction(v), -Math.PI * 4, Math.PI * 4, 'mass angle sample');
    const d = Math.atan2(Math.sin(u * 2 * Math.PI - theta), Math.cos(u * 2 * Math.PI - theta));
    return amount * Math.exp(-2 * (((v - at) / span) ** 2 + (d / spread) ** 2)) * smooth(v / .08) * smooth((1 - v) / .08);
  };
}
/** Loft smooth sections along +Y. Squareness flattens principal planes without
 * changing their axial extrema; depthBias distributes depth to front/back.
 * Both are optional scalar profiles, independent of mass fields and resolution. */
export function sectionLoft({ from, to, breadth, depth, offset = () => [0, 0], masses = [], squareness = () => 0, depthBias = () => 0 }) {
  finite(from, -100, 100, 'loft start'); finite(to, from + .001, 100, 'loft end');
  if (![breadth, depth, offset, squareness, depthBias, ...masses].every(f => typeof f === 'function')) throw new TypeError('Loft sections and masses must be functions');
  return (u, v) => {
    const a = u * 2 * Math.PI, x = breadth(v), z = depth(v), move = offset(v);
    if (!(x > 0 && z > 0) || ![x, z, ...move].every(Number.isFinite)) throw new Error('Invalid loft section');
    const mass = masses.reduce((sum, field) => sum + field(u, v), 0);
    if (!Number.isFinite(mass) || x + mass <= 0 || z + mass <= 0) throw new Error('Radial mass inverted a section');
    const q = finite(squareness(v), 0, .45, 'section squareness');
    const bias = finite(depthBias(v), -.45, .45, 'section depth bias');
    if(q + Math.abs(bias) > .45 + 1e-12) throw new RangeError('Combined squareness and absolute depth bias must not exceed .45');
    const sn = Math.sin(a), cs = Math.cos(a);
    return [(x + mass) * sn * (1 + q * cs * cs) + move[0], from + (to - from) * v,
      (z + mass) * cs * (1 + q * sn * sn + bias * cs) + move[1]];
  };
}
