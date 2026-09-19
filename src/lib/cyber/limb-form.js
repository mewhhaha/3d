import {sculptedLimbSupport,deltoidSupport} from './mass-forms.js';
import {group,material,sphere} from '../modeling.js';
import {shapeProfile,thickenSurface} from '../shape-rails.js';
import {contourVolume} from '../contour-volume.js';
import {attachToSurface,surfacePath} from '../surface-frame.js';
import {contourArmor} from './torso-form.js';
import {radialPort,routedCable,orient,link,bellows} from './mechanics.js';
import {archedFootSurface} from './contour-armor.js';

/** Local -Y limb axis; ends remain on the fixed segment centers. Contours, sweep,
 * radii and attachment sampling share the support, not a post-pose mesh warp. */
export function limbFormSupport({type='thigh',side=1,massStyle='profiled'}={}){
 if(!['thigh','shin','forearm','upper'].includes(type)||![-1,1].includes(side))throw new Error('Invalid limb support kind/side');
 if(!['profiled','sculpted','structured'].includes(massStyle))throw new Error('Invalid mass style');
 if(massStyle!=='profiled')return sculptedLimbSupport({type,side});
 const specs={
  thigh:{length:.428,radii:[[0,.041,.045],[.15,.058,.058],[.42,.081,.074],[.69,.087,.082],[.91,.073,.072],[1,.060,.057]],bow:.010},
  shin:{length:.329,radii:[[0,.025,.028],[.16,.031,.034],[.43,.045,.048],[.67,.070,.061],[.83,.065,.052],[1,.036,.035]],bow:-.012},
  forearm:{length:.225,radii:[[0,.023,.024],[.17,.029,.030],[.55,.043,.040],[.80,.043,.046],[1,.032,.034]],bow:.010},
  upper:{length:.242,radii:[[0,.029,.031],[.30,.036,.038],[.63,.045,.043],[.84,.042,.042],[1,.039,.038]],bow:.004},
 };
 const {length,radii,bow}=specs[type],rx=shapeProfile(radii.map(p=>[p[0],p[1]])),rz=shapeProfile(radii.map(p=>[p[0],p[2]]));
 return (u,v)=>{const a=(u-.5)*Math.PI*2,b=Math.sin(Math.PI*v)**2;return[Math.sin(a)*rx(v)+side*.006*b,-length*(1-v),Math.cos(a)*rz(v)+bow*b];};
}
const flip=p=>p.map(([u,v])=>[1-u,v]).reverse();
const plates={
 thigh:[
  // Interrupted proximal edge leaves an actual open hand/hip recess, with a long
  // flowing outer cover and scalloped knee throat rather than four horizontal cuffs.
  [[.49,.91],[.59,.975],[.70,.98],[.71,.80],[.81,.78],[.86,.91],[.94,.88],[.95,.56],[.91,.30],[.87,.15],[.82,.05],[.73,.045],[.71,.13],[.61,.17],[.59,.065],[.51,.10],[.48,.43]],
  [[.08,.87],[.18,.94],[.34,.89],[.45,.95],[.465,.72],[.44,.45],[.46,.24],[.41,.09],[.31,.06],[.29,.17],[.20,.21],[.14,.13],[.09,.37]],
 ],
 shin:[
  [[.48,.86],[.57,.96],[.64,.96],[.67,.86],[.75,.84],[.80,.94],[.91,.92],[.98,.74],[.94,.58],[.88,.53],[.86,.31],[.81,.12],[.77,.025],[.66,.025],[.63,.16],[.55,.18],[.51,.09],[.47,.30]],
  [[.04,.77],[.13,.91],[.25,.89],[.30,.79],[.40,.88],[.45,.80],[.43,.52],[.38,.42],[.36,.20],[.31,.055],[.20,.045],[.19,.16],[.10,.19],[.09,.40]],
 ],
 forearm:[[[.17,.80],[.28,.96],[.40,.97],[.48,.88],[.65,.95],[.79,.84],[.81,.65],[.70,.57],[.71,.30],[.61,.055],[.52,.04],[.49,.17],[.39,.20],[.30,.09],[.24,.35],[.19,.52]]],
 upper:[[[.13,.82],[.28,.98],[.52,.96],[.66,.86],[.77,.91],[.88,.77],[.83,.47],[.76,.18],[.64,.05],[.53,.12],[.44,.22],[.30,.12],[.23,.35],[.18,.55]]],
};

