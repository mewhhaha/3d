import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder, box } from '../src/lib/modeling.js';
import { profileSweepGeometry } from '../src/lib/profile-sweep.js';
import { solidifyGeometry } from '../src/lib/surface-thickness.js';
import { defineFaceRegions, faceRegionTriangles } from '../src/lib/face-regions.js';
import { surfaceMount, attachSurfaceMount } from '../src/lib/surface-mount.js';

function subsetGeometry(source, faces, offset = 0.0012) {
  const geometry = source.clone();
  const indices = [];
  for (const face of faces) {
    const i = face * 3;
    indices.push(source.index.getX(i), source.index.getX(i + 1), source.index.getX(i + 2));
  }
  geometry.setIndex(indices);
  geometry.clearGroups();
  geometry.userData = { subsetFaces: faces.length };
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

function leafSupport(curl) {
  const path = [
    [0,-.21,0],
    [-.012,-.10,.018 + curl*.01],
    [.018,.02,.032 + curl*.04],
    [-.010,.14,.022 + curl*.085],
    [.006,.25,curl*.13],
  ];
  const profile = [[-.07,0],[-.035,.018],[0,.027],[.035,.018],[.07,0]];
  const sheet = profileSweepGeometry({
    path, profile, closedProfile:false, segments:36, up:[1,0,0],
    scale:t=>[.68+.34*Math.sin(Math.PI*t), .82+.18*Math.sin(Math.PI*t)],
    tilt:t=>-4+8*t,
    faceRegions:{
      'leaf.mount':meta=>meta.kind==='side' && meta.pathMid>.58 && meta.pathMid<.86 && meta.profileMid>.24 && meta.profileMid<.76,
    },
  });
  const shell = solidifyGeometry(sheet,{thickness:.012,offset:-.2,rim:'smooth',preserveRegions:true,regionPrefix:'leaf.shell'});
  sheet.dispose();
  return shell;
}

function bud(palette) {
  return group('Bud module',[
    cylinder({name:'Bud stem',radius:.009,height:.055,segments:14,rotation:[90,0,0],position:[0,0,.027],material:palette.stem}),
    sphere({name:'Bud head',radius:.027,segments:18,position:[0,0,.069],scale:[.82,1.12,.82],material:palette.bud}),
    sphere({name:'Bud tip',radius:.011,segments:12,position:[0,0,.095],scale:[.65,.85,.65],material:palette.tip}),
  ]);
}

const LEAF_MOUNT = surfaceMount({
  near:[0,.12,.16],
  regionNames:['leaf.mount','leaf.shell.outer'],
  regionMatch:'all',
  tangentHint:[1,0,0],
  offset:.010,
  local:{position:[.006,0,0],rotation:[0,0,8]},
});

function organicState(curl, x, y, palette) {
  const support = leafSupport(curl);
  const root = group(curl ? 'Curled leaf / same mount' : 'Open leaf / same mount',[],{position:[x,y,0],rotation:[0,-7,0]});
  root.add(mesh(support,{name:'Leaf support',material:palette.leaf}));
  const active = faceRegionTriangles(support,['leaf.mount','leaf.shell.outer'],{match:'all'});
  root.add(mesh(subsetGeometry(support,active,.0013),{name:'Named leaf mounting region',material:palette.region}));
  const module = bud(palette);
  attachSurfaceMount(module,support,LEAF_MOUNT);
  root.add(module);
  root.userData.mount={sameConstraint:'LEAF_MOUNT',curl};
  return root;
}

function panelSupport(arch) {
  const g = new THREE.PlaneGeometry(.36,.32,8,7);
  const p = g.getAttribute('position');
  for (let i=0;i<p.count;i++) {
    const x=p.getX(i), y=p.getY(i);
    const z=.018*Math.cos(y*8.5) + arch*(.075*(1-(x/.18)**2) + .035*y);
    p.setZ(i,z);
  }
  p.needsUpdate=true; g.computeVertexNormals();
  defineFaceRegions(g,{
    'panel.service':({centroid})=>centroid.x>.015 && centroid.y>-.085 && centroid.y<.12,
    'panel.mount-strip':({centroid})=>centroid.y<-.11,
  },{clone:false});
  const shell=solidifyGeometry(g,{thickness:.022,offset:-.35,rim:'sharp',preserveRegions:true,regionPrefix:'panel.shell'});
  g.dispose();
  return shell;
}

function sensor(palette) {
  return group('Sensor module',[
    box({name:'Sensor body',size:[.075,.055,.025],radius:.008,segments:2,position:[0,0,.014],material:palette.sensor}),
    cylinder({name:'Sensor lens',radius:.018,height:.022,segments:18,rotation:[90,0,0],position:[0,0,.038],material:palette.lens}),
    box({name:'Sensor tab',size:[.026,.012,.014],radius:.003,segments:1,position:[.045,0,.012],material:palette.dark}),
  ]);
}

const PANEL_MOUNT = surfaceMount({
  near:[.09,.015,.16],
  regionNames:['panel.service','panel.shell.outer'],
  regionMatch:'all',
  tangentHint:[0,1,0],
  offset:.012,
  local:{position:[.012,-.006,0],rotation:[0,0,-18],scale:.92},
});

function mechanicalState(arch, x, y, palette) {
  const support=panelSupport(arch);
  const root=group(arch ? 'Arched panel / same mount' : 'Flat panel / same mount',[],{position:[x,y,0],rotation:[-2,9,-3]});
  root.add(mesh(support,{name:'Panel support',material:palette.panel}));
  const active=faceRegionTriangles(support,['panel.service','panel.shell.outer'],{match:'all'});
  root.add(mesh(subsetGeometry(support,active,.0015),{name:'Named service mounting region',material:palette.service}));
  const module=sensor(palette);
  attachSurfaceMount(module,support,PANEL_MOUNT);
  root.add(module);
  root.userData.mount={sameConstraint:'PANEL_MOUNT',arch};
  return root;
}

export default defineModel({
  id:'surface-mount-study',
  title:'Workflow lab / re-evaluable surface mounts',
  description:'Attach independently editable components to named mesh regions with support-local constraints that re-resolve after upstream shape changes.',
  parameters:{organic:{type:'boolean',default:true},mechanical:{type:'boolean',default:true}},
  build(p){
    const palette={
      leaf:material('#6f8976',{roughness:.58}),region:material('#d6a95d',{roughness:.34,emissive:'#34220d',emissiveIntensity:.08}),
      stem:material('#33483d',{roughness:.52}),bud:material('#d16f66',{roughness:.42}),tip:material('#efd277',{roughness:.36}),
      panel:material('#4b5660',{roughness:.37,metalness:.52}),service:material('#68d0c8',{roughness:.28,metalness:.2,emissive:'#12383a',emissiveIntensity:.15}),
      sensor:material('#d1d7d9',{roughness:.31,metalness:.52}),lens:material('#e59d58',{roughness:.24,metalness:.18,emissive:'#6a2c0b',emissiveIntensity:.45}),dark:material('#20272d',{roughness:.3,metalness:.7}),
    };
    const children=[];
    if(p.organic){children.push(organicState(0,-.39,.20,palette),organicState(1,.01,.29,palette));}
    if(p.mechanical){children.push(mechanicalState(0,-.39,-.29,palette),mechanicalState(1,.01,-.20,palette));}
    if(p.organic&&p.mechanical){children[0].position.x-=.25;children[1].position.x-=.25;children[2].position.x+=.58;children[3].position.x+=.58;}
    if(!children.length)children.push(sphere({radius:.02,material:palette.dark}));
    const root=group('Re-evaluable surface mount workflow',children);
    root.userData.workflow={operation:'named support-local surface mount + local edit transform',organicReevaluation:'open leaf -> curled leaf',mechanicalReevaluation:'flat panel -> arched panel'};
    return root;
  },
});
