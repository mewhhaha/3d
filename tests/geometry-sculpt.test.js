import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import {
  radialSelection, pathSelection, framedSelection, symmetrySelection, facingSelection, faceRegionSelection,
  intersectSelections, unionSelections, invertSelection, selectionWeights,
  pullVertices, inflateVertices, smoothVertices, relaxVertices, sculptGeometry,
} from '../src/lib/geometry-sculpt.js';
import { projectSurfacePath, surfacePathSelection } from '../src/lib/surface-stroke.js';

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


test('pathSelection follows a 3D polyline with interpolated radius and compact falloff', () => {
  const selection = pathSelection({
    points: [[-1, 0, 0], [0, 0, 0], [1, .5, 0]],
    radius: [.1, .2, .4],
    falloff: 'linear',
  });
  const meta = (position) => ({ index: 0, position, normal: [0, 0, 1] });
  assert.equal(selection(meta([-.5, 0, 0])), 1);
  assert.ok(selection(meta([.5, .35, 0])) > 0, 'point near second segment receives influence');
  assert.equal(selection(meta([0, .5, 0])), 0, 'remote point stays exactly zero');
  assert.throws(() => pathSelection({ points: [[0,0,0], [0,0,0]] }), /zero-length/);
});

test('surfacePathSelection follows mesh edge distance instead of bleeding to a nearby disconnected layer', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1,-1,0, 1,-1,0, -1,1,0, 1,1,0,
    -1,-1,-.03, 1,-1,-.03, -1,1,-.03, 1,1,-.03,
  ], 3));
  geometry.setIndex([0,1,2, 2,1,3, 4,6,5, 6,7,5]);
  geometry.computeVertexNormals();
  defineFaceRegions(geometry, {
    'layer.front': ({ centroid }) => centroid.z > -.01,
    'layer.back': ({ centroid }) => centroid.z < -.02,
  }, { clone: false });
  const authored = [[-1, -1, .01], [1, -1, .01]];
  const euclidean = selectionWeights(geometry, pathSelection({ points: authored, radius: .08, falloff: 'constant' }));
  const projected = projectSurfacePath(geometry, {
    points: authored, sampleSpacing: .15, maxDistance: .05, regionNames: 'layer.front',
  });
  const surface = surfacePathSelection(geometry, projected, { radius: .8, falloff: 'constant', regionNames: 'layer.front' });
  assert.ok(projected.samples.length > 4);
  assert.ok([...euclidean.slice(4)].some(weight => weight > 0), 'ordinary 3D path reaches the nearby backing layer');
  assert.ok([...surface.slice(0, 4)].some(weight => weight > 0), 'front layer receives surface influence');
  assert.ok([...surface.slice(4)].every(weight => weight === 0), 'disconnected backing layer receives no geodesic influence');
});

test('projected surface paths retain barycentric support through same-topology form edits', () => {
  const geometry = new THREE.PlaneGeometry(2, 2, 8, 8);
  geometry.computeVertexNormals();
  const projected = projectSurfacePath(geometry, {
    points: [[-.6, 0, .2], [.6, 0, .2]], sampleSpacing: .12, maxDistance: .3,
  });
  const deformed = geometry.clone();
  const p = deformed.getAttribute('position');
  for (let i = 0; i < p.count; i++) p.setZ(i, .25 * Math.cos(p.getX(i) * 1.4) * Math.cos(p.getY(i)));
  p.needsUpdate = true; deformed.computeVertexNormals();
  const weights = surfacePathSelection(deformed, projected, { radius: .3 });
  assert.ok([...weights].filter(weight => weight > 0).length > 8);
  const reordered = deformed.clone();
  const index = reordered.index.array.slice();
  const sampledOffset = projected.samples[0].triangleIndex * 3;
  [index[sampledOffset], index[sampledOffset + 1]] = [index[sampledOffset + 1], index[sampledOffset]];
  reordered.setIndex(new THREE.BufferAttribute(index, 1));
  assert.throws(() => surfacePathSelection(reordered, projected, { radius: .3 }), /topology changed/);
});

