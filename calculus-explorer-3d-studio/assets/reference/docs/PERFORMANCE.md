# Performance

## Budgets observed in the reference build

At 1440×1000 on Apple Silicon with Chrome's hardware WebGL:

| Unit | Draw calls | Triangles (approx.) |
| --- | --- | --- |
| 1 Limits | 19 | 21k |
| 2 Derivatives | 19 | 21k |
| 3 Chain Rule | 17 | 19k |
| 4 Applications | 29 | 15k |
| 5 Analysis | 31 | 13k |
| 6 Integration | 22 | 22k |
| 7 Differential Equations | 11 | 10k |
| 8 Applications of Integration | 15 | 1–15k (varies with sweep) |

These are modest. The cost is not triangle count; it is geometry rebuilds on slider input, especially Unit 6 at n = 200 and Unit 8 while dragging rotation.

## What is capped

- Device pixel ratio is capped at **2**.
- Unit 6 boxes are one `InstancedMesh` with at most **200** instances.
- Unit 6 refinement is time-based, not per-frame: only integer n changes rebuild; the smooth ribbon is built once per curve.
- Unit 7 keeps at most **8** trails; the oldest is disposed. RK4 is 210 + 210 steps per particle, not per frame.
- Unit 8 uses 64 angular steps and 72 profile samples. Rotation rebuilds the surface, but the profile curve is only rebuilt with the profile.
- The readout/narration loop runs every **240 ms**, not every frame. Three.js renders on `setAnimationLoop` with a delta clamp of 0.05 s.
- `renderer.setPixelRatio` is re-applied on resize, so moving between Retina and non-Retina displays does not over-render.

## What is not optimised

- All eight scene modules are imported at boot. There is no dynamic `import()` per unit. The package is small enough that this is not worth the complexity.
- Unit 5 rebuilds beacon/label sprites when the terrain preset changes, not per frame. The tangent plane geometry is rebuilt on probe movement; it is only six vertices.
- Unit 8 rebuilds a BufferGeometry on every angle input event. On a slow device, dragging the angle slider can be heavy. If this matters, debounce to `requestAnimationFrame` and rebuild at most once per frame.
- No frustum culling tweaks; Three's defaults are fine at this scale.
- No texture compression, because there are no textures.
- No service worker or offline cache. First load depends on the CDN.

## Memory and disposal

`CalculusStage.setVisual()`:

1. calls the old visual's `dispose()`;
2. removes the group from the scene;
3. traverses and disposes geometries, materials, and any `userData.dispose` (sprite textures);
4. clears the group.

Scenes that rebuild a mesh must dispose the old geometry/material before replacing it. Unit 2, 5, 6, and 8 do this explicitly. If you add a scene, follow the same rule; a leak shows up as steadily rising memory after repeated unit switches.

## Measuring

In the browser console:

```js
window.__calc3d.stageInfo()
// { calls, triangles, pixelRatio, width, height }
```

Or use the self-test, which reports calls/triangles and confirms the pixel ratio cap.

For a quick frame-rate check, open DevTools → Performance → record 5 s while dragging a slider. The expected result is 60 fps on a laptop; headless SwiftShader is slower and is not a performance benchmark.

## Mobile

The 390 px layout reflows the stage to ~390×390 CSS px, hides the last two readout chips, and turns the unit rail into a horizontal scroller. The renderer still draws at DPR ≤ 2, so a 390 px canvas can be 780 physical px wide. That is intentional for crispness; if a low-end phone struggles, lower the cap to 1.5 in `stage.js`.
