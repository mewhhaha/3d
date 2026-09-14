import { defineModel } from '../src/lib/modeling.js';
import explorer from './field-explorer.js';
import { riggedExplorer } from '../src/lib/explorer-rig.js';
export default defineModel({
  id: 'rigged-explorer', title: 'Field explorer / rigged',
  description: 'The existing textured explorer with a 38-joint deforming skeleton, weighted skin, finger joints, a breathing shape key, and Idle / Walk / Wave / Grasp clips. A procedural animation study, not a production character rig.',
  parameters: { ...explorer.parameters },
  build: riggedExplorer,
});
