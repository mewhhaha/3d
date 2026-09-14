import { THREE, group, box, material } from './modeling.js';
import { detail, loft, ellipsoid, sweep, patch, profileAt, gaussian as G } from './surfaces.js';
import { pbrMaterial } from './textures.js';
// An authored, stylized anatomical base. Not a scan or a likeness/medical model.
const HEAD = [[0,.065,.06,.07],[.06,.17,.135,.01],[.17,.25,.20,-.025],[.34,.30,.25,-.03],[.52,.32,.275,-.025],[.70,.32,.275,-.025],[.84,.29,.25,-.035],[.96,.19,.16,-.03],[1,.008,.008,-.03]];
function headProfile(jaw) { return HEAD.map(([y,x,z,c])=>[y,x*(1+(jaw-1)*G(y,.15,.18)),z,c]); }
function facialOffset(x,y,nose) {
  return .036*G(x,0,.044)*G(y,.54,.1) + .105*nose*G(x,0,.050)*G(y,.434,.037)
    + .030*(G(x,-.05,.022)+G(x,.05,.022))*G(y,.414,.023)
    - .039*(G(x,-.147,.066)+G(x,.147,.066))*G(y,.581,.040)
    + .021*(G(x,-.145,.077)+G(x,.145,.077))*G(y,.654,.031)
    + .029*(G(x,-.194,.070)+G(x,.194,.070))*G(y,.45,.063)
    + .027*G(x,0,.095)*G(y,.278,.029) + .020*G(x,0,.10)*G(y,.105,.048);
}
export function humanHead({ quality='studio', jaw=1, nose=1, skin, hair, eyes, lips, stone=false, curls=false, name='Head', ...options } = {}) {
  const d=detail(quality);
  if(![jaw,nose].every(n=>Number.isFinite(n)&&n>=.7&&n<=1.3)) throw new Error('Head jaw/nose ratios must be in 0.7..1.3');
  skin ||= pbrMaterial('skin',{size:d.textureSize}); hair ||= pbrMaterial('hair',{size:d.textureSize});
  eyes ||= material('#56402b',{name:'Iris',roughness:.3}); lips ||= material('#a36b59',{name:'Lips',roughness:.6});
  const sections=headProfile(jaw);
  const faceZ=(x,y)=>{
    const [rx,rz,cz]=profileAt(sections,y), cos=Math.sqrt(Math.max(0,1-(x/rx)**2));
    return cz+rz*cos+facialOffset(x,y,nose)*cos**4;
  };
  const face=loft({name:'Face • sculpted continuous surface',sections,radialSegments:d.radial*2,heightSegments:d.rings,
    deform:([x,y,z],{angle})=>[x,y,z+facialOffset(x,y,nose)*Math.max(0,Math.cos(angle))**4],material:skin});
  const parts=[face];
  const white=stone?skin:material('#d8cec0',{name:'Sclera',roughness:.38});
  const dark=stone?skin:material('#291e1b',{name:'Eye and mouth recess',roughness:.6});
  for(const side of [-1,1]) {
    const cx=side*.147, ey=.584, width=.073;
    parts.push(patch({name:`${side<0?'Right':'Left'} eye`,uSegments:32,vSegments:12,
      sample(u,v){const x=cx+(u-.5)*width*2, arc=Math.max(.015,Math.sin(Math.PI*u)), y=ey+arc*(v-.5)*.062;
        return [x,y,faceZ(x,y)+.012+Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*.020];},material:white}));
    const z=faceZ(cx,ey)+.038;
    parts.push(ellipsoid({name:'Iris',radii:[.024,.025,.008],position:[cx,ey,z],material:stone?skin:eyes,segments:32}));
    if(!stone) {
      parts.push(ellipsoid({name:'Pupil',radii:[.010,.011,.004],position:[cx,ey,z+.008],material:dark,segments:24}));
      parts.push(ellipsoid({name:'Eye catchlight',radii:[.004,.004,.003],position:[cx-.007,ey+.010,z+.011],material:white,segments:16}));
    }
    for(const upper of [true,false]) {
      const points=Array.from({length:13},(_,i)=>{
        const u=i/12,x=cx+(u-.5)*width*2,y=ey+Math.sin(Math.PI*u)*(upper?.034:-.029);
        return [x,y,faceZ(x,y)+.014];
      });
      parts.push(sweep({name:upper?'Upper eyelid':'Lower eyelid',points,radii:[.002,.006,.007,.005,.002],segments:32,sides:8,material:skin}));
    }
    const brow=Array.from({length:9},(_,i)=>{const x=cx+(i/8-.5)*.18,y=.663+.015*Math.sin(i/8*Math.PI);return[x,y,faceZ(x,y)+.006];});
    parts.push(sweep({name:'Brow ridge',points:brow,radii:[.002,.008,.009,.005,.001],segments:24,material:stone?skin:hair}));
    parts.push(ellipsoid({name:'Ear',radii:[.047,.108,.060],position:[side*.320,.488,-.012],material:skin,segments:32}));
    const helix=Array.from({length:19},(_,i)=>{const a=i/18*Math.PI*1.85;return[side*(.33+.022*Math.sin(a)),.489+.087*Math.cos(a),.023+.029*Math.sin(a)];});
    parts.push(sweep({name:'Ear helix',points:helix,radii:[.005,.010,.009,.004],segments:40,material:skin}));
    parts.push(sweep({name:'Ear antihelix',points:[[side*.336,.427,.037],[side*.348,.478,.043],[side*.335,.530,.034]],radii:.006,segments:20,material:skin}));
    if(!stone) parts.push(ellipsoid({name:'Nostril inset',radii:[.013,.008,.005],position:[side*.033,.404,faceZ(side*.033,.404)+.001],rotation:[-30,0,0],material:dark,segments:24}));
  }
  for(const upper of [true,false]) {
    parts.push(patch({name:upper?'Upper lip':'Lower lip',uSegments:40,vSegments:10,
      sample(u,v) {const x=(u-.5)*.19, arc=Math.max(.01,Math.sin(Math.PI*u)), seam=.28+.005*Math.cos(u*Math.PI*4)*arc;
        const w=upper?v:1-v; const y=seam+(upper?1:-1)*w*arc*(upper?.017:.021);
        return[x,y,faceZ(x,y)+.003+Math.sin(Math.PI*v)*arc*.004];},material:stone?skin:lips}));
  }
  const mouth=Array.from({length:15},(_,i)=>{const u=i/14,x=(u-.5)*.19,y=.28+.005*Math.cos(u*Math.PI*4)*Math.sin(Math.PI*u);return[x,y,faceZ(x,y)+.004];});
  parts.push(sweep({name:'Lip separation',points:mouth,radii:[.001,.002,.002,.001],segments:32,sides:6,material:dark}));
  parts.push(patch({name:'Hair cap',uSegments:d.radial,vSegments:32,wrapU:true,
    sample(u,v){const a=u*Math.PI*2,front=Math.max(0,Math.cos(a)),start=.39+.38*front, y=start+(1-start)*v;
      const [rx,rz,cz]=profileAt(sections,Math.min(.999,y));return[(rx+.022)*Math.sin(a),y+.017,cz+(rz+.020)*Math.cos(a)];},material:hair}));
  if(curls) {
    for(let i=0;i<d.strands;i++) {
      const a=i*2.399963, band=i%3, y=.72+band*.090, [rx,rz,cz]=profileAt(sections,y);
      const center=new THREE.Vector3((rx+.012)*Math.sin(a),y,cz+(rz+.025)*Math.cos(a));
      const tangent=new THREE.Vector3(Math.cos(a),0,-Math.sin(a)), outward=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
      const points=Array.from({length:25},(_,k)=>{const t=k/24,angle=t*Math.PI*3.4,r=.045*(1-t*.58);return center.clone().addScaledVector(tangent,r*Math.cos(angle)).add(new THREE.Vector3(0,r*Math.sin(angle),0)).addScaledVector(outward,.015+t*.019).toArray();});
      parts.push(sweep({name:`Carved curl ${i+1}`,points,radii:[.010,.020,.016,.002],segments:40,sides:8,material:hair}));
    }
  } else {
    parts.push(ellipsoid({name:'Hair bun',radii:[.13,.12,.11],position:[.065,.84,-.285],material:hair,segments:d.radial}));
    for(let i=0;i<d.strands;i++) {
      const a=-1.4+2.8*i/Math.max(1,d.strands-1), x=Math.sin(a)*.305;
      const points=[[x,.79-.07*Math.abs(Math.sin(a)),.245*Math.cos(a)],[x*.88,.94,-.02],[x*.50+.025,.93,-.235],[.065,.84,-.375]];
      parts.push(sweep({name:`Swept hair lock ${i+1}`,points,radii:[.002,.012,.013,.003],segments:36,sides:6,material:hair}));
    }
    for(let i=0;i<12;i++) {
      const a=i/12*Math.PI*2;
      const points=Array.from({length:20},(_,k)=>{const t=k/19*Math.PI*1.9;return[.065+.124*Math.cos(t)*Math.cos(a),.84+.112*Math.sin(t),-.285+.102*Math.cos(t)*Math.sin(a)];});
      parts.push(sweep({name:'Bun strand',points,radii:.004,segments:32,sides:6,material:hair}));
    }
  }
  return group(name,parts,options);
}
export function sculptureBust({quality='studio',finish='marble',jaw=1.05,nose=1.04,turn=-10,height=.72}={}) {
  const d=detail(quality),stone=pbrMaterial(finish,{name:'Carved stone',size:d.textureSize,seed:7});
  const parts=[humanHead({quality,jaw,nose,skin:stone,hair:stone,eyes:stone,lips:stone,stone:true,curls:true,position:[0,.59,0],scale:.37,rotation:[0,turn,0]}),
    loft({name:'Neck',sections:[[.44,.095,.085],[.53,.060,.060],[.65,.053,.055]],material:stone,radialSegments:d.radial,heightSegments:32}),
    loft({name:'Shoulders and chest',sections:[[.18,.12,.10],[.25,.20,.12],[.37,.26,.115],[.44,.23,.10],[.51,.10,.072]],material:stone,radialSegments:d.radial,heightSegments:d.rings}),
    box({name:'Plinth foot',size:[.37,.055,.28],radius:.012,position:[0,.0275,0],material:stone}),
    box({name:'Plinth molding',size:[.32,.035,.24],radius:.008,position:[0,.070,0],material:stone}),
    loft({name:'Pedestal',sections:[[.085,.125,.093],[.12,.085,.075],[.20,.085,.075]],material:stone,radialSegments:64,heightSegments:24})];
  parts.push(patch({name:'Draped mantle',uSegments:d.radial,vSegments:d.rings,
    sample(u,v){const x=(u-.5)*.48,y=.19+v*.27+.055*u,edge=Math.sin(Math.PI*u);
      return[x,y,.095+edge*.028 + .010*Math.sin(u*Math.PI*16+v*3)*Math.sin(v*Math.PI)];},material:stone}));
  for(let i=0;i<4;i++) parts.push(sweep({name:'Mantle fold',points:[[-.19+i*.047,.21,.108],[-.15+i*.062,.29,.140],[-.06+i*.079,.42,.103]],radii:[.003,.010,.003],segments:40,sides:8,material:stone}));
  return fitHeight(group('Classical study',parts),height);
}
export function humanoid({quality='studio',height=1.75,jaw=.88,nose=.95,skinColor='#c18b70',clothColor='#555e49',backpack=true}={}) {
  const d=detail(quality),skin=pbrMaterial('skin',{size:d.textureSize,color:skinColor,name:'Skin microdetail'}),cloth=pbrMaterial('cloth',{size:d.textureSize,color:clothColor,name:'Woven field fabric'}),
    leather=pbrMaterial('leather',{size:d.textureSize,name:'Worn leather'}),hair=pbrMaterial('hair',{size:d.textureSize,name:'Chestnut hair'}),scarf=pbrMaterial('cloth',{size:d.textureSize,color:'#837052',name:'Scarf weave'}),
    metal=material('#a58a57',{name:'Brass fittings',metalness:.72,roughness:.36}),rubber=material('#292624',{name:'Boot soles',roughness:.95});
  const parts=[humanHead({quality,jaw,nose,skin,hair,position:[0,1.486,.008],scale:.238}),
    loft({name:'Neck',sections:[[1.40,.046,.041],[1.50,.041,.040]],radialSegments:48,heightSegments:24,material:skin}),
    loft({name:'Tailored field jacket',sections:[[.92,.143,.096],[1.01,.125,.090],[1.09,.117,.086],[1.22,.16,.109],[1.32,.175,.104],[1.385,.187,.092],[1.44,.060,.043]],radialSegments:d.radial,heightSegments:d.rings,
      deform:([x,y,z],{angle})=>[x,y,z+.004*Math.sin(angle*12+y*42)*G(y,1.12,.16)],material:cloth}),
    loft({name:'Waist belt',sections:[[1.009,.130,.099],[1.046,.131,.099]],radialSegments:64,heightSegments:4,material:leather})];
  for(const s of [-1,1]) {
    parts.push(loft({name:'Trousers',sections:[[.13,.040,.046,0,s*.091],[.31,.050,.056,0,s*.098],[.43,.063,.062,0,s*.102],[.56,.054,.065,.005,s*.096],[.72,.072,.078,0,s*.088],[.90,.083,.087,0,s*.080],[.96,.080,.083,0,s*.077]],radialSegments:d.radial,heightSegments:d.rings,
      deform:([x,y,z],{angle})=>[x,y,z+.004*Math.sin(y*105+angle*3)*G(y,.56,.095)],material:cloth}));
    parts.push(sweep({name:'Rolled sleeve',points:[[s*.18,1.36,0],[s*.23,1.25,0],[s*.268,1.13,.007]],radii:[.061,.057,.045],segments:40,sides:24,material:cloth}));
    parts.push(sweep({name:'Forearm',points:[[s*.268,1.13,.007],[s*.282,1.037,.018],[s*.296,.953,.02]],radii:[.044,.035,.024],segments:40,sides:24,material:skin}));
    parts.push(sweep({name:'Sleeve cuff',points:[[s*.262,1.153,.006],[s*.270,1.121,.009]],radii:[.047,.047],segments:4,sides:24,material:scarf}));
    parts.push(ellipsoid({name:'Palm',radii:[.026,.044,.020],position:[s*.30,.915,.023],rotation:[0,0,s*8],material:leather,segments:32}));
    for(let f=0;f<4;f++) {
      const x=s*(.280+f*.013),length=[.048,.059,.055,.041][f];
      parts.push(sweep({name:`Finger ${f+1}`,points:[[x,.895,.027],[x+s*.001,.895-length*.55,.030],[x,.895-length,.041]],radii:[.007,.006,.004],segments:16,sides:8,material:skin}));
    }
    parts.push(sweep({name:'Thumb',points:[[s*.278,.929,.029],[s*.257,.907,.04],[s*.255,.885,.049]],radii:[.011,.008,.005],segments:16,sides:8,material:skin}));
    parts.push(loft({name:'Boot shaft',sections:[[.084,.057,.073,.016,s*.092],[.17,.046,.057,0,s*.092],[.31,.055,.062,0,s*.098],[.37,.058,.062,0,s*.10]],radialSegments:48,heightSegments:40,material:leather}));
    parts.push(ellipsoid({name:'Boot upper',radii:[.061,.062,.129],position:[s*.092,.073,.049],material:leather,segments:48}));
    parts.push(box({name:'Sole',size:[.132,.034,.281],radius:.014,position:[s*.092,.020,.049],material:rubber}));
    for(let k=0;k<7;k++) {
      const y=.13+k*.027;
      parts.push(sweep({name:'Boot lace',points:[[s*.092-.029,y,.062],[s*.092+.029,y+.018,.063]],radii:.0023,segments:3,sides:5,material:scarf}));
    }
    parts.push(box({name:'Cargo pocket',size:[.062,.10,.021],radius:.008,position:[s*.152,.808,.037],material:cloth}));
    parts.push(box({name:'Jacket pocket',size:[.077,.09,.014],radius:.005,position:[s*.090,1.272,.104],material:cloth}));
    parts.push(sweep({name:'Backpack strap',points:[[s*.090,1.405,-.04],[s*.112,1.37,.074],[s*.127,1.25,.11],[s*.135,1.06,.062]],radii:.013,segments:48,sides:8,material:leather}));
  }
  parts.push(box({name:'Buckle top',size:[.060,.006,.012],position:[0,1.046,.111],material:metal}),box({name:'Buckle bottom',size:[.060,.006,.012],position:[0,1.012,.111],material:metal}));
  for(const s of [-1,1]) parts.push(box({name:'Buckle side',size:[.006,.038,.012],position:[s*.027,1.029,.111],material:metal}));
  for(let i=0;i<7;i++) parts.push(ellipsoid({name:'Jacket button',radii:[.004,.004,.003],position:[0,1.07+i*.042,.107],material:metal,segments:16}));
  const scarfPoints=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2;return[.072*Math.sin(a),1.427+.009*Math.sin(a*3),.060*Math.cos(a)];});
  parts.push(sweep({name:'Wrapped scarf',points:scarfPoints,radii:.027,segments:64,sides:16,closed:true,material:scarf}));
  parts.push(patch({name:'Scarf tail',uSegments:24,vSegments:32,sample(u,v){const w=1-v;return[-.048+u*.10+.033*w,1.414-w*.146,.076+w*.053+Math.sin(u*Math.PI*6)*.007];},material:scarf}));
  if(backpack) parts.push(box({name:'Backpack',size:[.252,.32,.124],radius:.040,position:[0,1.239,-.146],material:cloth}),box({name:'Backpack flap',size:[.228,.11,.045],radius:.016,position:[0,1.352,-.211],material:leather}));
  return fitHeight(group('Field explorer',parts),height);
}
function fitHeight(root,height) {
  if(!Number.isFinite(height)||height<.1||height>5) throw new Error('Height must be 0.1..5 meters');
  const b=new THREE.Box3().setFromObject(root,true),factor=height/(b.max.y-b.min.y);
  root.scale.setScalar(factor);root.position.y=-b.min.y*factor;return root;
}
