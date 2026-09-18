import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSceneJSON} from '../scripts/scene-transfer.mjs';
function harness(load,{failAppend=false}={}){
 let parts=[],disposed=false,appends=[];
 globalThis.window={stage:{load}};
 const page={evaluateHandle:async fn=>{parts=fn();return{
  evaluate:async(fn,arg)=>{if(arg!==undefined){appends.push(arg);if(failAppend)throw new Error('transport failure');}return fn(parts,arg);},
  dispose:async()=>{disposed=true;},
 };}};
 return {page,get disposed(){return disposed;},get parts(){return parts;},appends};
}
test('bounded scene transfer round-trips JSON, escaped strings and split Unicode',async()=>{
 const json={name:'ねこ 🔧 "quoted"\\line\n',positions:[.012,3,-1.234],uv:[0,1],items:[{visible:true},null]};
 const h=harness(({json:received})=>{assert.deepEqual(received,json);return {triangles:7};});
 assert.deepEqual(await loadSceneJSON(h.page,json,{chunkSize:1}),{triangles:7});
 assert.ok(h.appends.every(s=>s.length<=1));assert.equal(h.disposed,true);assert.equal(h.parts.length,0);delete globalThis.window;
});
test('loader and transport failures remain errors and temporary handles are disposed',async()=>{
 for(const failAppend of [true,false]){
  const h=harness(()=>{throw new Error('model failure');},{failAppend});
  await assert.rejects(loadSceneJSON(h.page,{values:[1,2]}),failAppend?/transport failure/:/model failure/);
  assert.equal(h.disposed,true);
 }delete globalThis.window;
});
test('invalid chunk sizes and non-JSON input fail early',async()=>{
 for(const chunkSize of [0,1.5,5*1024*1024,NaN])await assert.rejects(loadSceneJSON({}, {},{chunkSize}));
 await assert.rejects(loadSceneJSON({},undefined));
 const cycle={};cycle.self=cycle;await assert.rejects(loadSceneJSON({},cycle));
});
