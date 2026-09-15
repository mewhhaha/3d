/** Audit geometric connectivity across separate UV charts; this does not certify animation quality. */
export function auditSeams(root, { exclude = name => name.endsWith('_Nail'), tolerance = 1e-7 } = {}) {
  if (!(tolerance>0) || !Number.isFinite(tolerance)) throw new Error('Invalid weld tolerance');
  const ids=new Map(), edges=new Map(), parents=[];let triangles=0,degenerate=0;
  const vertex=p=>{const key=p.map(x=>Math.round(x/tolerance)).join(',');if(!ids.has(key)){ids.set(key,parents.length);parents.push(parents.length);}return ids.get(key);};
  const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  root.traverse(o=>{
    if(!o.isMesh||exclude(o.name))return;
    const g=o.geometry,p=g.attributes.position,count=g.index?.count||p.count;
    for(let t=0;t<count;t+=3){
      const v=[0,1,2].map(k=>{const i=g.index?g.index.getX(t+k):t+k;return vertex([p.getX(i),p.getY(i),p.getZ(i)]);});triangles++;
      if(new Set(v).size!==3)degenerate++;
      for(let k=0;k<3;k++){const a=v[k],b=v[(k+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`,edge=edges.get(key)||{count:0,direction:0};edge.count++;edge.direction+=a<b?1:-1;edges.set(key,edge);parents[find(a)]=find(b);}
    }
  });
  return {vertices:ids.size,triangles,components:new Set(parents.map((_,i)=>find(i))).size,
    boundaryEdges:[...edges.values()].filter(e=>e.count===1).length,
    nonManifoldEdges:[...edges.values()].filter(e=>e.count>2).length,
    inconsistentWinding:[...edges.values()].filter(e=>e.count===2&&e.direction!==0).length,degenerateTriangles:degenerate};
}
