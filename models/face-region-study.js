import * as THREE from 'three';
import { defineModel, group, material, mesh, sphere, cylinder } from '../src/lib/modeling.js';
import { transferSurfaceAttributes } from '../src/lib/attribute-transfer.js';
import { defineFaceRegions, faceRegionVertexMask } from '../src/lib/face-regions.js';
import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';

function coloredSheet({ width=.72, height=.48, sx=18, sy=12, zAt, colorAt }) {
  const geometry = new THREE.PlaneGeometry(width, height, sx, sy);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let i=0;i<position.count;i++) {
    const x=position.getX(i), y=position.getY(i);
    position.setZ(i,zAt(x,y));
    const color=new THREE.Color(colorAt(x,y));
    colors.set([color.r,color.g,color.b],i*3);
  }
  position.needsUpdate=true;
  geometry.computeVertexNormals();
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  return geometry;
}

function mergeIndexed(parts) {
  let vertices=0,indices=0;
  for(const part of parts){vertices+=part.getAttribute('position').count;indices+=part.index.count;}
  const positions=new Float32Array(vertices*3),colors=new Float32Array(vertices*3);
  const indexArray=vertices>65535?new Uint32Array(indices):new Uint16Array(indices);
  let vertexBase=0,indexBase=0;
  for(const part of parts){
    positions.set(part.getAttribute('position').array,vertexBase*3);
    colors.set(part.getAttribute('color').array,vertexBase*3);
    for(let i=0;i<part.index.count;i++)indexArray[indexBase+i]=part.index.getX(i)+vertexBase;
    vertexBase+=part.getAttribute('position').count;indexBase+=part.index.count;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(new THREE.BufferAttribute(indexArray,1));
  geometry.computeVertexNormals();
  return geometry;
}

function organicFixture(named) {
  const outer=coloredSheet({
    zAt:(x,y)=>.070+.014*Math.cos(y*8)+.008*x,
    colorAt:(x,y)=>new THREE.Color('#50a878').lerp(new THREE.Color('#e3bd63'),THREE.MathUtils.clamp((y+.24)/.48,0,1)),
  });
  const inner=coloredSheet({
    zAt:(x,y)=>.018+.006*Math.sin(x*9),
    colorAt:(x,y)=>new THREE.Color('#804c9c').lerp(new THREE.Color('#445eac'),THREE.MathUtils.clamp((x+.36)/.72,0,1)),
  });
  let source=mergeIndexed([outer,inner]);
  source=defineFaceRegions(source,{
    'leaf.outer':({centroid})=>centroid.z>.045,
    'leaf.inner':({centroid})=>centroid.z<.045,
  },{clone:false});
  const target=coloredSheet({
    width:.64,height:.40,sx:20,sy:14,
    zAt:(x,y)=>.027+.007*Math.sin(y*11)+.004*x,
    colorAt:()=> '#ffffff',
  });
  target.deleteAttribute('color');target.deleteAttribute('uv');
  const transferred=transferSurfaceAttributes(source,target,{
    attributes:['color'],acceleration:'bvh',maxDistance:.09,
    ...(named?{sourceRegions:['leaf.outer']}:{})
  });
  const selection=faceRegionVertexMask(source,'leaf.outer');
  const root=group('Organic region correspondence',[
    mesh(transferred,{name:named?'Named outer-surface transfer':'Nearest-surface transfer',material:material('#ffffff',{vertexColors:true,roughness:.42,side:THREE.DoubleSide})}),
  ],{position:[-.47,.06,0],rotation:[4,-10,5]});
  root.userData.workflow={subject:'layered organic leaf',selectionVertices:[...selection].filter(v=>v>0).length,constraint:named?'leaf.outer':'none',transfer:transferred.userData.attributeTransfer};
  outer.dispose();inner.dispose();source.dispose();target.dispose();
  return root;
}

function mechanicalSource() {
  const front=new THREE.PlaneGeometry(.64,.44,8,6);
  front.translate(0,0,.095);
  const back=new THREE.PlaneGeometry(.64,.44,8,6);
  back.translate(0,0,.028);
  const paint=(geometry,color)=>{
    const count=geometry.getAttribute('position').count;
    const c=new THREE.Color(color),array=new Float32Array(count*3);
    for(let i=0;i<count;i++)array.set([c.r,c.g,c.b],i*3);
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(array,3));
  };
  paint(front,'#617a83');paint(back,'#2b3038');
  let source=mergeIndexed([front,back]);
  source=defineFaceRegions(source,{
    'housing.service-face':({centroid})=>centroid.z>.06,
    'housing.backing':({centroid})=>centroid.z<.06,
  },{clone:false});
  front.dispose();back.dispose();
  return source;
}

function mechanicalFixture(named) {
  const source=mechanicalSource();
  const query=triangleSpatialIndex(source,{leafSize:4});
  const probe=new THREE.Vector3(.14,.03,0);
  const hit=query.closestPoint(probe,named?{regionNames:['housing.service-face']}:{ });
  const panel=mesh(source.clone(),{
    name:'Layered equipment housing',
    material:material('#687982',{roughness:.34,metalness:.18,side:THREE.DoubleSide}),
  });
  const socket=sphere({
    name:named?'Service socket on named face':'Nearest-surface socket',radius:.045,segments:20,
    position:[hit.point.x,hit.point.y,hit.point.z+.025],
    material:material(named?'#efc15e':'#d65f8d',{roughness:.25,metalness:.35,emissive:named?'#4b2b04':'#3b061f',emissiveIntensity:.35}),
  });
  const stem=cylinder({
    name:'Socket stem',radius:.014,height:.07,segments:16,rotation:[90,0,0],
    position:[hit.point.x,hit.point.y,hit.point.z-.005],
    material:material('#222a30',{roughness:.42,metalness:.5}),
  });
  const root=group('Mechanical named attachment region',[panel,stem,socket],{position:[.47,-.03,.01],rotation:[-4,13,-3]});
  root.userData.workflow={subject:'layered service housing',constraint:named?'housing.service-face':'none',hit:{distance:hit.distance,triangleIndex:hit.triangleIndex,regionNames:hit.regionNames}};
  source.dispose();
  return root;
}

export default defineModel({
  id:'face-region-study',
  title:'Workflow lab / named face regions',
  description:'Stable named face-domain regions steer transfer and closest-surface attachments without coupling authoring intent to BufferGeometry material-group numbers.',
  parameters:{
    named:{type:'boolean',default:true},
    organic:{type:'boolean',default:true},
    mechanical:{type:'boolean',default:true},
  },
  build(p){
    const children=[];
    if(p.organic)children.push(organicFixture(p.named));
    if(p.mechanical)children.push(mechanicalFixture(p.named));
    if(!children.length)children.push(sphere({radius:.03,material:material('#888888')}));
    const root=group('Named face-region workflow',children);
    root.userData.workflow={namedRegions:p.named,domain:'face'};
    return root;
  },
});
