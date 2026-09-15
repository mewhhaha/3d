import test from 'node:test';
import assert from 'node:assert/strict';
import { group, box, dispose } from '../src/lib/modeling.js';
import { regionMask } from '../src/lib/region-mask.js';
import { polygonMask, rgbaPng } from '../scripts/raster-mask.mjs';
import { inflateSync } from 'node:zlib';
test('diagnostic regions keep white occluders, clone geometry and leave source materials alone',()=>{
 const source=group('Scene',[group('Hair',[box({name:'Strand',material:'#ff0000'})]),box({name:'Face',material:'#00ff00'})]);
 source.userData.sceneRecipe={background:'#000000',bloom:{strength:.5},depthOfField:{aperture:.02}};
 const mask=regionMask(source,{select:'Hair'});assert.equal(mask.getObjectByName('Strand').material.color.getHex(),0);assert.equal(mask.getObjectByName('Face').material.color.getHex(),0xffffff);
 assert.equal(mask.getObjectByName('Face').visible,true);assert.equal(mask.getObjectByName('Face').material.depthWrite,true);
 assert.equal(source.getObjectByName('Strand').material.color.getHex(),0xff0000);assert.notEqual(mask.getObjectByName('Face').geometry,source.getObjectByName('Face').geometry);
 assert.equal(source.userData.sceneRecipe.bloom.strength,.5);assert.equal(mask.userData.sceneRecipe.bloom.strength,0);
 assert.throws(()=>regionMask(source,{select:'Missing'}));dispose(source);dispose(mask);
});
test('polygon mask holes are white and PNG scanlines have the declared dimensions',()=>{
 const r=polygonMask({image:{width:10,height:10},outline:[[0,0],[10,0],[10,10],[0,10]],holes:[[[3,3],[7,3],[7,7],[3,7]]]});
 assert.equal(r.foregroundPixels,84);assert.equal(r.png.readUInt32BE(16),10);
 let at=8,data=[];while(at<r.png.length){const n=r.png.readUInt32BE(at),kind=r.png.toString('ascii',at+4,at+8);if(kind==='IDAT')data.push(r.png.subarray(at+8,at+8+n));at+=n+12;}
 const raw=inflateSync(Buffer.concat(data));assert.equal(raw.length,410);assert.equal(raw[0],0);assert.equal(raw[1],0);assert.equal(raw[4*41+1+4*4],255);
 assert.throws(()=>rgbaPng(0,5,new Uint8Array()));
});
