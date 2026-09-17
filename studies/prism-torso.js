import {defineModel,group} from '../src/lib/modeling.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
export default defineModel({id:'prism-torso',title:'Prism ribcage and pelvis construction',parameters:{bodyStyle:{type:'select',options:['legacy','articulated'],default:'articulated'}},build:p=>{
 const android=refinedAndroid({headStyle:'illustrated',bodyStyle:p.bodyStyle,cables:false}),body=android.getObjectByName('BodyGesture');
 body.removeFromParent();return group('Torso study',[body]);
}});
