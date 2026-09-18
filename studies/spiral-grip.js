import {defineModel,group,material,torus} from '../src/lib/modeling.js';
import {sectionLoft,radialMass} from '../src/lib/forms/structure.js';
import {shapeProfile,thickenSurface} from '../src/lib/shape-rails.js';
import {surfacePath} from '../src/lib/surface-frame.js';
import {routedCable} from '../src/lib/cyber/mechanics.js';

export default defineModel({id:'spiral-grip',title:'Directional mass / industrial grip',parameters:{swept:{type:'boolean',default:true}},build:({swept})=>{
 const root=group('Industrial grip'),twist=shapeProfile([[0,0],[.35,.25],[.65,.80],[1,1.15]]);
 const radius=shapeProfile([[0,.050],[.2,.059],[.52,.052],[.8,.060],[1,.050]]);
 const masses=[0,1,2].map(i=>radialMass({at:.5,span:.44,angle:swept?v=>i*2*Math.PI/3+twist(v):i*2*Math.PI/3,spread:.50,amount:.012}));
 const support=sectionLoft({from:0,to:.36,breadth:radius,depth:radius,masses});
 root.add(thickenSurface('Sculpted elastomer grip',support,{thickness:.006,segments:[64,48],material:material('#415763',{roughness:.68})}));
 for(const y of [0,.36])root.add(torus({name:'Independent rigid end ferrule',radius:.050,tube:.004,position:[0,y,0],rotation:[90,0,0],material:material('#b5c0bf',{metalness:.55,roughness:.28})}));
 // One trim follows the same authored ridge path on its changing support.
 const coords=Array.from({length:40},(_,i)=>{const v=.08+.84*i/39;return[(swept?twist(v):0)/(2*Math.PI),v];});
 root.add(routedCable({name:'Molded colored ridge',points:surfacePath(support,coords,{offset:.001}),radius:.002,segments:48,ends:false,material:material('#df9838')}));
 return root;
}});
