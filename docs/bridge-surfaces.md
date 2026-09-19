# Boundary-driven connecting surfaces

`bridgeSurface(start, end, {tangentStart, tangentEnd})` in
`src/lib/surface-boundary.js` spans two **corresponding curves in one coordinate
space**. `u` runs along each curve; `v` crosses from start (0) to end (1).

```js
const transition = bridgeSurface(
  u => inlet(u),
  u => outlet(u),
  {
    tangentStart: u => [0, 0, .4],
    tangentEnd: u => [.2, 0, .3],
  },
);
const wall = thickenSurface('Transition', transition, {
  segments: [40, 20], thickness: .008, material: shell,
});
```

Endpoints are exact and return owned arrays. Optional tangent functions specify
**dP/dv**, in position units per normalized span, at both ends. Both point in the
start-to-end direction; they are not a pair of inward normals. Cubic Hermite
interpolation satisfies those endpoint derivatives. Without tangents the result
is linear/ruled; with only one tangent, the other uses the endpoint chord.
Coordinates outside [0,1], nonfinite samples/results and non-function inputs
throw. Continuous source curves and periodic tangents give a periodic support.

Keep endpoint placement, shape, material and resolution separate. Resolve
Object3D-relative curves into a common space **after posing**, then rebuild if
owners move. This API is a pure surface function: it does not read cameras,
mutate objects, infer correspondences, weld vertices or close arbitrary meshes.
Crossed boundaries, bad tangents, folds, collision and incompatible sampling are
still the author's responsibility. Analytic contact is not a triangle-welding
or smooth-shading guarantee.

`surfaceEdge()` and `edgeDerivative()` can supply endpoint data. Negate an inward
end-edge derivative when extending out of its source patch. Existing
`surfaceBand`, `surfaceContourGeometry`, thickness and detail operations can
consume the new support. Compiling it generates fresh UVs/topology; no previous
weights, anchors, authored normals, tangents or high/low correspondence are
implicitly transferred. This pass changes no head/hair normal bake.

## Examples

- `shoulder-girdle.js` resolves rib, shoulder-ball and head-saddle boundaries in
  the torso's local frame. Separate clavicular/scapular/trapezial spans and a
  cervical collar replace missing connections. It remains a build-time rigid
  mechanical assembly, not continuous anatomical skin or a collision solver.
- `studies/boundary-duct.js` connects an oval inlet to a smaller tilted circular
  outlet. The end flanges and UV layout stay fixed between ruled/curved versions.

Use `girdleStyle: 'connected'` with `bodyStyle: 'articulated'` in
`cyber-form-study`. The previous default is `legacy`. Reproduce fixed-camera
material/clay/wire/silhouette comparisons with `node scripts/review-girdle.mjs`.
