import {humanoidPose} from '../src/lib/humanoid-rig.js';
// Shot construction hypotheses. Optical modules are NOT anatomical joint centers.
// All targets are in untransformed model space as fractions of stature.
export const shotProportions={height:1.80,build:'slender',shoulderSpan:.35,hipSpan:.17,legLength:.90,shinShare:.54,shoulderHeight:1.50,ankleHeight:.17};
export const shotPose={
 ...humanoidPose('lookback'),
 hips:[0,-45,-7], waist:[8,0,-20], chest:[-13,-22,31], head:[0,0,0], headWorld:[18,-25,25],
 shift:[-.055,-.025,.005],turn:-70,
 feet:[[-.045,.035],[.07,-.004]],
 targets:{
  Left:{ankle:[.068,.09444444444444444,.06],kneePole:[-.24,.37,.55],wrist:[.0,.55,.16],elbowPole:[.15,.67,-.05]},
  Right:{ankle:[-.012,.09444444444444444,-.075],kneePole:[-.36,.35,.40],wrist:[-.15,.52,.00],elbowPole:[-.22,.63,-.25]},
 },
};