test('framedSelection moves reusable path intent without rewriting its points', () => {
  const localPath = pathSelection({ points: [[-.5, 0, 0], [.5, 0, 0]], radius: .08, falloff: 'constant' });
  const placed = framedSelection(localPath, { origin: [.4, -.2, 0], rotation: [0, 0, 90] });
  const meta = (position) => ({ index: 0, position, normal: [0, 0, 1] });
  assert.equal(placed(meta([.4, .15, 0])), 1, 'local X path is rotated onto geometry Y');
  assert.equal(placed(meta([.65, -.2, 0])), 0, 'frame transform is applied before selection evaluation');
});

test('symmetrySelection mirrors one authored stroke across a local plane', () => {
  const oneSide = pathSelection({ points: [[.5, -.6, 0], [.5, .6, 0]], radius: .12, falloff: 'constant' });
  const bilateral = symmetrySelection(oneSide, 'x');
  const meta = (position) => ({ index: 0, position, normal: [0, 0, 1] });
  assert.equal(oneSide(meta([-.5, 0, 0])), 0);
  assert.equal(bilateral(meta([.5, 0, 0])), 1);
  assert.equal(bilateral(meta([-.5, 0, 0])), 1);
  assert.equal(bilateral(meta([0, 0, 0])), 0);
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


test('relaxVertices reduces deterministic surface noise while resisting Laplacian shrinkage', () => {
  const g = new THREE.SphereGeometry(1, 32, 20);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(p, i);
    const direction = point.clone().normalize();
    const noise = .08 * Math.sin(point.x * 13 + point.y * 7) + .05 * Math.cos(point.z * 17 - point.x * 5);
    point.addScaledVector(direction, noise);
    p.setXYZ(i, point.x, point.y, point.z);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  const all = new Float32Array(p.count).fill(1);
  const radii = geometry => {
    const position = geometry.getAttribute('position');
    const values = Array.from({ length: position.count }, (_, i) => Math.hypot(position.getX(i), position.getY(i), position.getZ(i)));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    return { mean, deviation: Math.sqrt(variance) };
  };
  const before = radii(g);
  const smooth = radii(sculptGeometry(g, smoothVertices(all, { strength: .35, iterations: 6 })));
  const relaxed = radii(sculptGeometry(g, relaxVertices(all, { lambda: .5, mu: -.53, iterations: 10 })));
  assert.ok(relaxed.deviation < before.deviation, 'alternating fairing reduces radial noise');
  assert.ok(relaxed.deviation <= smooth.deviation * 1.02, 'relaxation reaches comparable noise reduction to the one-way smooth fixture');
  assert.ok(Math.abs(relaxed.mean - before.mean) < Math.abs(smooth.mean - before.mean) * .15,
    'alternating negative pass retains the original mean radius far better than one-way smoothing');
});

test('relaxVertices preserves requested open boundaries and validates stable filter coefficients', () => {
  const g = grid();
  const p = g.getAttribute('position');
  p.setZ(12, .8); p.needsUpdate = true; g.computeVertexNormals();
  const before = Array.from(p.array);
  const all = new Float32Array(p.count).fill(1);
  const edited = sculptGeometry(g, relaxVertices(all, { lambda: .45, mu: -.5, iterations: 2, preserveBoundary: true }));
  const q = edited.getAttribute('position');
  for (const index of [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24]) {
    near(q.getX(index), before[index*3]); near(q.getY(index), before[index*3+1]); near(q.getZ(index), before[index*3+2]);
  }
  assert.ok(q.getZ(12) < .8);
  assert.throws(() => relaxVertices(all, { lambda: .5, mu: -.4 }), /negative pass magnitude/);
  assert.throws(() => relaxVertices(all, { lambda: 0, mu: -.53 }), /lambda/);
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
