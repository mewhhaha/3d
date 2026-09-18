import * as THREE from 'three';
import {defineModel,mesh,material} from '../src/lib/modeling.js';
import {radialProfileMaps} from '../src/lib/radial-profile-maps.js';
import {assignFaceMaterials} from '../src/lib/material-regions.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
export default defineModel({id:'radial-enamel',title:'Non-emissive glaze on a saddle tile',parameters:{marked:{type:'boolean',default:true}},build:p=>{
 const g=new THREE.PlaneGeometry(.34,.30,20,20),pos=g.attributes.position;
 for(let i=0;i<pos.count;i++)pos.setZ(i,.8*(pos.getX(i)**2-pos.getY(i)**2));g.computeVertexNormals();
 const shell=solidifyGeometry(g,{thickness:.009,offset:-1,regionPrefix:'tile'});g.dispose();
 const maps=p.marked?radialProfileMaps({name:'Off-center ceramic glaze',size:256,center:[.43,.58],radius:.62,stops:[[0,'#df632f',0],[.22,'#d98354',0],[.24,'#21343a',0],[.29,'#263d44',0],[.31,'#ede1bd',0],[.48,'#eee5cb',0],[.51,'#527e7e',0],[.70,'#82a5a3',0],[.74,'#223437',0],[.80,'#dae0be',0],[1,'#e9e5ca',0]]}):{};
 const mapped=assignFaceMaterials(shell,{'tile.outer':0},{defaultMaterial:1});shell.dispose();
 return mesh(mapped,{name:'Curved glazed ceramic',material:[material('#ffffff',{...maps,roughness:.25,metalness:0}),material('#e5dec9',{roughness:.65})]});
}});
