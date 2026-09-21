import * as THREE from 'three';
import { group, material, dispose } from '../modeling.js';
import { compactGeometry } from '../compact-geometry.js';
import { compileSurface, loopCap } from '../shape-rails.js';
import { animePortrait } from './portrait.js';
import { portraitFields } from './head-form.js';
import { reshapeAssembly } from '../shape-deform.js';
import { directNormals, ellipsoidNormalField, inkHull, twoToneMaterial } from '../illustration.js';

/** Rounded cross-section and independent lower cut, in local head meters.
 * The cap and drop share a common ellipse and tangent; no hidden crown filler. */
export function bobCrossSection({width=.112,depth=.135,top=.145,shoulder=.052,centerX=.002,centerZ=-.045,flare=.08}={}){
  if(![width,depth,top,shoulder,centerX,centerZ,flare].every(Number.isFinite)||width<=0||depth<=0||top<=shoulder||flare<0||flare>.5)throw new Error('Invalid bob cross-section');
  const point=(angle,y)=>{
    const h=Math.max(0,(y-shoulder)/(top-shoulder));
    const r=Math.sqrt(Math.max(.0001,1-h*h));
    const drop=Math.max(0,(shoulder-y)/.17),f=1+flare*drop*drop;
    return [centerX+Math.sin(angle)*width*r*f,y,centerZ+Math.cos(angle)*depth*r*f];
  };
  return {point,top,shoulder};
}
function hairColor(support){
  const w=512,h=128,data=new Uint8Array(w*h*4),stops=[[0,'#729b97'],[.35,'#96bf9c'],[.50,'#d5df85'],[.69,'#ffb646'],[.84,'#fa7030'],[1,'#ee491a']].map(([t,c])=>[t,new THREE.Color(c)]);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const u=i/(w-1),v=j/(h-1),p=support(u,v),y=p[1],angle=Math.atan2(p[0]-.002,p[2]+.045),t=THREE.MathUtils.clamp((.165-y)/.28,0,1);
    let k=0;while(k<stops.length-2&&t>stops[k+1][0])k++;
    const [a,ca]=stops[k],[b,cb]=stops[k+1],c=ca.clone().lerp(cb,(t-a)/(b-a));
    const strand=(.5+.5*Math.cos(2*Math.PI*(40*angle/(2*Math.PI))))**32;
    c.multiplyScalar(1-.30*strand).convertLinearToSRGB();data.set([c.r*255,c.g*255,c.b*255,255],(j*w+i)*4);
  }
  const map=new THREE.DataTexture(data,w,h);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;map.name='Bob / authored height and strand color';return map;
}
export function roundedBob({mode='cage',fringeHeight=.041,opening=.72,cutHeight=-.106,toon=true,segments=null}={}){
  if(![fringeHeight,opening,cutHeight].every(Number.isFinite)||fringeHeight<.028||fringeHeight>.065||opening<.5||opening>1.1||cutHeight<-.16||cutHeight>-.07)throw new Error('Invalid bob cut');
  if(segments!==null&&(typeof segments!=='object'||Array.isArray(segments)||Object.entries(segments).some(([key,value])=>!['crown','curtain','fringe'].includes(key)||!Array.isArray(value)||value.length!==2||value.some(n=>!Number.isInteger(n)||n<4||n>256))))throw new Error('Invalid bob chart segments');
  const cross=bobCrossSection(),root=group('Prismatic bob');
  const cap=(u,v)=>{const theta=u*Math.PI*2,phi=.03+(Math.PI/2-.03)*v;return cross.point(theta,cross.shoulder+(cross.top-cross.shoulder)*Math.cos(phi));};
  const cut=u=>{const theta=.16+u*(2*Math.PI-.38-.16);return [(Math.sin(theta)>0?.145:.158)*Math.sin(theta),cutHeight+.012*(1-Math.cos(theta))/2+.026*Math.max(0,Math.sin(theta))+.023*Math.exp(-((u/.14)**2)),.150*Math.cos(theta)-.029+.10*Math.max(0,-Math.sin(theta))**2];};
  const near=.70+(opening-.72),far=-.60-(opening-.72);
  const curtain=(u,v)=>{const theta=near+u*(2*Math.PI+far-near),a=cross.point(theta,cross.shoulder),b=cut(u),w=v*v*(3-2*v);return [THREE.MathUtils.lerp(a[0],b[0],w),THREE.MathUtils.lerp(a[1],b[1],v),THREE.MathUtils.lerp(a[2],b[2],w)];};
  const fringe=(u,v)=>{const theta=far+(near-far)*u,cut=fringeHeight+.003*Math.cos(theta*3)-.001*Math.cos(u*6*Math.PI);return cross.point(theta,THREE.MathUtils.lerp(cross.shoulder,cut,v));};
  for(const [name,rawSupport,defaultSegments,count]of [['crown',cap,[96,32],46],['curtain',curtain,[96,40],40],['fringe',fringe,[40,8],10]]){
    // Reverse U: the mesher uses du x dv; descending Y must face outward.
    const support=(u,v)=>rawSupport(1-u,v);
    const map=hairColor(support);
    const mat=toon?twoToneMaterial({color:'#ffffff',shadow:'#bdc9c4',direction:[-.5,.5,1],threshold:.10,softness:.08}):material('#ffffff',{roughness:.88});
    mat.map=map;mat.side=THREE.DoubleSide;mat.name='Bob / '+name;
    const detail=(u,v)=>.000045*Math.cos(u*count*Math.PI*2)*Math.sin(v*Math.PI)**2;
    const piece=compileSurface('Rounded '+name,support,{mode,segments:segments?.[name]??defaultSegments,refinement:3,textureSize:512,detail,material:mat});
    const original=piece.geometry;piece.geometry=compactGeometry(original);original.dispose();root.add(piece);
  }
  root.add(loopCap('Rounded crown closure',Array.from({length:64},(_,i)=>cap(i/64,0)),{lift:.00008,rings:2,material:material('#729b97',{roughness:.9,side:THREE.DoubleSide})}));
  root.userData.groom={method:'shared rounded cross-section / separate geometric fringe and curtain cuts',mode,fringeHeight,opening,cutHeight};return root;
}
/** Apply illustration AFTER shape. Default lighting remains an explicitly authored key.
 * No copied source raster, static face-shadow overlay, or hidden replacement skeleton. */
