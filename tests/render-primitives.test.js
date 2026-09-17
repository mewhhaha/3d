import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { assignFaceMaterials } from '../src/lib/material-regions.js';
import { group, inspect, material, mesh } from '../src/lib/modeling.js';

function fixture() {
  const source = defineFaceRegions(new THREE.PlaneGeometry(1, 1, 4, 4), {
    'panel.left': ({ centroid }) => centroid.x < -.05,
    'panel.right': ({ centroid }) => centroid.x > .05,
  }, { clone: false });
  const geometry = assignFaceMaterials(source, { 'panel.left': 1, 'panel.right': 2 }, { defaultMaterial: 0 });
  const materials = [material('#777777'), material('#bb6633'), material('#3388bb')];
  return { source, geometry, materials, root: group('Primitive fixture', [mesh(geometry, { material: materials, name: 'Grouped surface' })]) };
}

function disposeFixture({ root, source }) {
  root.traverse(node => { if (node.geometry) node.geometry.dispose(); for (const item of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) item.dispose(); });
  source.dispose();
}

test('inspect separates logical meshes from material-partitioned render primitives', () => {
  const asset = fixture();
  try {
    const stats = inspect(asset.root);
    assert.equal(stats.meshes, 1);
    assert.equal(stats.primitives, asset.geometry.groups.length);
    assert.ok(stats.primitives > stats.meshes);
  } finally { disposeFixture(asset); }
});

test('inspect rejects malformed multi-material group ownership before export', () => {
  const asset = fixture();
  try {
    asset.geometry.clearGroups();
    assert.throws(() => inspect(asset.root), /no geometry groups/);
    asset.geometry.addGroup(0, asset.geometry.index.count, 99);
    assert.throws(() => inspect(asset.root), /Invalid material group/);
  } finally { disposeFixture(asset); }
});

test('GLB reload may expand Mesh objects while preserving render primitives', async () => {
  const asset = fixture();
  const before = inspect(asset.root);
  const previous = globalThis.FileReader;
  globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }).catch(error => this.onerror?.(error)); } };
  let imported;
  try {
    const glb = await new GLTFExporter().parseAsync(asset.root, { binary: true });
    imported = (await new GLTFLoader().parseAsync(glb, '')).scene;
    const after = inspect(imported);
    assert.notEqual(after.meshes, before.meshes, 'regression must exercise loader primitive expansion');
    assert.equal(after.primitives, before.primitives);
    assert.equal(after.triangles, before.triangles);
    assert.deepEqual(after.dimensions, before.dimensions);
  } finally {
    globalThis.FileReader = previous;
    if (imported) imported.traverse(node => { if (node.geometry) node.geometry.dispose(); for (const item of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) item.dispose(); });
    disposeFixture(asset);
  }
});
