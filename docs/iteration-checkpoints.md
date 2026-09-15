# Render-driven iteration and checkpoints

The user explicitly requests incremental pushes to `main`. Commit coherent improvements as they pass targeted tests, rather than holding an entire modeling session in local files. Re-read the tip before advancing a branch, never force-push, and preserve unrelated changes. Do not treat a successful commit or structural test as visual acceptance.

## Recovery and review

The authoring-kit workflow packages the current source, its revision, pinned dependencies, and prepared anatomical assets, without Git metadata or credentials. This supports offline recovery when the authoring environment has no network. The model workflow saves `reference-review` and `native-reference` artifacts before running the remaining gallery checks, so a later failure does not erase the useful model checkpoint.

## Problems observed, not inferred from triangle counts

- Primitive anatomy was replaced by the existing CC0 anatomical foundation. More tessellation alone was not sufficient.
- Approximate ellipsoid hair guides detached from the actual scalp. `radialSurface()` now samples the anatomical triangles; `tiedBun()` layers fitted coverage, guide clumps, fine strands and flyaways.
- The old scarf resembled stacked tubes. `drapeRibbon()` creates a fabric sheet with hems. `sumFields()`, `foldWaves()` and `fadeEdges()` compose independent shape operations.
- A draped scarf still penetrated the shirt because its fit referenced naked anatomy. `projectMesh()` and `clearSurface()` constrain the drape against the already-fitted shirt instead.
- Blender's rig display templates polluted the framing bounds and floor height. The studio excludes custom bone shapes and hidden objects before measuring evaluated asset vertices.

## Composition at two levels

A model recipe chooses meaningful components:

```js
composeCharacter({ height: 1.72, quality: 'studio' },
  anatomy(), portrait(),
  wear(fieldShirt(), cargoTrousers(), hikingBoots(), scarf()),
  tiedBun({ looseness: 0.7 }),
  equip(utilityBelt(), backpack()),
  animate(idle(), walk(), wave()),
);
```

A component can itself compose operations:

```js
const folds = sumFields(
  foldWaves({ count: 4, amplitude: 0.003 }),
  fadeEdges(foldWaves({ count: 9, amplitude: 0.001 })),
);
const clearance = clearSurface(projectMesh(shirtMesh), { clearance: 0.006 });
const fabric = drapeRibbon({ path: guide, width: 0.08, material,
  folds, conform: clearance });
```

These helpers also apply to sashes, straps and other fitted fabric components. The positive-Z clearance operation is a rest-pose projection constraint, not a collision solver. Radial sampling requires a surface surrounding its axis; it is not a universal wrapping algorithm.

## Acceptance

Run the node tests, inspect front/side/face/boots and posed renders, then inspect the native Blender render and validation report. Require visible-asset framing, actual imported bone deformation, packed textures and file reopen. Report the tested code revision and deployment result separately. A completed scene still does not imply photographic likeness: silhouette tailoring, clean garment boundaries, realistic hair grooming, facial likeness and production deformation remain explicit quality targets.
