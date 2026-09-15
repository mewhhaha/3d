# Palm junction: geometry and normals must be composed together

The hand component initially ended the palm at a flat rim below four digit tubes. Moving that rim downward created a taller bridge but exposed another crease instead of producing a satisfactory organic transition. This is a geometric design limitation, not a missing pore texture.

The next iteration adds an explicit relaxation mode to the shared geometric graph:

```js
fairJoin(charts, {
  region: unionRegions(knuckleRegion, thumbRegion),
  method: 'relax',
  iterations: 20,
});
```

`fair` keeps the existing positive/negative smoothing pair; `relax` uses only the positive weighted-neighbor step. Relaxation intentionally loses volume and must be applied locally. Neither method is anatomical retopology, an exact volume constraint, nor an intersection solver. The hand uses 20 low-resolution steps and 320 high-resolution steps because the denser mesh has much shorter edges. These are authored settings, not a resolution-independent solver.

The knuckle-web patch now gets its own tangent frame and normal map, after smoothing. Previously, mapping the palm and digits while leaving the joining patch unmapped made their shading disagree. Hand baking includes seven chart normal maps; the complete arm includes eight. Both compare against the actual high mesh.

## Slightly different UV hole boundaries

The high digit opening has more samples than the low polygonal opening. A few low-chart points therefore fall just beyond the high chart's hole boundary. `normalSampler` is strict by default. A junction explicitly declares `geometry.userData.uvBoundaryPadding = 0.004` to allow a bounded nearest-edge extension in normalized UV coordinates. The returned normal is interpolated on a real high-mesh triangle edge; larger gaps still throw an error. This is not unconstrained projection or a general missing-surface fallback.

Both bake reports and independent filtered comparisons record `boundaryExtension`: the number of samples, edge-extended samples, and maximum edge distance. This makes the approximation visible rather than silently claiming exact correspondence at every UV.

## Remaining acceptance work

Inspect the actual browser and native renders. The joining patch may still show a residual seam, the palm remains simplified, and the thumb/nail silhouettes are not finished anatomy. A connected surface, a successful bake or low angular normal error does not imply an accurate hand. A dedicated branching quad cage remains a stronger next representation for deformation and continuous curvature; it has not been implemented here. The older whole explorer is not replaced by this component study.
