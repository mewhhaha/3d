import { defineModel } from '../src/lib/modeling.js';
import {sculptedBoot} from '../src/lib/cyber/contour-armor.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
export default defineModel({id:'prism-boot',title:'Prism contour boot',parameters:{},build:()=>sculptedBoot({},cyberMaterials())});
