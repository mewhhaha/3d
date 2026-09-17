import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import { projectFaceRegionUVs, remapUvChartAnchor } from '../src/lib/uv-charts.js';
import { bindSurfaceAnchor, resolveSurfaceAnchor } from '../src/lib/surface-mount.js';

function panel() {
  const geometry = new THREE.PlaneGeometry(1, 1, 4, 4);
  const tag = new Float32Array(geometry.attributes.position.count);
  for (let i = 0; i < tag.length; i++) tag[i] = i + .25;
  geometry.setAttribute('authorTag', new THREE.BufferAttribute(tag, 1));
  return defineFaceRegions(geometry, {
    'panel.decal': ({ centroid }) => Math.abs(centroid.x) < .27 && Math.abs(centroid.y) < .27,
    'panel.left': ({ centroid }) => centroid.x < -.25,
  }, { clone: false });
}

function faceCornerPositions(geometry) {
  const p = geometry.attributes.position;
  return Array.from({ length: geometry.index.count }, (_, offset) => {
    const v = geometry.index.getX(offset);
    return [p.getX(v), p.getY(v), p.getZ(v)];
  });
}

test('semantic planar charts split only UV seams while preserving face order, attributes and regions', () => {
  const source = panel();
  const sourceCorners = faceCornerPositions(source);
  const output = projectFaceRegionUVs(source, [{
    region: 'panel.decal', frame: { uAxis: [1, 0, 0], vAxis: [0, 1, 0] }, atlas: [.05, .05, .45, .45], padding: .05,
  }]);
  assert.deepEqual(faceCornerPositions(output), sourceCorners);
  assert.equal(output.index.count, source.index.count);
  assert.ok(output.attributes.position.count > source.attributes.position.count, 'chart boundary should duplicate shared vertices');
  assert.equal(output.attributes.authorTag.count, output.attributes.position.count);
  assert.deepEqual(faceRegionTriangles(output, 'panel.decal'), faceRegionTriangles(source, 'panel.decal'));
  for (let target = 0; target < output.attributes.position.count; target++) {
    const sourceVertex = output.userData.uvCharts.sourceVertices[target];
    assert.equal(output.attributes.authorTag.getX(target), source.attributes.authorTag.getX(sourceVertex));
  }
  assert.ok([...output.attributes.uv.array].every(Number.isFinite));
  source.dispose(); output.dispose();
});

test('surface anchors remap exactly through UV seam vertex duplication', () => {
  const source = panel();
  const anchor = bindSurfaceAnchor(source, { near: [.1, .1, .15], tangentHint: [1, 0, 0] });
  const before = resolveSurfaceAnchor(source, anchor);
  const output = projectFaceRegionUVs(source, [{ region: 'panel.decal', atlas: [.5, .5, .95, .95] }]);
  assert.throws(() => resolveSurfaceAnchor(output, anchor), /topology changed/);
  const remapped = remapUvChartAnchor(output, anchor);
  const after = resolveSurfaceAnchor(output, remapped);
  assert.ok(before.frame.origin.distanceTo(after.frame.origin) < 1e-8);
  assert.ok(before.frame.normal.distanceTo(after.frame.normal) < 1e-8);
  source.dispose(); output.dispose();
});

test('full chart coverage can author UVs from scratch and tangent ownership is rebuilt', () => {
  const source = new THREE.PlaneGeometry(1, 1, 2, 2);
  source.deleteAttribute('uv');
  defineFaceRegions(source, { 'panel.all': Array.from({ length: source.index.count / 3 }, (_, i) => i) }, { clone: false });
  const output = projectFaceRegionUVs(source, [{ region: 'panel.all', atlas: [0, 0, 1, 1] }], { preserveUnassigned: false });
  assert.equal(output.attributes.uv.count, output.attributes.position.count);
  assert.ok([...output.attributes.uv.array].every(value => value >= 0 && value <= 1));
  source.dispose(); output.dispose();
});

test('overlapping charts, partial no-UV coverage, morph ownership and degenerate frames fail explicitly', () => {
  const source = panel();
  assert.throws(() => projectFaceRegionUVs(source, [{ region: 'panel.decal' }, { region: 'panel.decal' }]), /overlap/);
  assert.throws(() => projectFaceRegionUVs(source, [{ region: 'panel.decal', frame: { uAxis: [1,0,0], vAxis: [2,0,0] } }]), /parallel/);
  const noUv = panel(); noUv.deleteAttribute('uv');
  assert.throws(() => projectFaceRegionUVs(noUv, [{ region: 'panel.decal' }]), /unassigned faces need source UVs/);
  const morph = panel(); morph.morphAttributes.position = [morph.attributes.position.clone()];
  assert.throws(() => projectFaceRegionUVs(morph, [{ region: 'panel.decal' }]), /morph-target transfer/);
  source.dispose(); noUv.dispose(); morph.dispose();
});
