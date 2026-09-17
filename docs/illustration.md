# Editable illustration shading and the Prism head variant

Geometry, normals, ink, textures and lighting are separate authoring decisions. Import the general operations from `src/lib/illustration.js`:

```js
const edited = directNormals(source, {
  field: ellipsoidNormalField({center: [0, 0, -1], radii: [1, 1.4, 1]}),
  selection: mySelection, // existing geometry-sculpt selector: semantic, radial, etc.
  maxAngle: 45,          // degrees, measured from the original vertex normal
});
const ink = inkHull(source, {width: .001}); // geometry-local meters
const look = twoToneMaterial({
  color: '#dec7ac', shadow: '#997080', direction: [-.5, .3, 1],
  threshold: .25, softness: .05,
});
```

`directNormals` clones indexed static geometry and edits only normals. It preserves positions, indices, UVs, groups and ordinary attributes. It deletes stale tangents: apply this **after shape changes and before normal baking**. Recomputing vertex normals later erases the authored result. Skin/morph geometry is rejected; this is not a rig-refit operation. Ellipsoid normals use the ellipsoid gradient, not an uncorrected radial direction. Selections remain the existing composable geometry-sculpt fields.

`inkHull` owns a second mesh, expands it using geometric normals, reverses winding and normals, and uses ordinary opaque front-sided unlit material. Thus the reversed shell exports as real glTF geometry instead of relying on an unsupported BackSide-material approximation. Width is not screen-space constant. Concavities and insufficient resolution can self-intersect; no collision guarantee is made. The local renderer excludes marked ink hulls from clay/wire/silhouette diagnostics and restores them for beauty/export.

`twoToneMaterial` is an explicit **WebGL look over a standard PBR fallback**. It uses an authored world-space key direction and the final shading normal, with independent lit/shaded hues and a softened threshold. It does not accumulate scene lights or implement real cast shadows. `hydrateScene` restores its shader from JSON-safe metadata after ObjectLoader transfer. glTF exports PBR color/textures/normals plus metadata, **not the custom shader**. External viewers therefore show the fallback unless they implement the look. `head-pbr` in the review demonstrates that difference. No shader callback, plugin, external service or generated reference projection is required by a consumer.

## Concrete examples

- `studies/prism-head.js --params '{"headStyle":"illustrated"}'`: reduced nose bulb, cheek/socket relief, attached upper-lid rim, less heavy lower lash, bigger iris, lifted mouth, custom normals and ink. These are genuine surfaces, not a face raster.
- `studies/illustration-tools.js`: an unrelated mechanical service pod, using the same normal field, mask, hull and material.
- `models/cyber-form-study.js --params '{"headStyle":"illustrated"}'`: replaces only the head in the published reference-aligned assembly. Camera, pose guide, body, routes and annotations stay fixed.

The old `headStyle: 'legacy'` remains the default, so prior reference/bake baselines do not silently change. The illustrated variant is editable, integrated and reviewable, but not approved final likeness.

## Hair construction

`bobCrossSection()` defines a rounded ellipse and crown in meters. `roundedBob()` shares that support between crown and fringe, with an independent swept blunt curtain cut. `fringeHeight`, `opening` and `cutHeight` are geometric controls, not texture offsets. The new shape replaces the old large forward sheet and raised crown plug; it does not modify the legacy guide tables. A procedural sRGB height gradient and strand field provide color. Fine fiber relief retains distinct high/cage/baked representations. `measureHair(out, {builder, names})` now permits verifying another hair component without changing the existing guide-bake defaults.

```sh
node --test tests/illustration.test.js
node scripts/review-illustration.mjs
```

The review retains partial results, validates all exported GLBs, compares fixed camera states, shows PBR fallback, tests a mechanical fixture, measures unchanged low/baked buffers against actual high hair, and writes mean/95th/max errors. It does not claim normal textures recover silhouette detail. See the research note and automation journal for limitations, rejected trials and measured results.
