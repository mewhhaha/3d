import * as THREE from 'three';
import { box, group, cylinder } from '../modeling.js';
import { onShell } from './shells.js';
import { radialPort, routedCable } from './mechanics.js';
export function shellDetails(stations,mats,...operations){
 const root=group('Surface-mounted details');
 const attach=(object,options)=>onShell(object,stations,options);
 for(const operation of operations.flat().filter(Boolean))root.add(operation({attach,mats}));
 return root;
}
export const portAt=({t,angle=0,radius=.015,color='amber',name='Inset service port'})=>({attach,mats})=>attach(radialPort({name,radius,color},mats),{t,angle,clearance:.001});
export const fastenerRow=({heights=[.2,.6,.9],angle=1,radius=.0028}={})=>({attach,mats})=>{
 const g=group('Captive fastener row');
 for(const t of heights){const m=cylinder({name:'Flush fastener',radius,height:.002,segments:8,material:mats.edge});m.rotation.x=Math.PI/2;const wrapper=group('Fastener mount',[m]);g.add(attach(wrapper,{t,angle,clearance:.001}));}return g;
};
export const seamPath=({points,color='orange',width=.0012,name='Panel circuit'})=>({attach,mats})=>{
 const path=points.map(([t,angle])=>attach(new THREE.Group(),{t,angle,clearance:.0007}).position.toArray());
 return routedCable({name,points:path,radius:width,material:mats[color],ends:false,segments:40});
};
export const ventAt=({t,angle=0,width=.012,height=.030}={})=>({attach,mats})=>{
 const g=group('Vent cassette');g.add(box({name:'Vent recess',size:[width,height,.0025],radius:.001,material:mats.dark}));
 for(let i=0;i<4;i++)g.add(box({name:'Vent louver',size:[width*.8,.002,.002],position:[0,(i-1.5)*height/5,.002],material:mats.edge}));
 return attach(g,{t,angle,clearance:.002});
};
