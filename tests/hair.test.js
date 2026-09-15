import test from 'node:test';
import assert from 'node:assert/strict';
import { composeCharacter, anatomy } from '../src/lib/characters/core.js';
import { tiedBun } from '../src/lib/characters/hair.js';
import { radialSurface } from '../src/lib/characters/radial-surface.js';
import { inspect, dispose } from '../src/lib/modeling.js';
import { assetInfo } from '../src/lib/rigging.js';
test('radial guides follow a real surface and reject missing samples',()=>{
 const points=[[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]];
 const faces=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].map(ids=>({ids}));
 const project=radialSurface({points,faces},{step:.1});
 assert.deepEqual(project(0,.5,.03),[0,.5,1.03]);
 assert.ok(Math.abs(project(Math.PI/4,.5)[0]-1)<1e-6);
 assert.throws(()=>project(0,3));assert.throws(()=>project(NaN,.5));
});
for(const quality of ['draft','studio','fine'])test(`${quality} scalp-fitting hairstyle has UVs, skinning and finite geometry`,()=>{
 const root=composeCharacter({quality},anatomy(),tiedBun());
 assert.ok(root.getObjectByName('HairFoundation'));assert.ok(root.getObjectByName('HairFlow0'));
 const stats=inspect(root),rig=assetInfo(root);assert.ok(stats.triangles<600000);assert.equal(rig.uvMeshes,rig.skinnedMeshes);dispose(root);
});
