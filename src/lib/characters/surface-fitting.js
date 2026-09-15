import { surfaceProjector } from './projection.js';
/** Project over an already-fitted mesh, not the bare anatomy beneath it. */
export function projectMesh(object) {
  const geometry=object.geometry, position=geometry?.attributes.position;
  if(!position)throw new TypeError('projectMesh requires a mesh');
  object.updateMatrixWorld(true);
  const points=Array.from({length:position.count},(_,i)=>[position.getX(i),position.getY(i),position.getZ(i)]);
  const e=object.matrixWorld.elements;
  for(const p of points){const[x,y,z]=p;p[0]=e[0]*x+e[4]*y+e[8]*z+e[12];p[1]=e[1]*x+e[5]*y+e[9]*z+e[13];p[2]=e[2]*x+e[6]*y+e[10]*z+e[14];}
  const index=geometry.index,faces=[];
  for(let i=0;i<(index?.count||position.count);i+=3)faces.push({ids:[0,1,2].map(j=>index?index.getX(i+j):i+j)});
  return surfaceProjector({points,faces});
}
/** Apply after draping to prevent rest-pose front-surface intersections. */
export function clearSurface(project,{clearance=.006}={}) {
  if(typeof project!=='function'||!Number.isFinite(clearance)||clearance<0||clearance>.05)throw new TypeError('Invalid surface clearance');
  return ([x,y,z])=>[x,y,Math.max(z,project(x,y)+clearance)];
}
