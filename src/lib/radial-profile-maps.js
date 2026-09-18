import * as THREE from 'three';

/** Rasterize an authored radial color/emission profile in UV space.
 * Stops: [normalizedRadius, sRGBHex, emissionWeight=1], strictly increasing 0..1.
 * Colors and emitted radiance are interpolated/filtered in linear space, then
 * encoded as ordinary sRGB RGBA8 maps. No lighting, normals, or geometry baked.
 */
export function radialProfileMaps({
  name='Radial profile', size=256, stops, center=[.5,.5], radius=.5, samples=2,
}={}) {
  if (!Number.isInteger(size)||size<16||size>1024||(size&(size-1))) throw new Error('Radial profile size must be a power of two in 16..1024');
  if (![1,2,4].includes(samples)) throw new Error('Radial profile samples must be 1, 2, or 4 per axis');
  if (!Array.isArray(center)||center.length!==2||!center.every(Number.isFinite)||!Number.isFinite(radius)||radius<=0) throw new Error('Radial profile needs finite UV center and positive radius');
  if (!Array.isArray(stops)||stops.length<2||stops.length>128) throw new Error('Radial profile needs 2..128 stops');
  const profile=stops.map((s,i)=>{
    if (!Array.isArray(s)||s.length<2||s.length>3||!Number.isFinite(s[0])||s[0]<0||s[0]>1||i&&s[0]<=stops[i-1][0]||!/^#[0-9a-f]{6}$/i.test(s[1])||!Number.isFinite(s[2]??1)||(s[2]??1)<0||(s[2]??1)>1) throw new Error('Radial profile stops must increase in 0..1 with hex colors and 0..1 emission');
    const color=new THREE.Color(s[1]).toArray(), e=s[2]??1;
    return {at:s[0],color,emission:color.map(v=>v*e)};
  });
  if(profile[0].at!==0||profile.at(-1).at!==1)throw new Error('Radial profile must include 0 and 1 endpoints');
  const colorBytes=new Uint8Array(size*size*4),emissionBytes=new Uint8Array(size*size*4),weight=1/(samples*samples);
  const encode=v=>Math.round(255*THREE.MathUtils.clamp(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055,0,1));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const color=[0,0,0],emission=[0,0,0];
    for(let sy=0;sy<samples;sy++)for(let sx=0;sx<samples;sx++){
      const u=(x+(sx+.5)/samples)/size,v=(y+(sy+.5)/samples)/size;
      const r=Math.min(1,Math.hypot(u-center[0],v-center[1])/radius);
      let i=0;while(i<profile.length-2&&r>profile[i+1].at)i++;
      const a=profile[i],b=profile[i+1],t=(r-a.at)/(b.at-a.at);
      for(let c=0;c<3;c++){color[c]+=(a.color[c]+(b.color[c]-a.color[c])*t)*weight;emission[c]+=(a.emission[c]+(b.emission[c]-a.emission[c])*t)*weight;}
    }
    const at=(y*size+x)*4;
    colorBytes.set([...color.map(encode),255],at);emissionBytes.set([...emission.map(encode),255],at);
  }
  const texture=(bytes,suffix)=>{
    const t=new THREE.DataTexture(bytes,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
    t.name=`${name} / ${suffix}`;t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;
    t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
    return t;
  };
  return {map:texture(colorBytes,'color'),emissiveMap:texture(emissionBytes,'emission')};
}
