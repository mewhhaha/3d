# Illustration normal direction and haircut revision — 2026-09-17

## Accessible sources and their actual influence

**Blender Manual, Normal Edit Modifier**, https://docs.blender.org/manual/en/latest/modeling/modifiers/normals/normal_edit.html (accessed 2026-09-17). The indexed written documentation describes radial/directional normal control, mixing, vertex-group influence and angle limiting, including non-photoreal use. Direct page fetch returned 402; substantive indexed text was available. Adaptation: a geometry-local ellipsoid-gradient field, existing composable selections, bounded spherical blending, separate geometric outline. Tested on both a face and a mechanical housing, not an anime-only library. This is not Blender modifier compatibility or an exact volume/normal-transfer solve.

**Three.js Material documentation**, https://threejs.org/docs/pages/Material.html (accessed 2026-09-17; checked against locked 0.186.0). Read material side and shader customization contracts. Adaptation: reverse actual hull winding for portable geometry, and explicitly reconstruct an optional shader from material metadata after ObjectLoader. Shader callbacks are not a portable glTF representation. Tests exercise metadata reload and a clear PBR fallback; the shader fails explicitly if the locked opaque-fragment hook changes.

**Arc System Works, Guilty Gear Xrd GDC talk announcement**, https://www.arcsystemworks.com/guilty-gear-xrds-art-style-the-x-factor-between-2d-and-3d-talk-from-gdc-2015-is-now-available-online/ (published 2015-04-09; accessed 2026-09-17). Official announcement identifies Junya C. Motomura's talk and links the slides. The official PDF at www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf could not be retrieved (timeout). Its instructional contents were **not** reviewed in this run. The implementation is our bounded art-directed-normal/two-tone adaptation, not a claim to reproduce Xrd's proprietary shader, shadow system, rig or normal-editing process. No tutorial assets were copied; the earlier two construction videos remain unreviewed.

## Results and rejected directions

The new bob uses a rounded crown and separate fringe/curtain cuts instead of modifying a large sheet through more scene-specific coordinate patches. The face has actual cheek/socket/lid geometry before shading normals are directed. This separates silhouette from the deliberate simplification of facial illumination.

Rejected: a wider front opening that hid the near eye, a pinched interpolation back to the old cut loop, an overly high two-tone threshold that darkened the lower face, and 512-square color maps that made local scene JSON loading terminate. A 512x128 map fits the same pixel budget as the working 256-square map and better resolves angular strands. These are observed local outcomes, not general performance claims.

Limitations: the single view cannot determine the hidden scalp/ear/neck depth. The bob side/underside remains draft; lines and colors are procedural rather than hand-painted art. Directed normals cannot fix a wrong silhouette. Ink width varies in pixels with camera distance. Two-tone rendering is preview/runtime-specific; standard GLBs retain the PBR fallback. Normals and tangents must be rebaked in order after future shape edits.
