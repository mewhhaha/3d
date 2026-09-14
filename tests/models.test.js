import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { modelFiles, project } from '../scripts/build.mjs';
import { defineModel, parametersFor, buildModel, inspect, dispose, box, cylinder, sphere, torus, lathe, extrude, tube, group, repeat } from '../src/lib/modeling.js';
import { startServer } from '../scripts/server.mjs';

const files = await modelFiles();
test('gallery has model recipes', () => assert.ok(files.length > 0));
for (const file of files) {
  const { default: model } = await import(pathToFileURL(path.join(project, 'models', file)));
  test(`${model.id}: metadata, default mesh, deterministic bounds, parameter limits`, () => {
    assert.equal(model.id, file.slice(0, -3), 'id must match filename');
    defineModel(model);
    const first = buildModel(model), second = buildModel(model);
    const stats = inspect(first);
    assert.deepEqual(stats, inspect(second));
    assert.ok(stats.triangles < 1000000, 'Keep the default preview under one million triangles');
    assert.equal(first.userData.units, 'meters');
    dispose(first); dispose(second);
    for (const [name, spec] of Object.entries(model.parameters)) {
      const values = spec.type === 'number' ? [spec.min, spec.max]
        : spec.type === 'boolean' ? [true, false]
        : spec.type === 'color' ? ['#000000', '#ffffff'] : spec.options;
      for (const value of values) {
        const root = buildModel(model, { [name]: value });
        assert.ok(inspect(root).triangles > 0); dispose(root);
      }
    }
  });
}
test('parameter inputs are normalized without unknown properties', () => {
  const model = defineModel({ id: 'test', title: 'Test', build: () => box(), parameters: {
    size: { type: 'number', min: 1, max: 3, step: 0.5, default: 2 },
    color: { type: 'color', default: '#ffffff' },
    on: { type: 'boolean', default: true },
    style: { type: 'select', options: ['a', 'b'], default: 'a' },
  } });
  assert.deepEqual(parametersFor(model, { size: 100, color: 'javascript:bad', on: 'false', style: 'missing', unknown: 1 }), { size: 3, color: '#ffffff', on: false, style: 'a' });
  assert.equal(parametersFor(model, { size: 'NaN' }).size, 2);
  assert.equal(parametersFor(model, { size: 1.7 }).size, 1.5);
});
test('modeling helpers produce valid mesh geometry', () => {
  const root = group('Helpers', [
    box(), box({ radius: 0.1 }), cylinder(), cylinder({ top: 0 }), sphere(), torus(),
    lathe({ points: [[0, 0], [1, 0], [0.8, 1], [0, 1]] }),
    extrude({ points: [[-1, -1], [1, -1], [1, 1], [-1, 1]], holes: [[[-0.2, -0.2], [-0.2, 0.2], [0.2, 0.2], [0.2, -0.2]]] }),
    tube({ points: [[0, 0, 0], [1, 1, 0], [2, 1, 1]] }),
    repeat(2, i => box({ name: `Repeat ${i}`, position: [i, 0, 0] })),
  ]);
  assert.equal(inspect(root).meshes, 11); dispose(root);
  assert.throws(() => box({ size: [0, 1, 1] }));
  assert.throws(() => box({ scale: -1 }));
  assert.throws(() => cylinder({ segments: 2 }));
  assert.throws(() => repeat(-1, () => box()));
  assert.throws(() => defineModel({ id: '../oops', title: 'bad', build() {} }));
});
test('static server supports a Pages subpath and rejects invalid requests', async () => {
  const { server, url } = await startServer({ root: project, base: '/3d/' });
  try {
    assert.equal((await fetch(`${url}index.html`)).status, 200);
    assert.equal((await fetch(new URL('/index.html', url))).status, 404);
    assert.equal((await fetch(`${url}missing`)).status, 404);
    assert.equal((await fetch(`${url}index.html`, { method: 'POST' })).status, 405);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
