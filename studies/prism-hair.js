import { defineModel } from '../src/lib/modeling.js';
import { guidedBob } from '../src/lib/cyber/hair-design.js';
export default defineModel({id:'prism-hair',title:'Prism guide-loft hair',parameters:{mode:{type:'select',options:['cage','sculpt','baked'],default:'baked'}},build:p=>guidedBob(p)});
