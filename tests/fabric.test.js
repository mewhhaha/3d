import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE, inspect, dispose } from '../src/lib/modeling.js';
import { composeCharacter, anatomy, wear, scarf, drapeRibbon, sumFields, foldWaves, fadeEdges } from '../src/lib/characters.js';
import { assetInfo } from '../src/lib/rigging.js';
test('fabric fields compose, taper and reject invalid inputs', () => {
  const a = foldWaves(), b = foldWaves({ count: 9, skew: -1 });
  assert.equal(sumFields(a,b)(.3,.2), a(.3,.2)+b(.3,.2));
  assert.equal(fadeEdges(a)(.4,0),0);assert.equal(fadeEdges(a)(.4,1),0);
  assert.throws(() => foldWaves({ amplitude: Infinity }));
  assert.throws(() => sumFields(3));assert.throws(() => fadeEdges(a,0));
});
test('ribbon makes real displaced geometry with UVs, normals and folded hems', () => {
  const ribbon = drapeRibbon({ path: u => [0,-u,0], across:[1,0,0], width:.1, folds:fadeEdges(foldWaves()), material:new THREE.MeshStandardMaterial(), segments:32 });
  assert.equal(inspect(ribbon).meshes,3);
  ribbon.traverse(m=>{if(m.isMesh){assert.ok(m.geometry.attributes.uv);assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));}});
  assert.ok(inspect(ribbon).dimensions[2]>.004);dispose(ribbon);
});
test('scarf is an optional composable garment with normalized skinning', () => {
  const root=composeCharacter({quality:'draft'},anatomy(),wear(scarf()));
  assert.ok(root.children.some(o=>o.name.startsWith('WovenScarf')));
  assert.equal(assetInfo(root).uvMeshes,assetInfo(root).skinnedMeshes);dispose(root);
});
