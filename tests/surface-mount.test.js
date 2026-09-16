import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';
import {
  surfaceMount, resolveSurfaceMount, attachSurfaceMount,
  surfaceAnchor, bindSurfaceAnchor, resolveSurfaceAnchor, attachSurfaceAnchor,
  remapSurfaceAnchor, surfaceTopologySignature,
} from '../src/lib/surface-mount.js';

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


test('surface anchor binds a JSON-safe barycentric spot and reproduces its bind pose', () => {
  const g = quad(0, .2);
  const mount = surfaceMount({near:[.17,.11,.4], tangentHint:[1,.2,0], offset:.025, local:{position:[.01,-.02,.005],rotation:[3,-7,18],scale:.9}});
  const nearest = resolveSurfaceMount(g, mount);
  const anchor = bindSurfaceAnchor(g, mount);
  assert.deepEqual(JSON.parse(JSON.stringify(anchor)), anchor);
  const resolved = resolveSurfaceAnchor(g, anchor);
  assert.equal(resolved.hit.triangleIndex, nearest.hit.triangleIndex);
  assert.deepEqual(resolved.hit.indices, nearest.hit.indices);
  close(resolved.hit.barycoord.x + resolved.hit.barycoord.y + resolved.hit.barycoord.z, 1);
  assert.ok(resolved.position.distanceTo(nearest.position) < 1e-8);
  assert.ok(resolved.quaternion.angleTo(nearest.quaternion) < 1e-8);
  assert.equal(resolved.diagnostics.binding, 'barycentric-anchor');
});

test('persistent anchor follows the exact same triangle and barycentric point through support edits', () => {
  const base = quad(0, 0);
  const anchor = bindSurfaceAnchor(base, {near:[.23,.14,.3], tangentHint:[1,0,0], offset:.01});
  const edited = quad(.03, .6);
  const p = edited.getAttribute('position');
  // Same indexed topology, but a local vertex edit strongly changes the bound triangle.
  const moved = anchor.indices[1];
  p.setXYZ(moved, p.getX(moved)+.18, p.getY(moved)-.08, p.getZ(moved)+.16);
  p.needsUpdate=true; edited.computeVertexNormals();
  const pose = resolveSurfaceAnchor(edited, anchor);
  const expected = new THREE.Vector3();
  anchor.indices.forEach((i, corner) => expected.addScaledVector(new THREE.Vector3().fromBufferAttribute(p,i), anchor.barycoord[corner]));
  assert.ok(pose.frame.origin.distanceTo(expected) < 1e-7);
  assert.equal(pose.hit.triangleIndex, anchor.triangleIndex);
  assert.deepEqual(pose.hit.indices, anchor.indices);
});

test('persistent anchor does not jump when a nearer admissible triangle appears', () => {
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.Float32BufferAttribute([
    -.4,-.3,0, .4,-.3,0, 0,.4,0,
    -.4,-.3,.35, .4,-.3,.35, 0,.4,.35,
  ],3));
  base.setIndex([0,1,2,3,4,5]); base.computeVertexNormals();
  const anchor = bindSurfaceAnchor(base,{near:[.12,.08,.04],tangentHint:[1,0,0]});
  assert.equal(anchor.triangleIndex,0);
  const edited = base.clone();
  const p = edited.getAttribute('position');
  for (const i of [0,1,2]) p.setZ(i,.26);
  for (const i of [3,4,5]) p.setZ(i,.01);
  p.needsUpdate=true; edited.computeVertexNormals();
  const persistent = resolveSurfaceAnchor(edited, anchor);
  const nearest = resolveSurfaceMount(edited,{near:[.12,.08,.02],tangentHint:[1,0,0]});
  assert.equal(persistent.hit.triangleIndex,0);
  assert.equal(nearest.hit.triangleIndex,1);
  assert.ok(persistent.position.distanceTo(nearest.position) > .2);
});

test('surface anchor transports its tangent affinely with the bound triangle', () => {
  const base=quad();
  const anchor=bindSurfaceAnchor(base,{near:[.2,.12,.1],tangentHint:[1,.25,0]});
  const edited=base.clone(), p=edited.getAttribute('position');
  for(let i=0;i<p.count;i++) p.setXYZ(i,p.getX(i)+.28*p.getY(i),p.getY(i),p.getZ(i)+.4*p.getX(i));
  p.needsUpdate=true; edited.computeVertexNormals();
  const pose=resolveSurfaceAnchor(edited,anchor);
  close(pose.frame.tangent.length(),1); close(pose.frame.tangent.dot(pose.frame.normal),0);
  assert.ok(Math.abs(pose.frame.tangent.z)>.1);
});

test('surface anchor rejects topology changes and invalid serialized anchors instead of guessing', () => {
  const g=quad(), anchor=bindSurfaceAnchor(g,{near:[.2,.1,.1]});
  assert.equal(anchor.topologySignature, surfaceTopologySignature(g));
  const reordered=g.clone();
  const idx=[...reordered.index.array]; [idx[0],idx[1]]=[idx[1],idx[0]]; reordered.setIndex(idx);
  assert.throws(()=>resolveSurfaceAnchor(reordered,anchor),/topology changed.*remap or rebind explicitly/);
  const expanded=g.clone(); expanded.setIndex([...g.index.array,0,1,2]);
  assert.throws(()=>resolveSurfaceAnchor(expanded,anchor),/topology signature differs/);
  assert.throws(()=>surfaceAnchor({...anchor,barycoord:[.8,.8,-.6]}),/barycoord/);
  assert.throws(()=>surfaceAnchor({...anchor,tangentWeights:[1,1,1]}),/summing to zero/);
});

test('generic anchor remap preserves corner-owned barycentric and tangent data through winding changes',()=>{
  const source=quad(), anchor=bindSurfaceAnchor(source,{near:[.21,.06,.2],tangentHint:[1,.2,0]});
  const target=source.clone();
  const shifted=[];
  for(let i=0;i<source.getAttribute('position').count;i++){
    const p=new THREE.Vector3().fromBufferAttribute(source.getAttribute('position'),i);
    shifted.push(p.x,p.y,p.z+.2);
  }
  target.setAttribute('position',new THREE.Float32BufferAttribute(shifted,3));
  target.setIndex([0,2,1,0,3,2]); target.computeVertexNormals();
  const targetTriangle=anchor.triangleIndex;
  const remapped=remapSurfaceAnchor(anchor,target,{triangleIndex:targetTriangle,cornerMap:[0,2,1]});
  assert.deepEqual(remapped.barycoord,[anchor.barycoord[0],anchor.barycoord[2],anchor.barycoord[1]]);
  assert.deepEqual(remapped.tangentWeights,[anchor.tangentWeights[0],anchor.tangentWeights[2],anchor.tangentWeights[1]]);
  assert.equal(remapped.topologySignature,surfaceTopologySignature(target));
  const pose=resolveSurfaceAnchor(target,remapped);
  assert.ok(Math.abs(pose.frame.origin.z-.2)<1e-7);
});

test('attachSurfaceAnchor applies the persistent pose without mutating support', () => {
  const base=quad(), anchor=bindSurfaceAnchor(base,{near:[-.12,.18,.2],offset:.018,local:{rotation:[0,0,12],scale:.75}});
  const edited=quad(.04,.25), before=[...edited.attributes.position.array];
  const object=new THREE.Group();
  const result=attachSurfaceAnchor(object,edited,anchor);
  assert.equal(result,object); vectorClose(object.scale,[.75,.75,.75]);
  assert.deepEqual([...edited.attributes.position.array],before);
});
