# Curriculum

The eight units mirror the Khan Academy AP®/College Calculus AB course framework. The app does not redistribute Khan Academy text, videos, exercises, or assets; every explanation, example, and question here is original.

## Inventory

| # | Unit | Weight shown | Concepts | Examples | MC | FRQ |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Limits & Continuity | 10–12% | 6 | 5 | 10 | 2 |
| 2 | Derivatives: Definition & Rules | 10–12% | 6 | 5 | 10 | 2 |
| 3 | Composite, Implicit & Inverse | 9–13% | 5 | 5 | 10 | 2 |
| 4 | Contextual Applications | 10–15% | 5 | 5 | 10 | 2 |
| 5 | Analytical Applications | 15–18% | 6 | 5 | 10 | 2 |
| 6 | Integration & Accumulation | 17–20% | 5 | 5 | 10 | 2 |
| 7 | Differential Equations | 6–12% | 6 | 5 | 10 | 2 |
| 8 | Applications of Integration | 10–15% | 5 | 5 | 10 | 2 |

Totals: **40 worked examples, 96 questions (80 multiple choice, 16 free response), 48 concept tags, 32 formula cards, 8 theorem cards.**

The percentage labels are the College Board's published exam weighting ranges, shown for orientation. The app is not an official exam and does not predict a score.

## Unit 1 — Limits & Continuity

Graphical limits, one-sided limits, tables, factoring, rationalizing, the squeeze theorem, continuity at a point, and IVT. Visual: a floating graph plane with left/right tracer spheres and a limit ring; presets for removable hole, jump, true jump, infinite discontinuity, and oscillation trapped by two walls.

## Unit 2 — Differentiation: Definition and Basic Rules

Average vs. instantaneous rate, the difference quotient, power/constant/sum rules, product and quotient rules, sine and cosine derivatives, tangent lines. Visual: a 3D curve with a tangent cylinder and a secant slope triangle that shrinks; presets for cubic, sine, parabola, and hyperbola.

## Unit 3 — Composite, Implicit, and Inverse Functions

Chain rule, implicit differentiation, `e^x`, `ln x`, inverse functions, inverse trigonometric derivatives. Visual: three nested rotation rings whose angular speeds are the inner, middle, and outer derivative factors; the product is the composed derivative.

## Unit 4 — Contextual Applications of Differentiation

Units, position/velocity/acceleration, related rates in expanding shapes, the sliding ladder, filling a cone, and marginal interpretation. Visual: two physical models — an inverted cone with a live water level and `dh/dt`, and a ladder with `dx/dt` and `dy/dt` vectors.

## Unit 5 — Analytical Applications of Differentiation

MVT, EVT, increasing/decreasing intervals, first and second derivative tests, concavity, inflection, optimization. Visual: a curvature-coloured terrain ribbon with extrema and inflection beacons, a movable tangent plane, a normal vector, and an optional MVT chord with a parallel tangent.

## Unit 6 — Integration and Accumulation of Change

Left/right/midpoint/trapezoidal sums, sigma notation, definite integrals as signed area, FTC Parts 1 and 2, net change. Visual: extruded Riemann prisms under a curve, n = 2–200, with method switching, exact integral, absolute error, and relative error.

## Unit 7 — Differential Equations

Modeling, verifying solutions, slope fields, separable equations, initial-value problems, exponential growth/decay. Visual: a colour-coded slope field; click anywhere to drop an RK4 particle that traces the integral curve forward and backward.

## Unit 8 — Applications of Integration

Average value, area between curves (in x or y), volumes with known cross-sections, disk and washer methods. Visual: a partial lathe from 0° to 360° with disk/washer profiles, plus a square/semicircle cross-section gallery.

## Question design

- **Difficulty 1–3** is shown as filled dots; it controls presentation only, not scoring.
- **MC questions** have four distinct choices and one zero-based correct index.
- **FRQ questions** are numeric with a per-question tolerance, so they can be auto-graded without pretending to be a symbolic grader. Unit labels appear beside the input.
- **Explanations** always state the method, not only the answer. **Hints** are one sentence and never reveal the final value.
- IDs follow `u<unit>-q<two digits>`, e.g. `u5-q11`. They are the permanent mastery keys; do not renumber them after release.

## Accuracy policy

Every numerical answer was checked against the analytic result. The Node suite independently tests the calculus helpers and the answer shapes. If you change a question or an answer, run:

```sh
node --test tests/curriculum.test.mjs
```

and re-run the in-page self-test. Do not edit a percentage claim in the README without changing the underlying bank.
