import {compactGeometry} from '../src/lib/compact-geometry.js';
import {defineModel,group,box,material,THREE} from '../src/lib/modeling.js';
import {directNormals,ellipsoidNormalField,inkHull,twoToneMaterial} from '../src/lib/illustration.js';
export default defineModel({id:'illustration-tools',title:'Normal direction and ink on a service pod',parameters:{illustrated:{type:'boolean',default:true}},build:p=>{
 const raw=box({name:'Service pod',size:[.65,.90,.28],radius:.045,material:material('#7caaa7',{roughness:.6})});
 const source=raw.geometry;raw.geometry=compactGeometry(source);source.dispose();
 const root=group('Pod',[raw]);
 if(p.illustrated){
  root.add(inkHull(raw.geometry,{width:.003,name:'Pod contour'}));
  const original=raw.geometry;raw.geometry=directNormals(original,{field:ellipsoidNormalField({center:[0,0,-1],radii:[1,1,1]}),selection:({position:p})=>THREE.MathUtils.smoothstep(p[2],.09,.13),maxAngle:50});original.dispose();
  raw.material=twoToneMaterial({color:'#7caaa7',shadow:'#3f626d',direction:[-.7,.8,1],threshold:.45});
 }
 root.add(box({name:'Service slot',size:[.26,.035,.02],radius:.008,position:[0,.24,.147],material:material('#263c47')}));
 return root;
}});
