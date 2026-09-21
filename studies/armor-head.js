import * as THREE from 'three';
import {illustratedHead} from '../src/lib/cyber/illustrated-head.js';
import {cyberMaterials} from '../src/lib/cyber/mechanics.js';
import {mountOnBone} from '../src/lib/bone-mount.js';
/** Reuse the authored portrait/bob at rough resolution. Attach in rest, not a
 * camera-space face decal. Source head faces are explicitly removed by caller. */
export function mountedPortrait(scene,skin,headFaces){
 const bounds=new THREE.Box3(),p=skin.geometry.attributes.position,index=skin.geometry.index;
 for(const f of headFaces)for(let j=0;j<3;j++)bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,index.getX(f*3+j)));
 if(bounds.isEmpty())throw new Error('Missing source head region');
 const palette=cyberMaterials({glow:.3});
 const head=illustratedHead({toon:false,outline:false,detail:0,hairSegments:{crown:[40,14],curtain:[40,18],fringe:[20,6]}},palette);
 // Portrait construction interval -.112..+.145. Stature stays on the existing head.
 const height=bounds.max.y-bounds.min.y,scale=height/.257;
 head.scale.set(scale*.98,scale,scale*.98);
 head.position.set(0,bounds.min.y+.112*scale,.008);
 const names=new Map();head.traverse(o=>{if(o.isMesh){const path=[];for(let node=o;node&&node!==head;node=node.parent)path.unshift(node.name);const base=path.join(' | '),n=names.get(base)||0;names.set(base,n+1);o.name='Head | '+base+(n?' '+n:'');}});
 const holder=mountOnBone(scene,scene.getObjectByName('mixamorigHead'),head);
 // Only materials actually retained by the portrait survive construction.
 const used=new Set();head.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>used.add(m));});
 Object.values(palette).forEach(m=>{if(m?.isMaterial&&!used.has(m))m.dispose();});
 holder.userData.portrait={source:'workshop portrait and bob; not generated reference projection',resolution:'coarse silhouette charts'};
 return holder;
}