export function scallopedLimb({type='thigh',side=1,socketClearance=false,massStyle='profiled',panelStyle='broad'}={},mats){
 if(!['broad','cutaway','swept'].includes(panelStyle))throw new Error('Invalid panel style');
 const base=limbFormSupport({type,side,massStyle});
 const support=panelStyle==='swept'&&type==='thigh'?(u,v)=>{
  const p=base(u,v),belly=Math.sin(Math.PI*v)**2;
  const t=Math.max(0,(v-.58)/.42),rootBlend=t*t*(3-2*t);
  // Extend the ceramic-bearing thigh volume over the hip socket, not the bone.
  // Mid-thigh is slimmer; the knee attachment and distal circumference stay pinned.
  return[p[0]*(1-.10*belly),p[1]+.036*rootBlend,p[2]*(1-.055*belly)+.008*rootBlend];
 }:base;
 const root=group('Scalloped '+type+' armor');
 // A narrowed core shows through real cutouts without borrowing old cylinder-sized details.
 const core=(u,v)=>{const p=support(u,v);return[p[0]*.82,p[1],p[2]*.80];};
 root.add(thickenSurface(type+' shaped dark core',core,{thickness:.002,segments:[40,28],material:mats.dark}));
 if(type==='shin')root.add(sphere({name:'Knee flex core',radius:.035,segments:24,material:mats.dark}));
 const outlines=panelStyle!=='broad'&&type==='thigh'?[
  [[.49,.91],[.59,.975],[.66,.963],[.665,.76],[.67,.60],[.70,.51],[.765,.52],[.785,.66],[.81,.80],[.86,.91],[.94,.88],[.95,.56],[.91,.30],[.86,.15],[.81,.05],[.74,.045],[.70,.14],[.62,.18],[.59,.065],[.51,.10],[.48,.43]],
  [[.08,.87],[.18,.94],[.34,.89],[.425,.93],[.436,.72],[.40,.52],[.435,.40],[.42,.24],[.39,.09],[.31,.06],[.29,.17],[.20,.21],[.14,.13],[.09,.37]],
 ]:plates[type];
 for(const [i,baseOutline] of outlines.entries()){ const outline=socketClearance&&type==='upper'?baseOutline.map(([u,v])=>[u,v>.70?.70+(v-.70)*.55:v]):baseOutline;root.add(contourArmor(type+' flowing plate '+i,support,side<0?flip(outline):outline,mats,{offset:.0035,thickness:.0035,rounding:.13,refinement:2}));}
 const u=side>0?.74:.26;
 if(type==='shin')root.add(attachToSurface(radialPort({name:'Calf lateral emitter',radius:.027,color:'lime',detail:1},mats),support,{u,v:.74,offset:.006}));
 if(type==='thigh')root.add(attachToSurface(radialPort({name:'Proximal thigh inset',radius:.016,color:'amber',detail:1},mats),support,{u,v:.86,offset:.006}));
 const coords=[[u,.20],[u+.025,.30],[u+.018,.49],[u+.05,.57],[u+.047,.67]];
 root.add(routedCable({name:type+' curved enamel seam',points:surfacePath(support,coords,{offset:.008}),radius:.0009,segments:30,ends:false,material:mats.orange}));
 root.userData.construction={method:'shared profiled volume with concave plates and surface-mounted hardware',type,side,massStyle,panelStyle};return root;
}

/** Independent boot upper, sloped instep and ankle guards on a planted sole.
 * Local sole bottom is the old -0.0435 datum consumed by footMount, so contact
 * is maintained without shifting an ankle or lengthening the tibia. */
