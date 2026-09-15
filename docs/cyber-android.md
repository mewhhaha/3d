# Prism: reference-guided cyber android

The current target is the user-supplied cyber-android artwork: pale mechanical armor over black structure, a mint-to-orange blunt bob, magenta eyes, a circular reactor backpack, hanging luminous cables, and a neon platform against a dark city. This implementation is authored 3D geometry. The image is a design guide, not a projected texture or a substitute render. No anatomical template or image-to-3D service is used by the new recipes. Earlier reference-explorer provenance remains unchanged.

## Entry points

- `models/cyber-android.js`: character, mechanisms and backpack only.
- `models/cyber-android-scene.js`: character plus geometric platform/city, power feeds, an authored camera and five lights.
- `studies/cyber-android-scene.json`: locked hero view, draft geometry comparison and a small head-motion test.

The scene recipe composes existing component functions:

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

The character itself composes `shellTorso`, two `exoArm` and `exoLeg` components, `servoHand`, `animePortrait`, `prismBob`, and `reactorBackpack`. Coordinates belong inside those implementations, not in every scene recipe. This is one design vocabulary, not a universal person generator.

## Smaller reusable construction operations

`panel()` makes a beveled contour with actual through holes. Bulged plates are subdivided before deformation: bending a coarse triangulation produced visible facets in the first local render. `wrapShell()` instead builds a thick, curved elliptical section from a longitudinal profile. `splitShell()` composes sectors with deliberate exposed seams. A closed-edge test checks the shared indexed shell and rims, but does not certify absence of intersections.

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

`radialPort()` composes mechanical housings and concentric emitter rings. `routedCable()` follows a centripetal spline and distributes clamps by arc length. `cableLoom()` offsets fibers in a moving route frame. These helpers do not solve collisions or physical cable equilibrium. The luminous tubes are currently opaque emissive geometry, not transmissive glass.

## Renderer and viewer

```sh
npm run render -- models/cyber-android-scene.js \
  --views hero --size 768x1376 --out renders/cyber --glb
npm run render -- models/cyber-android.js \
  --focus HeadMount --views front --out renders/portrait
npm run study -- studies/cyber-android-scene.json
node scripts/review-cyber.mjs
```

An authored scene carries `sceneRecipe` metadata naming its subject and camera. The renderer frames the subject, not the distant buildings, and uses the authored light rig instead of silently adding the neutral studio lights. The Pages viewer uses the same optical helper and the hero camera for its initial view, while still allowing orbiting and ordinary front/side views. The studio preset selector is disabled for an authored scene; its exposure control remains available.

Material renders use multisampled bloom and optional depth of field. The focal anchor follows `HeadMount` when the camera moves. Geometry diagnostic renders disable those effects, remove fog, hide environment-tagged objects, and use the neutral light rig. Image comparisons use this subject silhouette, not the city background. The platform and overhead feeds are intentionally allowed to extend outside the hero crop.

Export distinction: the character GLB contains the character only. The **scene GLB intentionally includes its camera and authored lights** using standard glTF capabilities. Preview studio objects never export. Bloom, depth of field, fog and tone mapping are runtime effects, not portable glTF rendering guarantees; their settings are retained as scene metadata. Importing the scene into a different renderer requires matching those settings. This scene has not yet received its own native Blender render verification.

## Verified local checkpoint, not visual acceptance

The full local repository test run passed 113 tests. The local renderer regression also passed its previous hand/rig, framing, input recovery, dependency-refresh and export-isolation checks. `review-cyber.mjs` passed a three-case scene study, the separate character export, named camera/five-light/embedded-image checks, and byte-identical scene exports before and after the Survey preview pose. Full validator reports are saved without truncation.

The default scene has 549,108 triangles; its character-only export has 458,488. The draft scene has 404,164 triangles. Draft lowers geometry/detail counts; **it is not a high-to-low normal-map bake**. Existing cage normal-transfer tooling is not yet integrated with this armor/hair assembly. The scene and character validators report zero errors and warnings, with informational unused-UV messages retained.

The first all-case review attempt was interrupted when the browser process closed during concurrent work. A fresh standalone run completed; this does not establish crash-free operation under arbitrary memory pressure. The local machine blocks HTTP navigation even with route fulfillment, so the actual Pages UI test is delegated to the independent `Cyber android scene checks` workflow. Do not claim local Pages navigation succeeded or that a successful component workflow proves Pages deployment.

## Visual priorities

The full-body and close-up renders remain a blockout/material study. The face and eye seating are doll-like, the stance is stiff, the armor has large simplified sections and some overlapping trim, the shoes are too slab-like, the hair lacks the reference's sharp silhouette and strand structure, and the city is an abstract arrangement of buildings/windows. The neon cable loop currently blooms too broadly. These defects are visible in the saved images; higher triangle counts do not establish likeness.

The named rigid joints and Survey head clip are not a skinned humanoid rig, complete hand articulation, IK, cloth/hair simulation, or contact-correct animation. Do not silently apply the earlier hand's rig/normal-bake claims to this different model.

Next useful iteration: refine the portrait and primary armor/boot contours against the supplied image, reduce part overlap, then add intentional rigid poses and cable attachment constraints. Inspect front, side, back, portrait and neutral clay renders before adding more decorative pieces. Keep pushing small, tested checkpoints to main; do not replace actual 3D output with image generation.
