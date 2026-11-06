# Visuals — eight scene recipes

All scenes inherit the stage: dark radial background, fog `0x050b14` density 0.0135, 720-star
additive field, hemisphere + key directional (shadows) + teal fill + rose rim, ACES tone mapping,
exposure 1.08, DPR cap 2. Axes: x rose, y teal, z blue.

Build curves as `TubeGeometry`, not 1 px lines. Use `Line` only for helpers, grids, and field
segments. Dispose geometry/materials before rebuilding.

## Unit 1 — Convergence microscope

- Graph-paper lines in the XY plane, stronger axes, x/y sprites.
- Function tube at z = 0.2, faint duplicate at z = −0.5.
- Translucent plane at x = c; dashed vertical asymptote for infinite models.
- Two tracer spheres (teal left, amber right) with ring halos; white torus at the finite limit.
- Presets: `(x²−1)/(x−1)` (hole at 1, limit 2); `x+1` / `3−x` (meet at 2); `x` / `x+1` (true jump);
  `1/(x−1)`; `2+(x−1)sin(1/(x−1))` trapped by `2±|x−1|`.
- Sliders 0–1 map to `c ∓ 1.15(1−t)`. Sweep eases both over 2.8 s and updates descriptors.
- Verdict: both finite and equal → limit exists; else no two-sided limit.

## Unit 2 — Tangent glider

- 3D curve: `(x, f(x), 0.22)` plus z-direction `0.42 cos(0.85x)` for the tangent orientation.
- Glowing amber cylinder along the tangent; dashed violet secant; Δx/Δy triangle; endpoint dots.
- Presets: cubic `0.35x³−1.2x+1` (blue), sine `1.5 sin(1.15x)+0.7` (teal), parabola
  `0.5x²−1.4` (violet), hyperbola `1.8/(x+0.8)+0.2` (rose).
- Shrink 2.1 → 0.02 over 3.4 s. Readout gap < 0.05 → “limit reached”.
- Curve hue must differ from the tangent hue; the reference used a blue cubic.

## Unit 3 — Nested rings

- Tori radii 1.05 (YZ), 1.75 (XZ), 2.48 (XY); four beads per ring; central icosahedron + halo.
- `u = ax`, `v = sin u`, `y = v^p`; factors `a`, `cos u`, `p v^(p−1)`.
- Arrow length `0.25 + 0.55·min(|rate|, 2.6)`; negative rate turns the arrow rose.
- Ring phase advances at `clamp(rate,−2.6,2.6)·dt·0.85` (outer 0.7). Stop when reduced motion.
- Readout shows x, u, v, y, factor product, dy/dx.

## Unit 4 — Related rates

Cone: height 3, top radius 1.8, so `r = 0.6h`, `V = 0.12πh³`, `dV/dt = 0.36πh² dh/dt`. Rebuild the
water cylinder on h; surface ring, droplets, pipe, upward arrow, apex glow. Fill advances
`dh/dt·dt·0.45` and stops at 2.95.

Ladder: `L = 3.4`, base `x`, top `y = √(L²−x²)`, `dy/dt = −(x/y)dx/dt`. Wall is a 0.12×4.7×3.2 box at
x=2.2; ladder at z=1.82, in front of the wall face 1.61. Rate arrow at z=2.12.

One select toggles models; `visibleWhen` hides the other controls.

## Unit 5 — Sign landscape

- Surface grid 96×26 over `[a,b]×[−1.35,1.35]`; `y = f(x) + 0.16 sin(1.55z)`, exact `f` at z=0.
- Vertex colour by `f″`: teal positive, rose negative, violet by magnitude.
- Centre profile tube; extrema beacons (amber max, green min), violet inflections with labels.
- Probe: sphere, stem, ring, tangent plane (six vertices, slope `f′(x)`), normal arrow.
- MVT toggle: chord as an amber tube + parallel teal tangent at the first sign change of
  `f′(x) − average`, scanning 500 samples.
- Presets: cubic `0.42x³−1.26x`; quartic `0.18x⁴−0.9x²+0.5`; sine `1.55 sin(1.2x)`.

## Unit 6 — Riemann prism engine

- Instanced boxes (one draw call) for left/right/mid; custom slanted BufferGeometry for trapezoid.
- Box scale `(0.88Δx, height, 1.75)`, centre y = height/2.
- Smooth area ribbon at z=−0.95, opacity ~0.12, built once per curve.
- Curves: `0.55x²+0.35`, `1.15 sin(1.3x)+1.35`, `0.16x³+0.7` on [−2,2].
- Exact with Simpson 4000; error and relative error in readouts.
- Refine: n 2→200 over 4.2 s, rebuild only when the integer changes.

## Unit 7 — Slope field lab

- Plane 8.6×8.6, 17×17 segments, slope-coloured (teal positive, rose negative, amber flat).
- Click raycasts into a transparent pick plane; spawn at clamped (x,y).
- RK4 step 0.055, 210 steps forward + 210 backward, clip ±60; display clip ±4.3.
- Trail: faint full line, glow tube, bright growing line (`setDrawRange`), additive points crumbs,
  moving head, start ring. Max 8 trails; oldest disposed.
- Head progress `0.42/s`. Presets: x+y, y−x, 0.35xy, sin x cos y, −0.6y, −x/y.

## Unit 8 — Solids studio

Custom revolution builder:

1. Profile in `(radius, x)`: outer samples a→b, then axis `(0,b),(0,a)` for a disk or an inner
   45% curve for a washer.
2. Dedupe consecutive/closed points (√x starts at (0,0)).
3. For each angular step j, push `(x, r cosθ, r sinθ)`.
4. Triangulate the boundary at both angular ends with `THREE.ShapeUtils.triangulateShape` when the
   sweep is partial.
5. Add contour arcs at 7 x positions.

Presets: √x [0,4], `0.45x²+0.25` [0,2.6], `1.15+sin x` [0,3], `0.35x+0.5` [0,3.2].

Cross-section mode: base `y=±f(x)`; squares `(2f)²`, semicircles `(π/2)f²`; 3–24 slices; volume
readout. Hide the axis in this mode.

## Camera defaults

| Unit | Position | Target | FOV |
| --- | --- | --- | --- |
| 1 | 3.2, 2.5, 8.8 | 0.9, 2.1, 0 | 42 |
| 2 | 5.2, 3.6, 8.6 | 0, 0.4, 0 | 42 |
| 3 | 5.2, 4.2, 9.2 | 0, 0, 0 | 42 |
| 4 | 5.6, 3.3, 8.6 | 0.4, 0.2, 0 | 42 |
| 5 | 5.4, 4.4, 8.6 | 0, −0.1, 0 | 42 |
| 6 | 4.8, 3.5, 8.2 | 0, 0.9, 0 | 42 |
| 7 | 6.2, 5.2, 9.9 | 0, 0, 0 | 40 |
| 8 | 5.9, 4.3, 8.6 | 1.4, 0, 0 | 42 |

## Reduced motion

`prefers-reduced-motion` and the settings toggle add `body.reduce-motion`, set stage
`reducedMotion`, and set `window.__CALC3D_REDUCED_MOTION__`. Unit 3 stops ring phases. Other scenes
keep small opacity pulses; if strict compliance is required, guard every autonomous phase with the
global flag. Do not disable user-driven response (slider movement must still render).

## Performance limits

- Unit 6 max 200 instances; one draw call.
- Unit 7 max 8 trails; 420 RK4 steps each at spawn, not per frame.
- Unit 8 64 angular steps, 72 profile points; rebuild on angle input.
- Readout/narration loop 240 ms, not per frame.
- DPR ≤ 2.
