import {sectionLoft,radialMass} from '../forms/structure.js';
import {shapeProfile} from '../shape-rails.js';

const profile=shapeProfile;
// These are artistic structural masses, not reconstructed muscles or a skin rig.
// The shared loft is the form; ceramic charts and hardware sample it afterwards.
const limbSpecs={
 thigh:{length:.428,radii:[[0,.041,.045],[.17,.052,.055],[.43,.069,.067],[.70,.079,.077],[.91,.073,.072],[1,.060,.057]],bow:.010,
  masses:[
   {at:.52,span:.40,angle:[[0,-.20],[1,.25]],spread:.65,amount:.009}, // rectus/front ridge
   {at:.21,span:.18,angle:[[0,-.64],[1,-.34]],spread:.64,amount:.012}, // medial knee teardrop
   {at:.63,span:.32,angle:[[0,.55],[1,1.35]],spread:.80,amount:.010}, // lateral quadriceps sweep
   {at:.52,span:.40,angle:[[0,2.35],[1,2.75]],spread:.95,amount:.008}, // posterior hamstring
  ]},
 shin:{length:.329,radii:[[0,.025,.028],[.18,.030,.031],[.45,.040,.043],[.67,.055,.056],[.83,.050,.047],[1,.036,.035]],bow:-.012,
  masses:[
   {at:.65,span:.23,angle:[[0,2.35],[1,2.55]],spread:.66,amount:.015},
   {at:.71,span:.24,angle:[[0,-2.65],[1,-2.35]],spread:.68,amount:.011}, // staggered calf heads
   {at:.43,span:.44,angle:[[0,-.05],[1,.22]],spread:.40,amount:.006}, // tibial crest
  ]},
 forearm:{length:.225,radii:[[0,.023,.024],[.19,.027,.028],[.52,.035,.033],[.78,.038,.041],[1,.032,.034]],bow:.010,
  masses:[
   {at:.60,span:.34,angle:[[0,.15],[1,1.25]],spread:.75,amount:.009},
   {at:.64,span:.33,angle:[[0,-.60],[1,-1.6]],spread:.8,amount:.006},
  ]},
 upper:{length:.242,radii:[[0,.029,.031],[.30,.032,.034],[.63,.038,.039],[.84,.040,.040],[1,.039,.038]],bow:.004,
  masses:[
   {at:.51,span:.31,angle:[[0,-.2],[1,.22]],spread:.85,amount:.007},
   {at:.54,span:.38,angle:[[0,2.5],[1,3.0]],spread:1.05,amount:.009},
  ]},
};
// Compile profile functions once: called by the constructors below, not per sample.
function masses(specs,side=1){
 return specs.map(({angle,...s})=>{const path=profile(angle);return radialMass({...s,angle:v=>path(v)*side});});
}
/** Ends retain the exact legacy radii and centers, while volume groups change between them. */
export function sculptedLimbSupport({type='thigh',side=1}={}){
 if(!Object.hasOwn(limbSpecs,type)||![-1,1].includes(side))throw new Error('Invalid mass support kind/side');
 const {length,radii,bow,masses:groups}=limbSpecs[type];
 const base=sectionLoft({from:-length,to:0,breadth:profile(radii.map(([v,x])=>[v,x])),depth:profile(radii.map(([v,,z])=>[v,z])),
  offset:v=>{const b=Math.sin(Math.PI*v)**2;return[side*.006*b,bow*b];},masses:masses(groups,side)});
 return(u,v)=>base(u-.5,v);
}

/** Rib cage and iliac masses are broad forms around a narrower waist, not a barrel. */
export function sculptedTorsoSupport({pose=null}={}){
 const breadth=profile([[0,.093],[.13,.146],[.27,.137],[.42,.087],[.61,.109],[.80,.151],[.92,.148],[1,.100]]);
 const depth=profile([[0,.065],[.13,.092],[.27,.085],[.42,.061],[.61,.073],[.80,.084],[.92,.066],[1,.044]]);
 const spine=profile([[0,-.014],[.22,.003],[.48,-.002],[.78,.017],[1,.002]]);
 const sway=profile([[0,0],[.25,0],[.55,-.006],[.82,-.016],[1,-.009]]);
 const pairs=[
  {at:.79,span:.19,angle:[[0,.46],[1,.70]],spread:.62,amount:.009}, // pectoral/upper rib plane
  {at:.42,span:.23,angle:[[0,1.2],[1,.90]],spread:.52,amount:.007}, // oblique/iliac transition
  {at:.14,span:.17,angle:[[0,2.45],[1,2.65]],spread:.75,amount:.014}, // posterior pelvic mass
 ];
 const base=sectionLoft({from:.935,to:1.517,breadth,depth,offset:v=>[sway(v),spine(v)],masses:[...masses(pairs,1),...masses(pairs,-1)]});
 return(u,v)=>{const p=base(u-.5,v);return pose?pose.point(p):p;};
}

/** A narrowing shoulder mantle: top collar, deltoid belly, tapered upper-arm insertion. */
export function deltoidSupport({side=1}={}){
 if(![-1,1].includes(side))throw new Error('Invalid deltoid side');
 const base=sectionLoft({from:-.126,to:.077,
  breadth:profile([[0,.026],[.25,.045],[.56,.064],[.73,.065],[.91,.043],[1,.017]]),
  depth:profile([[0,.027],[.27,.041],[.57,.059],[.73,.060],[.91,.037],[1,.015]]),
  offset:v=>[side*.003*Math.sin(Math.PI*v),-.002],
  masses:masses([{at:.50,span:.34,angle:[[0,.90],[1,1.6]],spread:.9,amount:.005}],side)});
 return(u,v)=>base(u-.5,v);
}

/** Egg-like rib cage, shorter waist and high iliac crest, with distinct front/back
 * depth. Same Y interval and endpoint rings; no inferred skeleton changes. */
export function structuredTorsoSupport({pose=null}={}){
 const breadth=profile([[0,.093],[.12,.127],[.28,.151],[.36,.113],[.47,.076],[.59,.092],[.73,.143],[.84,.136],[.94,.112],[1,.100]]);
 const depth=profile([[0,.065],[.14,.094],[.28,.086],[.44,.058],[.59,.077],[.73,.094],[.86,.083],[1,.044]]);
 const spine=profile([[0,-.014],[.20,-.006],[.44,.002],[.60,.027],[.77,.021],[1,.002]]);
 const sway=profile([[0,0],[.27,0],[.47,-.006],[.73,-.013],[1,-.009]]);
 const base=sectionLoft({from:.935,to:1.517,breadth,depth,offset:v=>[sway(v),spine(v)],
  squareness:profile([[0,0],[.23,.20],[.45,.05],[.70,.28],[.89,.26],[1,0]]),
  depthBias:profile([[0,0],[.19,-.22],[.40,0],[.68,.14],[.85,.13],[1,0]])});
 return(u,v)=>{const p=base(u-.5,v);return pose?pose.point(p):p;};
}
