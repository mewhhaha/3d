import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { projectFaceRegionUVs } from '../src/lib/uv-charts.js';
import { packUvCharts } from '../src/lib/uv-atlas.js';
import { chartTexture } from '../src/lib/chart-textures.js';

function twoCharts() {
  const source = new THREE.PlaneGeometry(2, 1, 8, 4);
  defineFaceRegions(source, {
    'panel.left': ({ centroid }) => centroid.x < -.2,
    'panel.right': ({ centroid }) => centroid.x > .2,
  }, { clone: false });
  const geometry = projectFaceRegionUVs(source, [
    { region: 'panel.left', atlas: [.05, .08, .46, .48], padding: .02 },
    { region: 'panel.right', atlas: [.54, .52, .95, .92], padding: .02 },
  ]);
  source.dispose();
  return geometry;
}

function pixel(texture, u, v) {
  const { data, width, height } = texture.image;
  const x = Math.max(0, Math.min(width - 1, Math.floor(u * width)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(v * height)));
  const i = (y * width + x) * 4;
  return Array.from(data.slice(i, i + 4));
}

function atlasFromLocal(chart, [a, b]) {
  const rotation = ((chart.packedRotation ?? 0) % 360 + 360) % 360;
  let p = a, q = b;
  if (rotation === 90) [p, q] = [b, 1 - a];
  else if (rotation === 180) [p, q] = [1 - a, 1 - b];
  else if (rotation === 270) [p, q] = [1 - b, a];
  const [u0, v0, u1, v1] = chart.atlas;
  return [u0 + p * (u1 - u0), v0 + q * (v1 - v0)];
}

test('semantic chart textures target named charts without changing geometry', () => {
  const geometry = twoCharts();
  const before = [...geometry.attributes.position.array];
  assert.deepEqual(Object.keys(geometry.userData.faceRegions.regions).sort(), ['panel.left', 'panel.right']);
  const texture = chartTexture(geometry, {
    size: 64,
    background: '#00000000',
    layers: [
      { chart: 'panel.left', shape: 'rect', center: [.5, .5], size: [.5, .35], color: '#ff3020' },
      { chart: 'panel.right', shape: 'ellipse', center: [.5, .5], radius: [.24, .32], color: '#20d080', opacity: .8 },
    ],
  });
  const left = geometry.userData.uvCharts.charts[0], right = geometry.userData.uvCharts.charts[1];
  const a = pixel(texture, ...atlasFromLocal(left, [.5, .5]));
  const b = pixel(texture, ...atlasFromLocal(right, [.5, .5]));
  const empty = pixel(texture, ...atlasFromLocal(left, [.92, .92]));
  assert.ok(a[0] > 240 && a[1] < 80 && a[3] === 255);
  assert.ok(b[1] > 170 && b[0] < 80 && b[3] > 190 && b[3] < 220);
  assert.equal(empty[3], 0);
  assert.deepEqual([...geometry.attributes.position.array], before);
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
  assert.equal(texture.flipY, false);
  assert.equal(texture.generateMipmaps, true);
  assert.deepEqual(texture.userData.chartTexture.layers.map(layer => layer.chartName), ['panel.left', 'panel.right']);
  geometry.dispose(); texture.dispose();
});

test('chart-local marks remain oriented after cardinal atlas packing rotation', () => {
  const source = new THREE.PlaneGeometry(2, .4, 8, 2);
  defineFaceRegions(source, { 'strap.detail': () => true }, { clone: false });
  const projected = projectFaceRegionUVs(source, [{ region: 'strap.detail', atlas: [.05, .05, .95, .30], padding: .02 }]);
  const packed = packUvCharts(projected, { target: [.05, .05, .32, .95], margin: .01, rotate: true });
  const chart = packed.userData.uvCharts.charts[0];
  assert.equal(chart.packedRotation, 90, 'wide chart should rotate inside a tall target');
  const texture = chartTexture(packed, {
    size: 128,
    background: '#000000',
    layers: [{ chart: 'strap.detail', shape: 'line', from: [.12, .5], to: [.88, .5], width: .10, color: '#ffffff' }],
  });
  const onA = pixel(texture, ...atlasFromLocal(chart, [.2, .5]));
  const onB = pixel(texture, ...atlasFromLocal(chart, [.8, .5]));
  const off = pixel(texture, ...atlasFromLocal(chart, [.5, .8]));
  assert.ok(onA[0] > 240 && onB[0] > 240);
  assert.ok(off[0] < 20);
  source.dispose(); projected.dispose(); packed.dispose(); texture.dispose();
});

test('chart textures support linear masks and reject ambiguous or invalid targets', () => {
  const geometry = twoCharts();
  const mask = chartTexture(geometry, {
    size: 32,
    colorSpace: 'linear',
    background: [0, 0, 0, 1],
    layers: [{ chart: 0, shape: 'fill', color: [1, 1, 1, 1], opacity: .5 }],
  });
  assert.equal(mask.colorSpace, THREE.NoColorSpace);
  assert.throws(() => chartTexture(geometry, { size: 30, layers: [{ chart: 0 }] }), /power of two/);
  assert.throws(() => chartTexture(geometry, { layers: [{ chart: 'missing' }] }), /unknown chart/);
  assert.throws(() => chartTexture(geometry, { layers: [{ chart: 0, shape: 'triangle' }] }), /shape/);
  assert.throws(() => chartTexture(new THREE.BoxGeometry(), { layers: [{ chart: 0 }] }), /provenance/);
  geometry.dispose(); mask.dispose();
});
