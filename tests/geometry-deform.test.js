import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import { radialSelection, faceRegionSelection, intersectSelections } from '../src/lib/geometry-sculpt.js';
import {
  deformationHandle, deformationCurve, bendVertices, twistVertices, taperVertices, curveVertices, deformGeometry,
} from '../src/lib/geometry-deform.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

function panel() {
  const geometry = new THREE.PlaneGeometry(2, 2, 6, 8);
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, {
    'panel.upper': ({ centroid }) => centroid.y > 0,
  }, { clone: false });
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('field', new THREE.Float32BufferAttribute(Array.from({ length: count }, (_, i) => i / count), 1));
  geometry.computeTangents();
  return geometry;
}

test('deformationHandle validates an independently editable local frame and range', () => {
  const handle = deformationHandle({ origin: [.2, -.4, .1], rotation: [5, 20, -10], scale: [1, .8, 1.2], range: [-.3, .7] });
  assert.deepEqual(handle.origin, [.2, -.4, .1]);
  assert.deepEqual(handle.range, [-.3, .7]);
  assert.throws(() => deformationHandle({ scale: [1, 0, 1] }), /positive/);
  assert.throws(() => deformationHandle({ range: [1, 1] }), /start < end/);
});

test('bendVertices follows a circular centerline and rigidly continues beyond the handle', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0,0,0, 0,1,0, 0,2,0, .2,1,0,
  ], 3));
  geometry.setIndex([0,1,3, 1,2,3]);
  const all = new Float32Array(4).fill(1);
  const handle = deformationHandle({ range: [0, 1] });
  const bent = deformGeometry(geometry, bendVertices(all, { handle, angle: 90 }));
  const p = bent.getAttribute('position');
  const radius = 1 / (Math.PI / 2);
  near(p.getX(0), 0); near(p.getY(0), 0);
  near(p.getX(1), radius); near(p.getY(1), radius);
  near(p.getX(2), radius + 1); near(p.getY(2), radius);
  near(p.getX(3), radius); near(p.getY(3), radius - .2);
});

test('twistVertices and taperVertices reuse the same handle and compose sequentially', () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2, 1, 2, 1);
  const all = new Float32Array(geometry.getAttribute('position').count).fill(1);
  const handle = deformationHandle({ range: [-1, 1] });
  const edited = deformGeometry(
    geometry,
    twistVertices(all, { handle, angle: 90 }),
    taperVertices(all, { handle, factor: -.5 }),
  );
  const source = geometry.getAttribute('position');
  const p = edited.getAttribute('position');
  let topChanged = 0, bottomUnchanged = 0;
  for (let i = 0; i < p.count; i++) {
    const before = new THREE.Vector3().fromBufferAttribute(source, i);
    const after = new THREE.Vector3().fromBufferAttribute(p, i);
    if (before.y > .99 && after.distanceTo(before) > 1e-5) topChanged++;
    if (before.y < -.99 && after.distanceTo(before) <= 1e-7) bottomUnchanged++;
  }
  assert.ok(topChanged > 0);
  assert.ok(bottomUnchanged > 0, 'vertices on/below handle start remain unchanged');
});

test('deformGeometry composes semantic/radial masks and preserves topology, UVs, custom attributes and regions', () => {
  const geometry = panel();
  const before = Array.from(geometry.getAttribute('position').array);
  const beforeIndex = Array.from(geometry.index.array);
  const beforeUV = Array.from(geometry.getAttribute('uv').array);
  const beforeField = Array.from(geometry.getAttribute('field').array);
  const selection = intersectSelections(
    faceRegionSelection(geometry, 'panel.upper'),
    radialSelection({ center: [0, .55, 0], radius: [.9, .8, .5] }),
  );
  const handle = deformationHandle({ origin: [0, -.2, 0], rotation: [0, 0, -12], range: [0, 1.2] });
  const edited = deformGeometry(geometry,
    bendVertices(selection, { handle, angle: 35 }),
    taperVertices(selection, { handle, factor: -.22 }),
  );
  assert.deepEqual(Array.from(geometry.getAttribute('position').array), before, 'source remains unchanged');
  assert.deepEqual(Array.from(edited.index.array), beforeIndex);
  assert.deepEqual(Array.from(edited.getAttribute('uv').array), beforeUV);
  assert.deepEqual(Array.from(edited.getAttribute('field').array), beforeField);
  assert.deepEqual(faceRegionTriangles(edited, 'panel.upper'), faceRegionTriangles(geometry, 'panel.upper'));
  assert.ok(Array.from(edited.getAttribute('position').array).some((v, i) => Math.abs(v - before[i]) > 1e-5));
  assert.ok([...edited.getAttribute('normal').array].every(Number.isFinite));
  assert.ok([...edited.getAttribute('tangent').array].every(Number.isFinite));
  assert.equal(edited.userData.geometryDeform.topologyPreserved, true);
});

