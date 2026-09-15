import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import validator from 'gltf-validator';
import { normalizeTangentFrames } from '../src/lib/tangent-frame.js';
import { buildModel, dispose } from '../src/lib/modeling.js';
import explorer from '../models/reference-explorer.js';
function check(g) {
 const t=g.attributes.tangent,n=g.attributes.normal;
 for(let i=0;i<t.count;i++) {
  const a=new THREE.Vector3().fromBufferAttribute(t,i),b=new THREE.Vector3().fromBufferAttribute(n,i).normalize();
  assert.ok(Math.abs(a.length()-1)<1e-5);assert.ok(Math.abs(a.dot(b))<1e-5);assert.ok(Math.abs(t.getW(i))===1);
 }
}
test('sphere-pole tangents have unit xyz and valid handedness in GLB',async()=>{
 const geometry=new THREE.SphereGeometry(.1,48,24);geometry.computeTangents();
 assert.ok(geometry.attributes.tangent.array.some((v,i)=>i%4===3&&v===0),'Regression covers unused pole vertices');
 normalizeTangentFrames(geometry);check(geometry);
 const scene=new THREE.Scene();scene.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));
 const previous=globalThis.FileReader;globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();}).catch(error=>this.onerror?.(error));}};
 try{const glb=await new GLTFExporter().parseAsync(scene,{binary:true});const report=await validator.validateBytes(new Uint8Array(glb),{maxIssues:0});assert.equal(report.issues.truncated,false);assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues.messages));}
 finally{globalThis.FileReader=previous;dispose(scene);}
});
test('every composed character tangent frame can be exported, including unused vertices',()=>{
 const root=buildModel(explorer,{quality:'draft'});root.traverse(o=>{if(o.isMesh&&o.geometry.attributes.tangent){normalizeTangentFrames(o.geometry);check(o.geometry);}});dispose(root);
});
