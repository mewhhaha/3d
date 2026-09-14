import { defineModel, group, box, cylinder, sphere, material, repeat } from '../src/lib/modeling.js';

export default defineModel({
  id: 'orbit-bot',
  title: 'Orbit bot',
  description: 'A small desk companion. Named, separate parts make this a useful first Blender import.',
  parameters: {
    width: { type: 'number', label: 'Body width', min: 0.9, max: 1.7, step: 0.05, default: 1.3 },
    eyeSize: { type: 'number', label: 'Eye size', min: 0.07, max: 0.17, step: 0.01, default: 0.12 },
    color: { type: 'color', label: 'Shell color', default: '#eeb568' },
    antenna: { type: 'boolean', label: 'Antenna', default: true },
  },
  build(p) {
    const shell = material(p.color, { name: 'Warm enamel', roughness: 0.32, metalness: 0.15 });
    const dark = material('#263640', { name: 'Graphite rubber', roughness: 0.6 });
    const steel = material('#bccbd2', { name: 'Brushed metal', roughness: 0.3, metalness: 0.7 });
    const glow = material('#a9f4df', { name: 'Mint indicator', emissive: '#66c5a9', emissiveIntensity: 0.7 });
    return group('Robot assembly', [
      box({ name: 'Torso', size: [p.width, 1.05, 0.8], radius: 0.14, position: [0, 1.43, 0], material: shell }),
      cylinder({ name: 'Neck', radius: 0.18, height: 0.22, position: [0, 2.03, 0], material: steel }),
      box({ name: 'Head', size: [1.4, 0.84, 0.94], radius: 0.16, position: [0, 2.52, 0], material: shell }),
      box({ name: 'Faceplate', size: [1.16, 0.57, 0.1], radius: 0.045, position: [0, 2.53, 0.46], material: dark }),
      repeat(2, i => {
        const side = i ? 1 : -1;
        return group(i ? 'Right side' : 'Left side', [
          sphere({ name: `Eye ${i}`, radius: p.eyeSize, scale: [1, 1.12, 0.4], position: [side * 0.29, 2.57, 0.524], material: glow }),
          cylinder({ name: `Hip ${i}`, radius: 0.16, height: 0.5, position: [side * 0.34, 0.7, 0], material: steel }),
          box({ name: `Boot ${i}`, size: [0.48, 0.38, 0.74], radius: 0.09, position: [side * 0.34, 0.19, 0.14], material: dark }),
          cylinder({ name: `Shoulder ${i}`, radius: 0.19, height: 0.2, rotation: [0, 0, 90], position: [side * (p.width / 2 + 0.05), 1.72, 0], material: steel }),
          box({ name: `Arm ${i}`, size: [0.28, 0.64, 0.34], radius: 0.09, rotation: [0, 0, side * 8], position: [side * (p.width / 2 + 0.19), 1.35, 0], material: shell }),
          sphere({ name: `Hand ${i}`, radius: 0.18, position: [side * (p.width / 2 + 0.24), 0.98, 0], material: dark }),
        ]);
      }),
      box({ name: 'Chest inset', size: [p.width * 0.64, 0.43, 0.055], radius: 0.02, position: [0, 1.46, 0.406], material: dark }),
      repeat(3, i => box({ name: `Speaker slot ${i}`, size: [0.25, 0.028, 0.016], position: [-0.12, 1.55 - i * 0.075, 0.44], material: steel })),
      sphere({ name: 'Power light', radius: 0.055, scale: [1, 1, 0.35], position: [0.25, 1.46, 0.443], material: glow }),
      p.antenna && group('Antenna', [
        cylinder({ name: 'Antenna stem', radius: 0.025, height: 0.32, position: [0.38, 3.07, 0], material: steel }),
        sphere({ name: 'Antenna tip', radius: 0.09, position: [0.38, 3.26, 0], material: glow }),
      ]),
    ]);
  },
});
