import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE, buildModel, dispose, inspect } from '../src/lib/modeling.js';
import { skeleton, skin, assetInfo, rotationTrack } from '../src/lib/rigging.js';
import character from '../models/rigged-explorer.js';
import original from '../models/field-explorer.js';

test('rigged explorer preserves the authored textured geometry and actually deforms', () => {
  const root = buildModel(character, { quality: 'draft' }), baseline = buildModel(original, { quality: 'draft' });
  const info = assetInfo(root), a = inspect(root), b = inspect(baseline);
  assert.equal(info.bones, 38); assert.equal(info.skinnedMeshes, a.meshes); assert.equal(info.uvMeshes, a.meshes);
  assert.equal(info.morphTargets, 1); assert.ok(info.textures >= 3);
  assert.deepEqual(info.animations.map(c => c.name), ['Idle', 'Walk', 'Wave', 'Grasp']);
  assert.equal(a.triangles, b.triangles);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(a.dimensions[i] - b.dimensions[i]) < 1e-5);
  const arm = root.getObjectByName('L_ForearmMesh'), before = arm.getVertexPosition(200, new THREE.Vector3()).clone();
  root.getObjectByName('L_UpperArm').rotation.z = .7; root.updateMatrixWorld(true);
  const after = arm.getVertexPosition(200, new THREE.Vector3());
  assert.ok(before.distanceTo(after) > .02, 'Bone rotation must deform vertices');
  dispose(root); dispose(baseline);
});
test('weight validation rejects unknown bones, bad weights and duplicate names', () => {
  const spec = [{ name: 'Root', position: [0, 0, 0] }];
  assert.throws(() => skeleton([...spec, ...spec]));
  const rig = skeleton(spec), g = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial();
  for (const weights of [[['Missing', 1]], [['Root', -1]], [], [['constructor', 1]]]) assert.throws(() => skin(g, material, rig, () => weights));
  assert.throws(() => rotationTrack('Root', [[1, [0, 0, 0]], [0, [0, 0, 0]]]));
  g.dispose(); material.dispose(); rig.skeleton.dispose();
});
test('fine rigged variant supports every vertex and parameter-scaled bind pose', () => {
  for (const height of [1.5, 2]) {
    const root = buildModel(character, { quality: 'fine', height });
    assert.equal(assetInfo(root).bones, 38); assert.ok(Math.abs(inspect(root).dimensions[1] - height) < 1e-5); dispose(root);
  }
});
