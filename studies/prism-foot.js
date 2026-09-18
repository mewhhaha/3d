import {defineModel} from '../src/lib/modeling.js';
import {bridgedBoot} from '../src/lib/cyber/foot-form.js';
import {articulatedBoot} from '../src/lib/cyber/limb-form.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
export default defineModel({id:'prism-foot',title:'Mechanical foot bridge',parameters:{style:{type:'select',options:['legacy','bridged'],default:'bridged'},side:{type:'number',min:-1,max:1,step:2,default:1}},build:p=>(p.style==='bridged'?bridgedBoot:articulatedBoot)({side:p.side},cyberMaterials())});
