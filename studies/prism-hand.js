import {defineModel} from '../src/lib/modeling.js';
import {articulatedHand} from '../src/lib/cyber/hand-form.js';
import {servoHand} from '../src/lib/cyber/android.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
export default defineModel({id:'prism-hand',title:'Mechanical hand silhouette and connected digits',parameters:{style:{type:'select',options:['legacy','articulated'],default:'articulated'},pose:{type:'select',options:['open','relaxed','grasp'],default:'relaxed'},side:{type:'number',min:-1,max:1,step:2,default:1}},build:p=>p.style==='legacy'?servoHand({side:p.side<0?-1:1},cyberMaterials()):articulatedHand({side:p.side<0?-1:1,pose:p.pose},cyberMaterials())});
