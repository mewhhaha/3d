import { defineModel, lathe, material } from '../src/lib/modeling.js';

export default defineModel({
  id: 'ripple-vase',
  title: 'Ripple vase',
  description: 'A hollow, twisted ceramic vessel. A lathed profile becomes a softly fluted surface through a small vertex deformation.',
  parameters: {
    height: { type: 'number', label: 'Height', min: 1.2, max: 3, step: 0.1, default: 2.1 },
    radius: { type: 'number', label: 'Radius', min: 0.4, max: 0.9, step: 0.05, default: 0.65 },
    flutes: { type: 'number', label: 'Flutes', min: 6, max: 18, step: 1, default: 12 },
    twist: { type: 'number', label: 'Twist (degrees)', min: -90, max: 90, step: 5, default: 35 },
    color: { type: 'color', label: 'Glaze color', default: '#77b9ae' },
  },
  build(p) {
    const wall = 0.055;
    const radiusAt = t => p.radius * (0.73 + 0.27 * Math.sin(Math.PI * t) - 0.12 * t);
    // Closed cross-section: underside, outer wall, lip, inner wall, inside floor.
    const points = [[0, 0], [radiusAt(0), 0]];
    for (let i = 1; i <= 48; i++) points.push([radiusAt(i / 48), p.height * i / 48]);
    points.push([radiusAt(1) - wall, p.height]);
    for (let i = 47; i >= 2; i--) points.push([radiusAt(i / 48) - wall, p.height * i / 48]);
    points.push([0, p.height * 2 / 48]);
    const body = lathe({
      name: 'Hollow ceramic shell', points, segments: 192,
      material: material(p.color, { name: 'Satin ceramic', roughness: 0.3, metalness: 0.05 }),
    });
    const positions = body.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const angle = Math.atan2(z, x) + p.twist * Math.PI / 180 * y / p.height;
      const ripple = 1 + 0.055 * Math.cos(p.flutes * angle);
      positions.setXYZ(i, x * ripple, y, z * ripple);
    }
    positions.needsUpdate = true;
    body.geometry.computeVertexNormals();
    return body;
  },
});
