import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE, buildModel, dispose, inspect } from '../src/lib/modeling.js';
import { assetInfo } from '../src/lib/rigging.js';
import { composeCharacter, anatomy, portrait, wear, fieldShirt, cargoTrousers, animate, idle } from '../src/lib/characters.js';
import { createStudioLighting } from '../src/lib/studio-lighting.js';
import { surfaceProjector } from '../src/lib/characters/projection.js';
import model from '../models/reference-explorer.js';
test('composed explorer preserves anatomy, UVs, weights and portable animation targets',()=>{
 const root=buildModel(model,{quality:'draft'}),info=assetInfo(root),stats=inspect(root);assert.equal(info.bones,50);assert.equal(info.skinnedMeshes,stats.meshes);assert.equal(info.uvMeshes,stats.meshes);assert.equal(info.morphTargets,1);assert.deepEqual(info.animations.map(a=>a.name),['Idle','Walk','Wave']);assert.equal(root.children[0].userData.anatomicalSource.license,'CC0-1.0');
 for(const part of['AnatomicalSkin','FieldShirt','CargoTrousers']){
 const mesh=root.getObjectByName(part),g=mesh.geometry;assert.ok(g.attributes.tangent);assert.ok(g.attributes.tangent.array.every(Number.isFinite));const bone=root.getObjectByName(part==='CargoTrousers'?'L_Thigh':'L_UpperArm'),before=Array.from({length:100},(_,i)=>mesh.getVertexPosition(Math.floor(i*g.attributes.position.count/100),new THREE.Vector3()).clone());bone.rotation.z=.35;root.updateMatrixWorld(true);
 const movement=Math.max(...before.map((p,i)=>p.distanceTo(mesh.getVertexPosition(Math.floor(i*g.attributes.position.count/100),new THREE.Vector3()))));assert.ok(movement>.005,`${part} must inherit actual deforming weights`);bone.rotation.z=0;root.updateMatrixWorld(true);
 }dispose(root);
});
test('components can be omitted and re-composed without explorer-specific animation dependencies',()=>{
 const base=composeCharacter({quality:'draft'},anatomy(),portrait(),animate(idle()));assert.equal(assetInfo(base).morphTargets,0);assert.ok(base.animations[0].tracks.every(t=>!t.name.includes('FieldShirt')));
 const clothed=composeCharacter({quality:'draft'},anatomy(),wear(fieldShirt(),cargoTrousers()),animate(idle()));assert.ok(clothed.getObjectByName('FieldShirt'));assert.ok(!clothed.getObjectByName('CanvasBackpack'));assert.ok(clothed.getObjectByName('AnatomicalSkin').geometry.index.count<base.getObjectByName('AnatomicalSkin').geometry.index.count,'Covered body triangles are removed');dispose(base);dispose(clothed);
});
test('composition rejects unsupported quality, dimensions, raw geometry stages and missing anatomy',()=>{
 assert.throws(()=>composeCharacter({quality:'unbounded'},anatomy()),/quality/);assert.throws(()=>composeCharacter({height:-1},anatomy()),/height/);assert.throws(()=>composeCharacter({},new THREE.Group()),/stages/);assert.throws(()=>composeCharacter({},wear(fieldShirt())),/anatomy/);assert.throws(()=>composeCharacter({},anatomy(),anatomy()),/Duplicate/);
});
test('studio lights are scene-owned and presets do not change the model',()=>{
 const scene=new THREE.Scene(),renderer={toneMappingExposure:1},asset=new THREE.Group();scene.add(asset);const lighting=createStudioLighting(scene,renderer),bounds=new THREE.Box3(new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,1.8,.5));lighting.fit(bounds);
 for(const preset of['studio','daylight','dramatic']){lighting.setPreset(preset);assert.equal(lighting.info().preset,preset);assert.equal(asset.children.length,0);}assert.throws(()=>lighting.setPreset('missing'));assert.throws(()=>lighting.setExposure(100));lighting.dispose();
});
test('surface projection is continuous across bins and ignores non-surface helpers',()=>{
 const project=surfaceProjector({points:[[0,0,0],[1,0,1],[1,1,2],[0,1,1],[.5,.5,100]],faces:[{ids:[0,1,2,3]}]});
 for(let i=1;i<99;i++){const x=i/100,y=.4;assert.ok(Math.abs(project(x,y)-(x+y))<1e-7);}
});
