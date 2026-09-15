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
 const dark=material(color,{roughness:.75}),mid=material('#392b22',{roughness:.75}),light=material('#4b392a',{roughness:.75}),cz=.049;
 const hairline=a=>1.575+.078*Math.max(0,Math.cos(a))+.012*Math.abs(Math.sin(a));
 const cap=fitSurface(ctx,{name:'HairFoundation',select:p=>p[1]>hairline(Math.atan2(p[0],p[2]-cz)),ease:.0035,kind:'hair',color});cap.material=dark;
 const shell=(a,y,inflate=.003)=>{const falloff=Math.sqrt(Math.max(.003,1-((y-1.639)/.083)**2));return[(.077*falloff+inflate)*Math.sin(a),y,cz+(.099*falloff+inflate)*Math.cos(a)];};
 const groups=[[],[],[]],count=ctx.quality==='fine'?540:ctx.quality==='studio'?360:160;
 for(let i=0;i<count;i++){
 const a=-Math.PI+(i+.5)/count*Math.PI*2,side=a<0?-1:1,sy=hairline(a)+(noise(i)-.5)*.004;
 const points=Array.from({length:29},(_,k)=>{const t=k/28,e=t*t*(3-2*t),angle=a+(side*(Math.PI-.12)-a)*e,y=sy+(1.694-sy)*t+.040*Math.sin(Math.PI*t),p=shell(angle,Math.min(1.721,y),.003+(i%7)*.0002);if(t>.80){const blend=(t-.8)/.2;p[0]=(1-blend)*p[0]+blend*(.009+.021*Math.sin(a));p[2]=(1-blend)*p[2]+blend*(-.049);}return p;});
 const width=i%7===0?.0012:.0004+noise(i+8)*.0004;groups[i%3].push(sweep({points,radii:[width*.15,width,width,.00005],segments:36,sides:5,material:dark}));
 }
 const bun=[.009,1.704,-.053];ctx.add(ellipsoid({name:'HairBunVolume',radii:[.038,.037,.038],position:bun,segments:48,material:dark}),'Head');
 for(let i=0;i<110;i++){const a=i/110*Math.PI*2,r=.033+(noise(i+31)-.5)*.006,points=Array.from({length:24},(_,j)=>{const t=j/23*Math.PI*2.4;return[bun[0]+r*Math.sin(t)*Math.cos(a),bun[1]+r*Math.cos(t),bun[2]+r*Math.sin(t)*Math.sin(a)];});groups[i%3].push(sweep({points,radii:.0006+noise(i)*.0006,segments:30,sides:5,material:dark}));}
 for(const side of [-1,1])for(let i=0;i<7;i++){const start=shell(side*(.38+i*.055),1.659,.004),endY=1.60-noise(i+side+9)*.025*looseness;groups[i%3].push(sweep({points:[start,[side*(.042+i*.0012),1.65,.126],[side*(.066+i*.001),1.624,.119],[side*(.074+i*.0013),endY,.080]],radii:[.0005,.0008,.0006,.00006],segments:30,sides:5,material:dark}));}
 for(let i=0;i<3;i++)ctx.add(merged(`HairStrands${i}`,groups[i],[dark,mid,light][i]),'Head');
});}
