# Rough costume on the current upright rig

Start from `studies/prism-armor-blockout.js`, not the older twisted static android.
This optional study extends the current **tailored Xbot / upright** combination.
No bone, pose definition, camera, source skin vertex, UV, weight or inverse bind
is changed by dressing it. Existing stock/old variants and the detailed android
remain available and unmodified. This is still an Adobe/Mixamo-derived evaluation
asset: no raw or modified imported mesh is included in Git, Pages or CI artifacts.

```sh
node scripts/prepare-xbot.mjs # explicit optional input, once
node scripts/render.mjs studies/prism-armor-blockout.js --pose upright --time .5 \
  --views hero,side --passes material,clay,silhouette --glb
node scripts/review-armor-blockout.mjs
```

`armor: false` gives the previous bare rig. `textured: false` keeps the same rough
costume with flat enamel; `pack: false` removes only the backpack mass/cables.
Exports start in T bind with the existing five clips; choose `upright`, not the
historical dramatic twist, to inspect the current costume in the intended pose.

## Construction rather than a painted character

- Broad chest and iliac panels use existing contour surfaces and thickness.
- Separate upper-arm, forearm, thigh and shin shells do not span the joints.
  Each limb support is sampled radially against its rest-skin influence region,
  then cached with the existing C1 surface cache. Missing samples explicitly fall
  back to a coarse authored support. This is an approximate rest fit, not a
  collision solver or copied source topology. The fit records sample/miss counts.
- Shoulder caps, shallow optical housings, foot covers, orange soles, a backpack
  carrier and three simple return loops are independent editable geometry.
- Circular colors/emission use existing `radialProfileMaps`, not many torus bands.
  Large contours and plate thickness remain geometric. No normal bake is claimed.

`mountOnBone(model, bone, component, {frame})` resolves independently authored
component meters into the bone's parent space. `frame` maps component coordinates
to model coordinates and is composed with the component's own local transform.
Resolve in rest after any proportion edit. It compensates for imported armature
units (the sample's .01 conversion) rather than scaling garment vertices by eye.
The owned, unparented rigid component becomes a child of a named mount under the
existing bone; future clips move it. Geometry and skin binding are not rewritten.

```js
const guard = box({name: 'Guard', size: [.12, .24, .035]});
mountOnBone(subject, upperArmBone, guard, {frame: authoredRestFrame});
```

The operation rejects external bones, already-parented components, skins/bones
inside a rigid component, frozen component matrices, nonuniform model-relative
bone scales and singular/reflected/sheared local transforms. It is not
surface anchoring, weight transfer or cloth deformation. Rebuild mounts after
changing rest geometry. Callers retain responsibility for own-resource disposal.
The unrelated `bone-mounted-prop` study uses the same operation and swatch on a
moving inspection-arm guard, not another renamed humanoid.

## Generated texture guide: explicit interpretation

The user-approved generated **material board** is a look-development guide, not
the original reference raster and not six physically measured PBR maps. Two small
flat color regions (enamel and rubber) were cropped, resized to 32x32 and quantized
into indexed palettes. Their exact crop boxes, parent hash and source dimensions
are in `studies/data/armor-study-swatches.json`. No labels, full-board projection,
or original reference pixels are used. The large generated board stays external.

`indexedColorTexture` creates owned sRGB RGBA8 textures from that explicit pixel
data, reversing top-down image rows for the existing bottom-up UV convention.
Roughness/metalness are authored constants. The painted purple "normal" sample
was deliberately **not** used as a normal bake. The color samples are not asserted
to be seamless, lighting-free or sufficient for production close-ups. UV stretch,
limited 32px resolution and low-frequency color noise remain visible limitations.

## What remains rough

The head has no face or hair costume yet. Chest/hip panels have conservative
stand-off because close-fitting a rigid panel to a skin influenced by multiple
spine joints caused intersections in the posed view. Hands, foot wedges and
backpack are only rough masses. Geometry contacts in all possible clips are not
certified; primary side/back views must remain part of review. This pass is not
an accepted likeness, remesh, animation-retargeting or native Blender result.
