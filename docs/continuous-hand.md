# Continuous hand: shared topology before surface detail

Verified model revision: `e943e114ba25f61953cd58cdc48c3918c2442920`.
Component workflow: `34980172725`, Connected hand cage study, successful.
Model ID: `anatomy-cage-hand`. Lab selection: Hand — connected quad cage.

This is an isolated first-principles hand study, not a realistic reproduction of the explorer, and not a replacement for the old arm or whole-character recipe. Its primary form, branching topology, joints, weight field and detail are procedural. It does not import MakeHuman vertices, a scan, or an image-to-3D reconstruction. It uses the existing Three.js rendering and MikkTSpace tangent infrastructure.

## What changed

The previous hand joined separate palm and finger charts with a triangulated patch. Its high/low boundaries differed, requiring a bounded UV-edge extension, and the previous junction quality report contained a roughly 81-degree worst sampled error. Adding more texture pixels did not address the topology problem.

This hand starts as a closed shared quad graph. Each finger and the thumb are extruded from a named palm face. Catmull-Clark subdivision operates on the geometric graph, while UVs remain face-varying corner data with exactly corresponding domains across levels. Relief is applied once per geometric vertex, so a UV split cannot physically separate the skin. Baking samples the evaluated high surface normal in the actual low triangle's Mikk tangent frame.

The first workflow renders then exposed blocky palm volumes, rectangular faceted nails and unwanted wrist influence at distal fingers. Localized volume operators, rounded smooth-shaded nail patches and a separation of digit ownership from longitudinal skin blending address those problems. The final render is still visibly simplified: broad palm/knuckle shaping, the thumb root and nail beds are not production anatomy. A closed manifold audit does not rule out self-intersections or an unattractive fold.

## One semantic definition, multiple representations

```js
import { hand, palm, fingers, opposingThumb, skinDetail } from '../src/lib/forms/hand.js';
import { buildCageHand, cageHandSource } from '../src/lib/forms/cage-hand.js';

const form = hand(
  palm({ breadth: 1, arch: 0.45 }),
  fingers({ spread: 0.3, curl: 0.1 }),
  opposingThumb({ reach: 1 }),
  skinDetail({ creases: 1, pores: 0.4 }),
);

const high = buildCageHand(form, { mode: 'sculpt' });
const low = buildCageHand(form, { mode: 'cage' });
const baked = buildCageHand(form, { mode: 'baked', textureSize: 1024 });
const editableSource = cageHandSource(form);
```

These objects are independently owned; dispose them when finished. The geometry controls stay inside reusable components rather than being copied into every character recipe. `models/anatomy-cage-hand.js` shows normal recipe discovery and parameter controls.

## Construction operations, not just a parameter catalogue

- `quadCage(points, faces)` validates shared quad topology, edge winding and vertex fans.
- `growFace(cage, socketTag, rings, { name })` replaces one socket face with a branch. Ring points belong in the component implementation; the root keeps shared vertex IDs.
- `deformCage(cage, ...operations)` composes primary-form changes without changing connectivity or UVs. `softMove({ center, radius, offset })` provides smooth local volume shaping in meters.
- `atlasCage(cage, { size, gutter })` lays out padded control-face charts before subdivision.
- `subdivideCage(cage, levels)` refines geometry and per-corner UVs separately.
- `displaceCage(cage, field)` adds signed normal relief once per geometric vertex.
- `cageGeometry(cage)` emits renderable triangles, seam-consistent geometric normals and Mikk tangents.

Cage geometry functions live in `src/lib/forms/cage.js`; shaping operations are in `cage-shape.js`. This separation allows the same topology and detail machinery to serve future branching anatomy and other forms. It is not yet a universal humanoid, face retopologizer or arbitrary-mesh decimator.

## Measured high-to-low result

Default levels are low 2 and high 4. Including the five separate nail plates:

