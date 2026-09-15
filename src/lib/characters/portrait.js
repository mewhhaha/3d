import { THREE, group, material, mesh } from '../modeling.js';
import { patch, ellipsoid, sweep } from '../surfaces.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stage, fitSurface } from './core.js';
const noise=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function merged(name,objects,mat){const geometries=objects.map(o=>{o.updateMatrix();o.geometry.applyMatrix4(o.matrix);return o.geometry;});const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());return mesh(geometry,{name,material:mat});}
export function portrait({eyes='#655131'}={}){return stage('portrait',ctx=>{
 const white=material('#bab7a6',{roughness:.35}),iris=material(eyes,{roughness:.35}),pupil=material('#0b0a08',{roughness:.2}),brow=ctx.material('hair','#30251f');
 for(const side of ['l','r']){
 const c=ctx.anchor(`${side}-eye`),s=side==='l'?1:-1,r=.0119,parts=[];parts.push(ellipsoid({radii:[r,r,r],position:c.toArray(),material:white,segments:48}));
 for(const[radius,mat,offset]of[[.0058,iris,.0001],[.0024,pupil,.0002]])parts.push(patch({uSegments:40,vSegments:8,wrapU:true,material:mat,sample(u,v){const a=u*Math.PI*2,d=Math.max(.00001,v*radius);return[c.x+d*Math.sin(a),c.y+d*Math.cos(a),c.z+Math.sqrt(r*r-d*d)+offset];}}));
 ctx.add(group(`Eye_${side}`,parts),'Head');const hairs=[];
 for(let k=0;k<65;k++){const t=k/64,x=c.x+s*(t-.45)*.040,y=c.y+.020+.005*Math.sin(t*Math.PI),z=ctx.frontAt(x,y)+.0009;hairs.push(sweep({points:[[x,y,z],[x+s*.0015,y+.0025,z+.0006],[x+s*.003,y+.003,z]],radii:[.00016,.00022,.00006],segments:4,sides:3,material:brow}));}
 ctx.add(merged(`Eyebrow_${side}`,hairs,brow),'Head');
 }
});}
export function tiedBun({color='#2f251e',looseness=.65}={}){return stage('tied-bun',ctx=>{
 if(!Number.isFinite(looseness)||looseness<0||looseness>1)throw new Error('Hair looseness must be 0..1');
 const dark=ctx.material('hair',color),light=material('#514131',{roughness:.72}),mid=material('#392b22',{roughness:.72}),cz=.035;
 const hairline=a=>1.574+.082*Math.max(0,Math.cos(a))+.014*Math.abs(Math.sin(a));
 fitSurface(ctx,{name:'HairFoundation',select:p=>p[1]>hairline(Math.atan2(p[0],p[2]-cz)),ease:.003,kind:'hair',color});
 // A continuous cranium envelope removes the stepped nearest-ring artifacts.
 const shell=(a,y,inflate=.003)=>{const cy=1.645,ry=.088,zc=.049,falloff=Math.sqrt(Math.max(.002,1-((y-cy)/ry)**2));return[(.079*falloff+inflate)*Math.sin(a),y,zc+(.101*falloff+inflate)*Math.cos(a)];};
 const groups=[[],[],[]],count=ctx.quality==='fine'?360:ctx.quality==='studio'?200:100;
 for(let i=0;i<count;i++){
 const a=i/count*Math.PI*2,sy=hairline(a)+(noise(i)-.5)*.009,turn=a<Math.PI?1:-1;
 const controls=[shell(a,sy,.003),shell(a+turn*.20,Math.max(sy+.012,1.676),.005),shell(a+turn*.7,1.714,.005),[.013+.029*Math.sin(a),1.732,-.006],[.013+.027*Math.sin(a),1.705,-.047]],curve=new THREE.CatmullRomCurve3(controls.map(p=>new THREE.Vector3(...p))),points=curve.getPoints(24).map(p=>p.toArray());
 const thickness=i%5===0?.0011:.00035+noise(i+8)*.00045;groups[i%3].push(sweep({points,radii:[thickness*.18,thickness,thickness*.85,.00008],segments:24,sides:5,material:dark}));
 }
 const bun=[.013,1.709,-.049];ctx.add(ellipsoid({name:'HairBunVolume',radii:[.036,.037,.035],position:bun,segments:48,material:dark}),'Head');
 for(let i=0;i<90;i++){const a=i/90*Math.PI*2,r=.033+(noise(i+31)-.5)*.005,points=Array.from({length:24},(_,j)=>{const t=j/23*Math.PI*2.4;return[bun[0]+r*Math.sin(t)*Math.cos(a),bun[1]+r*Math.cos(t),bun[2]+r*Math.sin(t)*Math.sin(a)];});groups[i%3].push(sweep({points,radii:.0007+noise(i)*.0006,segments:30,sides:5,material:dark}));}
 for(const side of[-1,1])for(let i=0;i<8;i++){const start=shell(side*(.38+i*.055),1.665,.004),endY=1.60-noise(i+side+9)*.025*looseness,path=[start,[side*(.042+i*.0012),1.65,.122],[side*(.063+i*.001),1.624,.117],[side*(.074+i*.0013),endY,.080]];groups[i%3].push(sweep({points:path,radii:[.0007,.0011,.0007,.00008],segments:30,sides:5,material:dark}));}
 for(let i=0;i<3;i++)ctx.add(merged(`HairStrands${i}`,groups[i],[dark,mid,light][i]),'Head');
});}
