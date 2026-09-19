# Pose the plain body for the shot

The shot study is `studies/prism-mannequin-shot.js`, not another adjustment to
`cyber-form-study` defaults. It resumes the previously unpushed original
humanoid foundation on verified main. The detailed android is unchanged.

```sh
npm run render -- studies/prism-mannequin-shot.js --pose shot --time .5 \
  --views hero,side --passes material,clay,silhouette --glb
node scripts/review-mannequin-shot.mjs
```

The GLB contains a clean T bind and `baseline` / `shot` hold clips. Select `shot`
after importing; these are not a walk or a collision-correct animation. The
baseline uses the **same shot proportions**, camera and lights, so the controlled
comparison isolates pose. The generic `humanoid-mannequin` model still keeps its
previous proportions and neutral/contrapposto/lookback presets.

## Editable construction data

`studies/prism-mannequin-pose.js` holds this project's dimensions and pose; the
library knows no reference pixels or android component names. Optical emitters
are not treated as skeletal joint centers. The camera is the earlier reference
projection translated down by the omitted 0.155 m platform; it is fixed before
all comparisons, not fitted independently for each pose.

`humanoidProportions` additionally accepts `legLength`, `shinShare`,
`shoulderHeight`, and `ankleHeight`. They define the bind skeleton **before**
posing. Waist positions and blend weights follow the resulting hip height.
Defaults retain the old proportions. The selected 1.80 m study uses 0.35 m
shoulder span, 0.17 m hip-socket span, 0.414/0.486 m thigh/shin lengths and a
0.17 m ankle datum. These are artistic blockout choices, not measured anatomy;
the large simple foot volumes remain placeholders for the missing costume.

Pose definitions now optionally accept:

- `waist: [x,y,z]`: parent-relative XYZ degrees on the first spine bone.
- `headWorld: [x,y,z]`: absolute **untransformed model-space** head orientation,
  not a view-dependent billboard. Neck/head share the turn, with connected
  translations preserved.
- `targets.Left/Right.{wrist,ankle,elbowPole,kneePole}`: explicit model-space
  vectors in fractions of stature. An omitted value keeps the old automatic
  hang/foot/pole behavior. Feet turn independently through the existing `turn`.

`poseHumanoid()` solves complete chains at fixed bind lengths; changing targets
never stretches bones. Invalid controls fail before mutation; an unreachable
solve restores the previous rig. Solves must occur before scene placement.

Changing bind dimensions requires rebuilding skins and clips. No UV/weight
transfer from another character, Mixamo upload/retargeting, physics balance,
collision/contact solver, continuous anatomical skin, or normal bake is claimed.
The costume has not yet been fitted to this rig.