| Representation | Triangles | Embedded normal atlas |
| --- | ---: | --- |
| High evaluated geometry | 179,840 | No |
| Low geometry | 11,840 | No |
| Low geometry plus baked detail | 11,840 | 1,024 x 1,024 |

Reduction: 93.4164%. Low and baked attributes are identical, including positions, normals, UVs, tangents and skin weights. This is corresponding subdivision resampling, not arbitrary edge-collapse decimation. Normal maps do not preserve silhouettes or fix deformation; lower subdivision levels can visibly change those.

Independent deterministic tests use 8,192 area-weighted samples for the whole skin and another 8,192 for a palm-to-finger junction band, with bilinear level-zero texture lookup:

| Atlas | Whole mean / 95th / maximum error | Junction mean / 95th / maximum error |
| --- | --- | --- |
| 512 | 0.177 / 0.322 / 3.077 degrees | 0.175 / 0.346 / 2.795 degrees |
| 1024 | 0.160 / 0.265 / 0.994 degrees | 0.150 / 0.250 / 1.008 degrees |

Both configurations required zero UV-edge extension samples. The new junction has a different topology and sampling domain from the old patch, so this is not a like-for-like claim that the previous benchmark fell from 81 degrees to 1 degree. These measurements test normal transfer, not photographic likeness, silhouette, mipmapping, animated tangent fidelity or skin shading. The per-control-face atlas is intentionally simple and wastes texture space; production unwrapping and mip-safe chart packing remain future work.

## Rig and Blender handoff

The asset has one connected skin surface plus five separate nail plates, all skinned to 17 joints. Grasp and WristFlex are illustrative clips, not contact-correct gripping or a biomechanical simulation. The regression suite checks removal of distal wrist contamination and return to rest after an explicit finger rotation.

The workflow exports all three GLBs and a normal-map PNG, then imports the baked GLB in Blender 4.0.2. The native report verifies six UV meshes, one decoded Non-Color normal image, animation actions, an imported finger rotation moving vertices by approximately 0.031475 m, zero measured restoration error, texture packing, save, reopen and a CPU Cycles render with a three-light studio.

The native file also contains `EditableHandCage`: 352 shared vertices, 350 quads, per-corner UVs, 17 vertex groups, an armature modifier and a real Subdivision Surface modifier at viewport level 2 / render level 4. It is in the disabled collection `Construction source - enable to edit`. Enable that collection's viewport visibility and hide the evaluated hand when editing the source. The source is render-disabled by default to avoid doubled geometry.

The editable cage preserves the primary construction, not a live replay of the JS relief or nails. Blender's interpolated control weights and evaluated subdivision can differ from the compiled asset. Editing the cage does not update the JavaScript recipe or automatically rebake the normal map.

## Validation and artifacts

All 90 local repository tests passed for this source revision, including 10 targeted cage tests. The dedicated workflow independently passed those 10 tests, both bake measurements, all three GLB validations and structural re-imports, browser views/poses/mobile checks, and native Blender verification. Each GLB has zero errors but retains six `NODE_SKINNED_MESH_NON_ROOT` hierarchy warnings. Warnings are saved, not suppressed.

Artifacts: `cage-hand-review` and `cage-hand-blender`. Review output includes `comparison.json`, three validator reports, `cage-hand-source.json`, normal PNG, neutral-lit views, a skeleton view and a grasp view. `reports/cage-hand-quality.json` contains the complete normal-transfer measurements. Native output contains `cage-hand-baked.blend`, `blender-preview.png` and `validation.json`.

This successful component workflow does not establish that the separate whole-gallery Pages deployment succeeded. Report that deployment status separately.

## Resume here

Use the actual front/back/side/posed images as the next acceptance target. Resolve the remaining thumb-root fold and broad palm/knuckle anatomy, add explicit intersection and posed seam tests, then extend a shared wrist boundary into the arm. Reuse the connected topology and correspondence machinery for facial openings before spending more triangles on pores or hair strands. Do not silently replace the old whole-character hands until the new component is visually and mechanically accepted.
