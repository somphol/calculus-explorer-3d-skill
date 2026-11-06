# The eight scenes

All scenes share the stage: a dark radial background, fog, 720-point starfield, hemisphere + key + fill + rim lights, ACES tone mapping, and OrbitControls with damping. Coordinates are world units; the x-axis is red, y-axis teal, z-axis blue. Every scene is procedural — no model files or textures.

## Unit 1 — Convergence microscope

**Draws.** A graph-paper wall at z = 0; the function as a glowing tube with a faint depth shadow; a translucent plane at x = c; two tracer spheres with halo rings; a white torus marking the limit; a dashed vertical asymptote when relevant.

**Presets.**

| Preset | Function | c | Result |
| --- | --- | --- | --- |
| Removable hole | `(x² − 1)/(x − 1)` | 1 | limit 2, f(1) undefined |
| Jump | `x + 1` / `3 − x` | 1 | both sides 2, f(1) = 2 |
| True jump | `x` / `x + 1` | 1 | left 1, right 2 |
| Infinite | `1/(x − 1)` | 1 | −∞ / +∞ |
| Squeeze | `2 + (x − 1)sin(1/(x − 1))` | 1 | trapped between `2 ± |x − 1|` |

**Controls.** Model select; independent left/right approach sliders (0–1 maps to c ∓ 1.15·(1−t)); “Sweep both tracers” animates both to c over 2.8 s and writes back to the slider descriptors.

**Math.** One-sided limits agree only when both finite values are within 1e-6; otherwise the verdict is “no two-sided limit”. Continuity additionally requires f(c) to equal that limit.

## Unit 2 — Tangent glider

**Draws.** A 3D curve (z offset plus a second z component), a glowing amber tangent cylinder, a dashed violet secant, a right triangle with Δx/Δy, two endpoint spheres, and a white handle.

**Presets.** Cubic ridge `0.35x³ − 1.2x + 1`; sine `1.5 sin(1.15x) + 0.7`; parabola `0.5x² − 1.4`; hyperbola `1.8/(x + 0.8) + 0.2`.

**Controls.** Preset, probe `x₀`, secant width `Δx`, “Shrink Δx to the limit” (2.1 → 0.02 over 3.4 s).

**Math.** Tangent slope from the analytic derivative; secant slope `(f(x₀+Δx) − f(x₀))/Δx`; the readout shows the gap. The visual “limit” badge appears below 0.05.

## Unit 3 — Nested rotation rings

**Draws.** Three translucent tori in three planes (radii 1.05, 1.75, 2.48), four orbiting beads per ring, a central icosahedron with a halo, three tangent arrows whose length is the local rate, and labels for inner/middle/outer.

**Controls.** Input x; inner gain a; outer power 2/3/4.

**Math.** `u = ax`, `v = sin u`, `y = v^p`; factors `h′ = a`, `g′ = cos u`, `f′ = p v^(p−1)`; `dy/dx = f′·g′·h′`. Ring phases advance at clamped signed factor rates. Negative factors flip the arrow and ring direction.

## Unit 4 — Filling cone and sliding ladder

**Cone.** Inverted cone of height 3 and top radius 1.8, so `r = 0.6h`. A physical water cylinder is rebuilt as h changes; a surface ring, falling droplets, a pipe, and an upward rate arrow. `V = 0.12πh³`; `dV/dt = 0.36πh² · dh/dt`. Controls: h, inflow dV/dt, fill/pause, reset. The fill action advances h at `dh/dt · dt · 0.45` and stops at 2.95.

**Ladder.** A 3.4-unit ladder between `(2.2 − x, −1.5)` and `(2.2, −1.5 + √(L² − x²))`, in front of a dark wall. `dy/dt = −(x/y) dx/dt`. Controls: base x, base speed dx/dt, reset. The top falls faster as y → 0, which is visible in the arrow length.

## Unit 5 — Sign landscape

**Draws.** A 96×26 vertex-coloured ribbon. The centre profile is exactly `f(x)`; depth adds `0.16 sin(1.55z)` so the ridge has topography. Colour: teal for `f″ > 0`, rose for `f″ < 0`, mixed with violet by curvature magnitude. Extrema get amber (max) or green (min) beacons with labels; inflections get violet beacons. A probe sphere, stem, ring, tangent plane, and normal arrow follow x. The MVT toggle draws the endpoint chord as a tube and a parallel tangent at the first sign change of `f′ − average`.

