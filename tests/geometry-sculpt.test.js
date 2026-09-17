import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import {
  radialSelection, facingSelection, faceRegionSelection,
  intersectSelections, unionSelections, invertSelection, selectionWeights,
  pullVertices, inflateVertices, smoothVertices, sculptGeometry,
} from '../src/lib/geometry-sculpt.js';

function grid() {
  const g = new THREE.PlaneGeometry(2, 2, 4, 4);
  g.computeVertexNormals();
  defineFaceRegions(g, {
    'panel.right': ({ centroid }) => centroid.x > 0,
    'panel.upper': ({ centroid }) => centroid.y > 0,
  }, { clone: false });
  return g;
}

function near(a, b, eps = 1e-6) { assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`); }

test('geometry-local radial, facing and boolean selections resolve deterministic point weights', () => {
  const g = grid();
  const radial = radialSelection({ center: [0, 0, 0], radius: [1, .75, .5] });
  const facing = facingSelection([0, 0, 1], { minDot: .25 });
  const region = faceRegionSelection(g, 'panel.right');
  const combined = intersectSelections(radial, facing, region);
  const weights = selectionWeights(g, combined);
  assert.equal(weights.length, g.getAttribute('position').count);
  const center = 12;
  assert.ok(weights[center] > 0 && weights[center] < 1, 'shared region boundary keeps fractional face ownership');
  assert.equal(weights[0], 0);
  const any = selectionWeights(g, unionSelections(region, invertSelection(region)));
  assert.ok([...any].every(weight => weight >= .5 && weight <= 1));
});

test('sculptGeometry clones source, preserves topology/UV/custom attributes and named face semantics', () => {
  const g = grid();
  const count = g.getAttribute('position').count;
  g.setAttribute('field', new THREE.Float32BufferAttribute(Array.from({ length: count }, (_, i) => i / count), 1));
  g.computeTangents();
  const beforePosition = Array.from(g.getAttribute('position').array);
  const beforeUV = Array.from(g.getAttribute('uv').array);
  const beforeField = Array.from(g.getAttribute('field').array);
  const beforeIndex = Array.from(g.index.array);
  const selection = intersectSelections(
    faceRegionSelection(g, 'panel.right'),
    radialSelection({ center: [.45, 0, 0], radius: [.85, .8, .5] }),
  );
  const edited = sculptGeometry(g,
    pullVertices(selection, [0, 0, .22]),
    smoothVertices(selection, { strength: .25, iterations: 2, preserveBoundary: true }),
  );
  assert.notEqual(edited, g);
  assert.deepEqual(Array.from(g.getAttribute('position').array), beforePosition, 'source remains unchanged');
  assert.deepEqual(Array.from(edited.index.array), beforeIndex);
  assert.deepEqual(Array.from(edited.getAttribute('uv').array), beforeUV);
  assert.deepEqual(Array.from(edited.getAttribute('field').array), beforeField);
  assert.deepEqual(faceRegionTriangles(edited, 'panel.right'), faceRegionTriangles(g, 'panel.right'));
  assert.ok(Array.from(edited.getAttribute('position').array).some((value, i) => Math.abs(value - beforePosition[i]) > 1e-5));
  assert.ok([...edited.getAttribute('normal').array].every(Number.isFinite));
  assert.ok([...edited.getAttribute('tangent').array].every(Number.isFinite));
  assert.equal(edited.userData.geometrySculpt.topologyPreserved, true);
  assert.equal(edited.userData.geometrySculpt.tangents, 'recomputed');
});

test('inflate follows current vertex normals and exact zero selection leaves remote vertices unchanged', () => {
  const g = new THREE.SphereGeometry(1, 16, 10);
  const before = Array.from(g.getAttribute('position').array);
  const selection = intersectSelections(
    radialSelection({ center: [0, .45, .75], radius: [.5, .5, .45] }),
    facingSelection([0, 0, 1]),
  );
  const edited = sculptGeometry(g, inflateVertices(selection, .15));
  const p = edited.getAttribute('position');
  let moved = 0, unchanged = 0;
  for (let i = 0; i < p.count; i++) {
    const delta = Math.hypot(p.getX(i) - before[i*3], p.getY(i) - before[i*3+1], p.getZ(i) - before[i*3+2]);
    if (delta > 1e-6) moved++; else unchanged++;
  }
  assert.ok(moved > 0);
  assert.ok(unchanged > moved, 'compact selection keeps most of the sphere bit-identical');
});

test('smooth preserves open boundaries when requested and moves selected interior vertices', () => {
  const g = grid();
  const p = g.getAttribute('position');
  p.setZ(12, .8); p.needsUpdate = true; g.computeVertexNormals();
  const before = Array.from(p.array);
  const all = new Float32Array(p.count).fill(1);
  const edited = sculptGeometry(g, smoothVertices(all, { strength: .5, iterations: 1, preserveBoundary: true }));
  const q = edited.getAttribute('position');
  for (const index of [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24]) {
    near(q.getX(index), before[index*3]); near(q.getY(index), before[index*3+1]); near(q.getZ(index), before[index*3+2]);
  }
  assert.ok(q.getZ(12) < .8);
});

test('geometry sculpt refuses rig and morph ownership it cannot safely rewrite', () => {
  const g = grid();
  const count = g.getAttribute('position').count;
  const all = new Float32Array(count).fill(1);
  const skinned = g.clone();
  skinned.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  skinned.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(count * 4), 4));
  assert.throws(() => sculptGeometry(skinned, pullVertices(all, [0, 0, .1])), /pre-rig/);
  const morphed = g.clone();
  morphed.morphAttributes.position = [g.getAttribute('position').clone()];
  assert.throws(() => sculptGeometry(morphed, pullVertices(all, [0, 0, .1])), /morph targets/);
});
