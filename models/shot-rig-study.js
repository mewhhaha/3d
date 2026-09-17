import { defineModel, group, material, sphere, cylinder, torus, box } from '../src/lib/modeling.js';
import { framedPerspectiveCamera, punctualLightRig, authoredShot, inspectShotFraming } from '../src/lib/shot-rig.js';

function organicSubject() {
  const skin = material('#778a68', { roughness: .72, metalness: 0 }); skin.name = 'Creature skin';
  const crest = material('#c88a42', { roughness: .48, metalness: .05 }); crest.name = 'Creature crest';
  const dark = material('#20282a', { roughness: .36, metalness: .18 }); dark.name = 'Creature dark detail';
  const subject = group('MossCreature', [
    cylinder({ name: 'Creature neck', radius: .19, top: .16, bottom: .23, height: .52, position: [0, .26, -.03], material: skin }),
    sphere({ name: 'Creature head', radius: .42, segments: 40, position: [0, .69, 0], scale: [1, .92, .84], material: skin }),
    torus({ name: 'Creature crown arc', radius: .32, tube: .045, segments: 52, position: [0, .91, -.09], rotation: [0, 0, 0], material: crest }),
    sphere({ name: 'Creature eye L', radius: .042, segments: 24, position: [-.14, .73, .345], scale: [1.15, .75, .55], material: dark }),
    sphere({ name: 'Creature eye R', radius: .042, segments: 24, position: [.14, .73, .345], scale: [1.15, .75, .55], material: dark }),
    cylinder({ name: 'Creature muzzle', radius: .12, top: .09, bottom: .12, height: .18, segments: 32, position: [0, .57, .31], rotation: [90, 0, 0], scale: [1.3, 1, .75], material: crest }),
  ]);
  const camera = framedPerspectiveCamera(subject, { direction: [.72, .28, 1.5], fov: 34, aspect: 1, occupancy: .74 });
  const lights = punctualLightRig(subject, { lights: [
    { name: 'Organic warm key', type: 'directional', offset: [-2.4, 3.1, 3.4], color: '#ffe5c7', intensity: 2.3 },
    { name: 'Organic cool fill', type: 'point', offset: [2.1, 1.1, 2.0], color: '#b7d8ff', intensity: 1.9, decay: 2 },
    { name: 'Organic amber rim', type: 'spot', offset: [1.0, 2.2, -3.0], color: '#ffb663', intensity: 3.8, angle: 46, penumbra: .55, decay: 2 },
  ] });
  const floor = cylinder({ name: 'Organic plinth', radius: .72, height: .06, segments: 64, position: [0, -.025, 0], material: material('#2f3834', { roughness: .68, metalness: .08 }) });
  const shot = authoredShot({ name: 'Organic authored shot', subject, camera, lights, environment: [floor], background: '#26302b', fog: { near: 5, far: 10 } });
  shot.userData.shotStudy = { subject: 'organic stylized bust', framing: inspectShotFraming(camera, subject) };
  return shot;
}

function mechanicalSubject() {
  const shell = material('#b9c0bd', { roughness: .34, metalness: .58 }); shell.name = 'Drone shell';
  const dark = material('#253039', { roughness: .24, metalness: .72 }); dark.name = 'Drone frame';
  const amber = material('#d49a32', { emissive: '#8c4b0c', emissiveIntensity: .35, roughness: .28, metalness: .46 }); amber.name = 'Drone service accent';
  const subject = group('SurveyDrone', [
    box({ name: 'Drone body', size: [.88, .42, .50], radius: .07, segments: 4, position: [0, .54, 0], material: shell }),
    box({ name: 'Drone shoulder rail', size: [1.08, .09, .22], radius: .025, segments: 3, position: [0, .76, -.04], material: dark }),
    torus({ name: 'Drone sensor ring', radius: .20, tube: .035, segments: 52, position: [0, .55, .274], material: dark }),
    cylinder({ name: 'Drone sensor lens', radius: .13, height: .05, segments: 48, position: [0, .55, .275], rotation: [90, 0, 0], material: amber }),
    cylinder({ name: 'Drone leg L', radius: .055, height: .42, segments: 24, position: [-.28, .18, 0], material: dark }),
    cylinder({ name: 'Drone leg R', radius: .055, height: .42, segments: 24, position: [.28, .18, 0], material: dark }),
    box({ name: 'Drone foot L', size: [.25, .08, .34], radius: .025, position: [-.28, -.01, .04], material: shell }),
    box({ name: 'Drone foot R', size: [.25, .08, .34], radius: .025, position: [.28, -.01, .04], material: shell }),
  ]);
  const camera = framedPerspectiveCamera(subject, { direction: [-1.05, .42, 1.75], fov: 41, aspect: 1, occupancy: .79 });
  const lights = punctualLightRig(subject, { lights: [
    { name: 'Mechanical neutral key', type: 'directional', offset: [-2.5, 2.7, 3.4], color: '#f7f3ea', intensity: 2.0 },
    { name: 'Mechanical service spot', type: 'spot', offset: [2.4, 1.5, 2.1], color: '#9fd7ff', intensity: 5.2, angle: 34, penumbra: .32, decay: 2 },
    { name: 'Mechanical rear practical', type: 'point', offset: [-.5, .65, -2.2], color: '#ff9f45', intensity: 2.6, decay: 2 },
  ] });
  const pad = box({ name: 'Mechanical service pad', size: [1.55, .055, 1.35], radius: .04, position: [0, -.055, 0], material: material('#30363b', { roughness: .46, metalness: .42 }) });
  const shot = authoredShot({ name: 'Mechanical authored shot', subject, camera, lights, environment: [pad], background: '#17202a', fog: { near: 6, far: 12 } });
  shot.userData.shotStudy = { subject: 'hard-surface survey drone', framing: inspectShotFraming(camera, subject) };
  return shot;
}

export default defineModel({
  id: 'shot-rig-study',
  title: 'Workflow / authored shot and punctual-light rig',
  description: 'Reusable bounds-aware perspective framing plus subject-relative exportable directional/point/spot lighting, exercised on unrelated organic and mechanical subjects.',
  parameters: {
    subject: { type: 'select', options: ['organic', 'mechanical'], default: 'organic' },
  },
  build: ({ subject }) => subject === 'mechanical' ? mechanicalSubject() : organicSubject(),
});
