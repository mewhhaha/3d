import { defineModel, group } from '../src/lib/modeling.js';
import { guidedBob } from '../src/lib/cyber/hair-design.js';
import { cyberMaterials } from '../src/lib/cyber/mechanics.js';
import { animePortrait } from '../src/lib/cyber/portrait.js';
import { portraitFields } from '../src/lib/cyber/head-form.js';
import { reshapeAssembly } from '../src/lib/shape-deform.js';
export default defineModel({id:'prism-head',title:'Prism head construction',parameters:{hair:{type:'boolean',default:true},mode:{type:'select',options:['cage','sculpt','baked'],default:'cage'}},build:p=>{const face=reshapeAssembly(animePortrait({},cyberMaterials()),portraitFields);const ears=[];face.traverse(o=>{if(o.name==='Ear attachment')ears.push(o);});ears.forEach(o=>o.removeFromParent());return group('Head study',[face,p.hair&&guidedBob({mode:p.mode})]);}});
