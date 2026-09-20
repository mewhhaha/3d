# Edit a body while retaining its hands and feet

`withPins(chains, edit)` extends the existing `skeletonPose()` controller; it does
not create a skeleton, rebind a mesh or infer a humanoid. Each descriptor names
one independent direct two-link branch and supplies a **world-space pole**.
Current tip positions and, by default, world orientations are captured before
the edit. Then the existing two-link solver resolves all branches.

```js
const pins = [
  {root: 'upperArm', joint: 'elbow', tip: 'hand', pole: [.4, 1.2, -.3]},
  {root: 'thigh', joint: 'knee', tip: 'foot', pole: [0, .4, 1]},
];
pose.withPins(pins, body => {
  body.rotateWorld('chest', [-3, -12, 8]);
  body.translateWorld('pelvis', [-.04, 0, 0]);
});
```

Names can use the controller's existing role dictionary. `orientation: false`
retains only position, allowing the tip's rotation to follow the edited chain.
`swivel` remains the two-link solver's bend-plane rotation in degrees. The
returned ordered solve records own their arrays. Poles are author data, not
silhouette-derived anatomy or automatic joint-limit constraints.

The edit is synchronous. All bone local TRS is restored if the edit throws, any
chain becomes unreachable, an edited link changes length, or solving fails.
Pins must use disjoint branches: shared bones and serial dependent chains are
rejected before editing. This one-pass solver is not coupled full-body IK.
Positive uniform ancestor scale is required by the existing world-orientation
operations. Do not use async callbacks or mutate non-bone resources inside this
transaction; they are outside its rollback scope.

A pin guarantees the selected bone frame, **not** collision-free skin, physically
balanced support, correct ground forces or finger contact. It is a build-time
pose editing tool, not a continuous contact constraint during animation. Wrap
it in `hold()` to retain the existing clean-bind export and prior-pose isolation.
Geometry, UVs, weights, inverse binds, materials and original clips are untouched.

## Exercised uses

- Actual Adobe/Mixamo Xbot: `poised` starts from the retained `confident` clip,
  shifts/counterturns the pelvis and chest, and adjusts the clavicles/head while
  all four hand/foot frames remain pinned. The rig and source mesh are unchanged.
- `studies/pinned-inspection-arm.js`: an unrelated rigid inspection carriage
  moves while the probe retains its position and orientation at the workpiece.
- Unit tests use a rotated .01-scale two-branch skeleton and the original broad
  humanoid, including invalid topology, failed second-chain rollback and
  position-only pins.

`node scripts/review-imported-humanoid.mjs` reviews all old and new pose clips,
locked material/clay/wire/silhouette angles, the mechanism and real GLB reimports.
The optional imported source must already be prepared; see imported-humanoid.md.
