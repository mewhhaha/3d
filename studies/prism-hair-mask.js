import { defineModel, buildModel, dispose } from '../src/lib/modeling.js';
import { regionMask } from '../src/lib/region-mask.js';
import before from '../models/cyber-pose-study.js';
import after from '../models/cyber-form-study.js';
export default defineModel({id:'prism-hair-mask',title:'Visible hair geometry diagnostic',parameters:{baseline:{type:'boolean',default:false}},build:p=>{const source=buildModel(p.baseline?before:after,p.baseline?{}:{hairMode:'cage'});try{return regionMask(source,{select:'Prismatic bob'});}finally{dispose(source);}}});
