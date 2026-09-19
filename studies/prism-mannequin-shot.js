import {defineModel,group} from '../src/lib/modeling.js';
import {humanoidMannequin} from '../src/lib/humanoid-mannequin.js';
import {humanoidPose} from '../src/lib/humanoid-rig.js';
import {referenceCamera} from '../src/lib/reference-shot.js';
import {authoredShot,punctualLight} from '../src/lib/shot-rig.js';
import {shotProportions,shotPose} from './prism-mannequin-pose.js';
export default defineModel({id:'prism-mannequin-shot',title:'Prism / plain pose before costume',parameters:{},build:()=>{
 const subject=humanoidMannequin({...shotProportions,poses:{baseline:humanoidPose('lookback'),shot:shotPose}});
 const camera=referenceCamera({target:[0,.875,0]});
 return authoredShot({name:'Mannequin shot',subject,camera,background:'#e4e3e0',lights:group('Studio lights',[
  punctualLight({name:'Soft key',type:'directional',position:[-3,5,5],intensity:2.4}),
  punctualLight({name:'Soft fill',type:'directional',position:[3,2,2],intensity:.9}),
 ])});
}});