export function illustratedHead({hairMode='cage',toon=true,outline=true,fringeHeight=.041,opening=.72,detail=1,hairSegments=null}={},mats){
  if(![0,1].includes(detail))throw new Error('Portrait detail must be 0 or 1');
  const raw=animePortrait({definition:1,detail},mats),face=reshapeAssembly(raw,portraitFields);dispose(raw);
  const ears=[];face.traverse(o=>{if(o.name==='Ear attachment')ears.push(o);});ears.forEach(o=>{o.removeFromParent();o.geometry.dispose();});
  const skin=face.getObjectByName('Face / continuous jaw cheeks and nose');
  if(outline)face.add(inkHull(skin.geometry,{width:.00055,name:'Portrait ink contour'}));
  const original=skin.geometry;
  skin.geometry=directNormals(original,{field:ellipsoidNormalField({center:[0,-.012,-.13],radii:[.19,.28,.31]}),selection:({position:p})=>.65*THREE.MathUtils.smoothstep(p[2],.0,.06),maxAngle:65});original.dispose();
  if(toon){skin.material=twoToneMaterial({color:'#cbb79f',shadow:'#a67c7c',direction:[-.5,.2,1],threshold:.32,softness:.045});skin.material.name='Portrait / art-directed two-tone';}
  const head=group('Illustrated head',[face,roundedBob({mode:hairMode,fringeHeight,opening,toon,segments:hairSegments})]);
  head.userData.illustration={geometry:'reduced nasal bulb / cheek and socket relief / upper lid rims',shading:'independent bounded normal field; optional two-tone preview',export:'PBR fallback, authored normals and geometric outline'};return head;
}
