import { illustratedHead } from '../src/lib/cyber/illustrated-head.js';
import { defineModel, group } from '../src/lib/modeling.js';
import { guidedBob } from '../src/lib/cyber/hair-design.js';
import { cyberMaterials } from '../src/lib/cyber/mechanics.js';
import { animePortrait } from '../src/lib/cyber/portrait.js';
import { portraitFields } from '../src/lib/cyber/head-form.js';
import { reshapeAssembly } from '../src/lib/shape-deform.js';
export default defineModel({id:'prism-head',title:'Prism head construction',parameters:{headStyle:{type:'select',options:['legacy','illustrated'],default:'legacy'},toon:{type:'boolean',default:true},outline:{type:'boolean',default:true},crownRoundness:{type:'number',default:1,min:0,max:1,step:.05},hair:{type:'boolean',default:true},mode:{type:'select',options:['cage','sculpt','baked'],default:'cage'}},build:p=>{if(p.headStyle==='illustrated'){const h=illustratedHead({hairMode:p.mode,toon:p.toon,outline:p.outline},cyberMaterials());if(!p.hair){const hair=h.getObjectByName('Prismatic bob');hair.removeFromParent();}return h;}const face=reshapeAssembly(animePortrait({},cyberMaterials()),portraitFields);const ears=[];face.traverse(o=>{if(o.name==='Ear attachment')ears.push(o);});ears.forEach(o=>o.removeFromParent());return group('Head study',[face,p.hair&&guidedBob({mode:p.mode,crownRoundness:p.crownRoundness})]);}});
