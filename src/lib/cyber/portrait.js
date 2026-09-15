import * as THREE from 'three';
import { mesh, group, material, sphere } from '../modeling.js';
import { routedCable } from './mechanics.js';
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
function faceSurface(u,v){
 const theta=(u-.5)*Math.PI*2,y=mix(-.124,.145,v);
 const profile=[[-.124,.003,.018],[-.110,.030,.039],[-.082,.061,.055],[-.035,.081,.067],[.025,.089,.074],[.080,.080,.071],[.120,.055,.053],[.145,.002,.008]];
 let k=0;while(k<profile.length-2&&y>profile[k+1][0])k++;
 const a=profile[k],b=profile[k+1],t=(y-a[0])/(b[0]-a[0]);
 const radius=axis=>{const before=profile[Math.max(0,k-1)],after=profile[Math.min(profile.length-1,k+2)],h=b[0]-a[0],m0=(b[axis]-before[axis])/(b[0]-before[0]),m1=(after[axis]-a[axis])/(after[0]-a[0]);return (2*t**3-3*t*t+1)*a[axis]+(t**3-2*t*t+t)*h*m0+(-2*t**3+3*t*t)*b[axis]+(t**3-t*t)*h*m1;};
 const x=Math.sin(theta)*radius(1);let z=Math.cos(theta)*radius(2)-.006;
 const front=Math.max(0,Math.cos(theta))**8;
 z+=front*(.019*gauss(x,y,0,-.021,.011,.015)+.012*gauss(x,y,0,.002,.011,.040)
  +.004*gauss(x,y,-.051,-.029,.025,.022)+.004*gauss(x,y,.051,-.029,.025,.022)
  -.005*gauss(x,y,-.039,.027,.028,.016)-.005*gauss(x,y,.039,.027,.028,.016)
  +.006*gauss(x,y,0,-.065,.026,.018));
 return[x,y,z];
}
export function animePortrait({name='Portrait',eyeColor='#ef4fca',detail=1}={},mats){
 const root=group(name); const skin=mats.skin;
 // Winding is outward for the phi/height parameterization.
 const face=patch('Face / continuous jaw cheeks and nose',faceSurface,{u:detail?96:48,v:detail?72:36,material:skin});
 const fi=face.geometry.index.array;for(let i=0;i<fi.length;i+=3)[fi[i+1],fi[i+2]]=[fi[i+2],fi[i+1]];face.geometry.computeVertexNormals();root.add(face);
 const sclera=material('#efdcda',{roughness:.38});sclera.name='Eye sclera';
 const iris=material(eyeColor,{roughness:.26,emissive:eyeColor,emissiveIntensity:.5});iris.name='Pink iris';
 const lip=material('#b67970',{roughness:.65});lip.name='Lip tint';
 for(const side of[-1,1]){
   const eye=group(side<0?'Eye.R':'Eye.L');eye.position.set(side*.039,.027,.059);eye.rotation.y=side*.10;eye.rotation.z=side*.08;
   // An almond surface, not a sphere protruding from the face.
   const almond=(u,v)=>{const x=(u-.5)*.053, h=.013*Math.sin(u*Math.PI)**.72;return[x,(v*2-1)*h,.006*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)];};
   const white=patch('Almond sclera',almond,{u:32,v:12,material:sclera});
   // This chart uses +X/+Y rather than azimuth/height: reverse its winding.
   const idx=white.geometry.index.array;for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];white.geometry.computeVertexNormals();eye.add(white);
   eye.add(sphere({name:'Iris',radius:.0100,scale:[1,1,.25],position:[-.002*side,0,.007],segments:32,material:iris}));
   eye.add(sphere({name:'Pupil',radius:.0044,scale:[.75,1,.22],position:[-.002*side,0,.010],segments:24,material:mats.ink}));
   eye.add(sphere({name:'Corneal highlight',radius:.0021,position:[-.004,.004,.0115],segments:12,material:mats.white}));
   for(const sign of[-1,1]){const p=Array.from({length:13},(_,i)=>{const u=i/12;return[(u-.5)*.054,sign*.013*Math.sin(u*Math.PI)**.72,.0015];});eye.add(polyline(sign===1?'Upper eyeliner':'Lower lash line',p,sign===1?.0015:.00065,mats.ink));}
   eye.add(polyline('Outer lash wing',[[side*.022,.006,.002],[side*.028,.009,.001],[side*.031,.014,0]],.0008,mats.ink));
   root.add(eye);
   root.add(polyline('Eyebrow',[[side*.017,.055,.061],[side*.037,.061,.060],[side*.061,.055,.047]],.0017,mats.ink));
   root.add(polyline('Nostril',[[side*.004,-.034,.075],[side*.008,-.035,.075],[side*.010,-.033,.073]],.0006,lip));
   root.add(sphere({name:'Ear attachment',radius:.024,position:[side*.083,-.008,-.005],scale:[.40,1,.48],segments:24,material:skin}));
 }
 root.add(polyline('Mouth line',[[-.018,-.068,.061],[0,-.070,.066],[.018,-.066,.061]],.0008,mats.ink));
 root.add(polyline('Lower lip',[[-.012,-.073,.062],[0,-.075,.065],[.012,-.072,.062]],.001,lip));
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
 const mat=material('#ffffff',{map:texture,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.13,roughness:.36,metalness:.22,side:THREE.DoubleSide});mat.name='Iridescent gradient hair';
 const count=detail?64:40;
 for(let i=0;i<count;i++){
  const theta=-Math.PI+(i+.5)/count*Math.PI*2, half=Math.PI/count*.992;
  const fringe=Math.abs(theta)<.77;
  const bottom=fringe?.055+.008*Math.cos(theta*3)-.006*Math.sin(i*1.4):.15-length+.011*Math.cos(theta)+.004*Math.sin(i*1.7);
  const surf=(u,v)=>{
   const a=theta+(u-.5)*half*2,y=mix(.154,bottom,v);
   const dome=Math.sqrt(Math.max(.0001,1-(Math.max(0,y-.010)/.146)**2));
   const r=(.108*dome+.003)*(1+.22*v),wave=.0016*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
   return[Math.sin(a)*(r+wave),y,Math.cos(a)*(r*.86+wave)-.009];
  };
  const ribbon=patch(`Hair panel ${i+1}`,surf,{u:detail?4:2,v:detail?26:16,material:mat});
  const uv=ribbon.geometry.attributes.uv,p=ribbon.geometry.attributes.position;
  for(let j=0;j<uv.count;j++)uv.setY(j,THREE.MathUtils.clamp((p.getY(j)+.145)/.30,0,1));
  root.add(ribbon);

 }
 return root;
}
