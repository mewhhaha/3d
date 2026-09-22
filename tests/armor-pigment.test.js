import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
import {mesh,dispose} from '../src/lib/modeling.js';
import {armorLook} from '../studies/armor-look.js';
import {coatPanel} from '../studies/armor-pigment.js';
function panel(){const front=surfaceContourGeometry((u,v)=>[u,v,.1*u*v],{outline:[[.1,.2],[.8,.1],[.9,.9],[.2,.8]],rounding:.1,refinement:1});const g=solidifyGeometry(front,{thickness:.005});front.dispose();return mesh(g,{name:'Plate',material:armorLook(true).shell});}
test('pigment preserves construction buffers, original swatch and unpainted inside/rim',()=>{
 const p=panel(),g=p.geometry,original=p.material,bytes=original.map.image.data.slice();const attrs=Object.fromEntries(Object.entries(g.attributes).map(([k,v])=>[k,v.array.slice()])),index=g.index.array.slice();
 coatPanel(p);assert.equal(p.geometry,g);assert.equal(p.material[1],original);assert.deepEqual(original.map.image.data,bytes);assert.deepEqual(g.index.array,index);for(const [k,a]of Object.entries(attrs))assert.deepEqual(g.attributes[k].array,a);
 assert.equal(g.groups[0].count,g.userData.solidify.ranges.outer[1]);assert.equal(g.groups[1].materialIndex,1);assert.equal(p.material[0].map.colorSpace,T.SRGBColorSpace);assert.equal(p.material[0].roughnessMap.colorSpace,T.NoColorSpace);
 assert.ok(p.material[0].map.image.data.some((x,i)=>i%4!==3&&x<120));assert.throws(()=>coatPanel(p),/uncoated/);dispose(p);
});
test('same contour/guide colors produce deterministic independently owned maps',()=>{
 const a=coatPanel(panel()),b=coatPanel(panel());assert.deepEqual(a.material[0].map.image.data,b.material[0].map.image.data);assert.notEqual(a.material[0].map,b.material[0].map);dispose(a);dispose(b);
});