test('a zero selection keeps geometry bit-identical and handle placement can move deformation intent', () => {
  const geometry = new THREE.PlaneGeometry(1, 1, 4, 8);
  const before = Array.from(geometry.getAttribute('position').array);
  const zero = new Float32Array(geometry.getAttribute('position').count);
  const unchanged = deformGeometry(geometry, bendVertices(zero, { angle: 70 }));
  assert.deepEqual(Array.from(unchanged.getAttribute('position').array), before);

  const all = new Float32Array(geometry.getAttribute('position').count).fill(1);
  const centered = deformGeometry(geometry, bendVertices(all, {
    handle: deformationHandle({ range: [-.5, .5] }), angle: 45,
  }));
  const shifted = deformGeometry(geometry, bendVertices(all, {
    handle: deformationHandle({ origin: [.4, 0, 0], range: [-.5, .5] }), angle: 45,
  }));
  assert.notDeepEqual(Array.from(centered.getAttribute('position').array), Array.from(shifted.getAttribute('position').array));
});

test('deformation rejects rig and morph ownership rather than silently invalidating it', () => {
  const skinned = new THREE.BoxGeometry(1, 1, 1);
  const count = skinned.getAttribute('position').count;
  skinned.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  skinned.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(count * 4), 4));
  assert.throws(() => deformGeometry(skinned, bendVertices(new Float32Array(count).fill(1))), /pre-rig/);

  const morphed = new THREE.BoxGeometry(1, 1, 1);
  morphed.morphAttributes.position = [morphed.getAttribute('position').clone()];
  assert.throws(() => deformGeometry(morphed, twistVertices(new Float32Array(morphed.getAttribute('position').count).fill(1))), /morph targets/);
});


test('deformationCurve is JSON-safe and rejects degenerate construction data', () => {
  const guide = deformationCurve([[0, -1, 0], [0.2, 0, 0.1], [0, 1, 0]], { segments: 32 });
  assert.equal(guide.kind, 'deformation-curve');
  assert.deepEqual(JSON.parse(JSON.stringify(guide)).points[1], [0.2, 0, 0.1]);
  assert.throws(() => deformationCurve([[0, 0, 0]]), /2\.\.128/);
  assert.throws(() => deformationCurve([[0, 0, 0], [0, 0, 0]]), /distinct/);
  assert.throws(() => deformationCurve([[0, 0, 0], [0, 1, 0]], { up: [0, 0, 0] }), /non-zero/);
});

test('straight curve deformation is identity in the default +Y handle frame', () => {
  const geometry = new THREE.BoxGeometry(.4, 2.4, .6, 2, 6, 2);
  const all = new Float32Array(geometry.getAttribute('position').count).fill(1);
  const guide = deformationCurve([[0, -1, 0], [0, 1, 0]], { segments: 16 });
  const edited = deformGeometry(geometry, curveVertices(all, {
    guide, handle: deformationHandle({ range: [-1, 1] }),
  }));
  const before = geometry.getAttribute('position');
  const after = edited.getAttribute('position');
  for (let i = 0; i < before.count; i++) {
    near(after.getX(i), before.getX(i), 2e-6);
    near(after.getY(i), before.getY(i), 2e-6);
    near(after.getZ(i), before.getZ(i), 2e-6);
  }
});

test('curve deformation carries cross-sections through an S guide and extends beyond endpoints', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0,-1.4,0, 0,-1,0, 0,0,0, 0,1,0, 0,1.4,0, .2,0,0,
  ], 3));
  geometry.setIndex([0,1,5, 1,2,5, 2,3,5, 3,4,5]);
  const all = new Float32Array(6).fill(1);
  const guide = deformationCurve([[0,-1,0], [.45,-.45,.05], [-.28,.18,.18], [.35,1,.1]], { segments: 128 });
  const edited = deformGeometry(geometry, curveVertices(all, { guide, handle: deformationHandle({ range: [-1, 1] }) }));
  const p = edited.getAttribute('position');
  const start = new THREE.Vector3(p.getX(1), p.getY(1), p.getZ(1));
  const end = new THREE.Vector3(p.getX(3), p.getY(3), p.getZ(3));
  near(start.distanceTo(new THREE.Vector3(0,-1,0)), 0, 2e-5);
  near(end.distanceTo(new THREE.Vector3(.35,1,.1)), 0, 2e-5);
  const mid = new THREE.Vector3(p.getX(2), p.getY(2), p.getZ(2));
  assert.ok(Math.abs(mid.x) > .05 || Math.abs(mid.z) > .05, 'centerline follows non-circular guide');
  const cross = new THREE.Vector3(p.getX(5), p.getY(5), p.getZ(5));
  near(cross.distanceTo(mid), .2, 3e-3);
  const beforeStart = new THREE.Vector3(p.getX(0), p.getY(0), p.getZ(0));
  const afterEnd = new THREE.Vector3(p.getX(4), p.getY(4), p.getZ(4));
  near(beforeStart.distanceTo(start), .4, 3e-3);
  near(afterEnd.distanceTo(end), .4, 3e-3);
});
