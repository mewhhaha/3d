import {defineModel,mesh,group,material} from '../src/lib/modeling.js';
import {sectionPose} from '../src/lib/section-pose.js';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
import {assignFaceMaterials} from '../src/lib/material-regions.js';
import {contourLineMaps} from '../src/lib/contour-line-maps.js';
import {twoToneMaterial} from '../src/lib/illustration-material.js';
export default defineModel({id:'posed-enamel',title:'Tapered inspection cover',parameters:{shaped:{type:'boolean',default:true},marked:{type:'boolean',default:true}},build:p=>{
 const pose=sectionPose([{y:0},{y:.25,offset:p.shaped?[.07,0,.03]:[0,0,0],rotation:p.shaped?[0,20,0]:[0,0,0],scale:p.shaped?[.75,1,1]:[1,1,1]},{y:.5,offset:p.shaped?[.12,0,.05]:[0,0,0],rotation:p.shaped?[0,35,0]:[0,0,0],scale:p.shaped?[.55,1,1]:[1,1,1]}]);
 const surface=(u,v)=>pose.point([(u-.5)*.36,v*.5,.025*Math.sin(Math.PI*u)]);
 const base=surfaceContourGeometry(surface,{outline:[[.04,.12],[.18,.02],[.88,.04],[.96,.24],[.90,.86],[.73,.97],[.08,.90]],holes:[[[.34,.68],[.66,.68],[.66,.80],[.34,.80]]],rounding:.12,refinement:2});
 const shell=solidifyGeometry(base,{thickness:.008,offset:-1,regionPrefix:'cover'}),g=assignFaceMaterials(shell,{'cover.outer':0},{defaultMaterial:1});shell.dispose();
 const paint=p.marked?twoToneMaterial({color:'#a2c2c9',shadow:'#3e6877',direction:[-.55,.75,1],softness:.18}):material('#a2c2c9',{roughness:.6});
 if(p.marked)Object.assign(paint,contourLineMaps(base,{name:'Inspection enamel',size:256}));base.dispose();
 return group('Inspection cover',[mesh(g,{name:'Bent inspection plate',material:[paint,material('#283638',{roughness:.65})]})]);
}});
