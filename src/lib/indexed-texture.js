import * as THREE from 'three';
/** Portable, owned sRGB swatch from explicit indexed pixels; no DOM or URL load.
 * Rows are top-to-bottom image order, remapped to bottom-up texture UVs.
 * This is color sampling, not normal/roughness extraction or tile synthesis. */
export function indexedColorTexture({width,height,palette,indices,name='Indexed swatch'}={}) {
 if(![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=1024)||!Array.isArray(palette)||!palette.length||palette.length>256||palette.some(c=>!/^#[0-9a-f]{6}$/i.test(c))||typeof indices!=='string')throw new Error('Invalid indexed color image');
 let decoded;try{decoded=Uint8Array.from(atob(indices),c=>c.charCodeAt(0));}catch{throw new Error('Invalid indexed pixel encoding');}
 if(decoded.length!==width*height||decoded.some(i=>i>=palette.length))throw new Error('Indexed pixels disagree with size/palette');
 const colors=palette.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))),bytes=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)bytes.set([...colors[decoded[y*width+x]],255],((height-1-y)*width+x)*4);
 const texture=new THREE.DataTexture(bytes,width,height,THREE.RGBAFormat,THREE.UnsignedByteType);
 texture.name=name;texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}
