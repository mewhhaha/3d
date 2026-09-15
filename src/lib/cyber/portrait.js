import * as THREE from 'three';
import { mesh, group, material, sphere } from '../modeling.js';
import { routedCable } from './mechanics.js';
import { surfaceLayer, attachToSurface } from '../surface-frame.js';
const mix=THREE.MathUtils.lerp;
const gauss=(x,y,cx,cy,rx,ry)=>Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2));
/** UV-parametric patch shared by face, eye and hair builders. Angles are radians here. */
export function patch(name, surface, {u=48,v=32,material:mat}={}) {
  const positions=[],uv=[],indices=[];
  for(let j=0;j<=v;j++)for(let i=0;i<=u;i++) {const p=surface(i/u,j/v); if(!p.every(Number.isFinite))throw new Error('Non-finite surface');positions.push(...p);uv.push(i/u,j/v);}
  for(let j=0;j<v;j++)for(let i=0;i<u;i++){const a=j*(u+1)+i,b=a+1,c=a+u+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  return mesh(g,{name,material:mat});
}
function polyline(name,points,radius,mat){return routedCable({name,points,radius,material:mat,segments:32,ends:false});}
const faceProfile=[[-.112,.003,.018],[-.097,.031,.039],[-.067,.063,.057],[-.025,.083,.068],[.025,.089,.074],[.080,.080,.071],[.120,.055,.053],[.145,.002,.008]];
function faceRadius(y,axis){
 const profile=faceProfile; let k=0;while(k<profile.length-2&&y>profile[k+1][0])k++;
 const a=profile[k],b=profile[k+1],t=(y-a[0])/(b[0]-a[0]);
 const before=profile[Math.max(0,k-1)],after=profile[Math.min(profile.length-1,k+2)],h=b[0]-a[0],m0=(b[axis]-before[axis])/(b[0]-before[0]),m1=(after[axis]-a[axis])/(after[0]-a[0]);
 return (2*t**3-3*t*t+1)*a[axis]+(t**3-2*t*t+t)*h*m0+(-2*t**3+3*t*t)*b[axis]+(t**3-t*t)*h*m1;
}
function faceRelief(x,y,front){
 return front*(.008*gauss(x,y,0,-.020,.008,.012)+.005*gauss(x,y,0,.001,.010,.037)
  +.004*gauss(x,y,-.051,-.029,.025,.022)+.004*gauss(x,y,.051,-.029,.025,.022)
  -.003*gauss(x,y,-.039,.027,.028,.016)-.003*gauss(x,y,.039,.027,.028,.016)
  +.003*gauss(x,y,0,-.055,.026,.018));
}
/** Front facial chart in meters, shared by the skull and all facial attachments. */
export function facialChart(x,y){
 const rx=faceRadius(y,1),rz=faceRadius(y,2);
 if(Math.abs(x)>=rx)throw new Error('Facial chart is outside the front hemisphere');
 const c=Math.sqrt(1-(x/rx)**2);
 return [x,y,c*rz-.006+faceRelief(x,y,c**8)];
}
function faceSurface(u,v){
 const theta=(u-.5)*Math.PI*2,y=mix(-.112,.145,v),x=Math.sin(theta)*faceRadius(y,1),c=Math.cos(theta);
 return[x,y,c*faceRadius(y,2)-.006+faceRelief(x,y,Math.max(0,c)**8)];
}
function forwardPatch(name,surface,options){
 const result=patch(name,surface,options),idx=result.geometry.index.array;
 for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
 result.geometry.computeVertexNormals();return result;
}
function featureCurve(name,coordinates,surface,radius,mat){
 return polyline(name,coordinates.map(([u,v])=>surface(u,v)),radius,mat);
}
function irisMaterial(color){
 const size=128,data=new Uint8Array(size*size*4),tint=new THREE.Color(color);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(x/(size-1)-.5)*2,dy=(y/(size-1)-.5)*2,r=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  const fibers=.10*Math.sin(angle*37+r*14)+.055*Math.sin(angle*71-r*9);
  const edge=1-THREE.MathUtils.smoothstep(r,.79,.99),inner=THREE.MathUtils.smoothstep(r,.30,.55);
  const c=tint.clone().multiplyScalar((.21+.79*edge)*(.72+.28*inner+fibers)).convertLinearToSRGB();
  const i=(y*size+x)*4;data.set([Math.round(c.r*255),Math.round(c.g*255),Math.round(c.b*255),255],i);
 }
 const texture=new THREE.DataTexture(data,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.name='Radial iris fibers';
 const result=material('#ffffff',{map:texture,roughness:.38,emissive:color,emissiveIntensity:.08});result.name='Pink iris fibers';return result;
}
function surfaceDisc(name,radius,center,surface,mat){
 const g=new THREE.CircleGeometry(radius,48),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const q=surface(center[0]+p.getX(i),center[1]+p.getY(i));p.setXYZ(i,...q);}
 g.computeVertexNormals();return mesh(g,{name,material:mat});
}
export function animePortrait({name='Portrait',eyeColor='#ef4fca',detail=1}={},mats){
 const root=group(name),skin=mats.skin.clone();skin.color.set('#edc5ad');skin.name='Soft warm portrait';
 const face=forwardPatch('Face / continuous jaw cheeks and nose',faceSurface,{u:detail?96:48,v:detail?72:36,material:skin});root.add(face);
 const sclera=material('#e7d9cd',{roughness:.5});sclera.name='Eye sclera';
 const iris=irisMaterial(eyeColor),lip=material('#9f6864',{roughness:.65});lip.name='Lip tint';
 const facialInk=surfaceLayer(facialChart,{offset:.00055});
 for(const side of[-1,1]){
   const eye=group(side<0?'Eye.R':'Eye.L'),cx=side*.039,cy=.027,cant=side*.12;
   const base=(x,y)=>facialChart(cx+x*Math.cos(cant)-y*Math.sin(cant),cy+x*Math.sin(cant)+y*Math.cos(cant));
   const eyeSurface=surfaceLayer(base,{offset:.0009,relief:(x,y)=>.002*Math.max(0,1-(x/.0255)**2)*Math.max(0,1-(y/.013)**2)});
   const almond=(u,v)=>{const x=(u-.5)*.051,h=Math.sin(u*Math.PI)**.80;return eyeSurface(x,mix(-.010*h,.012*h,v));};
   eye.add(forwardPatch('Conforming almond sclera',almond,{u:32,v:12,material:sclera}));
   eye.add(surfaceDisc('Surface iris',.0096,[-side*.001,0],surfaceLayer(eyeSurface,{offset:.00016}),iris));
   eye.add(surfaceDisc('Surface pupil',.0037,[-side*.001,0],surfaceLayer(eyeSurface,{offset:.00030}),mats.ink));
   const highlight=sphere({name:'Corneal glint',radius:.0017,scale:[1,1,.35],segments:12,material:mats.white});
   eye.add(attachToSurface(highlight,eyeSurface,{u:-.003,v:.0038,offset:.0006}));
   for(const sign of[-1,1]){
    const points=Array.from({length:17},(_,i)=>{const u=i/16;return[(u-.5)*.051,sign*(sign>0?.012:.010)*Math.sin(u*Math.PI)**.8];});
    eye.add(featureCurve(sign>0?'Upper eyeliner':'Lower lash line',points,surfaceLayer(eyeSurface,{offset:.0002}),sign>0?.0011:.00045,mats.ink));
   }
   eye.add(featureCurve('Outer lash wing',[[side*.021,.005],[side*.026,.007],[side*.029,.011]],surfaceLayer(base,{offset:.0012}),.0007,mats.ink));
   root.add(eye);
   root.add(featureCurve('Eyebrow',[[side*.019,.053],[side*.036,.059],[side*.058,.054]],facialInk,.0013,mats.ink));
   root.add(featureCurve('Nostril detail',[[side*.004,-.028],[side*.006,-.029],[side*.008,-.028]],facialInk,.00035,lip));
   root.add(sphere({name:'Ear attachment',radius:.024,position:[side*.083,-.008,-.005],scale:[.40,1,.48],segments:24,material:skin}));
 }
 root.add(featureCurve('Mouth line',[[-.014,-.056],[0,-.058],[.014,-.055]],facialInk,.00055,lip));
 root.add(featureCurve('Lower lip',[[-.010,-.060],[0,-.062],[.010,-.059]],facialInk,.00065,lip));
 return root;
}
function hairMap(){
 const width=64,height=256,data=new Uint8Array(width*height*4);
 const stops=[[0,'#ff592b'],[.27,'#ffc258'],[.53,'#d9e58b'],[.76,'#89c8a9'],[1,'#7298a7']].map(([t,c])=>[t,new THREE.Color(c)]);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const t=y/(height-1);let k=0;while(k<stops.length-2&&t>stops[k+1][0])k++;
  const a=stops[k],b=stops[k+1],c=a[1].clone().lerp(b[1],(t-a[0])/(b[0]-a[0]));
  const streak=1-.075*(.5+.5*Math.sin(x*.19+.18*Math.sin(y*.023)))**12;
  c.multiplyScalar(streak).convertLinearToSRGB();const i=(y*width+x)*4;data.set([Math.round(c.r*255),Math.round(c.g*255),Math.round(c.b*255),255],i);
 }
 const texture=new THREE.DataTexture(data,width,height);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.name='Mint to amber bob / strand albedo';return texture;
}
/** Bob is a set of shaped 3D ribbon surfaces; no reference image is projected onto it. */
export function prismBob({name='Prismatic bob',detail=1,length=.320}={},mats){
 const root=group(name),texture=hairMap();
 const mat=material('#ffffff',{map:texture,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.13,roughness:.46,metalness:.06,side:THREE.DoubleSide});mat.name='Iridescent gradient hair';
 const count=detail?64:40;
 for(let i=0;i<count;i++){
  const theta=-Math.PI+(i+.5)/count*Math.PI*2, half=Math.PI/count*.992;
  const fringe=Math.abs(theta)<.77;
  const bottom=fringe?.055+.008*Math.cos(theta*3)-.0015*Math.sin(i*1.4):.15-length+.011*Math.cos(theta)+.004*Math.sin(i*1.7);
  const surf=(u,v)=>{
   const a=theta+(u-.5)*half*2,y=mix(.154,bottom,v);
   const dome=Math.sqrt(Math.max(.0001,1-(Math.max(0,y-.010)/.146)**2));
   const r=(.108*dome+.003)*(1+.22*v),wave=.00015*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
   return[Math.sin(a)*(r+wave),y,Math.cos(a)*(r*.86+wave)-.009];
  };
  const ribbon=patch(`Hair panel ${i+1}`,surf,{u:detail?4:2,v:detail?26:16,material:mat});
  const uv=ribbon.geometry.attributes.uv,p=ribbon.geometry.attributes.position;
  for(let j=0;j<uv.count;j++)uv.setY(j,THREE.MathUtils.clamp((p.getY(j)+.145)/.30,0,1));
  root.add(ribbon);

 }
 return root;
}