export function articulatedBoot({side=1}={},mats){
 const root=group(side>0?'Boot.L':'Boot.R');
 const outline=[[-.035,-.053],[-.044,-.04],[-.044,.015],[-.055,.084],[-.057,.133],[-.038,.16],[-.010,.17],[.032,.164],[.052,.14],[.054,.105],[.042,.040],[.038,-.036]];
 const sole=material('#da5021',{roughness:.54,metalness:.06});sole.name='Segmented warm sole';
 root.add(contourVolume({name:'Shaped planted outsole',outline,sections:[{height:-.0435,scale:[.89,.96]},{height:-.038,scale:[1,1]},{height:-.023,scale:[1.02,1]},{height:-.016,scale:[.93,.98]}],material:sole}));
 root.add(contourVolume({name:'Flexible boot welt',outline,sections:[{height:-.017,scale:[.88,.94]},{height:-.008,scale:[.88,.94]}],material:mats.dark,layers:2}));
 root.add(bellows({name:'Boot ankle connector',from:[0,.039,-.025],to:[0,.082,-.025],radius:.026,ribs:4},mats));
 const upper=archedFootSurface({base:-.009,height:[[0,.067],[.20,.080],[.39,.068],[.58,.038],[.82,.025],[1,.011]],width:[[0,.034],[.22,.041],[.46,.047],[.78,.050],[1,.022]]});
 root.add(thickenSurface('Boot flex upper',upper,{thickness:.0025,segments:[20,30],material:mats.dark}));
 const toe=[[.08,.64],[.20,.58],[.43,.65],[.51,.59],[.62,.62],[.92,.72],[.90,.94],[.73,.99],[.34,.99],[.12,.94]];
 const instep=[[.06,.25],[.19,.10],[.37,.075],[.66,.09],[.92,.24],[.86,.43],[.73,.53],[.62,.41],[.48,.38],[.37,.53],[.18,.48]];
 for(const [name,p]of [['Swept toe cap',toe],['Split instep cowl',instep]])root.add(contourArmor(name,upper,p,mats,{offset:.004,thickness:.003,refinement:2,rounding:.12}));
 for(const s of [-1,1]){
  const wall=(u,v)=>[s*(.032+.017*Math.sin(v*Math.PI)),.012+v*.090,-.034+(u-.5)*.088];
  const support=s>0?(u,v)=>wall(1-u,v):wall;
  root.add(contourArmor('Ankle fork '+s,support,[[.05,.15],[.17,.67],[.30,.97],[.66,.93],[.94,.58],[.83,.28],[.63,.19],[.57,.08],[.37,.13]],mats,{offset:.003,refinement:2,thickness:.004}));
  root.add(orient(radialPort({name:'Boot heel bearing',radius:.020,color:'amber',detail:1},mats),[s*.049,.031,-.024],[s,0,0]));
 }
 for(const z of [.018,.052,.090,.126])for(const s of [-1,1])root.add(link({name:'Sole lateral lug',from:[s*.045,-.033,z],to:[s*.052,-.030,z+.008],radius:.004,segments:10,material:sole}));
 root.userData.construction={method:'planted profiled outsole with independently contoured instep/toe/ankle forks',soleBottom:-.0435};return root;
}

/** Two rear/side plates continue the deltoid into the upper arm while leaving
 * the independently mounted front joint emitter exposed. No joint is moved. */
export function deltoidMantle({side=1,structured=false}={},mats){
 const original=deltoidSupport({side}),support=(u,v)=>{const p=original(u,v),w=Math.sin(Math.PI*v)**2;return structured?[p[0]*(1-.20*w),p[1],p[2]*(1-.18*w)]:p;},root=group('Deltoid mantle');
 const outline=[[.015,.33],[.04,.62],[.12,.87],[.21,.96],[.31,.88],[.37,.65],[.33,.38],[.26,.13],[.19,.07],[.12,.27]];
 for(const [i,p] of [outline,flip(outline)].entries())root.add(contourArmor('Deltoid wrap '+i,support,p,mats,{offset:.004,thickness:.0035,refinement:2,rounding:.15}));
 root.userData.construction={method:'anatomical deltoid support, separate from shoulder hinge',side};return root;
}