**Presets.** Cubic `0.42x³ − 1.26x`; quartic `0.18x⁴ − 0.9x² + 0.5`; sine `1.55 sin(1.2x)`.

**Controls.** Terrain, probe x, jump to next critical point, MVT chord.

**Math.** Signs are read from the preset's analytic first and second derivatives. Critical/inflection beacon positions are authored from the same formulas. MVT c is found by scanning 500 samples for a sign change.

## Unit 6 — Riemann prism engine

**Draws.** A dark floor and grid; an extruded solid under the curve at z depth 1.75; a smooth translucent area ribbon at z = −0.95; the curve as a tube. Rectangles use one `InstancedMesh` (up to 200 boxes) with per-instance colour; the trapezoid method builds a custom BufferGeometry with slanted tops.

**Presets.** Quadratic `0.55x² + 0.35`; sine `1.15 sin(1.3x) + 1.35`; cubic `0.16x³ + 0.7`; all on [−2, 2].

**Controls.** Curve, method (left/right/midpoint/trapezoid), n = 2–200, “Refine to n = 200” (2 → 200 over 4.2 s). Exact integral via Simpson with 4000 panels; approximation via the selected Riemann method.

**Math.** `Δx = (b−a)/n`; error and relative error are computed from the exact value. The smooth ribbon is static per curve, not rebuilt on every n.

## Unit 7 — Slope field particle lab

**Draws.** An 8.6×8.6 glass plane, a border, axes, a 17×17 field of coloured segments, and up to eight solution trails. Each trail has a faint full path, a glow tube, a bright growing line, a dotted crumb path, a moving head, and a start ring.

**Presets.** `x + y`, `y − x`, `0.35xy`, `sin x cos y`, `−0.6y`, `−x/y` (with a guard near y = 0).

**Controls.** Equation, drop x, drop y, drop particle, clear trails, reset lab. Clicking the plane raycasts to (x, y) and spawns there. The stage only treats a pointerup as a click if the pointer moved ≤ 6 px in ≤ 700 ms, so orbiting does not spawn.

**Math.** Fourth-order Runge–Kutta, step 0.055, 210 steps forward and 210 backward, clipped at ±60 during integration and ±4.3 for display. Head progress runs at 0.42 of the path per second. Colours cycle through six hues; the ninth particle removes the oldest.

## Unit 8 — Solids studio

**Revolve mode.** Builds a closed profile in the (radius, x) plane: outer curve, then either the axis (solid) or a 45%-radius inner curve (washer). A custom revolution builder samples 64 angular steps, triangulates the boundary, and adds flat caps at the two angular ends when the sweep is partial. The profile is extruded, wireframed, and annotated with seven arcs. The rotation slider 0–360° rebuilds the surface; 0° shows only the profile. The axis is a red line with an arrow and label.

**Cross-section mode.** The base is `y = ±f(x)`. Slices perpendicular to x are squares (`2f × 2f`) or semicircles (diameter `2f`). Slice count 3–24. Volumes: `∫(2f)²dx` and `(π/2)∫f²dx`.

**Presets.** `√x` on [0,4], `0.45x² + 0.25` on [0,2.6], `1.15 + sin x` on [0,3], `0.35x + 0.5` on [0,3.2].

**Controls.** Mode, profile, rotation sweep (with ° suffix), washer toggle, half/full sweep, cross-section shape, slice count. Visibility follows `visibleWhen`.

**Math.** Disk `π∫R²dx`, washer `π∫(R² − r²)dx`, partial volume scaled by angle/360. Cross-section formulas are shown with the base interval substituted.

## Visual quality rules

- Curves are tubes, not 1 px lines, except for helper/grid lines.
- Every scene has a readable axis or orientation cue.
- A control change must produce a visible change within one frame.
- Auto-animation must keep its slider in sync.
- No scene may create a renderer, resize listener, or animation loop.
- Dispose geometry and materials when a scene is replaced; the stage handles the group traversal.
- Avoid unbounded object creation inside `update`; reuse meshes where possible. Unit 8 rebuilds on rotation because the geometry genuinely changes.
