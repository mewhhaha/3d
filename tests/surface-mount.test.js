import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';
import { surfaceMount, resolveSurfaceMount, attachSurfaceMount } from '../src/lib/surface-mount.js';

function quad(z = 0, slope = 0) {
  const g = new THREE.BufferGeometry();
  const pts = [-.5,-.5,z-.5*slope,.5,-.5,z-.5*slope,.5,.5,z+.5*slope,-.5,.5,z+.5*slope];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1], 2));
  g.setIndex([0,1,2,0,2,3]);
  g.computeVertexNormals();
  return g;
}

function close(a, b, eps = 1e-6) { assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`); }
function vectorClose(actual, expected, eps = 1e-6) { expected.forEach((n, i) => close(actual.getComponent(i), n, eps)); }

test('surface mount resolves support-local position, normal alignment and editable local transform', () => {
  const g = quad();
  const spec = surfaceMount({near:[0,0,.2], tangentHint:[1,0,0], offset:.1, local:{position:[.02,.03,0], rotation:[0,0,90]}});
  const pose = resolveSurfaceMount(g, spec);
  vectorClose(pose.position, [.02,.03,.1]);
  vectorClose(pose.frame.normal, [0,0,1]);
  const z = new THREE.Vector3(0,0,1).applyQuaternion(pose.quaternion);
  vectorClose(z, [0,0,1]);
  const x = new THREE.Vector3(1,0,0).applyQuaternion(pose.quaternion);
  vectorClose(x, [0,1,0]);
});

test('same mount data re-evaluates deterministically when support shape changes', () => {
  const flat = quad(0,0), tilted = quad(.02,.35);
  const spec = surfaceMount({near:[.15,.18,.3], tangentHint:[1,0,0], offset:.015});
  const a = resolveSurfaceMount(flat, spec), b = resolveSurfaceMount(tilted, spec);
  assert.ok(b.position.distanceTo(a.position) > .02);
  assert.ok(b.frame.normal.angleTo(a.frame.normal) > .2);
  const again = resolveSurfaceMount(tilted, spec);
  assert.deepEqual(again.matrix.toArray(), b.matrix.toArray());
});

test('named support regions disambiguate layered surfaces', () => {
  const front = quad(.08), back = quad(.01);
  const positions = new Float32Array([...back.attributes.position.array, ...front.attributes.position.array]);
  const normals = new Float32Array([...back.attributes.normal.array, ...front.attributes.normal.array]);
  const uv = new Float32Array([...back.attributes.uv.array, ...front.attributes.uv.array]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions,3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals,3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv,2));
  g.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);
  defineFaceRegions(g, {'support.front':[2,3], 'support.back':[0,1]}, {clone:false});
  const unconstrained = resolveSurfaceMount(g, {near:[0,0,0], tangentHint:[1,0,0]});
  const constrained = resolveSurfaceMount(g, {near:[0,0,0], regionNames:['support.front'], tangentHint:[1,0,0]});
  assert.ok(unconstrained.position.z < .02);
  assert.ok(constrained.position.z > .07);
  assert.deepEqual(constrained.hit.regionNames, ['support.front']);
});

test('smooth mode interpolates vertex normals while face mode stays geometric', () => {
  const g = quad();
  const n = g.getAttribute('normal');
  n.setXYZ(0,0,0,1); n.setXYZ(1,.4,0,.916515); n.setXYZ(2,.4,0,.916515); n.setXYZ(3,0,0,1); n.needsUpdate=true;
  const smooth = resolveSurfaceMount(g,{near:[.25,0,.2],tangentHint:[0,1,0],normalMode:'smooth'});
  const face = resolveSurfaceMount(g,{near:[.25,0,.2],tangentHint:[0,1,0],normalMode:'face'});
  assert.ok(smooth.frame.normal.x > .1);
  close(face.frame.normal.x,0);
  close(face.frame.normal.z,1);
});

test('parallel tangent hints use deterministic triangle-edge fallback', () => {
  const g = quad();
  const spec = {near:[0,0,.1], tangentHint:[0,0,1]};
  const a = resolveSurfaceMount(g,spec), b = resolveSurfaceMount(g,spec);
  assert.deepEqual(a.frame.tangent.toArray(), b.frame.tangent.toArray());
  close(a.frame.tangent.dot(a.frame.normal),0);
  close(a.frame.tangent.length(),1);
});

test('prebuilt spatial index is reusable and object application does not edit support', () => {
  const g = quad(); const before = [...g.attributes.position.array]; const index = triangleSpatialIndex(g);
  const object = new THREE.Group();
  const spec = surfaceMount({near:[0,0,.2], tangentHint:[1,0,0], offset:.02, local:{scale:.8}});
  const result = attachSurfaceMount(object,g,spec,{index});
  assert.equal(result,object); vectorClose(object.position,[0,0,.02]); vectorClose(object.scale,[.8,.8,.8]);
  assert.deepEqual([...g.attributes.position.array],before);
  assert.equal(index.diagnostics().queries,1);
});

test('surface mount validates ambiguous input and max distance failures', () => {
  const serial = surfaceMount({near:[0,0,0]});
  assert.deepEqual(JSON.parse(JSON.stringify(serial)), serial);
  assert.throws(()=>surfaceMount({near:[0,0,0],tangentHint:[0,0,0]}),/cannot be zero/);
  assert.throws(()=>surfaceMount({near:[0,0,0],minNormalDot:.1}),/needs queryNormal/);
  assert.throws(()=>resolveSurfaceMount(quad(),{near:[0,0,2],maxDistance:.01}),/no matching/);
  const other=quad(.2), index=triangleSpatialIndex(other);
  assert.throws(()=>resolveSurfaceMount(quad(),{near:[0,0,0]},{index}),/different geometry/);
});
