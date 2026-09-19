import {contourLineMaps} from '../contour-line-maps.js';
import {assignFaceMaterials} from '../material-regions.js';
import {material} from '../modeling.js';
import {twoToneMaterial} from '../illustration-material.js';
/** Look development runs after all geometry replacements, never during their
 * temporary construction. Only the outer ceramic face receives its UV pattern. */
export function applyContourLook(root,{toon=true}={}){
 let count=0;
 root.traverse(o=>{
  if(!o.isMesh||!o.name.endsWith(' / ceramic')||!o.geometry.userData.surfaceContour||!o.geometry.userData.solidify)return;
  if(Array.isArray(o.material))throw new Error('Contour coating expects one uncoated shell material');
  const original=o.material;
  const inked=toon?twoToneMaterial({color:'#e0dbbf',shadow:'#77867a',direction:[-.8,.55,.8],threshold:.42,softness:.08}):material('#e0dbbf',{roughness:1,metalness:0});
  Object.assign(inked,contourLineMaps(o.geometry,{name:o.name+' pigments',size:128}));inked.roughness=1;inked.name=o.name+' / illustrated coating';
  const old=o.geometry;o.geometry=assignFaceMaterials(old,{'panel.outer':0},{defaultMaterial:1});old.dispose();o.material=[inked,original];count++;
 });
 root.userData.contourLook={count,scope:'UV pigment and explicit two-tone illumination; PBR export fallback, no geometry displacement or baked normals'};
 return root;
}
