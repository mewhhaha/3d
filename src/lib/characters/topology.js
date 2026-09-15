import { THREE } from '../modeling.js';
export function blendWeights(entries) {
  const merged = new Map();
  for (const [weights, factor] of entries) for (const [bone, weight] of weights) merged.set(bone, (merged.get(bone) || 0) + weight * factor);
  const sorted = [...merged].filter(([,w]) => w > 0).sort((a,b) => b[1]-a[1]).slice(0,4);
  const total = sorted.reduce((s,[,w]) => s+w,0);
  return sorted.map(([b,w]) => [b,w/total]);
}
const average = values => values[0].map((_,i) => values.reduce((sum,v) => sum+v[i],0)/values.length);
/** Catmull-Clark on shared quad topology; UV charts remain face-varying. */
export function subdivide(surface, levels=1) {
  let {points,faces,weights,colors} = surface;
  for(let level=0;level<levels;level++) {
    const edges = new Map(), vf = points.map(()=>[]), ve = points.map(()=>[]);
    const fp=faces.map(f=>average(f.ids.map(i=>points[i]))), fw=faces.map(f=>blendWeights(f.ids.map(i=>[weights[i],1/f.ids.length]))), fc=faces.map(f=>average(f.ids.map(i=>colors[i])));
    faces.forEach((f,fi)=>f.ids.forEach((a,k)=>{
      vf[a].push(fi);const b=f.ids[(k+1)%f.ids.length],key=a<b?`${a},${b}`:`${b},${a}`;
      let edge=edges.get(key);if(!edge){edge={a,b,faces:[]};edges.set(key,edge);ve[a].push(edge);ve[b].push(edge);}edge.faces.push(fi);
    }));
    const nextP=points.map((p,i)=>{
      if(!vf[i].length) return p.slice();
      const boundary=ve[i].filter(e=>e.faces.length===1);
      if(boundary.length===2) return p.map((v,k)=>(6*v+points[boundary[0].a===i?boundary[0].b:boundary[0].a][k]+points[boundary[1].a===i?boundary[1].b:boundary[1].a][k])/8);
      const n=vf[i].length,F=average(vf[i].map(f=>fp[f])),R=average(ve[i].map(e=>average([points[e.a],points[e.b]])));
      return p.map((v,k)=>(F[k]+2*R[k]+(n-3)*v)/n);
    }), nextW=weights.map(w=>w),nextC=colors.map(c=>c.slice());
    for(const e of edges.values()) {
      e.index=nextP.length;
      nextP.push(e.faces.length===2?average([points[e.a],points[e.b],...e.faces.map(i=>fp[i])]):average([points[e.a],points[e.b]]));
      nextW.push(blendWeights([[weights[e.a],.5],[weights[e.b],.5]]));nextC.push(average([colors[e.a],colors[e.b]]));
    }
    const faceStart=nextP.length;nextP.push(...fp);nextW.push(...fw);nextC.push(...fc);
    const out=[];
    faces.forEach((f,fi)=>{
      const uvCenter=average(f.uv),n=f.ids.length;
      for(let k=0;k<n;k++) {
        const a=f.ids[k],b=f.ids[(k+1)%n],prev=f.ids[(k+n-1)%n],edge=(x,y)=>edges.get(x<y?`${x},${y}`:`${y},${x}`).index;
        out.push({ids:[a,edge(a,b),faceStart+fi,edge(prev,a)],uv:[f.uv[k],average([f.uv[k],f.uv[(k+1)%n]]),uvCenter,average([f.uv[(k+n-1)%n],f.uv[k]])]});
      }
    });
    points=nextP;weights=nextW;colors=nextC;faces=out;
  }
  return {points,faces,weights,colors};
}
export function normalsFor(points,faces) {
  const normals=points.map(()=>new THREE.Vector3());
  for(const f of faces){const a=new THREE.Vector3(...points[f.ids[0]]);for(let k=1;k<f.ids.length-1;k++){
    const n=new THREE.Vector3(...points[f.ids[k]]).sub(a).cross(new THREE.Vector3(...points[f.ids[k+1]]).sub(a));
    for(const i of [f.ids[0],f.ids[k],f.ids[k+1]])normals[i].add(n);
  }}return normals.map(n=>n.normalize().toArray());
}
/** Split UV seams after smoothing, preserving source weights and normals. */
export function geometryFrom(surface) {
  const {points,faces,weights,colors}=surface, normals=normalsFor(points,faces), remap=new Map(), p=[],n=[],uv=[],c=[],index=[],outWeights=[];
  for(const f of faces){const ids=f.ids.map((source,k)=>{
    const t=f.uv[k],key=`${source}:${t[0].toFixed(7)}:${t[1].toFixed(7)}`;
    if(!remap.has(key)){remap.set(key,p.length/3);p.push(...points[source]);n.push(...normals[source]);uv.push(...t);c.push(...colors[source]);outWeights.push(weights[source]);}
    return remap.get(key);
  });for(let k=1;k<ids.length-1;k++)index.push(ids[0],ids[k],ids[k+1]);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(index);g.computeTangents();
  return {geometry:g,weights:outWeights};
}
export function faceCenter(face, points) {return average(face.ids.map(i=>points[i]));}
