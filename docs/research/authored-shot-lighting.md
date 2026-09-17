# Research note — authored perspective shots and portable punctual-light rigs

Accessed 2026-09-17. Scope: one bounded workflow problem: stop hand-authoring camera/light world coordinates for every new subject while keeping the result ordinary Three.js objects and portable glTF punctual lights. This is not a cinematography survey and does not claim photometric calibration.

## Three.js — PerspectiveCamera

Source: https://threejs.org/docs/pages/PerspectiveCamera.html

Observation: Three.js defines perspective framing through vertical field of view, aspect ratio, positive near/far planes, and the camera transform. The current documentation also exposes view-size/bounds helpers, but the repository needs deterministic build-time framing that is independent of a live renderer.

Intended operation: `framedPerspectiveCamera(subject, spec)` derives a camera from an explicit view direction, FOV, aspect and occupancy target. It evaluates the subject's world-space bounds in the authored camera frame and solves the minimum distance required to keep every bounds corner inside the requested horizontal/vertical occupancy. The camera target and framing contract are stored as JSON-safe metadata.

Test/example/result: unit tests fit the same direction/FOV contract to materially different subject scales, require unclipped bounds, and verify that camera distance scales with subject size instead of depending on hard-coded scene coordinates. The workflow model uses different FOV/direction/occupancy choices for an organic bust and a hard-surface drone.

Limitations: this is bounds framing, not composition intelligence. It does not recognize faces, horizons, leading room, rule-of-thirds intent, occlusion or focal hierarchy; authors still choose direction, FOV and target.

## Three.js — DirectionalLight, PointLight and SpotLight

Sources:
- https://threejs.org/docs/pages/DirectionalLight.html
- https://threejs.org/docs/pages/PointLight.html
- https://threejs.org/docs/pages/SpotLight.html

Observation: Three.js directional and spot lights are target-based at runtime; a directional light's direction is from its position to `target`, while point lights are omnidirectional. Point/spot intensity is distance-sensitive with inverse-square behavior at the physically correct decay value 2. Three.js documentation notes that non-default directional targets must participate in the scene graph.

Intended operation: `punctualLight()` creates ordinary directional/point/spot lights. For aimed lights it aligns the light object's local -Z axis to the target and parents a tagged target node at local `[0,0,-1]`, so the Three.js runtime target and the serialized node orientation express the same direction. `punctualLightRig(subject, spec)` then places those lights with explicit offsets measured in one subject-scale unit, defaulting to the subject bounding-sphere radius.

Test/example/result: tests compare each aimed light's Three.js target direction to transformed local -Z, serialize/parse an authored shot, and rehydrate the explicit target. The two examples reuse the same rig API with materially different light types, offsets, colors and camera choices.

Limitations: bounds-relative placement does not automatically rescale point/spot intensity when subject scale changes; inverse-square lights may therefore need deliberate intensity changes. The helpers do not infer physically measured values, shadow-map settings, IES profiles, area emitters or environment lighting.

## Khronos Group — KHR_lights_punctual

Source: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_lights_punctual/README.md

Observation: the ratified glTF extension defines exactly three portable punctual types: directional, point and spot. Directional and spot lights emit along the light node's local `-Z`; point and spot intensities are in candela and use inverse-square attenuation; directional intensity is in lux. Light instances inherit node transforms.

Intended operation: restrict the reusable exportable rig to these three types and make local -Z orientation explicit. Area-light or preview-environment behavior stays outside this portable rig rather than being silently approximated during export.

Test/example/result: the repository's normal GLB bake/validator path will exercise the new model with standard Three.js light objects. Unit tests reject unsupported light types instead of producing a scene that cannot round-trip through the intended glTF lighting contract.

Limitations: this does not prove identical rendered appearance across engines. Tone mapping, shadowing, exposure, renderer implementation and unsupported scene/environment effects remain separate concerns.

## Blender Foundation — Light Objects

Source: https://docs.blender.org/manual/en/dev/render/lights/light_object.html

Observation: Blender likewise distinguishes point, spot, area and sun lights, and notes that point/spot brightness varies with distance while area lights model extended emitters with softer shadows. The manual also distinguishes intensity/exposure from light placement and color.

Intended operation: keep rig geometry/placement, light type, color/intensity and camera framing as independently editable construction data. Do not collapse look development into a subject-specific `scene()` wrapper or pretend a punctual rig replaces area/environment lighting where those are the artistic intent.

Test/example/result: the organic fixture uses a directional key, point fill and spot rim; the unrelated mechanical fixture uses a directional key, spot service light and point practical. The API is reused while the actual look is not forced into one style preset.

Limitations: Three.js/glTF punctual lights do not reproduce Blender Area lights. Native-Blender compatibility of the final repository artifact remains a separate CI status.

## Implementation decision

Add three composable levels rather than a universal scene builder:

- `framedPerspectiveCamera(subject, spec)` — explicit FOV/direction/occupancy framing from reusable subject bounds.
- `punctualLight()` / `punctualLightRig(subject, spec)` — portable directional/point/spot construction with subject-relative placement and matched runtime/export orientation.
- `authoredShot({...})` — a small assembly boundary that names the subject/camera and carries the existing `sceneRecipe` metadata consumed by hero rendering, while environment pieces remain separately owned objects.

The workflow fixture intentionally uses two different subjects and two different lighting/camera designs. The abstraction owns coordinate/frame mechanics, not artistic decisions or one reference's dimensions.
