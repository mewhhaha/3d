import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { composeGeometries } from '../src/lib/geometry-composition.js';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import { faceRegionSelection } from '../src/lib/geometry-sculpt.js';
import {
  deformationHandle, deformationLattice, latticeVertices,
  bendVertices, deformGeometry, deformGeometryInParent,
} from '../src/lib/geometry-deform.js';

const near = (a, b, eps = 2e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const all = geometry => new Float32Array(geometry.getAttribute('position').count).fill(1);

function lattice() {
  return deformationLattice({
    handle: deformationHandle({ origin: [.08, .02, -.03], rotation: [5, -12, 8], range: [-.55, .55] }),
    xRange: [-.7, .7], zRange: [-.5, .5], resolution: [3, 3, 3],
    edits: [
      { point: [0, 2, 1], offset: [-.08, .06, .02] },
      { point: [1, 2, 2], offset: [.02, .08, .09] },
      { point: [2, 1, 1], offset: [.10, -.01, .00] },
      { point: [2, 0, 0], offset: [.03, -.04, -.05] },
    ],
  });
}

function comparePositions(a, b, eps = 2e-6) {
  const pa = a.getAttribute('position'), pb = b.getAttribute('position');
  assert.equal(pa.count, pb.count);
  for (let i = 0; i < pa.count; i++) {
    near(pa.getX(i), pb.getX(i), eps);
    near(pa.getY(i), pb.getY(i), eps);
    near(pa.getZ(i), pb.getZ(i), eps);
  }
}

test('identity parent placement matches geometry-local deformation', () => {
  const geometry = new THREE.BoxGeometry(.7, .9, .5, 4, 5, 3);
  const field = lattice();
  const local = deformGeometry(geometry, latticeVertices(all(geometry), { lattice: field }));
  const parent = deformGeometryInParent(geometry, {}, latticeVertices(all(geometry), { lattice: field }));
  comparePositions(local, parent);
  assert.deepEqual(parent.userData.geometryDeform.placement, {
    position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  });
});

test('one parent-space lattice matches deforming the composed assembly while preserving separate source ownership', () => {
  const shell = new THREE.BoxGeometry(.64, .62, .42, 5, 5, 4);
  const trim = new THREE.BoxGeometry(.46, .12, .50, 5, 2, 4);
  const shellBefore = [...shell.getAttribute('position').array];
  const trimBefore = [...trim.getAttribute('position').array];
  const shellPlacement = { position: [-.12, .03, .02], rotation: [0, 16, -5], scale: [1.1, .95, 1] };
  const trimPlacement = { position: [.06, .21, .08], rotation: [7, -11, 9], scale: [.92, 1.08, 1.04] };
  const field = lattice();

  const shapedShell = deformGeometryInParent(shell, shellPlacement, latticeVertices(all(shell), { lattice: field }));
  const shapedTrim = deformGeometryInParent(trim, trimPlacement, latticeVertices(all(trim), { lattice: field }));
  assert.deepEqual([...shell.getAttribute('position').array], shellBefore);
  assert.deepEqual([...trim.getAttribute('position').array], trimBefore);

  const separateThenCompose = composeGeometries([
    { name: 'shell', geometry: shapedShell, ...shellPlacement },
    { name: 'trim', geometry: shapedTrim, ...trimPlacement },
  ]);
  const composeThenDeform = (() => {
    const baseline = composeGeometries([
      { name: 'shell', geometry: shell, ...shellPlacement },
      { name: 'trim', geometry: trim, ...trimPlacement },
    ]);
    const result = deformGeometry(baseline, latticeVertices(all(baseline), { lattice: field }));
    baseline.dispose();
    return result;
  })();
  comparePositions(separateThenCompose, composeThenDeform, 4e-6);

  shapedShell.getAttribute('position').setX(0, 99);
  assert.notEqual(shapedTrim.getAttribute('position').getX(0), 99, 'outputs retain independent buffers');
  shell.dispose(); trim.dispose(); shapedShell.dispose(); shapedTrim.dispose(); separateThenCompose.dispose(); composeThenDeform.dispose();
});

test('parent-space field keeps component-local semantic selection separate from assembly placement', () => {
  let geometry = new THREE.PlaneGeometry(1, 1, 8, 8);
  geometry = defineFaceRegions(geometry, {
    'trim.flex': ({ centroid }) => centroid.y > 0,
  }, { clone: false });
  const selected = faceRegionSelection(geometry, 'trim.flex');
  const placement = { position: [.4, -.2, .3], rotation: [15, 25, -10], scale: [1.3, .8, 1] };
  const before = geometry.getAttribute('position');
  const edited = deformGeometryInParent(geometry, placement, bendVertices(selected, {
    handle: deformationHandle({ origin: [.4, -.2, .3], rotation: [15, 25, -10], range: [-.5, .5] }),
    angle: 32,
  }));
  const after = edited.getAttribute('position');
  let changedUpper = 0, unchangedLower = 0;
  for (let i = 0; i < before.count; i++) {
    const moved = new THREE.Vector3().fromBufferAttribute(before, i).distanceTo(new THREE.Vector3().fromBufferAttribute(after, i));
    if (before.getY(i) > .01 && moved > 1e-6) changedUpper++;
    if (before.getY(i) < -.01 && moved <= 1e-7) unchangedLower++;
  }
  assert.ok(changedUpper > 0);
  assert.ok(unchangedLower > 0);
  assert.deepEqual(faceRegionTriangles(edited, 'trim.flex'), faceRegionTriangles(geometry, 'trim.flex'));
  assert.match(edited.userData.geometryDeform.coordinateSpace, /parent\/assembly-local/);
});

test('parent-space deformation validates explicit invertible authoring placement', () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const op = latticeVertices(all(geometry), { lattice: lattice() });
  assert.throws(() => deformGeometryInParent(geometry, { scale: [1, 0, 1] }, op), /placement scale must be positive/);
  assert.throws(() => deformGeometryInParent(geometry, { rotation: [0, Number.NaN, 0] }, op), /rotation must contain three finite/);
});
