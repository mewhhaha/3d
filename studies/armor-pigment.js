import * as THREE from 'three';
import {contourLineMaps} from '../src/lib/contour-line-maps.js';
/** Reuse chart pigment on selected shell exteriors. Multiply the retained
 * generated enamel sample in LINEAR color; never infer relief from its pixels.
 * Interior/rim UVs keep their original material, not repeated face decals. */
export function coatPanel(panel){
 const g=panel.geometry,base=panel.material,ranges=g.userData.solidify?.ranges;
 if(!g.userData.surfaceContour||!ranges||Array.isArray(base))throw new Error('Panel needs an uncoated contour shell');
 const image=base.map?.image;
 if(image?.data&&(base.map.colorSpace!==THREE.SRGBColorSpace||base.map.flipY||base.map.rotation||base.map.repeat.x!==1||base.map.repeat.y!==1||base.map.offset.x||base.map.offset.y))throw new Error('Panel color expects the untransformed generated sRGB sample');
 const maps=contourLineMaps(g,{size:128,lineWidth:.008,inset:.028,name:panel.name+' inset pigment',ink:'#546359',accent:'#ba6941'});
 const bytes=maps.map.image.data,c=new THREE.Color(),sample=new THREE.Color();
 if(image?.data){
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const u=((x+.5)/128-maps.map.offset.x)/maps.map.repeat.x,v=((y+.5)/128-maps.map.offset.y)/maps.map.repeat.y;
   const sx=THREE.MathUtils.clamp(Math.floor(u*image.width),0,image.width-1),sy=THREE.MathUtils.clamp(Math.floor(v*image.height),0,image.height-1),j=(sy*image.width+sx)*4,i=(y*128+x)*4;
   c.setRGB(bytes[i]/255,bytes[i+1]/255,bytes[i+2]/255,THREE.SRGBColorSpace);
   sample.setRGB(image.data[j]/255,image.data[j+1]/255,image.data[j+2]/255,THREE.SRGBColorSpace);
   c.multiply(sample).convertLinearToSRGB();bytes[i]=Math.round(c.r*255);bytes[i+1]=Math.round(c.g*255);bytes[i+2]=Math.round(c.b*255);
  }
 }
 const outer=base.clone();Object.assign(outer,maps);outer.name=panel.name+' painted enamel';outer.roughness=1;
 g.clearGroups();g.addGroup(...ranges.outer,0);const end=ranges.outer[0]+ranges.outer[1];g.addGroup(end,g.index.count-end,1);
 panel.material=[outer,base];return panel;
}
