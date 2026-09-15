import * as THREE from 'three';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildModel,dispose} from '../src/lib/modeling.js';
import {projectPoint,landmarkError,convexHull,convexOverlap} from '../src/lib/reference-shot.js';
export function measureReference(object,camera,reference){
 if(!camera?.isCamera||!reference?.image||!reference.landmarks||!reference.regions)throw new Error('Reference, camera and annotation record required');
 object.updateMatrixWorld(true);camera.updateMatrixWorld(true);const actual={},targets={};
 for(const [name,spec]of Object.entries(reference.landmarks)){
  const scope=spec.scope?spec.scope.map(n=>object.getObjectByName(n)).find(Boolean):object;
  if(!scope)throw new Error(`Missing scope for ${name}`);
  const node=scope.getObjectByName(spec.node);
  if(!node)throw new Error(`Missing feature ${name}: ${spec.node}`);
  const p=new THREE.Vector3();if(spec.geometryCenter){if(!node.isMesh)throw new Error('Geometry center needs a mesh');node.geometry.computeBoundingBox();node.geometry.boundingBox.getCenter(p);}
  actual[name]=node.localToWorld(p).toArray();targets[name]={pixel:spec.pixel};
 }
 const score=landmarkError(camera,actual,targets,reference.image),regions={};
 for(const row of score.rows){row.uncertaintyPixels=reference.landmarks[row.name].uncertaintyPixels;row.withinAnnotationBand=row.errorPixels<=row.uncertaintyPixels;}
 for(const [name,spec]of Object.entries(reference.regions)){
  const node=object.getObjectByName(spec.node);if(!node)throw new Error(`Missing region ${name}`);const box=[Infinity,Infinity,-Infinity,-Infinity],projected=[];
  node.traverseVisible(o=>{if(!o.isMesh)return;for(let i=0;i<o.geometry.attributes.position.count;i++){const p=o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld);const q=projectPoint(camera,p.toArray(),reference.image).pixel;projected.push(q);box[0]=Math.min(box[0],q[0]);box[1]=Math.min(box[1],q[1]);box[2]=Math.max(box[2],q[0]);box[3]=Math.max(box[3],q[1]);}});
  regions[name]={actual:box,target:spec.bounds,uncertaintyPixels:spec.uncertaintyPixels};if(spec.outline){const hull=convexHull(projected);regions[name].envelope={...convexOverlap(hull,spec.outline),actual:hull,target:convexHull(spec.outline),minimum:spec.minimumEnvelopeIoU??.85};}
 }
 const failures=Object.entries(regions).filter(([,r])=>r.envelope&&r.envelope.iou<r.envelope.minimum).map(([name])=>name+' mass envelope');
 return {...score,regions,alignmentPass:score.rmsPixels<=20,alignmentThresholdPixels:20,nextPriorities:failures,visualAcceptance:'not-assessed',annotationProvenance:reference.provenance,warning:'These annotations drive authoring. This is an alignment diagnostic, not held-out accuracy or photographic likeness.'};
}
export async function measureRecipe(module,values={},referencePath='references/prism.json'){
 const reference=JSON.parse(await readFile(referencePath,'utf8'));
 const definition=(await import(pathToFileURL(path.resolve(module)))).default,root=buildModel(definition,values);
 try{return measureReference(root,root.getObjectByName('HeroCamera'),reference);}finally{dispose(root);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const module=process.argv[2]||'models/cyber-pose-study.js',out=process.argv[3]||'renders/reference-alignment.json';const report=await measureRecipe(module);await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({rmsPixels:report.rmsPixels,maxPixels:report.maxPixels,features:report.rows.length,out}));}
