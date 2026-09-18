import {defineModel} from '../src/lib/modeling.js';
import {cyberMaterials,radialPort} from '../src/lib/cyber/mechanics.js';
export default defineModel({id:'prism-signal',title:'Geometric versus mapped signal face',parameters:{style:{type:'select',options:['rings','mapped'],default:'mapped'},color:{type:'select',options:['pink','cyan','lime','amber'],default:'pink'}},build:p=>radialPort({name:'Signal comparison',radius:.12,color:p.color},cyberMaterials({glow:.7,emitterStyle:p.style}))});
