import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE, dispose } from '../src/lib/modeling.js';
import { projectMesh, clearSurface } from '../src/lib/characters/surface-fitting.js';
test('surface clearance uses the dressed mesh rather than the naked body',()=>{
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshStandardMaterial());mesh.position.z=.1;
 const project=projectMesh(mesh),clear=clearSurface(project,{clearance:.006});
 assert.ok(Math.abs(project(.2,.4)-.1)<1e-6);
 assert.ok(Math.abs(clear([0,0,.03])[2]-.106)<1e-6);
 assert.deepEqual(clear([0,0,.2]),[0,0,.2]);dispose(mesh);
});
