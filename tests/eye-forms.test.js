import test from'node:test';import assert from'node:assert/strict';import{eye,eyeball,eyelids,iris,buildEye}from'../src/lib/forms/eye.js';import{inspect,dispose}from'../src/lib/modeling.js';
test('eye composition validates dimensions and duplicate stages',()=>{assert.throws(()=>eye(eyelids(),eyelids()));assert.throws(()=>eyeball({radius:0}));assert.throws(()=>iris({pupil:2}));});
test('eye preserves optical geometry while lowering only orbital detail',()=>{
 const high=buildEye(eye(),{mode:'sculpt'}),low=buildEye(eye(),{textureSize:64});assert.ok(inspect(high).triangles>inspect(low).triangles*4);assert.ok(low.getObjectByName('EyelidsAndOrbit').material.normalMap);assert.equal(low.getObjectByName('Iris').material.map.colorSpace,'srgb');for(const root of[high,low])root.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok(o.geometry.attributes.uv);}});dispose(high);dispose(low);
});
