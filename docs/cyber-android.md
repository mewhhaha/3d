# Prism: reference-guided cyber android

Verified model revision: `bf0db11d890c5a67a032469a7fef0d508715901f`.
Dedicated workflow: `35009481740` — Cyber android scene checks, successful.

The current target is the user-supplied cyber-android artwork: pale mechanical armor over black structure, a mint-to-orange blunt bob, magenta eyes, a circular reactor backpack, hanging luminous cables, and a neon platform against a dark city. This implementation is authored 3D geometry. The image is a design guide, not a projected texture or a substitute render. No anatomical template or image-to-3D service is used by these recipes. Earlier reference-explorer provenance remains unchanged.

## Entry points

- `models/cyber-android.js`: character, mechanisms and backpack only.
- `models/cyber-android-scene.js`: character plus geometric platform/city, power feeds, an authored camera and five lights.
- `studies/cyber-android-scene.json`: locked hero view, draft geometry comparison and a small head-motion test.

The scene recipe composes implemented components:

```js
sceneAssembly({},
  cyberAndroid({ detail: 'hero', cables: true }),
  neonPlatform(),
  neonCity({ seed: 42 }),
  neonLightRig(),
  heroCamera(),
  overheadFeeds({}),
);
```

The character composes `shellTorso`, two `exoArm` and `exoLeg` components, `servoHand`, `animePortrait`, `prismBob`, and `reactorBackpack`. Coordinates belong inside those implementations, not in every scene recipe. This is one design vocabulary, not a universal person generator.

## Smaller reusable construction operations

`panel()` makes a beveled contour with actual through holes. Bulged plates are subdivided before deformation: bending a coarse triangulation produced visible facets in the first local render. `wrapShell()` builds a thick, curved elliptical section from a longitudinal profile. `splitShell()` composes sectors with deliberate exposed seams. A closed-edge test checks the shared indexed shell and rims, but does not certify absence of intersections.

`onShell()` attaches a +Z-facing detail at a normalized longitudinal coordinate and angular position on the same support used by the shell. Its frame includes the longitudinal slope; clearance follows the surface normal rather than a guessed global Z value.

```js
const stations = [[0.30, 0.08, 0.07], [0.15, 0.10, 0.09], [0, 0.05, 0.04]];
const armor = splitShell({ stations, material: materials.shell });
armor.add(shellDetails(stations, materials,
  portAt({ t: 0.24, angle: 0.3, radius: 0.018, color: 'cyan' }),
  fastenerRow({ heights: [0.15, 0.5, 0.85], angle: 1.0 }),
  ventAt({ t: 0.6, angle: 0.1 }),
  seamPath({ points: [[0.2, -0.3], [0.4, -0.4], [0.8, -0.25]] }),
));
```

`radialPort()` composes mechanical housings and concentric emitter rings. `routedCable()` follows a centripetal spline and distributes clamps by arc length. `cableLoom()` offsets fibers in a moving route frame. These helpers do not solve collisions or physical cable equilibrium. The luminous tubes are opaque emissive geometry, not transmissive glass.

## Surface-conforming portrait

The first close-up exposed floating eye corners and over-raised hair ribs. The portrait now uses the same `facialChart(x,y)` for its front skin and the sclera, iris, pupil, lid curves, brows and lip curves. Layers follow the differential normal instead of an arbitrary global depth.

`surfaceFrame()`, `surfaceLayer()` and `attachToSurface()` in `src/lib/surface-frame.js` are reusable for regular two-parameter surfaces. The cross product du x dv defines the outward side; the chart must be valid around the evaluation point. This is not a collision solver, general nearest-surface projection, or topology welding.

```js
const enamel = surfaceLayer(supportChart, { offset: 0.001 });
const raisedDetail = surfaceLayer(enamel, {
  relief: (u, v) => detailHeight(u, v),
});
attachToSurface(port, supportChart, { u: 0.2, v: 0.4, offset: 0.003 });
```

