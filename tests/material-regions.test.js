import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import { assignFaceMaterials, faceMaterialIndices } from '../src/lib/material-regions.js';
import { bindSurfaceAnchor, resolveSurfaceAnchor, surfaceTopologySignature } from '../src/lib/surface-mount.js';
import { mesh, material } from '../src/lib/modeling.js';

function grid() {
  const geometry = new THREE.PlaneGeometry(1, 1, 2, 2);
  return defineFaceRegions(geometry, {
    'panel.left': ({ centroid }) => centroid.x < -.26,
    'panel.center': ({ centroid }) => Math.abs(centroid.x) < .20,
    'panel.top': ({ centroid }) => centroid.y > .05,
  }, { clone: false });
}

function snapshot(geometry) {
  return {
    position: [...geometry.attributes.position.array],
    index: [...geometry.index.array],
    groups: geometry.groups.map(group => ({ ...group })),
  };
}

test('semantic face regions become complete material groups without changing topology or anchors', () => {
  const source = grid();
  const before = snapshot(source);
  const topology = surfaceTopologySignature(source);
  const anchor = bindSurfaceAnchor(source, { near: [.45, -.25, .2], tangentHint: [1, 0, 0] });
  const output = assignFaceMaterials(source, { 'panel.left': 1, 'panel.center': 2 }, { defaultMaterial: 0 });
  assert.deepEqual(snapshot(source), before);
  assert.deepEqual([...output.index.array], before.index);
  assert.deepEqual([...output.attributes.position.array], before.position);
  assert.equal(surfaceTopologySignature(output), topology);
  assert.deepEqual(faceRegionTriangles(output, 'panel.center'), faceRegionTriangles(source, 'panel.center'));
  assert.ok(resolveSurfaceAnchor(output, anchor).frame.origin.distanceTo(resolveSurfaceAnchor(source, anchor).frame.origin) < 1e-8);
  const slots = faceMaterialIndices(output);
  assert.equal(slots.length, output.index.count / 3);
  assert.ok([...slots].includes(0));
  assert.ok([...slots].includes(1));
  assert.ok([...slots].includes(2));
  assert.equal(output.groups.reduce((sum, group) => sum + group.count, 0), output.index.count);
  source.dispose(); output.dispose();
});

test('existing source groups remain the default while semantic regions override selected faces', () => {
  const source = grid();
  source.clearGroups();
  source.addGroup(0, 12, 4);
  source.addGroup(12, source.index.count - 12, 5);
  const output = assignFaceMaterials(source, { 'panel.left': 9 });
  const left = new Set(faceRegionTriangles(source, 'panel.left'));
  const before = faceMaterialIndices(source);
  const after = faceMaterialIndices(output);
  for (let face = 0; face < after.length; face++) {
    assert.equal(after[face], left.has(face) ? 9 : before[face]);
  }
  source.dispose(); output.dispose();
});

test('ambiguous semantic overlaps and malformed existing groups fail explicitly', () => {
  const source = grid();
  assert.throws(() => assignFaceMaterials(source, { 'panel.center': 1, 'panel.top': 2 }, { defaultMaterial: 0 }), /conflict/);
  const uncovered = grid(); uncovered.clearGroups(); uncovered.addGroup(0, 3, 0);
  assert.throws(() => faceMaterialIndices(uncovered), /without a material/);
  const overlap = grid(); overlap.clearGroups(); overlap.addGroup(0, 6, 0); overlap.addGroup(3, overlap.index.count - 3, 1);
  assert.throws(() => faceMaterialIndices(overlap), /overlap/);
  source.dispose(); uncovered.dispose(); overlap.dispose();
});

test('same-slot semantic overlaps are accepted and modeling mesh accepts material arrays', () => {
  const source = grid();
  const output = assignFaceMaterials(source, { 'panel.center': 1, 'panel.top': 1 }, { defaultMaterial: 0 });
  assert.ok([...faceMaterialIndices(output)].includes(1));
  const materials = [material('#888888'), material('#dd8844')];
  const object = mesh(output, { material: materials, name: 'Region material mesh' });
  assert.ok(Array.isArray(object.material));
  assert.equal(object.material.length, 2);
  assert.throws(() => mesh(source.clone(), { material: [] }), /must not be empty/);
  materials.forEach(item => item.dispose()); source.dispose(); output.dispose();
});
