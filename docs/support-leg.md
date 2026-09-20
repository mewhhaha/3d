# Pose a simple humanoid before fitting its costume

Continue the existing original 28-bone mannequin, not a new procedural armor
assembly. It has `slender` and `broad` builds, an explicit T bind, standard
materials, UVs and real skin weights. These are editable starting proportions,
not sex classifications or imported Adobe X/Y Bot assets. The full android and
its previous experiments remain untouched.

## Choose a supporting leg without stretching it

```js
const stance = humanoidPose('contrapposto');
stance.support = { side: 'Right', bend: 12, maxShift: .08 };
const figure = humanoidMannequin({ build: 'broad', poses: { stance } });
```

`bend` is knee flexion in degrees (0 is straight). `maxShift` is the maximum
vertical pelvis correction as a fraction of stature, limited to `[0,.2]`.
The optional control slides the hips along model Y before solving all four
chains. The selected ankle target stays fixed; the other leg and both wrists
must also remain reachable. An impossible request throws and restores the
previous rig, instead of secretly stretching legs, moving feet, or clamping a
joint. No `support` field means the previous behavior is retained.

This is **kinematic support intent**, not a center-of-mass or balance solver.
It does not guarantee realistic knee limits, collision-free limbs, toe contact,
or natural transitions between hold poses. The default mannequin feet are
placeholders. The normal untransformed-model-space solve contract still applies.

The reusable primitive is `slideRootForBend()` in `two-link-pose.js`:

```js
const slide = slideRootForBend({
  root: [0, .8, 0], target: [.10, 0, 0], lengths: [.42, .45],
  bendDegrees: 15, direction: [0, 1, 0], maxSlide: .15,
});
const chain = twoLinkPose({ ...slide, pole: [0, .4, .8] });
```

Using the law of cosines, the requested bend defines a root-to-endpoint distance.
The helper intersects its sphere with the authored slide line and selects the
nearest root. Endpoint correspondence and bend plane remain separate. Returned
arrays are owned; inputs are not mutated. Invalid inputs, finite arithmetic
overflow, missed intersections and excessive travel throw. The line direction
need not be vertical: the independent inspection boom uses the same primitive.

## Inspect and export

```sh
node scripts/render.mjs studies/prism-mannequin-shot.js --pose stance --time .5 \
  --views hero,side --passes material,clay,silhouette --glb
node scripts/render.mjs studies/humanoid-support.js --params '{"build":"broad"}' \
  --pose support --time .5 --views front,side --glb
node scripts/review-support-leg.mjs
```

`prism-mannequin-shot` retains `baseline` and `shot` and adds `stance`; the new
candidate changes the pelvis/waist counter-roll and requests 14 degrees on the
left support leg. Bind proportions, ankle/wrist targets and mesh buffers are
unchanged. This project data is not embedded in the library. Generic mannequin
preset clips are unchanged. All are hold clips, not a walk cycle.

Export rebuilds a clean T bind with all clips, irrespective of preview pose.
No new topology, UV transfer, shader or normal bake is involved. The added
control is exercised on the reference-shot proxy, both generic builds and the
existing inspection boom. See the checkpoint for actual tests and visual limits.
