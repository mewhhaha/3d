import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import { faceRegionSelection } from '../src/lib/geometry-sculpt.js';
import {
  deformationHandle, deformationLattice, latticeVertices, deformGeometry,
} from '../src/lib/geometry-deform.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

function panel() {
  const geometry = new THREE.PlaneGeometry(2, 2, 6, 8);
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, { 'panel.upper': ({ centroid }) => centroid.y > 0 }, { clone: false });
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('field', new THREE.Float32BufferAttribute(Array.from({ length: count }, (_, i) => i / count), 1));
  geometry.computeTangents();
  return geometry;
}

test('deformationLattice is compact JSON-safe sparse construction data', () => {
  const handle = deformationHandle({ origin: [.1, .2, -.1], rotation: [8, -12, 4], range: [-.6, .7] });
  const lattice = deformationLattice({
    handle, xRange: [-.4, .5], zRange: [-.3, .2], resolution: [3, 4, 2],
    edits: [
      { point: [2, 3, 1], offset: [.08, -.03, .04] },
      { point: [0, 2, 0], offset: [-.02, .01, 0] },
    ],
  });
  const json = JSON.parse(JSON.stringify(lattice));
  assert.equal(json.kind, 'deformation-lattice');
  assert.deepEqual(json.resolution, [3, 4, 2]);
  assert.deepEqual(json.edits[0], { point: [2, 3, 1], offset: [.08, -.03, .04] });
  assert.equal(json.outside, 'identity');
  assert.throws(() => deformationLattice({ resolution: [1, 2, 2] }), /2\.\.8/);
  assert.throws(() => deformationLattice({ xRange: [1, 1] }), /start < end/);
  assert.throws(() => deformationLattice({ resolution: [2, 2, 2], edits: [{ point: [2, 0, 0], offset: [0, 0, 0] }] }), /outside resolution/);
});

test('regular lattice is identity and points outside its authored box stay unchanged', () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2, 2, 2, 2);
  const all = new Float32Array(geometry.getAttribute('position').count).fill(1);
  const unchanged = deformGeometry(geometry, latticeVertices(all, {
    lattice: deformationLattice({
      handle: deformationHandle({ range: [-.5, .5] }), xRange: [-.5, .5], zRange: [-.5, .5], resolution: [3, 3, 3],
    }),
  }));
  const before = geometry.getAttribute('position');
  const afterIdentity = unchanged.getAttribute('position');
  for (let i = 0; i < before.count; i++) {
    near(afterIdentity.getX(i), before.getX(i)); near(afterIdentity.getY(i), before.getY(i)); near(afterIdentity.getZ(i), before.getZ(i));
  }

  const edited = deformGeometry(geometry, latticeVertices(all, {
    lattice: deformationLattice({
      handle: deformationHandle({ range: [-.25, .25] }), xRange: [-.25, .25], zRange: [-.25, .25], resolution: [2, 2, 2],
      edits: [{ point: [1, 1, 1], offset: [.4, .4, .4] }],
    }),
  }));
  const afterOutside = edited.getAttribute('position');
  for (let i = 0; i < before.count; i++) {
    near(afterOutside.getX(i), before.getX(i)); near(afterOutside.getY(i), before.getY(i)); near(afterOutside.getZ(i), before.getZ(i));
  }
});

test('trilinear 2x2x2 lattice gives the expected center displacement from one control edit', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, .2,0,0, 0,.2,0], 3));
  geometry.setIndex([0,1,2]);
  const all = new Float32Array(3).fill(1);
  const lattice = deformationLattice({
    handle: deformationHandle({ range: [-1, 1] }), xRange: [-1, 1], zRange: [-1, 1], resolution: [2, 2, 2],
    edits: [{ point: [1, 1, 1], offset: [.8, -.4, .24] }],
  });
  const edited = deformGeometry(geometry, latticeVertices(all, { lattice }));
  const p = edited.getAttribute('position');
  near(p.getX(0), .1); near(p.getY(0), -.05); near(p.getZ(0), .03);
});

test('lattice deformation honors rotated local frames and selection blending', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 0,.2,0, .2,0,0], 3));
  geometry.setIndex([0,1,2]);
  const weights = new Float32Array([1, .5, 0]);
  const edits = [];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) {
    edits.push({ point: [i, j, k], offset: [.1, 0, 0] });
  }
  const lattice = deformationLattice({
    handle: deformationHandle({ rotation: [0, 0, 90], range: [-.5, .5] }),
    xRange: [-.5, .5], zRange: [-.5, .5], resolution: [2, 2, 2], edits,
  });
  const edited = deformGeometry(geometry, latticeVertices(weights, { lattice }));
  const p = edited.getAttribute('position');
  near(p.getX(0), 0, 2e-6); near(p.getY(0), .1, 2e-6);
  near(p.getX(1), 0, 2e-6); near(p.getY(1), .25, 2e-6);
  near(p.getX(2), .2, 2e-6); near(p.getY(2), 0, 2e-6);
});

test('lattice deformation preserves topology, UVs, attributes and face-region metadata', () => {
  const geometry = panel();
  const beforeIndex = Array.from(geometry.index.array);
  const beforeUV = Array.from(geometry.getAttribute('uv').array);
  const beforeField = Array.from(geometry.getAttribute('field').array);
  const selection = faceRegionSelection(geometry, 'panel.upper');
  const lattice = deformationLattice({
    handle: deformationHandle({ range: [-1, 1] }), xRange: [-1.1, 1.1], zRange: [-.3, .3], resolution: [3, 3, 2],
    edits: [
      { point: [2, 2, 0], offset: [.14, .08, .10] }, { point: [2, 2, 1], offset: [.14, .08, .10] },
      { point: [1, 2, 0], offset: [.04, .04, .05] }, { point: [1, 2, 1], offset: [.04, .04, .05] },
    ],
  });
  const edited = deformGeometry(geometry, latticeVertices(selection, { lattice }));
  assert.deepEqual(Array.from(edited.index.array), beforeIndex);
  assert.deepEqual(Array.from(edited.getAttribute('uv').array), beforeUV);
  assert.deepEqual(Array.from(edited.getAttribute('field').array), beforeField);
  assert.deepEqual(faceRegionTriangles(edited, 'panel.upper'), faceRegionTriangles(geometry, 'panel.upper'));
  assert.equal(edited.userData.geometryDeform.operations.at(-1), 'lattice');
  assert.deepEqual(edited.userData.geometryDeform.lattices[0], { resolution: [3, 3, 2], edits: 4, outside: 'identity' });
  assert.ok([...edited.getAttribute('normal').array].every(Number.isFinite));
  assert.ok([...edited.getAttribute('tangent').array].every(Number.isFinite));
});
