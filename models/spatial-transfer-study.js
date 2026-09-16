import * as THREE from 'three';
import { defineModel, group, material, mesh, box } from '../src/lib/modeling.js';
import { transferSurfaceAttributes } from '../src/lib/attribute-transfer.js';

function coloredGrid({ width, height, sx = 18, sy = 12, zAt, colorAt, reverse = false }) {
  const geometry = new THREE.PlaneGeometry(width, height, sx, sy);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i);
    position.setZ(i, zAt(x, y));
    const color = new THREE.Color(colorAt(x, y));
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
  }
  if (reverse) {
    const index = geometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1), c = index.getX(i + 2);
      index.setX(i + 1, c); index.setX(i + 2, b);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function combineSurfaces(parts) {
  let vertexCount = 0, indexCount = 0;
  for (const part of parts) { vertexCount += part.getAttribute('position').count; indexCount += part.index.count; }
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  const geometry = new THREE.BufferGeometry();
  let vertexBase = 0, indexBase = 0;
  parts.forEach((part, groupIndex) => {
    positions.set(part.getAttribute('position').array, vertexBase * 3);
    colors.set(part.getAttribute('color').array, vertexBase * 3);
    for (let i = 0; i < part.index.count; i++) indices[indexBase + i] = part.index.getX(i) + vertexBase;
    geometry.addGroup(indexBase, part.index.count, groupIndex);
    vertexBase += part.getAttribute('position').count;
    indexBase += part.index.count;
  });
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

function targetGrid({ width, height, sx = 20, sy = 14, zAt }) {
  const geometry = new THREE.PlaneGeometry(width, height, sx, sy);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) position.setZ(i, zAt(position.getX(i), position.getY(i)));
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.deleteAttribute('uv');
  return geometry;
}

function organicFixture(constrained) {
  const upper = coloredGrid({
    width: .72, height: .52,
    zAt: (x, y) => .034 + .012 * Math.cos(y * 8) + .006 * x,
    colorAt: (x, y) => new THREE.Color('#4f9b72').lerp(new THREE.Color('#e7bd61'), THREE.MathUtils.clamp((y + .26) / .52, 0, 1)),
  });
  const lower = coloredGrid({
    width: .72, height: .52,
    zAt: (x, y) => -.034 + .008 * Math.sin(x * 7),
    colorAt: (x, y) => new THREE.Color('#a64f8d').lerp(new THREE.Color('#4e72c6'), THREE.MathUtils.clamp((x + .36) / .72, 0, 1)),
    reverse: true,
  });
  const source = combineSurfaces([upper, lower]);
  const target = targetGrid({
    width: .66, height: .46,
    zAt: (x, y) => .027 * Math.sin((x / .33) * Math.PI * .5) + .003 * Math.sin(y * 9),
  });
  const transferred = transferSurfaceAttributes(source, target, {
    attributes: ['color'], acceleration: 'bvh', maxDistance: .09,
    ...(constrained ? { groupIndices: [0] } : {}),
  });
  const mat = material('#ffffff', { roughness: .44, vertexColors: true, side: THREE.DoubleSide });
  const root = group('Layered organic transfer', [
    mesh(transferred, { name: constrained ? 'Upper-layer constrained leaf' : 'Nearest-only leaf', material: mat }),
  ], { position: [-.46, .03, 0], rotation: [3, -10, 4] });
  root.userData.workflow = { subject: 'layered organic sheet', ambiguity: 'two nearby source sheets', constraint: constrained ? 'source BufferGeometry group 0' : 'none', transfer: transferred.userData.attributeTransfer };
  upper.dispose(); lower.dispose(); source.dispose(); target.dispose();
  return root;
}

function mechanicalFixture(constrained) {
  const front = coloredGrid({
    width: .70, height: .46, sx: 16, sy: 10,
    zAt: (x, y) => .035 + .012 * (x / .35) + .006 * Math.cos(y * 10),
    colorAt: (x, y) => new THREE.Color('#4ca8ba').lerp(new THREE.Color('#d18c61'), THREE.MathUtils.clamp((x + .35) / .70, 0, 1)),
  });
  const back = coloredGrid({
    width: .70, height: .46, sx: 16, sy: 10,
    zAt: (x, y) => -.010 + .004 * Math.sin(y * 12),
    colorAt: () => '#9c4c72',
    reverse: true,
  });
  const source = combineSurfaces([front, back]);
  const target = targetGrid({
    width: .62, height: .38, sx: 18, sy: 12,
    zAt: (x, y) => .002 + .004 * Math.sin(x * 9) * Math.cos(y * 8),
  });
  const transferred = transferSurfaceAttributes(source, target, {
    attributes: ['color'], acceleration: 'bvh', maxDistance: .08,
    ...(constrained ? { minNormalDot: .35 } : {}),
  });
  const panel = mesh(transferred, {
    name: constrained ? 'Facing-constrained service skin' : 'Nearest-only service skin',
    material: material('#ffffff', { roughness: .32, metalness: .08, vertexColors: true, side: THREE.DoubleSide }),
  });
  const mounts = [-.25, .25].map(x => box({ name: 'Panel mount', size: [.055, .05, .05], radius: .006, segments: 2, position: [x, -.17, -.045], material: material('#b69260', { roughness: .32, metalness: .45 }) }));
  const root = group('Facing-aware mechanical transfer', [panel, mounts], { position: [.48, -.04, .01], rotation: [-5, 15, -4] });
  root.userData.workflow = { subject: 'stacked hard-surface panel', ambiguity: 'nearer opposite-facing backing sheet', constraint: constrained ? 'target normal dot source face normal >= 0.35' : 'none', transfer: transferred.userData.attributeTransfer };
  front.dispose(); back.dispose(); source.dispose(); target.dispose();
  return root;
}

export default defineModel({
  id: 'spatial-transfer-study',
  title: 'Workflow lab / constrained spatial transfer',
  description: 'A reusable triangle AABB index accelerates closest-surface queries while source-group and normal-facing filters resolve intentionally ambiguous layered geometry.',
  parameters: {
    constrained: { type: 'boolean', default: true },
    organic: { type: 'boolean', default: true },
    mechanical: { type: 'boolean', default: true },
  },
  build(p) {
    const children = [];
    if (p.organic) children.push(organicFixture(p.constrained));
    if (p.mechanical) children.push(mechanicalFixture(p.constrained));
    if (!children.length) children.push(box({ size: [.05, .05, .05], material: material('#888888') }));
    const root = group('Constrained spatial transfer workflow', children);
    root.userData.workflow = { constrained: p.constrained, acceleration: 'triangle AABB hierarchy' };
    return root;
  },
});
