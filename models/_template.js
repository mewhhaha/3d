// Copy to models/my-model.js. Underscore-prefixed files are not added to the gallery.
import { defineModel, group, box, material } from '../src/lib/modeling.js';
export default defineModel({
  id: 'my-model', // Must match the filename.
  title: 'My model',
  description: 'What this model is and how its parameters work.',
  parameters: {
    width: { type: 'number', label: 'Width', min: 0.5, max: 3, step: 0.1, default: 1 },
    color: { type: 'color', label: 'Color', default: '#eeb568' },
  },
  build(p) {
    return group('Assembly', [
      box({ name: 'Body', size: [p.width, 1, 1], radius: 0.08,
        position: [0, 0.5, 0], material: material(p.color) }),
    ]);
  },
});
