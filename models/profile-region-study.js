import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { solidifyGeometry } from '../src/lib/surface-thickness.js';
import { faceRegionTriangles } from '../src/lib/face-regions.js';
import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';

function subsetGeometry(source, faces, offset = 0.0012) {
  const geometry = source.clone();
  const indices = [];
  for (const face of faces) {
    const base = face * 3;
    indices.push(source.index.getX(base), source.index.getX(base + 1), source.index.getX(base + 2));
  }
  geometry.setIndex(indices);
  geometry.clearGroups();
  geometry.userData = { subsetOf: source.type, faceCount: faces.length };
  if (offset) {
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    for (let i = 0; i < position.count; i++) {
      position.setXYZ(i,position.getX(i)+normal.getX(i)*offset,position.getY(i)+normal.getY(i)*offset,position.getZ(i)+normal.getZ(i)*offset);
    }
    position.needsUpdate = true;
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function organicFixture(palette) {
  const path = [[-.47,-.36,-.03],[-.37,-.16,.05],[-.20,.07,.10],[-.01,.26,.055],[.22,.37,-.03],[.43,.53,.025]];
  const profile = [[-.060,0],[-.036,.016],[0,.024],[.036,.016],[.060,0]];
  const sheet = profileSweepGeometry({path,profile,closedProfile:false,segments:56,up:[0,1,0],scale:t=>[.42+.80*Math.sin(Math.PI*t)**.75,.72+.30*Math.sin(Math.PI*t)],tilt:t=>-14+34*t,regionPrefix:'leaf.sweep',faceRegions:{'leaf.tip':meta=>meta.kind==='side'&&meta.pathMid>=.70,'leaf.center-ridge':meta=>meta.kind==='side'&&meta.profileMid>.34&&meta.profileMid<.66}});
  const shell = solidifyGeometry(sheet,{thickness:.015,offset:-.35,rim:'smooth',preserveRegions:true,regionPrefix:'leaf.shell'});
  const tipFaces=faceRegionTriangles(shell,'leaf.tip'),ridgeFaces=faceRegionTriangles(shell,'leaf.center-ridge');
  const tipRim=faceRegionTriangles(shell,['leaf.tip','leaf.shell.rim'],{match:'all'});
  const root=group('Organic sweep-domain regions',[],{position:[-.58,.02,0],rotation:[2,-12,7]});
  root.add(mesh(shell,{name:'Leaf shell',material:palette.leaf}));
  root.add(mesh(subsetGeometry(shell,ridgeFaces,.0014),{name:'Sweep-space center ridge',material:palette.ridge}));
  root.add(mesh(subsetGeometry(shell,tipFaces,.0017),{name:'Sweep-space tip',material:palette.tip}));
  root.add(mesh(subsetGeometry(shell,tipRim,.0020),{name:'Inherited tip rim',material:palette.rim}));
  root.userData.workflow={subject:'organic swept leaf shell',operation:'path/profile-parametric face regions preserved through solidification',regions:['leaf.tip','leaf.center-ridge','leaf.shell.outer','leaf.shell.rim']};
  sheet.dispose(); return root;
}

function mechanicalFixture(palette) {
  const path=[[-.48,-.30,.03],[-.30,-.09,.085],[-.09,.11,.02],[.14,.06,-.08],[.31,.25,-.015],[.49,.20,.065]];
  const profile=[[-.050,-.012],[.038,-.012],[.055,-.004],[.055,.009],[-.038,.009],[-.055,.003]];
  const strap=profileSweepGeometry({path,profile,segments:64,up:[0,1,0],tilt:t=>10*Math.sin(t*Math.PI*2),scale:t=>[1-.16*Math.sin(Math.PI*t),1],regionPrefix:'strap',faceRegions:{'strap.service-flank':meta=>meta.kind==='side'&&meta.pathMid>.22&&meta.pathMid<.78&&meta.profileEdge===3,'strap.mount-zone':meta=>meta.kind==='side'&&meta.pathMid<=.16}});
  const service=faceRegionTriangles(strap,'strap.service-flank'),endCap=faceRegionTriangles(strap,'strap.cap.end'),mount=faceRegionTriangles(strap,'strap.mount-zone');
  const root=group('Mechanical sweep-domain regions',[],{position:[.59,-.05,0],rotation:[-4,16,-5]});
  root.add(mesh(strap,{name:'Service strap',material:palette.strap}));
  root.add(mesh(subsetGeometry(strap,service,.0014),{name:'Parametric service flank',material:palette.service}));
  root.add(mesh(subsetGeometry(strap,mount,.0016),{name:'Parametric mount zone',material:palette.mount}));
  root.add(mesh(subsetGeometry(strap,endCap,.0018),{name:'Structural end cap',material:palette.cap}));
  const hit=triangleSpatialIndex(strap).closestPoint(new THREE.Vector3(.52,.20,.07),{regionNames:['strap.cap.end']});
  const connector=hit.point.clone().addScaledVector(hit.normal,.025);
  root.add(cylinder({name:'Connector placed from cap region',radius:.026,height:.042,segments:20,rotation:[90,0,0],position:connector.toArray(),material:palette.connector}));
  root.add(sphere({name:'Connector marker',radius:.012,segments:14,position:connector.toArray(),material:palette.cap}));
  root.userData.workflow={subject:'mechanical profiled service strap',operation:'side/cap structural roles plus path/profile semantic regions',regions:['strap.side','strap.cap.start','strap.cap.end','strap.service-flank','strap.mount-zone']};
  return root;
}

export default defineModel({id:'profile-region-study',title:'Workflow lab / sweep-space face regions',description:'Exact semantic face regions authored in normalized guide/profile coordinates, with structural side/cap roles and downstream provenance.',parameters:{organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},build(p){const palette={leaf:material('#718f78',{roughness:.56,metalness:.02}),ridge:material('#6bc1a2',{roughness:.40,metalness:.04}),tip:material('#e4bf62',{roughness:.36,metalness:.04}),rim:material('#db775d',{roughness:.34,metalness:.16}),strap:material('#3f4a52',{roughness:.36,metalness:.55}),service:material('#65d5d4',{roughness:.28,metalness:.18,emissive:'#0d3339',emissiveIntensity:.18}),mount:material('#cf788f',{roughness:.37,metalness:.10}),cap:material('#e6b95c',{roughness:.28,metalness:.48}),connector:material('#242c32',{roughness:.30,metalness:.68})};const children=[];if(p.organic)children.push(organicFixture(palette));if(p.mechanical)children.push(mechanicalFixture(palette));if(!children.length)children.push(sphere({radius:.025,material:material('#888888')}));return group('Sweep-space face-region workflow',children);}});
