import { THREE, material, mesh } from '../modeling.js';
import { ellipsoid, sweep } from '../surfaces.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stage, fitSurface } from './core.js';
import { radialSurface } from './radial-surface.js';
const random=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function bundle(name,strands,mat){const geometries=strands.map(s=>s.geometry),g=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());return mesh(g,{name,material:mat});}
/** Layer scalp coverage, flow-following clumps, fine strands, a bun and flyaways. */
export function tiedBun({color='#30271f',looseness=.65}={}) {
  return stage('tied-bun',ctx=>{
    if(!Number.isFinite(looseness)||looseness<0||looseness>1)throw new Error('Hair looseness must be 0..1');
    const dark=material(color,{roughness:.72}),mid=material('#382b22',{roughness:.72}),highlight=material('#45352a',{roughness:.72});
    const cz=.038,project=radialSurface(ctx.body,{centerZ:cz,minY:1.56});
    const hairline=a=>1.603+.052*Math.max(0,Math.cos(a))+.017*Math.abs(Math.sin(a))+.002*Math.sin(3*a);
    const cap=fitSurface(ctx,{name:'HairFoundation',select:p=>p[1]>hairline(Math.atan2(p[0],p[2]-cz)),ease:.003,kind:'hair',color});cap.material=dark;
    const groups=[[],[],[]],count=ctx.quality==='fine'?540:ctx.quality==='studio'?340:150;
    const guide=(a,i)=>Array.from({length:33},(_,j)=>{
      const t=j/32,side=a<0?-1:1,e=t*t*(3-2*t),start=hairline(a)-.003;
      const angle=a+(side*(Math.PI-.05)-a)*e;
      const y=start+(1.695-start)*t+.033*Math.sin(Math.PI*t);
      const padding=.004+.004*Math.sin(Math.PI*t)+.0008*Math.sin(i*2.4);
      const p=project(angle,Math.min(1.716,y),padding);
      if(t>.86){const f=(t-.86)/.14;p[0]=p[0]*(1-f)+f*(.013+.022*Math.sin(a));p[1]=p[1]*(1-f)+f*1.698;p[2]=p[2]*(1-f)+f*(-.052);}
      return p;
    });
    for(let i=0;i<55;i++){
      const a=-Math.PI+(i+.5)/55*Math.PI*2;
      groups[0].push(sweep({points:guide(a,i),radii:[.0002,.0026,.0035,.0002],segments:40,sides:6,material:dark}));
    }
    for(let i=0;i<count;i++){
      const a=-Math.PI+(i+.5)/count*Math.PI*2,width=.00023+random(i)*.00024;
      groups[i%3].push(sweep({points:guide(a,i),radii:[.00007,width,width,.00004],segments:40,sides:4,material:dark}));
    }
    const bun=[.013,1.704,-.056];ctx.add(ellipsoid({name:'HairBunVolume',radii:[.034,.036,.034],position:bun,segments:40,material:dark}),'Head');
    for(let i=0;i<85;i++){
      const a=i/85*Math.PI*2,r=.033+(random(i+31)-.5)*.004;
      const points=Array.from({length:25},(_,j)=>{const t=j/24*Math.PI*2.4;return[bun[0]+r*Math.sin(t)*Math.cos(a),bun[1]+r*Math.cos(t),bun[2]+r*Math.sin(t)*Math.sin(a)];});
      groups[i%3].push(sweep({points,radii:.0005+random(i)*.0006,segments:32,sides:5,material:dark}));
    }
    for(const side of[-1,1])for(let i=0;i<9;i++){
      const start=project(side*(.36+i*.045),1.659,.006);
      const points=[start,[side*(.043+i*.0012),1.649,.134],[side*(.067+i*.001),1.622,.127],[side*(.075+i*.001),1.61-random(i+8)*.047*looseness,.09]];
      groups[i%3].push(sweep({points,radii:[.0001,.0006,.0005,.00004],segments:36,sides:4,material:dark}));
    }
    groups.forEach((strands,i)=>ctx.add(bundle(`HairFlow${i}`,strands,[dark,mid,highlight][i]),'Head'));
  });
}
