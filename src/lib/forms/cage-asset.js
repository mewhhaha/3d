import * as THREE from 'three';
import { atlasCage, subdivideCage, displaceCage, cageGeometry } from './cage.js';
import { normalSampler } from './fair.js';
import { bakeNormals } from './surface.js';
import { sculpt } from './sculpt.js';

/** Compile any shared quad form, not a hard-coded anatomical component.
 * Primary sculpting happens before this call. Fine operations affect only the high surface.
 * Low/cage and baked positions are identical. No automatic decimation or silhouette recovery.
 */
export function cageAsset(cage,{name='Sculpt',mode='baked',lowLevel=1,highLevel=3,textureSize=1024,detail=[],relief=()=>0,color='#bfa38b',roughness=.72}={}){
  if(!['sculpt','cage','baked'].includes(mode)||!Number.isInteger(lowLevel)||lowLevel<0||!Number.isInteger(highLevel)||highLevel<=lowLevel||highLevel>4)throw new Error('Invalid cage representation levels');
  const atlas=atlasCage(cage,{size:textureSize,gutter:4}),low=cageGeometry(subdivideCage(atlas,lowLevel));
  const mat=new THREE.MeshStandardMaterial({color,roughness});mat.name=name+'Material';let high,geometry=low;
  try {
    if(mode!=='cage'){
      const refined=subdivideCage(atlas,highLevel);
      high=cageGeometry(displaceCage(detail.length?sculpt(refined,...detail):refined,relief));
      if(mode==='sculpt'){geometry=high;low.dispose();}
      else {const sample=normalSampler(high);mat.normalMap=bakeNormals({normal:sample,wrapU:false},low,{size:textureSize});mat.normalMap.name=name+'Normal';mat.normalMap.userData.correspondence={...sample.stats};high.dispose();}
    }
    const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;
    mesh.userData.construction={controlQuads:cage.faces.length,lowLevel,highLevel,mode,textureSize,primaryShape:'shared quad cage',detail:'evaluated high surface normal transfer'};
    return mesh;
  }catch(e){low.dispose();high?.dispose();mat.normalMap?.dispose();mat.dispose();throw e;}
}
