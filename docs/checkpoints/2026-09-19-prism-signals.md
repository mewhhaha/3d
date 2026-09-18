# Mapped optical detail with fewer triangles — 2026-09-19

Base main **425a1fda81ff0f0f3ed437c682b99e30056da544** was checked through
connected GitHub. Its exact locked kit was recovered and its source tree hashes
to `151cc1b58ee059ff55d8fdb413b6cd272bf58dc7`. The base foot and combined form
CI jobs have both completed successfully. The containing commit is the tested
code revision; no stale local modeling snapshot was promoted.

## Accepted implementation

`radialProfileMaps()` rasterizes separate color/emission profiles in linear space,
then encodes sRGB RGBA8 textures. Pixel supersampling, mipmaps, UV units, owned
arrays, and strict profile validation are explicit. It uses standard materials,
not a custom runtime shader or reference projection. The unrelated ceramic saddle
tile uses the same API with zero emission and off-center placement.

Optional `emitterStyle: mapped` rebuilds the port's inner face as a shallow cap,
replacing fine torus layers and the opaque dark bore with softer concentric optical
bands and a warm core. Housings, bezels, outer rims and screws remain exact. The
palette shares maps only within its own build. Shape/pose/head/camera/foot placement
and all previous defaults remain unchanged. The full figure still needs major
shape work; this is a local optical correction, not overall likeness acceptance.

## Actual local checks

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, SwiftShader WebGL2/Xvfb.
- New unit/integration tests: **7/7**; expanded radial/cyber/foot/hand/gesture/mass/form
  regressions: **36/36**, rerun after strengthening scene parameter-route checks.
- `npm run build`: **44 recipes**.
- `node scripts/review-signals.mjs`: **7 cases / 39 renders / 4 GLBs** with **0 errors /
  0 warnings**; complete validator reports retain informational messages. Cases
  include mapped/geometric full scenes, port front/side/three-quarter in material,
  clay, wire and silhouette, a second emitter palette, and the non-emitting tile.
- `timeout 180 npm test`: exit **124**, **165 passing subtests** before the bound;
  no completed full-suite local pass. An earlier targeted `tests/models.test.js`
  command also timed out before reporting its result. The new parameter's two
  variants and normalized default were instead verified in the dedicated tests;
  no claim that every unrelated model limit was rerun successfully.
- One long outer tool call was interrupted after preserving two cases, reporting
  a closed browser. The final full isolated-browser review was restarted and
  completed; that interrupted attempt is not counted as a successful review.

Final computational source fingerprint (233 files):
`b5f0414242981ac544ffa3d407a4d13d15d0d7ec2ef53f17ae57e67c9de21746`.

### Counts and representation tradeoff

| Case | Before | After |
| --- | ---: | ---: |
| Full-scene triangles | 722,916 | 645,300 |
| Full-scene vertices | 684,030 | 627,298 |
| Full-scene render primitives | 1,058 | 906 |
| Full-scene GLB bytes | 27,537,408 | 25,697,064 |
| Isolated port triangles | 4,224 | 1,872 |
| Isolated port vertices | 3,536 | 1,822 |

The mapped design removes **77,616 scene triangles (10.74%)** and **152 render
primitives**. Individual port triangles fall **55.68%**. Additional texture storage
is a real cost: the scene GLB embeds **14 images instead of 4**, including ten new
256x256 color/emission maps (2.5 MiB base-level RGBA8 before mipmaps). No FPS or
universal memory/performance improvement is claimed.

Actual GLB inspection confirms ordinary baseColorTexture/emissiveTexture bindings
and KHR_materials_emissive_strength. The new ports have no custom shader fallback.
The illustrated head retains its separate, previously documented PBR fallback.

### Fixed-view comparisons

Baseline hero material PNG is byte-identical to the supplied previous checkpoint
(`ca3f26248b82f2c254c2d302cbad6f486c0633bb663b008846dfe2126cfdc841`). Full hero
silhouette IoU **1.0**, zero changed foreground silhouette pixels. Isolated port
front and three-quarter IoU **1.0**, but side IoU **0.96407**: the inner lens relief
is intentionally different from stacked tubes and a projecting center bore.
Landmarks remain **9.80033448 px RMS / 25.91514214 px max**. These values do not
measure likeness. Material differences are deliberate, not reproduction error.

No normal bake was performed. Actual geometric cap normals provide the lens
shading. The maps cannot recover ring parallax or the removed bore, cast dynamic
lights, or solve the torso, hair and limb silhouette. The existing ring variant
remains available for physically exposed annular mechanisms.

## Visual assessment and rejected trial

The prior emitter centers were black with thin intense rings; the new broad pink,
cyan and warm-colored fields read closer to the supplied illustration's luminous
lenses. The whole-body correction remains modest and the ring structure is still
regular. Body proportions, large smooth armor, simplified hair/face and sparse
reactor module/cable construction remain substantial mismatches.

The first ceramic tile applied its front texture to the solidified rim too,
repeating the pattern along that edge. The accepted version uses existing face
regions/material assignments to glaze only `tile.outer`, leaving rim/inner faces
unmapped. This keeps UV and material ownership separate from shell construction.

The user's reupload was consulted visually; encoded SHA is
`8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`, not the historical
original checksum. No raster is in source history. Research sources and failed
fetches are in [radial optical detail](../research/radial-optical-detail.md).

Evidence: `renders/signal-review/` plus the isolated CI `radial-signal-review`
artifact. Final-commit CI and Pages are pending at the checkpoint; local validation,
component CI, native appearance and deployment remain distinct statuses.
Next: the large shoulder/rib/pelvic silhouette under neutral lighting, not more
microgeometry. This pass demonstrates how to spend fewer triangles on detail; it
does not justify postponing those primary shape corrections indefinitely.
