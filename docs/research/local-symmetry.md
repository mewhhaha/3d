# Local symmetry research notes

Accessed 2026-09-16. These notes record only source-visible behavior and the specific adaptation tested here.

## Blender Manual — Mirror Modifier

Source: https://docs.blender.org/manual/en/5.0/modeling/modifiers/generate/mirror.html

Observed: Blender mirrors around an object's local axes and origin, or around another object's position and local axes. It can bisect an existing mesh, merge close vertices at the plane, and keep the operation live while the source side is edited.

Adaptation: the code-first API now represents the mirror plane explicitly as `{origin, normal}` rather than assuming world X=0. `mirrorSurface()` reflects construction data before tessellation and reverses one surface parameter so downstream normals/thickness retain consistent orientation. This is intentionally not a topology bisector or vertex welder.

## Blender Manual — Sculpt Symmetry

Source: https://docs.blender.org/manual/en/4.2/sculpt_paint/sculpting/tool_settings/symmetry.html

Observed: sculpt strokes can be mirrored across selected local axes; radial symmetry and tiling are separate modes. The manual also exposes a symmetrize merge distance rather than treating every overlap as automatically welded.

Adaptation: `mirrorMask()` now accepts an arbitrary local plane while preserving the old x/y/z shorthand. It mirrors selection evaluation and uses `max`, so a stroke on the plane does not double brush strength. This pass deliberately does not add radial symmetry, tiling, topology merging, or tag renaming.

## Blender Studio — Sculpting Fundamentals, Julien Kaspar

Source: https://studio.blender.org/training/stylized-character-workflow/5d5e6141b01c790d39b7ed4e/

Observed from the public lesson page: symmetry, dynamic topology and multiresolution sculpting are treated as core sculpt-mode concepts in the fundamentals material. The page does not provide enough written detail to attribute a particular symmetry technique beyond that scope.

Adaptation: symmetry is implemented at the selection/construction layer, before representation resolution, so the same authored intent can feed low/high forms. This is our design choice, not a claim about a specific demonstration in the video.
