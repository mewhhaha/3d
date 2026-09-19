import * as THREE from 'three';
import {group,material,mesh} from './modeling.js';
import {skinnedPart,jointBlend} from './rigging.js';
import {humanoidProportions,humanoidRig,humanoidPoseClips} from './humanoid-rig.js';

/** A deliberately plain, low-resolution segmented mannequin. This is NOT Mixamo
 * geometry, a MakeHuman import, anatomical skin, or a fitted android costume.
 * Every part is bound to the same conventional humanoid hierarchy in a T-pose.
 * Change proportions first, then clips/pose, then design armor against the rig. */
export function humanoidMannequin({height=1.72,build='slender',shoulderSpan,hipSpan,legLength,shinShare,shoulderHeight,ankleHeight,segments=16,color='#b7b2aa',poses}={}) {
  if(!Number.isInteger(segments)||segments<12||segments>32)throw new Error('Mannequin segments must be 12..32');
  const d=humanoidProportions({height,build,shoulderSpan,hipSpan,legLength,shinShare,shoulderHeight,ankleHeight}),h=d.height,rig=humanoidRig(d);
  const shell=material(color,{roughness:.82}),joint=material('#59676d',{roughness:.85});
  shell.name='Mannequin primary masses';joint.name='Mannequin joint zones';
  const root=group('Humanoid mannequin',[rig.root]),p=name=>rig.spec[rig.indices[name]].position;
  const vec=a=>new THREE.Vector3(...a);
  function volume(name,bone,center,radii,{direction=[0,1,0],taper=0,mat=shell,weights=null}={}) {
    const geo=new THREE.SphereGeometry(1,segments,Math.floor(segments*.75));
    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const y=pos.getY(i),w=1-taper*y;
      pos.setXYZ(i,pos.getX(i)*radii[0]*w,y*radii[1],pos.getZ(i)*radii[2]*w);
    }
    geo.computeVertexNormals();
    const object=mesh(geo,{name,material:mat,position:center});
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec(direction).normalize());
    root.add(skinnedPart(object,rig,weights??(()=>[[bone,1]])));
  }
  function span(name,bone,end,width,depth,taper=.12) {
    const a=vec(p(bone)),b=vec(p(end)),delta=b.clone().sub(a);
    volume(name,bone,a.clone().add(b).multiplyScalar(.5).toArray(),[width,delta.length()*.53,depth],{direction:delta.toArray(),taper});
  }
  const hipY=d.ankleHeight+d.thigh+d.shin,waistRatio=(h*.75-hipY)/(h*.21);
  volume('Pelvis mass','Hips',[0,hipY-h*.011,-h*.005],[d.pelvisBreadth*.5,h*.075,h*.069],{taper:-.10});
  volume('Waist connection','Spine',[0,hipY+h*.083*waistRatio,0],[d.ribBreadth*.35,h*.110*waistRatio,h*.054],{
    mat:joint,weights:jointBlend('Hips','Spine2','y',hipY+h*.09*waistRatio,h*.20*waistRatio)});
  volume('Ribcage mass','Spine2',[0,h*.733,0],[d.ribBreadth*.51,h*.115,h*(build==='slender'?.064:.079)],{taper:-.13});
  span('Neck mass','Neck','Head',h*.023,h*.026,0);
  volume('Head mass','Head',[0,h*.933,h*.004],[h*.049,h*.067,h*.051],{taper:-.20});
  // A small nose plane makes head direction readable without facial decoration.
  volume('Facing marker','Head',[0,h*.925,h*.054],[h*.009,h*.016,h*.012]);
  for(const [side,sign] of [['Left',1],['Right',-1]]){
    span(side+' clavicle',side+'Shoulder',side+'Arm',h*.032,h*.031,0);
    volume(side+' shoulder',side+'Arm',p(side+'Arm'),[h*.039,h*.040,h*.041]);
    span(side+' upper arm',side+'Arm',side+'ForeArm',h*(build==='slender'?.026:.032),h*.030,.18);
    span(side+' forearm',side+'ForeArm',side+'Hand',h*.024,h*.026,.30);
    volume(side+' elbow',side+'ForeArm',p(side+'ForeArm'),[h*.023,h*.023,h*.023],{mat:joint});
    volume(side+' wrist',side+'Hand',p(side+'Hand'),[h*.017,h*.017,h*.017],{mat:joint});
    span(side+' hand mitten',side+'Hand',side+'HandEnd',h*.029,h*.015,-.12);
    const palm=vec(p(side+'Hand')).add(new THREE.Vector3(sign*h*.035,-h*.020,h*.013));
    volume(side+' thumb block',side+'Hand',palm.toArray(),[h*.017,h*.028,h*.017],{direction:[sign*.3,-1,0]});
    volume(side+' hip',side+'UpLeg',p(side+'UpLeg'),[h*.033,h*.034,h*.035],{mat:joint});
    span(side+' thigh',side+'UpLeg',side+'Leg',h*(build==='slender'?.050:.052),h*.049,.30);
    volume(side+' knee',side+'Leg',p(side+'Leg'),[h*.028,h*.031,h*.031],{mat:joint});
    span(side+' calf',side+'Leg',side+'Foot',h*.031,h*.036,.32);
    volume(side+' ankle',side+'Foot',p(side+'Foot'),[h*.019,h*.024,h*.021],{mat:joint});
    // Flat planted datum: this ellipsoid reaches y=0 exactly in its bind pose.
    const ankle=p(side+'Foot');
    volume(side+' foot',side+'Foot',[ankle[0],d.ankleHeight*(.028/.06),h*.045],[h*.034,d.ankleHeight*(.028/.06),h*.087],{taper:0});
  }
  root.animations=humanoidPoseClips(rig,poses);
  root.userData.exportSkinRoots=true;
  root.userData.humanoid={version:1,proportions:{...d},bind:'T-pose',rig:'28 named bones; segmented rigid skin plus blended waist',source:'original code-authored proxy, not a Mixamo download',poseApproval:'draft'};
  return root;
}
