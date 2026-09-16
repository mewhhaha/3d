import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachToCurve,curveTransforms,offsetCurvePoints,transportedFrames} from '../src/lib/curve-frame.js';

const openCurve=()=>new THREE.CatmullRomCurve3([
 new THREE.Vector3(-.5,0,0),new THREE.Vector3(-.2,.28,.08),new THREE.Vector3(.08,-.12,.16),
 new THREE.Vector3(.34,.22,.05),new THREE.Vector3(.56,.02,-.08),
],false,'centripetal');

test('transported frames stay orthonormal through an inflected route',()=>{
 const frames=transportedFrames(openCurve(),{segments:64,up:[0,1,0]});
 assert.equal(frames.length,65);
 for(let i=0;i<frames.length;i++){
  const f=frames[i];
  assert.ok(Math.abs(f.tangent.length()-1)<1e-12);assert.ok(Math.abs(f.normal.length()-1)<1e-12);assert.ok(Math.abs(f.binormal.length()-1)<1e-12);
  assert.ok(Math.abs(f.tangent.dot(f.normal))<1e-10);assert.ok(Math.abs(f.tangent.dot(f.binormal))<1e-10);assert.ok(Math.abs(f.normal.dot(f.binormal))<1e-10);
  if(i)assert.ok(f.normal.dot(frames[i-1].normal)>.75,'transport should not introduce a frame flip');
  const z=new THREE.Vector3(0,0,1).applyQuaternion(f.quaternion);assert.ok(z.distanceTo(f.tangent)<1e-10);
 }
});

test('tilt adds authored roll without changing the path or tangent',()=>{
 const curve=openCurve(),base=transportedFrames(curve,{segments:20,up:[0,1,0]}),rolled=transportedFrames(curve,{segments:20,up:[0,1,0],tilt:t=>90*t});
 assert.ok(base[10].origin.distanceTo(rolled[10].origin)<1e-12);assert.ok(base[10].tangent.distanceTo(rolled[10].tangent)<1e-12);
 const expected=base[10].normal.clone().applyAxisAngle(base[10].tangent,Math.PI/4);
 assert.ok(expected.distanceTo(rolled[10].normal)<1e-10);
});

test('closed frames distribute seam correction and expose local offset poses',()=>{
 const curve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(.4,0,0),new THREE.Vector3(0,.18,.4),new THREE.Vector3(-.4,0,0),new THREE.Vector3(0,-.18,-.4)
 ],true,'centripetal');
 const frames=transportedFrames(curve,{segments:80,closed:true,up:[0,1,0]});
 assert.ok(frames[0].normal.distanceTo(frames.at(-1).normal)<1e-6);
 const poses=curveTransforms(curve,{segments:12,closed:true,up:[0,1,0],offset:[.02,-.01,.005]});
 const p=poses[3],expected=p.origin.clone().addScaledVector(p.normal,.02).addScaledVector(p.binormal,-.01).addScaledVector(p.tangent,.005);
 assert.ok(p.position.distanceTo(expected)<1e-12);
 const object=attachToCurve(new THREE.Group(),p);assert.ok(object.position.distanceTo(expected)<1e-12);
});

test('offset routes share the transported frame and reject ambiguous seed normals',()=>{
 const curve=openCurve(),frames=transportedFrames(curve,{segments:24,up:[0,1,0]}),route=offsetCurvePoints(curve,{segments:24,up:[0,1,0],offset:[.03,-.012]});
 assert.equal(route.length,frames.length);
 for(let i=0;i<route.length;i++){
  const delta=new THREE.Vector3(...route[i]).sub(frames[i].origin),expected=frames[i].normal.clone().multiplyScalar(.03).addScaledVector(frames[i].binormal,-.012);
  assert.ok(delta.distanceTo(expected)<1e-12);
 }
 const legacy=curve.computeFrenetFrames(24,false),compatible=offsetCurvePoints(curve,{segments:24,offset:[.02,0]});
 for(let i=0;i<compatible.length;i++){
  const expected=curve.getPointAt(i/24).addScaledVector(legacy.normals[i],.02);
  assert.ok(new THREE.Vector3(...compatible[i]).distanceTo(expected)<1e-8,'default seed preserves prior Three.js frame direction');
 }
 const line=new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,1,0));
 assert.throws(()=>transportedFrames(line,{segments:4,up:[0,1,0]}),/parallel/);
 assert.throws(()=>offsetCurvePoints(curve,{offset:[NaN,0]}),/curve offset/);
});