The portrait has a shorter jaw, smaller nasal relief, fitted almond eye surfaces, and a procedural radial iris texture. The bob's geometric strand rib height was reduced from 1.6 mm to 0.15 mm. These changes were inspected in a local close-up; the result remains simplified and is not a likeness. The eye-layer regression verifies finite, positive separations below 4 mm from the analytic facial chart. That test does not certify eye socket topology, eyelid deformation, a closed cornea, or absence of all intersections.

## Renderer and viewer

```sh
npm run render -- models/cyber-android-scene.js \
  --views hero --size 768x1376 --out renders/cyber --glb
npm run render -- models/cyber-android.js \
  --focus HeadMount --views front --out renders/portrait
npm run study -- studies/cyber-android-scene.json
node scripts/review-cyber.mjs
```

An authored scene carries `sceneRecipe` metadata naming its subject and camera. The renderer frames the subject, not the distant buildings, and uses authored lights instead of silently adding neutral studio lights. The Pages viewer uses the same optical helper and hero camera for its initial view, while allowing orbiting and ordinary front/side views. The studio preset selector is disabled for an authored scene; exposure remains available.

Material renders use multisampled bloom and optional depth of field. The focal anchor follows `HeadMount` when the camera moves. Geometry diagnostic renders disable those effects, remove fog, hide environment-tagged objects, and use neutral lights. Image comparisons use this subject silhouette, not the city background. The platform and overhead feeds are intentionally allowed to extend outside the hero crop.

The character GLB contains the character only. The **scene GLB intentionally includes its camera and authored lights**. Preview studio objects never export. Bloom, depth of field, fog and tone mapping are runtime effects, not portable glTF rendering guarantees; their settings are retained as scene metadata. Importing into a different renderer requires matching those settings. This new scene has not received its own native Blender render verification. The rig UI now describes native Blender artifacts as recipe-specific.

## Verified checkpoint, not visual acceptance

The initial local repository test run passed 113 tests before the portrait follow-up. The follow-up independently passed 11 targeted tests and the complete local scene review. The earlier expanded renderer regression passed hand/rig, framing, input recovery, dependency-refresh and export-isolation checks.

The dedicated workflow for `bf0db11` independently passed all 11 targeted component tests, the complete 18-image scene/asset/portrait review, all four GLB validations, an actual Pages build, desktop/mobile UI checks, model switching and a GLB download. The scene and character GLBs plus the 768 x 1376 hero PNG were independently compared with the local outputs and were byte-identical. This observation applies to this revision and these environments, not every browser or machine.

The default scene has **546,324 triangles**; the character-only export has **455,704**. The draft scene has **401,380**. Draft lowers geometry/detail counts; **it is not a high-to-low normal-map bake**. Existing cage normal-transfer tooling is not yet integrated with this armor/hair assembly. All four GLBs have zero validation errors and warnings. Informational unused-UV messages are retained and none of the reports is truncated.

`review-cyber.mjs` checks the named camera, five exported lights, embedded image data, Survey clip and byte-identical scene exports before/after the preview pose. The local environment blocks HTTP navigation, so the actual Pages UI test runs in CI; local 3D renders use the in-memory runtime. An interrupted local review was rerun successfully; this is not a claim of crash-free operation under arbitrary resource pressure.

Artifacts: `cyber-scene-review`, including models, hero/asset/clay/portrait/backpack images, full validator reports and Pages desktop/mobile screenshots. The separate all-gallery Pages deployment is not implied by this successful scene/UI check. Report deployment status separately.

## Visual priorities and scope

The full-body and close-up renders are a blockout/material study. The stance is stiff, the face is still doll-like, the armor has large simplified sections and overlapping trim, the shoes are too slab-like, the hair lacks the reference's silhouette and strand structure, and the city is an abstract arrangement of buildings/windows. The luminous loop blooms too broadly. These visible defects are not resolved by higher triangle counts.

The named rigid joints and Survey head clip are not a skinned humanoid rig, complete hand articulation, IK, cloth/hair simulation, or contact-correct animation. Do not apply the earlier hand's rig/normal-bake claims to this different model.

Next: refine the portrait and primary armor/boot contours against the supplied image, reduce part overlap, then add intentional rigid poses and cable attachment constraints. Inspect front, side, back, portrait and neutral clay images before adding more decorative pieces. Push small tested checkpoints to main; never replace real 3D output with image generation.
