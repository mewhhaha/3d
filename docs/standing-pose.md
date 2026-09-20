# Standing correction: do not build another torso spiral

The user's current direction is explicit: **standing upright, pelvis pushed out,
arms along the sides, head down**. The earlier `confident` / `poised` /
`silhouette` variants overinterpreted the three-quarter view as a strong spinal
countertwist. Keep them as historical comparisons, not the active target.

```sh
node scripts/render.mjs studies/imported-xbot.js \
  --params '{"form":"tailored"}' --pose upright --time .5 \
  --views hero,side --passes material,clay,silhouette
node scripts/review-upright.mjs
```

`xbotUpright()` composes the existing skeleton controller; this correction did
not require a new rig, new skin, new posing framework or any extra triangles.
It starts from rest through `hold()`, rather than adding more rotations to an
already twisted candidate. The hip, waist and chest share a common model-space
heading. Lumbar pitch/roll provide a small pelvis/rib offset without opposing
yaw; the upper chest is upright and the shoulders are not individually raised.
Head pitch is independently downward.

Arm reach targets are recomputed relative to each posed shoulder using actual
bone lengths, a gravity-aligned drop and small lateral/front clearances. They
are **not** pinned to the previous twisted pose's world wrist positions. This
is a necessary release of the old constraints, not a loss of IK precision.
Ankle positions and bone lengths remain fixed; foot yaw now follows the common
body heading with small toe-out. This is still authored IK, not mass-based
balance or guaranteed skin collision/contact.

The project-specific pose controls are `heading` (default -30 degrees),
`lumbarPitch` (-8), `lumbarRoll` (-14), world `hipShift` (meters), `headPitch`
(20) and `headRoll` (12). Both stock and tailored forms exercise the same recipe.
They are hypotheses to judge in the rendered image, not a new definition of
confidence. These parameters are callable author data, not promises that every
arbitrary combination is reachable. The existing fixed-length solver can throw.

## What stayed independent

The model's stock and tailored bind shapes, UVs, weights, inverse binds, materials,
all four earlier pose definitions, detailed android and original code-authored
mannequin are untouched. `upright` is a new held pose, not a replacement animation
library. It is stored with the other clips in clean T-bind exports. The authored
camera and lighting remain fixed; there is no perspective or shading trick to
make one shoulder look larger.

`review-upright.mjs` is the actual imported-rig regression, after explicit pinned
asset preparation. It asserts common chest/pelvis heading, an upright upper
chest, small shoulder height discrepancy, downward head direction, gravity-
aligned arm drops, retained ankle targets/limb lengths, and clean bind export.
It reimports all vertices for all five poses on both forms. These assertions
check the authored direction; they do not certify likeness or attractiveness.

No proprietary input or derivative GLBs enter public source or CI artifacts.
The user's reuploaded reference remains local comparison material, and its
manual annotations remain unchanged.
