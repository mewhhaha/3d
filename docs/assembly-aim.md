# Aim an assembly without moving its attachment

`aimAroundAnchor()` in `src/lib/assembly-aim.js` changes a rigid Object3D's
orientation while retaining an explicitly selected **object-local anchor**.
It returns the same object and does not rewrite or dispose mesh buffers.

```js
const sensor = group('Sensor', [housing, lens]);
sensor.position.set(0, .25, 0);
root.add(sensor);
aimAroundAnchor(sensor, {
  anchor: [0, -.10, -.03], // local ball-seat attachment, not the object origin
  axis: [0, 0, 1],        // local optical axis (default +Z)
  direction: [.8, .35, 1],
  space: 'world',         // alternatively 'parent'
  influence: 1,          // 0..1 shortest-swing interpolation
});
```

Before, changing the optical direction around an offset ball seat required
manually recomputing the housing's translation. This operation computes that
compensation from the anchor, current TRS and a quaternion swing. Position and
quaternion change; scale and descendants' **local** transforms do not. Their
world transforms necessarily follow their owner. Geometry, materials, UVs,
authored normals and tangents are unchanged and keep their original ownership.

`direction` is a vector, **not a target point, surface normal or camera**. Supply
it in world or immediate-parent coordinates. `axis` and `anchor` are local to
the object; the current scale is accounted for. The full inverse parent matrix
resolves world directions, including nonuniform/sheared ancestor chains.
The minimum swing is evaluated in parent space, not the Euclidean world metric
under nonuniform scale. A transformed vector axis is not an inverse-transpose
normal. There is no additional up/roll target or time-based tracking constraint.
The exact antiparallel case uses Three.js's deterministic shortest-axis choice.

Requires finite TRS, a unit quaternion, positive object scales, an invertible
orientation-preserving parent transform and `matrixAutoUpdate`. Invalid inputs
throw before placement is changed. Influence zero keeps placement exactly.
Repeated calls apply to the current orientation; this is not an animation state
store. Rebuild any separately generated connecting surfaces after aiming.

## Exercised examples

- The seated shoulder variant retains each lens center, swings the port/cowl
  together and rebuilds the sleeve from the unchanged shoulder ball to the
  optical back ring. Its cowl uses a private analytic one-sphere axial clearance
  fit. That is not a generic shrinkwrap or collision solver. Use
  `shoulderStyle: 'seated'` with `girdleStyle: 'connected'` and
  `bodyStyle: 'articulated'`; previous defaults remain unchanged.
- `studies/aimed-inspector.js` is an unrelated inspection instrument. Its
  off-origin ball-seat anchor stays fixed while the housing and lens swing.

Run `node scripts/review-shoulders.mjs` for fixed-camera material, clay, wire,
silhouette, alternate views and GLB validation. The operation itself does not
add a mesh, material, texture, rig, or export extension.
