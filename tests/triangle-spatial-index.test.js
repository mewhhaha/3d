import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';

function bruteClosest(geometry, point, { groupIndices = null, normal = null, minNormalDot = -1 } = {}) {
  const p = geometry.getAttribute('position');
  const allowed = groupIndices ? new Set(groupIndices) : null;
  let best = null;
  const candidate = new THREE.Vector3();
  for (let offset = 0, triangleIndex = 0; offset < geometry.index.count; offset += 3, triangleIndex++) {
    const groups = [];
    for (let i = 0; i < geometry.groups.length; i++) {
      const g = geometry.groups[i];
      if (offset >= g.start && offset + 2 < g.start + g.count) groups.push(i);
    }
    if (allowed && !groups.some(i => allowed.has(i))) continue;
    const ids = [geometry.index.getX(offset), geometry.index.getX(offset + 1), geometry.index.getX(offset + 2)];
    const triangle = new THREE.Triangle(...ids.map(i => new THREE.Vector3().fromBufferAttribute(p, i)));
    const faceNormal = triangle.getNormal(new THREE.Vector3());
    if (normal && faceNormal.dot(normal) < minNormalDot) continue;
    triangle.closestPointToPoint(point, candidate);
    const distanceSq = point.distanceToSquared(candidate);
    if (!best || distanceSq < best.distanceSq || (distanceSq === best.distanceSq && triangleIndex < best.triangleIndex)) {
      best = { triangleIndex, point: candidate.clone(), distanceSq, ids };
    }
  }
  return best;
}

test('AABB triangle index matches deterministic brute-force closest points', () => {
  const geometry = new THREE.SphereGeometry(1, 28, 18);
  const index = triangleSpatialIndex(geometry, { leafSize: 6 });
  let seed = 123456789;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < 40; i++) {
    const point = new THREE.Vector3((random() - .5) * 3, (random() - .5) * 3, (random() - .5) * 3);
    const expected = bruteClosest(geometry, point);
    const actual = index.closestPoint(point);
    assert.equal(actual.triangleIndex, expected.triangleIndex);
    assert.ok(actual.point.distanceTo(expected.point) < 1e-12);
    assert.ok(Math.abs(actual.distanceSq - expected.distanceSq) < 1e-12);
  }
  const diagnostics = index.diagnostics();
  assert.equal(diagnostics.queries, 40);
  assert.ok(diagnostics.triangleTests < 40 * index.triangleCount * .35, `expected spatial pruning, tested ${diagnostics.triangleTests}`);
});

test('group and facing constraints filter otherwise-nearer triangles', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1,-1,.12, 1,-1,.12, 1,1,.12, -1,1,.12,
    -1,-1,.04, -1,1,.04, 1,1,.04, 1,-1,.04,
  ], 3));
  geometry.setIndex([0,1,2, 0,2,3, 4,5,6, 4,6,7]);
  geometry.addGroup(0, 6, 0);
  geometry.addGroup(6, 6, 1);
  const index = triangleSpatialIndex(geometry, { leafSize: 2 });
  const point = new THREE.Vector3(0,0,0);
  assert.equal(index.closestPoint(point).groupIndices[0], 1, 'nearer back-facing group wins without constraints');
  assert.equal(index.closestPoint(point, { groupIndices:[0] }).groupIndices[0], 0);
  const facing = index.closestPoint(point, { normal:new THREE.Vector3(0,0,1), minNormalDot:.5 });
  assert.equal(facing.groupIndices[0], 0, 'back-facing nearer surface is rejected');
  assert.ok(facing.normal.z > .99);
});
