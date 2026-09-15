import { THREE, group, box, material, mesh, torus, extrude } from '../modeling.js';
import { patch, sweep, ellipsoid, gaussian as G } from '../surfaces.js';
import { stage, fitSurface } from './core.js';
const armBones=/UpperArm|Forearm|Hand|Finger/;
function armFace(ctx,f){return f.ids.some(i=>ctx.body.weights[i].some(([b,w])=>armBones.test(b)&&w>.25));}
function solid(ctx,name,node,bind='Chest'){node.name=name;return ctx.add(node,bind);}
function seam(points,mat,name='Stitch',radius=.0008){return sweep({points,radii:radius,segments:Math.max(3,points.length*3),sides:5,material:mat,name});}
export function compressionFolds({at,width=.09,depth=.003,frequency=95}={}) {
  if(![at,width,depth,frequency].every(Number.isFinite)||width<=0||depth<0||depth>.02)throw new Error('Invalid fold field');
  return p=>depth*G(p[1],at,width)*(Math.sin(p[1]*frequency+Math.atan2(p[0],p[2])*.9)+.35*Math.sin(p[1]*frequency*1.7));
}
function fittedPocket(ctx,{name,x,y,width=.072,height=.09,side=1,bind='Chest',mat}) {
  const z=ctx.frontAt(x,y,side)+side*.027;
  const body=box({name,size:[width,height,.014],radius:.005,position:[x,y,z],material:mat});
  const flap=box({name:'Pocket flap',size:[width+.004,height*.25,.008],radius:.003,position:[x,y+height*.43,z+side*.010],material:mat});
  const thread=material('#a69873',{roughness:.9});
  const outline=[[-.46,-.46],[.46,-.46],[.46,.39],[-.46,.39],[-.46,-.46]].map(([u,v])=>[x+u*width,y+v*height,z+side*.009]);
  solid(ctx,name,group(name,[body,flap,seam(outline,thread)]),bind);
}
export function fieldShirt({color='#555747',fit='relaxed',wear=.5}={}) {return stage('field-shirt',ctx=>{
  if(!['relaxed','tailored'].includes(fit)||!Number.isFinite(wear)||wear<0||wear>1)throw new Error('Invalid shirt style');
  const mask=(p,f)=>p[1]>.968&&p[1]<1.443&&(!armFace(ctx,f)||p[1]>ctx.anchor('l-elbow').y-.035);
  const folds=p=>.0015*Math.sin(p[1]*88+Math.atan2(p[0],p[2])*5)*G(p[1],1.14,.18)+compressionFolds({at:ctx.anchor('l-elbow').y+.05,width:.08,depth:.0025})(p);
  const shirt=fitSurface(ctx,{name:'FieldShirt',select:mask,ease:fit==='relaxed'?.018:.010,folds,color,breath:true});
  const mat=shirt.material,thread=material('#b0a48a',{roughness:.95}),button=material('#716651',{metalness:.35,roughness:.6});
  for(const s of [-1,1]){
    fittedPocket(ctx,{name:`ShirtPocket${s>0?'L':'R'}`,x:s*.087,y:1.278,mat});
    const shape=patch({name:'Collar',uSegments:12,vSegments:18,material:mat,sample(u,v){const x=s*(.03+u*.055+v*.007),y=1.428-v*(.062+.038*u);return[x,y,ctx.frontAt(x,y)+.025+.012*Math.sin(Math.PI*u)];}});
    solid(ctx,`Collar${s}`,shape);
    const shoulder=ctx.anchor(s>0?'l-shoulder':'r-shoulder'),elbow=ctx.anchor(s>0?'l-elbow':'r-elbow');
    const cuffCenter=elbow.clone().lerp(ctx.anchor(s>0?'l-hand':'r-hand'),.05);
    const axis=elbow.clone().sub(shoulder).normalize(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
    const parts=[];
    for(let k=0;k<3;k++){const ring=torus({radius:.046+k*.0008,tube:.0055,segments:40,material:mat});ring.rotation.x=Math.PI/2;ring.updateMatrix();ring.geometry.applyMatrix4(ring.matrix);ring.rotation.set(0,0,0);ring.quaternion.copy(q);ring.position.copy(cuffCenter).addScaledVector(axis,(k-1)*.007);parts.push(ring);}
    solid(ctx,`RolledCuff${s}`,group('Rolled cloth cuff',parts),s>0?'L_Forearm':'R_Forearm');
  }
  const center=Array.from({length:24},(_,i)=>{const y=1.005+i/23*.36;return[.006,y,ctx.frontAt(.006,y)+.022];});
  solid(ctx,'ButtonPlacket',seam(center,mat,'Folded placket',.005));
  for(let i=0;i<7;i++){const y=1.05+i*.046;solid(ctx,`Button${i}`,ellipsoid({radii:[.004,.004,.0015],position:[.006,y,ctx.frontAt(.006,y)+.027],segments:16,material:button}));}
});}
export function cargoTrousers({color='#655f50',pockets=true}={}) {return stage('cargo-trousers',ctx=>{
  const mask=(p,f)=>p[1]>.205&&p[1]<1.015&&!armFace(ctx,f),knee=ctx.anchor('l-knee').y;
  const folds=p=>compressionFolds({at:knee,width:.11,depth:.0035})(p)+compressionFolds({at:.275,width:.07,depth:.004,frequency:135})(p)+.0012*Math.sin(p[1]*40+Math.atan2(p[0],p[2])*5);
  const pants=fitSurface(ctx,{name:'CargoTrousers',select:mask,ease:.022,folds,color});
  for(const s of [-1,1]){
    const leg=ctx.anchor(s>0?'l-upper-leg':'r-upper-leg'),mat=pants.material;
    if(pockets)fittedPocket(ctx,{name:`CargoPocket${s}`,x:s*(Math.abs(leg.x)+.032),y:.79,width:.083,height:.13,mat,bind:s>0?'L_Thigh':'R_Thigh'});
    const thread=material('#938975',{roughness:.95});
    const path=Array.from({length:20},(_,i)=>{const y=.29+i/19*.61,x=s*(Math.abs(leg.x)+.055);return[x,y,ctx.frontAt(x,y)+.024];});
    solid(ctx,`TrouserSeam${s}`,seam(path,thread),s>0?'L_Thigh':'R_Thigh');
  }
});}
export function hikingBoots({color='#4d3d2e'}={}) {return stage('hiking-boots',ctx=>{
  const mat=ctx.material('leather',color),rubber=material('#272522',{roughness:.93}),thread=material('#998b6f',{roughness:.9}),metal=material('#7a715a',{metalness:.7,roughness:.5});
  for(const [s,S] of [[1,'L'],[-1,'R']]){
    const ankle=ctx.anchor(s>0?'l-ankle':'r-ankle'),mask=(p,f)=>p[1]<.235&&p[0]*s>0&&!armFace(ctx,f);
    const boot=fitSurface(ctx,{name:`BootUpper${S}`,select:mask,ease:.012,folds:p=>.0025*Math.sin(p[1]*120)*G(p[1],.15,.07),color,kind:'leather'});
    const pos=boot.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,Math.max(.025,pos.getY(i)));boot.geometry.computeVertexNormals();
    const shoePoints=ctx.body.points.filter(p=>p[1]<.10&&p[0]*s>0);
    const minZ=Math.min(...shoePoints.map(p=>p[2]))-.012,maxZ=Math.max(...shoePoints.map(p=>p[2]))+.013,cx=shoePoints.reduce((n,p)=>n+p[0],0)/shoePoints.length,w=.064;
    const outline=[[-.76,0],[-1,.21],[-1,.78],[-.83,.94],[-.4,1],[.4,1],[.83,.94],[1,.78],[.93,.25],[.65,0]].map(([x,z])=>[cx+x*w,minZ+z*(maxZ-minZ)]);
    const sole=extrude({points:outline,depth:.022,bevel:.004,material:rubber});sole.geometry.rotateX(Math.PI/2);sole.position.y=.026;
    const parts=[sole];
    for(let k=0;k<9;k++)for(const side of [-1,1])parts.push(box({size:[.035,.010,.017],radius:.002,position:[cx+side*.042,.008,minZ+.022+k/8*(maxZ-minZ-.045)],rotation:[0,side*18,0],material:rubber}));
    for(let k=0;k<8;k++){
      const y=.078+k*.018,z=ctx.frontAt(ankle.x,y)+.017,spread=.024;
      parts.push(seam([[ankle.x-spread,y,z],[ankle.x+spread,y+.011,z+.002]],thread,'Lace',.0016));
      for(const side of [-1,1])parts.push(torus({radius:.0035,tube:.001,segments:12,position:[ankle.x+side*.027,y,z],material:metal}));
    }
    solid(ctx,`BootDetails${S}`,group(`Hiking boot ${S}`,parts),`${S}_Foot`);
  }
});}
export function fingerlessGloves({color='#332f27'}={}) {return stage('fingerless-gloves',ctx=>{
  for(const s of ['l','r']){
    const hand=ctx.anchor(`${s}-hand`),S=s.toUpperCase(),select=(p,f)=>f.ids.some(i=>ctx.body.weights[i].some(([b,w])=>b===`${S}_Hand`&&w>.35))&&p[1]>hand.y-.09;
    fitSurface(ctx,{name:`FingerlessGlove${S}`,select,ease:.0025,color,kind:'leather'});
  }
});}
export function scarf({color='#76624a'}={}) {return stage('woven-scarf',ctx=>{
  const mat=ctx.material('cloth',color),neck=ctx.anchor('neck'),parts=[];
  for(let band=0;band<4;band++){
    const path=Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2;return[.068*Math.sin(a),neck.y-.027-band*.012+.012*Math.cos(a)+.005*Math.sin(3*a+band),.054*Math.cos(a)+.012];});
    parts.push(sweep({points:path,radii:.017,segments:72,sides:12,closed:true,material:mat}));
  }
  parts.push(patch({uSegments:24,vSegments:40,material:mat,sample(u,v){const x=(u-.5)*(.085-.012*v)-.025*v,y=neck.y-.067-v*.15;return[x,y,ctx.frontAt(x,y)+.03+.007*Math.sin(u*15+v*4)];}}));
  solid(ctx,'WovenScarf',group('Woven scarf',parts));
});}
export function utilityBelt({color='#4e3d2b',pouches=2}={}) {return stage('utility-belt',ctx=>{
  if(!Number.isInteger(pouches)||pouches<0||pouches>4)throw new Error('Belt pouches must be 0..4');
  const leather=ctx.material('leather',color),metal=material('#8d8165',{metalness:.7,roughness:.5});
  const path=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2,x=.14*Math.sin(a),y=1.01;return[x,y,Math.cos(a)>0?ctx.frontAt(x,y)+.028:ctx.frontAt(x,y,-1)-.028];});
  const curve=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p)),true);
  const belt=patch({uSegments:64,vSegments:3,wrapU:true,material:leather,sample(u,v){const p=curve.getPoint(u);p.y+=(v-.5)*.035;return p.toArray();}});
  const z=ctx.frontAt(0,1.01)+.037,parts=[belt];
  for(const y of [-.017,.017])parts.push(box({size:[.052,.005,.008],position:[0,1.01+y,z],material:metal}));
  for(const x of [-.024,.024])parts.push(box({size:[.005,.035,.008],position:[x,1.01,z],material:metal}));
  for(let i=0;i<pouches;i++){
    const s=i%2?1:-1,x=s*(.122+Math.floor(i/2)*.03),y=.948,pz=ctx.frontAt(x,y)+.045;
    parts.push(box({size:[.06,.102,.043],radius:.010,position:[x,y,pz],rotation:[0,s*15,0],material:leather}),box({size:[.064,.032,.047],radius:.008,position:[x,y+.041,pz+.004],material:leather}));
  }
  solid(ctx,'UtilityBelt',group('Utility belt',parts),'Hips');
});}
export function backpack({color='#55503c'}={}) {return stage('canvas-backpack',ctx=>{
  const cloth=ctx.material('cloth',color),leather=ctx.material('leather','#4f4230'),metal=material('#837659',{metalness:.6,roughness:.5});
  const back=ctx.frontAt(0,1.25,-1)-.105,parts=[box({size:[.265,.335,.145],radius:.038,position:[0,1.25,back],material:cloth}),box({size:[.24,.115,.09],radius:.027,position:[0,1.39,back-.031],material:cloth}),box({size:[.20,.21,.055],radius:.020,position:[0,1.23,back-.094],material:cloth})];
  for(const s of [-1,1]){
    const x=s*.093,path=[[x,1.44,back+.014],[x,1.416,.008],[s*.121,1.365,ctx.frontAt(s*.121,1.365)+.035],[s*.132,1.20,ctx.frontAt(s*.132,1.20)+.034],[s*.128,1.08,.035],[x,1.11,back+.045]];
    const curve=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p)));
    parts.push(patch({uSegments:4,vSegments:56,material:leather,sample(u,v){const p=curve.getPoint(v);p.x+=(u-.5)*.027;return p.toArray();}}));
    parts.push(box({size:[.032,.21,.006],position:[s*.07,1.245,back-.125],material:leather}));
    for(let row=0;row<5;row++)parts.push(box({size:[.070,.013,.009],position:[s*.053,1.17+row*.04,back-.129],radius:.002,material:leather}));
    parts.push(torus({radius:.012,tube:.0023,segments:20,scale:[.75,1,1],position:[x,1.36,back-.087],material:metal}));
  }
  solid(ctx,'CanvasBackpack',group('Canvas backpack',parts));
});}
