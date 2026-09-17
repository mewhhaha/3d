import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { projectFaceRegionUVs } from '../src/lib/uv-charts.js';
import { packUvCharts } from '../src/lib/uv-atlas.js';
import { chartScalarTexture, packMetallicRoughness } from '../src/lib/chart-pbr.js';

function charted() {
  const source = new THREE.PlaneGeometry(2, 1, 4, 2);
  const tagged = defineFaceRegions(source, {
    left: ({ centroid }) => centroid.x < 0,
    right: ({ centroid }) => centroid.x >= 0,
  }, { clone: false });
  const projected = projectFaceRegionUVs(tagged, [
    { region: 'left', frame: { uAxis: [1, 0, 0], vAxis: [0, 1, 0] }, atlas: [.05, .08, .62, .46], padding: .02 },
    { region: 'right', frame: { uAxis: [0, 1, 0], vAxis: [-1, 0, 0] }, atlas: [.28, .36, .88, .82], padding: .02 },
  ]);
  const packed = packUvCharts(projected, { margin: .04, rotate: true, density: 'equalize' });
  source.dispose(); projected.dispose();
  return packed;
}

function sample(texture, u, v) {
  const { data, width, height } = texture.image;
  const x = Math.max(0, Math.min(width - 1, Math.floor(u * width)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(v * height)));
  return [...data.slice((y * width + x) * 4, (y * width + x) * 4 + 4)];
}

function atlasCenter(chart, local = [.5, .5]) {
  let [p, q] = local;
  const rotation = ((chart.packedRotation ?? 0) % 360 + 360) % 360;
  if (rotation === 90) [p, q] = [q, 1 - p];
  else if (rotation === 180) [p, q] = [1 - p, 1 - q];
  else if (rotation === 270) [p, q] = [1 - q, p];
  const [u0, v0, u1, v1] = chart.atlas;
  return [u0 + p * (u1 - u0), v0 + q * (v1 - v0)];
}

test('chart scalar textures author linear 0..1 fields in semantic chart space', () => {
  const geometry = charted();
  const texture = chartScalarTexture(geometry, {
    size: 64,
    background: .8,
    layers: [
      { chart: 'left', shape: 'fill', value: .25 },
      { chart: 'right', shape: 'ellipse', center: [.5, .5], radius: [.28, .28], value: .1 },
    ],
  });
  assert.equal(texture.colorSpace, THREE.NoColorSpace);
  assert.equal(texture.flipY, false);
  const [left, right] = geometry.userData.uvCharts.charts;
  assert.ok(Math.abs(sample(texture, ...atlasCenter(left))[1] / 255 - .25) < .02);
  assert.ok(Math.abs(sample(texture, ...atlasCenter(right))[1] / 255 - .1) < .02);
  assert.ok(Math.abs(sample(texture, ...atlasCenter(right, [.08, .08]))[1] / 255 - .8) < .02);
  geometry.dispose(); texture.dispose();
});

test('metallic-roughness packing writes roughness to G and metalness to B without mutating sources', () => {
  const geometry = charted();
  const roughness = chartScalarTexture(geometry, { size: 32, background: .7, layers: [{ chart: 'left', value: .2 }] });
  const metalness = chartScalarTexture(geometry, { size: 32, background: 0, layers: [{ chart: 'left', value: .9 }] });
  const packed = packMetallicRoughness(roughness, metalness);
  const chart = geometry.userData.uvCharts.charts[0], uv = atlasCenter(chart);
  const rgba = sample(packed, ...uv);
  assert.equal(rgba[0], 255);
  assert.ok(Math.abs(rgba[1] / 255 - .2) < .02);
  assert.ok(Math.abs(rgba[2] / 255 - .9) < .02);
  assert.equal(rgba[3], 255);
  const before = rgba.slice(); roughness.image.data.fill(0); metalness.image.data.fill(0);
  assert.deepEqual(sample(packed, ...uv), before);
  assert.equal(packed.userData.chartPbr.encoding, 'gltf-metallic-roughness');
  geometry.dispose(); roughness.dispose(); metalness.dispose(); packed.dispose();
});

test('scalar and pack helpers reject invalid values and incompatible textures', () => {
  const geometry = charted();
  assert.throws(() => chartScalarTexture(geometry, { background: -1, layers: [{ chart: 0 }] }), /0 through 1/);
  assert.throws(() => chartScalarTexture(geometry, { layers: [{ chart: 0, value: 2 }] }), /0 through 1/);
  assert.throws(() => chartScalarTexture(geometry, { layers: [{ chart: 0, color: '#ffffff' }] }), /uses value, not color/);
  const a = chartScalarTexture(geometry, { size: 32, layers: [{ chart: 0, value: .5 }] });
  const b = chartScalarTexture(geometry, { size: 64, layers: [{ chart: 0, value: .5 }] });
  assert.throws(() => packMetallicRoughness(a, b), /matching dimensions/);
  b.dispose();
  const bad = a.clone(); bad.colorSpace = THREE.SRGBColorSpace;
  assert.throws(() => packMetallicRoughness(a, bad), /linear non-color/);
  bad.colorSpace = THREE.NoColorSpace; bad.offset.set(.1, 0);
  assert.throws(() => packMetallicRoughness(a, bad), /matching UV transform/);
  geometry.dispose(); a.dispose(); bad.dispose();
});
