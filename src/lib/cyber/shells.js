import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mesh, group } from '../modeling.js';
/** Linear triangle refinement before deformation. Preserves all float vertex attributes. */
export function refineTriangles(input, levels=2){
 if(!Number.isInteger(levels)||levels<0||levels>3)throw new Error('Refinement levels must be 0..3');
 let g=mergeVertices(input,1e-7);
 for(let level=0;level<levels;level++){
  const names=Object.keys(g.attributes),values=Object.fromEntries(names.map(n=>[n,Array.from(g.attributes[n].array)])),idx=g.index.array,next=[],cache=new Map();
  const middle=(a,b)=>{const key=a<b?`${a},${b}`:`${b},${a}`;if(cache.has(key))return cache.get(key);const result=values.position.length/3;
   for(const name of names){const size=g.attributes[name].itemSize;for(let c=0;c<size;c++)values[name].push((values[name][a*size+c]+values[name][b*size+c])*.5);}cache.set(key,result);return result;};
  for(let i=0;i<idx.length;i+=3){const a=idx[i],b=idx[i+1],c=idx[i+2],ab=middle(a,b),bc=middle(b,c),ca=middle(c,a);next.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
  const h=new THREE.BufferGeometry();for(const name of names)h.setAttribute(name,new THREE.Float32BufferAttribute(values[name],g.attributes[name].itemSize));h.setIndex(next);g.dispose();g=h;
 }
 return g;
}
/** Shell wrapped around an elliptical support. Named sectors keep deliberate black gaps.
 * y stations are [height, x radius, z radius]. An explicit inner surface and rims give thickness.
 */
export function wrapShell({name='Wrapped shell',stations,arc=[-2.5,2.5],thickness=.004,segments=36,rows=24,material:mat}){
 if(!Array.isArray(stations)||stations.length<2||stations.some(p=>p.length!==3||!p.every(Number.isFinite)||p[1]<=thickness||p[2]<=thickness))throw new Error('Invalid shell stations');
 if(!Number.isFinite(thickness)||thickness<=0||!arc.every(Number.isFinite)||arc[1]<=arc[0]||arc[1]-arc[0]>Math.PI*2)throw new Error('Invalid shell section');
 for(let i=1;i<stations.length;i++)if(stations[i][0]>=stations[i-1][0])throw new Error('Shell stations must descend in Y');
 const positions=[],uv=[],index=[],columns=segments+1,size=columns*(rows+1);
 for(let side=0;side<2;side++)for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++){
  const y=THREE.MathUtils.lerp(stations[0][0],stations.at(-1)[0],j/rows);let k=0;while(k<stations.length-2&&y<stations[k+1][0])k++;
  const a=stations[k],b=stations[k+1],t=(a[0]-y)/(a[0]-b[0]),angle=THREE.MathUtils.lerp(...arc,i/segments);
  const rx=THREE.MathUtils.lerp(a[1],b[1],t)-side*thickness,rz=THREE.MathUtils.lerp(a[2],b[2],t)-side*thickness;
  positions.push(Math.sin(angle)*rx,y,Math.cos(angle)*rz);uv.push(i/segments,j/rows);
 }
 const quad=(a,b,c,d,flip=false)=>index.push(...(flip?[a,c,b,a,d,c]:[a,b,c,a,c,d]));
 for(let j=0;j<rows;j++)for(let i=0;i<segments;i++){const a=j*columns+i,b=a+1,c=b+columns,d=a+columns;quad(a,d,c,b);quad(a+size,b+size,c+size,d+size);}
 for(let i=0;i<segments;i++){quad(i,i+1,i+1+size,i+size);const a=rows*columns+i;quad(a,a+size,a+1+size,a+1);}
 for(let j=0;j<rows;j++){const a=j*columns,b=a+columns;quad(a,a+size,b+size,b);const c=a+segments,d=b+segments;quad(c,d,d+size,c+size);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
 return mesh(g,{name,material:mat});
}
export function splitShell({name='Split shell',stations,gap=.035,material,backOpen=.50}){
 if(!Number.isFinite(gap)||gap<0||gap>.2)throw new Error('Invalid seam gap');
 const g=group(name),edge=Math.PI-backOpen;
 for(const [i,a,b] of [[0,-edge,-.60],[1,-.60,.60],[2,.60,edge]])g.add(wrapShell({name:`${name} / sector ${i+1}`,stations,arc:[a+gap,b-gap],material}));
 return g;
}
/** Attach a local +Z-facing module to the actual elliptical support by normalized height. */
export function onShell(object,stations,{t=.5,angle=0,clearance=.001}={}){
 if(!Number.isFinite(t)||t<0||t>1||!Number.isFinite(angle)||!Number.isFinite(clearance))throw new Error('Invalid surface attachment');
 const y=THREE.MathUtils.lerp(stations[0][0],stations.at(-1)[0],t);let k=0;while(k<stations.length-2&&y<stations[k+1][0])k++;
 const a=stations[k],b=stations[k+1],u=(a[0]-y)/(a[0]-b[0]),rx=THREE.MathUtils.lerp(a[1],b[1],u),rz=THREE.MathUtils.lerp(a[2],b[2],u);
 const point=new THREE.Vector3(Math.sin(angle)*rx,y,Math.cos(angle)*rz);
 const circumferential=new THREE.Vector3(Math.cos(angle)*rx,0,-Math.sin(angle)*rz);
 const longitudinal=new THREE.Vector3(Math.sin(angle)*(b[1]-a[1])/(b[0]-a[0]),1,Math.cos(angle)*(b[2]-a[2])/(b[0]-a[0]));
 const normal=circumferential.cross(longitudinal).normalize();
 object.position.copy(point.addScaledVector(normal,clearance));object.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
 return object;
}
