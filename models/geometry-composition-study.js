import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { solidifyGeometry } from '../src/lib/surface-thickness.js';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import { composeGeometries } from '../src/lib/geometry-composition.js';
import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';

function subsetGeometry(source, faces, offset = 0.0012) {
  const geometry = source.clone();
  const indices = [];
  for (const face of faces) {
    const i = face * 3;
    indices.push(source.index.getX(i), source.index.getX(i + 1), source.index.getX(i + 2));
  }
  geometry.setIndex(indices); geometry.clearGroups(); geometry.userData = { subsetFaces: faces.length };
  if (offset) {
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    for (let i = 0; i < position.count; i++) position.setXYZ(i,
      position.getX(i) + normal.getX(i) * offset,
      position.getY(i) + normal.getY(i) * offset,
      position.getZ(i) + normal.getZ(i) * offset);
    position.needsUpdate = true;
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function leafSource() {
  const path = [[0,-.36,0],[.015,-.19,.025],[-.012,.03,.045],[.018,.23,.018],[0,.39,0]];
  const profile = [[-.075,0],[-.04,.018],[0,.026],[.04,.018],[.075,0]];
  const sheet = profileSweepGeometry({
    path, profile, closedProfile:false, segments:42, up:[0,1,0],
    scale:t=>[.48+.78*Math.sin(Math.PI*t)**.72,.75+.22*Math.sin(Math.PI*t)],
    tilt:t=>-5+10*t,
    faceRegions:{'leaf.tip':meta=>meta.kind==='side'&&meta.pathMid>.72,'leaf.midvein':meta=>meta.kind==='side'&&meta.profileMid>.34&&meta.profileMid<.66},
  });
  const shell = solidifyGeometry(sheet,{thickness:.012,offset:-.25,rim:'smooth',preserveRegions:true});
  sheet.dispose(); return shell;
}

function organicFixture(palette) {
  const a=leafSource(), b=leafSource(), c=leafSource();
  const composed=composeGeometries([
    {name:'left',geometry:a,position:[-.08,-.02,.01],rotation:[8,-18,26],scale:.94},
    {name:'center',geometry:b,position:[0,.01,.025],rotation:[-5,4,-2],scale:1.08},
    {name:'right',geometry:c,position:[.09,-.025,-.005],rotation:[10,22,-28],scale:.90},
  ]);
  a.dispose();b.dispose();c.dispose();
  const tips=faceRegionTriangles(composed,'leaf.tip');
  const centerTip=faceRegionTriangles(composed,['leaf.tip','part.center'],{match:'all'});
  const root=group('Organic owned composition',[],{position:[-.58,.01,0],rotation:[1,-7,4]});
  root.add(mesh(composed,{name:'Composed leaf cluster',material:palette.leaf}));
  root.add(mesh(subsetGeometry(composed,tips,.0014),{name:'Inherited tips across parts',material:palette.tip}));
  root.add(mesh(subsetGeometry(composed,centerTip,.0021),{name:'Center part tip intersection',material:palette.center}));
  const hit=triangleSpatialIndex(composed).closestPoint([0,.30,.08],{regionNames:['leaf.tip','part.center'],regionMatch:'all'});
  const bud=hit.point.clone().addScaledVector(hit.normal,.022);
  root.add(sphere({name:'Attachment constrained by semantic + part identity',radius:.018,segments:14,position:bud.toArray(),material:palette.center}));
  root.userData.workflow={subject:'three-leaf organic cluster',operation:'owned composition with inherited overlapping semantic regions',parts:['left','center','right']};
  return root;
}

function panelSource() {
  const g=new THREE.PlaneGeometry(.42,.46,6,7);
  const p=g.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i); const z=.032*Math.cos(x*7.5)-.018*Math.cos(y*8.4)+.012*x;
    p.setZ(i,z);
  }
  p.needsUpdate=true;g.computeVertexNormals();
  const tagged=defineFaceRegions(g,{
    'panel.service':({centroid})=>centroid.x>.02&&centroid.y>-.12,
    'panel.mount':({centroid})=>centroid.y<-.13,
  },{clone:false});
  return solidifyGeometry(tagged,{thickness:.026,offset:-.35,rim:'sharp',preserveRegions:true,regionPrefix:'panel.shell'});
}

function railSource() {
  const path=[[-.15,-.17,.07],[-.08,-.04,.095],[.01,.08,.10],[.10,.18,.085],[.17,.27,.065]];
  return profileSweepGeometry({
    path,profile:[[-.024,-.013],[.024,-.013],[.024,.013],[-.024,.013]],segments:34,up:[0,1,0],
    faceRegions:{'rail.terminal':meta=>meta.kind==='side'&&meta.pathMid>.72,'rail.service':meta=>meta.kind==='side'&&meta.profileEdge===2},
    regionPrefix:'rail.sweep',
  });
}

function mechanicalFixture(palette) {
  const panel=panelSource(), rail=railSource();
  const composed=composeGeometries([
    {name:'housing',geometry:panel,rotation:[-4,-6,-7]},
    {name:'rail',geometry:rail,position:[.02,.015,.025],rotation:[3,7,4]},
  ]);
  panel.dispose();rail.dispose();
  const service=faceRegionTriangles(composed,'panel.service');
  const terminal=faceRegionTriangles(composed,['rail.terminal','part.rail'],{match:'all'});
  const root=group('Mechanical owned composition',[],{position:[.60,-.03,0],rotation:[2,11,-2]});
  root.add(mesh(composed,{name:'Composed service module',material:palette.panel}));
  root.add(mesh(subsetGeometry(composed,service,.0015),{name:'Inherited panel service region',material:palette.service}));
  root.add(mesh(subsetGeometry(composed,terminal,.0019),{name:'Rail terminal + part identity',material:palette.terminal}));
  const hit=triangleSpatialIndex(composed).closestPoint([.15,.28,.11],{regionNames:['rail.terminal','part.rail'],regionMatch:'all'});
  const socket=hit.point.clone().addScaledVector(hit.normal,.026);
  root.add(cylinder({name:'Socket placed after merge by part region',radius:.024,height:.045,segments:18,rotation:[90,0,0],position:socket.toArray(),material:palette.dark}));
  root.add(sphere({name:'Socket semantic marker',radius:.011,segments:12,position:socket.toArray(),material:palette.terminal}));
  root.userData.workflow={subject:'panel + routed rail mechanical module',operation:'merge preserves component identity and semantic regions independent of draw groups',parts:['housing','rail']};
  return root;
}

export default defineModel({
  id:'geometry-composition-study',title:'Workflow lab / owned geometry composition',description:'Merge independently authored components while preserving named face semantics and stable part identity.',
  parameters:{organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
  build(p){
    const palette={leaf:material('#78957d',{roughness:.57}),tip:material('#d99b57',{roughness:.38}),center:material('#e7c767',{roughness:.34}),panel:material('#49535d',{roughness:.36,metalness:.55}),service:material('#64cfca',{roughness:.28,metalness:.18,emissive:'#0d3032',emissiveIntensity:.18}),terminal:material('#e4a85d',{roughness:.31,metalness:.36}),dark:material('#20272d',{roughness:.30,metalness:.7})};
    const children=[];if(p.organic)children.push(organicFixture(palette));if(p.mechanical)children.push(mechanicalFixture(palette));if(!children.length)children.push(sphere({radius:.02,material:palette.dark}));
    return group('Owned geometry composition workflow',children);
  }
});
