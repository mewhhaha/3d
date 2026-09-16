import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions, faceRegionNames, faceRegionTriangles, faceRegionVertexMask, faceRegionMembership } from '../src/lib/face-regions.js';

function strip() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    -1,-1,0, 0,-1,0, 1,-1,0,
    -1, 1,0, 0, 1,0, 1, 1,0,
  ], 3));
  g.setIndex([0,1,4, 0,4,3, 1,2,5, 1,5,4]);
  return g;
}

test('named face regions resolve predicates once and survive BufferGeometry cloning', () => {
  const source = strip();
  const tagged = defineFaceRegions(source, {
    'panel.left': ({ centroid }) => centroid.x < 0,
    'panel.upper': ({ centroid }) => centroid.y > 0,
    'panel.middle': [0, 3],
  });
  assert.notEqual(tagged, source);
  assert.deepEqual(faceRegionNames(source), []);
  assert.deepEqual(faceRegionNames(tagged), ['panel.left', 'panel.middle', 'panel.upper']);
  assert.deepEqual(faceRegionTriangles(tagged, 'panel.left'), [0, 1]);
  assert.deepEqual(faceRegionTriangles(tagged, ['panel.left', 'panel.upper'], { match: 'all' }), [1]);
  assert.deepEqual(faceRegionTriangles(tagged.clone(), 'panel.middle'), [0, 3]);
  assert.deepEqual(faceRegionMembership(tagged).map(names => names.join('|')), [
    'panel.left|panel.middle', 'panel.left|panel.upper', '', 'panel.middle|panel.upper',
  ]);
});

test('face region vertex masks expose soft boundary ownership without changing topology', () => {
  const tagged = defineFaceRegions(strip(), { left: [0,1] });
  const mask = faceRegionVertexMask(tagged, 'left');
  assert.equal(mask.length, tagged.getAttribute('position').count);
  assert.equal(mask[0], 1);
  assert.equal(mask[3], 1);
  assert.equal(mask[2], 0);
  assert.equal(mask[5], 0);
  assert.ok(mask[1] > 0 && mask[1] < 1, 'shared boundary vertex receives fractional incident-face ownership');
  assert.ok(mask[4] > 0 && mask[4] < 1);
});

test('named region metadata rejects stale topology instead of silently retargeting face IDs', () => {
  const tagged = defineFaceRegions(strip(), { left: [0,1] });
  tagged.setIndex([0,1,4]);
  assert.throws(() => faceRegionNames(tagged), /stale or invalid/);
});

test('region names are explicit construction identifiers, not arbitrary object keys', () => {
  assert.throws(() => defineFaceRegions(strip(), { 'bad name': [0] }), /face region name/);
  assert.throws(() => defineFaceRegions(strip(), { empty: [] }), /non-empty triangle list/);
});

import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';
import { transferSurfaceAttributes } from '../src/lib/attribute-transfer.js';

test('spatial queries target named face regions independently from material group numbering', () => {
  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1,-1,.14, 1,-1,.14, 1,1,.14, -1,1,.14,
    -1,-1,.03, 1,-1,.03, 1,1,.03, -1,1,.03,
  ], 3));
  geometry.setIndex([0,1,2, 0,2,3, 4,5,6, 4,6,7]);
  geometry.addGroup(0,3,5); geometry.addGroup(3,9,2);
  geometry = defineFaceRegions(geometry, {
    'shell.front': ({ centroid }) => centroid.z > .1,
    'shell.back': ({ centroid }) => centroid.z < .1,
  }, { clone: false });
  const index = triangleSpatialIndex(geometry, { leafSize: 2 });
  const point = new THREE.Vector3(0,0,0);
  assert.ok(index.closestPoint(point).point.z < .05, 'unfiltered nearest surface is the backing sheet');
  const front = index.closestPoint(point, { regionNames: ['shell.front'] });
  assert.ok(front.point.z > .13);
  assert.deepEqual(front.regionNames, ['shell.front']);
  assert.throws(() => index.closestPoint(point, { regionNames: ['shell.missing'] }), /unknown face region/);
});

test('attribute transfer targets named regions identically through brute-force and BVH paths',()=>{
  let source=new THREE.BufferGeometry();
  source.setAttribute('position',new THREE.Float32BufferAttribute([
    -1,-1,.12,1,-1,.12,1,1,.12,-1,1,.12,
    -1,-1,.03,1,-1,.03,1,1,.03,-1,1,.03,
  ],3));
  source.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);
  source.setAttribute('field',new THREE.Float32BufferAttribute([2,2,2,2,-3,-3,-3,-3],1));
  source=defineFaceRegions(source,{
    'paint.outer':({centroid})=>centroid.z>.1,
    'paint.inner':({centroid})=>centroid.z<.1,
  },{clone:false});
  const target=new THREE.BufferGeometry();
  target.setAttribute('position',new THREE.Float32BufferAttribute([-.4,-.3,0,.4,-.3,0,0,.4,0],3));
  target.setIndex([0,1,2]);
  const nearest=transferSurfaceAttributes(source,target,{attributes:['field'],acceleration:'brute-force'});
  const brute=transferSurfaceAttributes(source,target,{attributes:['field'],sourceRegions:['paint.outer'],acceleration:'brute-force'});
  const bvh=transferSurfaceAttributes(source,target,{attributes:['field'],sourceRegions:['paint.outer'],acceleration:'bvh'});
  assert.ok([...nearest.getAttribute('field').array].every(v=>v<0));
  assert.ok([...brute.getAttribute('field').array].every(v=>v>0));
  assert.deepEqual(Array.from(bvh.getAttribute('field').array),Array.from(brute.getAttribute('field').array));
  assert.deepEqual(bvh.userData.attributeTransfer.sourceRegions,['paint.outer']);
  assert.equal(bvh.userData.attributeTransfer.sourceRegionMatch,'any');
});
