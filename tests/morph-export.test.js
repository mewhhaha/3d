import test from 'node:test';
import assert from 'node:assert/strict';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { THREE, buildModel, dispose } from '../src/lib/modeling.js';
import { morphTarget, clip } from '../src/lib/rigging.js';
import explorer from '../models/rigged-explorer.js';

test('the character uses named morph bindings that survive GLB export', async () => {
  const character = buildModel(explorer, { quality: 'draft' });
  let track;
  character.traverse(n => { for (const c of n.animations) for (const t of c.tracks) if (t.name.includes('morphTargetInfluences')) track = t.clone(); });
  dispose(character);
  assert.ok(track.name.endsWith('[Breath]'), 'GLTFExporter requires the morph name, not a numeric index');
  const scene = new THREE.Scene(), mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  mesh.name = 'ExplorerJacket'; scene.add(mesh);
  morphTarget(mesh, 'Breath', p => new THREE.Vector3(p.x * .02, 0, 0));
  const animation = clip('Morph regression', [track]);
  const previous = globalThis.FileReader;
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }).catch(error => this.onerror?.(error)); }
  };
  try {
    const bytes = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true, trs: true, animations: [animation] }));
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    assert.equal(gltf.animations[0].channels[0].target.path, 'weights');
    assert.deepEqual(gltf.meshes[0].extras.targetNames, ['Breath']);
  } finally { globalThis.FileReader = previous; dispose(scene); }
});
