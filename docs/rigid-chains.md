# Connected rigid link authoring

`rigidChain()` in `src/lib/rigid-chain.js` builds an ordinary Three.js Group tree.
A link extends along its **local -Y**, in meters. Its XYZ Euler rotation, in degrees,
is relative to its parent link. Each next joint is placed at the preceding link's
exact local endpoint; the final `tip` is a separate named transform.

```js
const finger = rigidChain({
  name: 'Finger',
  lengths: [0.03, 0.019, 0.013],
  rotations: [[15, 0, -3], [32, 0, 0], [22, 0, 0]],
}, (length, index) => makePhalanx({ length, index }));
```

The builder is called once per length and must return either null or a distinct,
unparented Object3D. It owns its geometry/material design; the chain adds only
transforms. Empty `rotations` means straight. `userData.rigidChain` records lengths,
original angles, local-axis convention and joint/tip names. It is construction
metadata, not a continuously updated pose report. Use the returned standard
Object3D nodes to evaluate current world-space endpoints or edit a joint rotation.
The helper does not steal parented parts, share one part between links, clone
caller geometry, or dispose caller resources.

This removes repeated joint-placement arithmetic from rigid fingers, grippers and
other serial linkages. Unlike `twoLinkPose`, it is forward construction from angles,
not a target solve. Unlike `skeleton`/`skin`, it does not bind vertices or imply a
skinned hand. The three APIs have deliberately separate responsibilities.

## Integration and limits

`articulatedHand()` uses a tapered palm, arcing knuckle roots and independently
curled fingers/thumb; `studies/chain-gripper.js` exercises the same operation on
larger non-anatomical jaws. Three hand poses preserve identical geometry buffers.
The android uses the new hand only with `handStyle: 'relaxed'`. Its wrist mount,
palm emitter and all prior scene defaults remain unchanged. `panelStyle: 'cutaway'`
separately changes torso/thigh contours, not the skeleton or hand behavior.

GLB preserves these rigid nodes, geometry, UVs and standard materials. No runtime
IK, contact, joint limits, tendon coupling, anatomical simulation or animation
clip is generated. Repeated chain names in different owners require scoped lookup;
callers authoring animation tracks should choose globally unique names. The hand's
palm is an open-ended mechanical shell, not a watertight printable skin.

Research: [hand structure / connected FK](research/rigid-hand-chains.md).
Review: `node scripts/review-hands.mjs` creates fixed-camera comparisons and validates
three GLBs. It uses the existing isolated-browser batch after a reused local
browser terminated during an earlier full-scene capture; it does not suppress
geometry, browser or validation errors.
