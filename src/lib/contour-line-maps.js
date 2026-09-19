import * as THREE from 'three';
/** Draw boundary-following pigment and roughness in a surfaceContour's existing
 * UV domain, independent of mesh density. Not normals, displaced edges or a bake.
 * Width/inset are normalized to the bounding rectangle of this chart. */
export function contourLineMaps(geometry,{size=256,lineWidth=.010,inset=.024,ink='#36423c',accent='#b95b39',name='Contour pigment'}={}){
 const meta=geometry?.userData?.surfaceContour,uv=geometry?.attributes?.uv;
 if(!meta||!uv||uv.itemSize!==2)throw new Error('contourLineMaps needs surfaceContour geometry with its original UVs');
 if(!Number.isInteger(size)||size<32||size>1024||(size&(size-1)))throw new Error('Contour map size must be a power of two 32..1024');
 if(![lineWidth,inset].every(Number.isFinite)||lineWidth<=0||lineWidth>.1||inset<0||inset>.2)throw new Error('Invalid contour line width/inset');
 if(![ink,accent].every(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)))throw new Error('Contour colors must be #rrggbb');
 const counts=[meta.outline,...(meta.holes??[])].map(p=>p.length*(meta.rounding?meta.cornerSegments+1:1));
 if(counts.reduce((a,b)=>a+b,0)!==meta.boundaryCount||meta.boundaryCount>uv.count)throw new Error('Contour boundary provenance mismatch');
 const points=Array.from({length:meta.boundaryCount},(_,i)=>[uv.getX(i),uv.getY(i)]);
 if(points.some(p=>p.some(v=>!Number.isFinite(v))))throw new Error('Invalid contour UV');
 const min=[0,1].map(k=>Math.min(...points.map(p=>p[k]))),extent=[0,1].map(k=>Math.max(...points.map(p=>p[k]))-min[k]);
 if(extent.some(v=>v<1e-8))throw new Error('Degenerate contour chart');
 const normalized=points.map(p=>p.map((x,k)=>(x-min[k])/extent[k]));
 const segments=[];let offset=0;
 for(const count of counts){for(let i=0;i<count;i++)segments.push([normalized[offset+i],normalized[offset+(i+1)%count]]);offset+=count;}
 const pigment=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),dark=new THREE.Color(ink),orange=new THREE.Color(accent),white=new THREE.Color('#ffffff');
 const aa=.75/size;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size;let d=Infinity;
  for(const [a,b] of segments){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?THREE.MathUtils.clamp(((u-a[0])*dx+(v-a[1])*dy)/l,0,1):0;d=Math.min(d,Math.hypot(u-a[0]-t*dx,v-a[1]-t*dy));}
  const stroke=1-THREE.MathUtils.smoothstep(Math.abs(d-inset),lineWidth/2-aa,lineWidth/2+aa);
  // Deliberate interrupted warm edge accent, not random grunge or baked light.
  const warm=(1-THREE.MathUtils.smoothstep(Math.abs(d-inset-.019),.002-aa,.002+aa))*(u>.56&&v<.54?1:0);
  const c=white.clone().lerp(dark,stroke).lerp(orange,warm*.72).convertLinearToSRGB(),i=(y*size+x)*4;
  pigment.set([Math.round(c.r*255),Math.round(c.g*255),Math.round(c.b*255),255],i);
  const r=Math.round((.55+.24*stroke)*255);rough.set([255,r,0,255],i);
 }
 const texture=(data,color,label)=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);t.name=name+' '+label;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.repeat.set(1/extent[0],1/extent[1]);t.offset.set(-min[0]/extent[0],-min[1]/extent[1]);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.flipY=false;t.needsUpdate=true;return t;};
 return {map:texture(pigment,true,'color'),roughnessMap:texture(rough,false,'roughness')};
}
