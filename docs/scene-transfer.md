# Bounded in-memory scene transfer

The local renderer still builds recipes in fresh Node workers and sends ordinary
Three.js JSON into a fixed browser runtime. It needs no server, network navigation,
external service, or geometry reduction.

`scripts/scene-transfer.mjs` sends that JSON through an owned browser `JSHandle`
in 1 Mi UTF-16-unit strings (at most 4 Mi by option). The strings are joined and
parsed in the browser, then passed to the existing `stage.load`. Each escaped
transport command remains well below Chromium's observed 100 MiB DevTools pipe
limit. The temporary handle is disposed on success or failure. Errors propagate;
this is not a retry layer. The renderer retains its timeout and geometry/rig
round-trip checks.

A full 722,916-triangle foot-study scene reproduced the old failure. Chromium
144 logged `Too large read data is pending ... max_buffer_size=104857600` followed
by `Connection closed, not enough capacity`, before ObjectLoader completed.
The bounded transfer loaded and rendered that same construction without reducing
geometry. Three pre-change baseline PNG hashes (material/clay/silhouette) are
unchanged after the transfer change. This is a correctness/blocker fix, not a
benchmark claim of universal speedup.

Input must already be JSON-safe (as `Object3D.toJSON()` is intended to be); this
is not a serializer for arbitrary JS functions, cyclic objects or BigInt. It
still holds the full JSON in Node and browser memory. It does not solve renderer
memory limits, GPU capacity, arbitrary large outgoing screenshots/GLBs, or
unsupported custom classes/shaders.

The regression covers bounded chunks, escaped/unicode data, failure propagation,
and temporary ownership. Actual render/GLB validation remains separate from the
transport unit test. See the [foot checkpoint](checkpoints/2026-09-18-prism-feet.md).
