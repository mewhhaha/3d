import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalGLB} from '../src/lib/canonical-glb.js';
function fixture(reverse=false){
 const blocks=[[1,2,3,4],[9,8,7,6]],json={asset:{version:'2.0'},buffers:[{byteLength:8}],bufferViews:[{buffer:0,byteOffset:0,byteLength:4},{buffer:0,byteOffset:4,byteLength:4}],images:[{name:'A',bufferView:reverse?1:0,mimeType:'image/png'},{name:'B',bufferView:reverse?0:1,mimeType:'image/png'}]};
 const text=new TextEncoder().encode(JSON.stringify(json)),n=(text.length+3)&~3,out=new Uint8Array(28+n+8),v=new DataView(out.buffer);
 for(const[offset,value]of [[0,0x46546c67],[4,2],[8,out.length],[12,n],[16,0x4e4f534a],[20+n,8],[24+n,0x004e4942]])v.setUint32(offset,value,true);
 out.fill(32,20,20+n);out.set(text,20);out.set((reverse?blocks.reverse():blocks).flat(),28+n);return out;
}
test('asynchronous image completion order does not alter canonical GLB',()=>{
 const a=fixture(),b=fixture(true),copy=a.slice();
 assert.notDeepEqual(a,b);assert.deepEqual(new Uint8Array(canonicalGLB(a)),new Uint8Array(canonicalGLB(b)));assert.deepEqual(a,copy);
});
test('canonicalization preserves payload bytes and is idempotent',()=>{
 const a=canonicalGLB(fixture(true));assert.deepEqual(new Uint8Array(canonicalGLB(a)),new Uint8Array(a));
 const bytes=new Uint8Array(a),n=new DataView(a).getUint32(12,true),json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+n)));
 for(const[i,expected]of [[0,[1,2,3,4]],[1,[9,8,7,6]]]){const view=json.bufferViews[json.images[i].bufferView];assert.deepEqual([...bytes.subarray(28+n+view.byteOffset,28+n+view.byteOffset+4)],expected);}
 assert.throws(()=>canonicalGLB(new Uint8Array(4)));
});
