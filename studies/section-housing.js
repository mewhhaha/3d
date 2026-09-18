import {defineModel,group,material} from '../src/lib/modeling.js';
import {sectionLoft,contour} from '../src/lib/forms/structure.js';
import {thickenSurface,loopCap} from '../src/lib/shape-rails.js';
import {attachToSurface} from '../src/lib/surface-frame.js';
import {radialPort,cyberMaterials} from '../src/lib/cyber/mechanics.js';
// Independent prop: a long flattened housing with a deeper rear compartment and
// a narrow nose. No android dimensions, guides, anatomy or reference cameras.
export default defineModel({id:'section-housing',title:'Planed inspection housing',parameters:{shaped:{type:'boolean',default:true}},build:({shaped})=>{
 const support=sectionLoft({from:0,to:.8,breadth:contour([[0,.18],[.65,.16],[1,.10]]),depth:contour([[0,.10],[.6,.15],[1,.07]]),
  squareness:()=>shaped?.26:0,depthBias:contour([[0,0],[.35,shaped?-.15:0],[1,0]])});
 const mat=material('#6d899b',{roughness:.45}),root=group('Inspection housing');
 root.add(thickenSurface('Housing shell',support,{segments:[48,24],thickness:.01,material:mat}));
 for(const v of [0,1])root.add(loopCap('End '+v,Array.from({length:49},(_,i)=>support(v===1?i/48:1-i/48,v)),{rings:1,lift:0,material:mat}));
 root.add(attachToSurface(radialPort({name:'Inspection lens',radius:.055,detail:0},cyberMaterials({emitterStyle:'mapped'})),support,{u:0,v:.7,offset:.008}));
 root.rotation.z=-.4;return root;
}});
