# Decisions

## Static, no build

**Decision.** Ship the repository root as the artifact. No bundler, no npm dependency, no generated `dist/`.

**Why.** The app is one page, eight scene modules, and pure data. A build step would add a toolchain, lockfile, CI cache, and deploy artifact for no runtime benefit. It also makes the source the thing users can read on GitHub Pages.

**Cost.** No tree-shaking; all eight scenes are imported at boot. No hashed cache busting. No TypeScript. Accepted.

## Three.js pinned by import map

**Decision.** `three@0.169.0` and `three/addons/` from jsDelivr, pinned exactly.

**Why.** CDN keeps the repository asset-free and satisfies the “loaded via CDN” requirement. Pinning prevents silent breakage when addon paths or APIs move. The import map is the browser-native mechanism; no bundler needed.

**Cost.** First load requires network. A strict offline requirement would need a vendored `three.module.js`, which was explicitly not chosen.

## One renderer, eight factories

**Decision.** A single `CalculusStage` owns the renderer/camera/controls. Each unit is a factory returning a group and a small contract; switching units disposes and rebuilds.

**Why.** Multiple canvases or renderers would multiply GPU contexts and complicate resize/orbit behaviour. A single stage makes disposal and testing straightforward.

**Cost.** Switching units rebuilds geometry (tens of ms). State is not preserved across unit switches. Accepted: the content is the point, not a persistent sandbox.

## Procedural visuals, no models or textures

**Decision.** Every mesh, label, and icon is generated from geometry, canvas text, or inline SVG.

**Why.** Zero assets, no licensing ambiguity, no loading failures, small repository, consistent palette.

**Cost.** Labels are sprites rather than crisp HTML; complex shapes take code. Accepted.

## Mastery is monotonic

**Decision.** One correct answer masters a question forever; a later review miss increments `lapses` but does not revoke mastery.

**Why.** The spec says “when a student answers correctly, the topic/question is flagged as mastered.” Revoking on a single miss would make 100% fragile and punish review. The lapse counter preserves honesty without destroying progress.

**Cost.** A student can master by lucky guess. The hint and explanation still teach. A stricter spaced-repetition model would need multiple correct answers over time, which contradicts the stated one-correct rule.

## Adaptive queue, not random sampling

**Decision.** The queue is exactly the unmastered set, shuffled; correct answers remove; wrong answers rotate to the back.

**Why.** “Allow students to focus exclusively on unmastered concepts until 100% unit mastery.” A random sample with replacement would keep showing mastered questions and could stall.

**Cost.** Session length is deterministic (the number of unmastered questions). Review mode exists for full passes.

## Numeric FRQ, not free-text

**Decision.** Free-response questions are auto-gradable numeric entries with per-question tolerances.

**Why.** Static client, no LLM grader, no backend. A numeric answer is objective and testable. The prompt and unit hint make the expected form clear.

**Cost.** It cannot grade a justification or a multi-part derivation. The worked examples carry that load. Accepted and documented.

## Authored HTML in formulas

**Decision.** Formula and explanation fields contain a small allow-list of authored HTML (`<sub>`, `<sup>`, `<strong>`, `<br>`), rendered with `innerHTML` only for authored data.

**Why.** Subscripts and superscripts are essential for calculus notation, and MathJax/KaTeX would add a dependency and a CDN.

**Cost.** It is not a sanitizer for user input. Prompts are rendered with `textContent`; the only user-controlled string that reaches the DOM is the FRQ input, which is never inserted as HTML. Do not start rendering imported content as HTML.

## Dark-only theme

**Decision.** One deliberate dark scientific theme, four accent hues, a serif display face, and system UI fonts.

**Why.** Visual consistency, no font download, strong contrast for a projector/lecture context. A theme toggle would be a second design system to test.

**Cost.** No light mode. `color-scheme: dark` makes native controls legible.

## Reduced motion is a preference plus the OS setting

**Decision.** The settings toggle adds a body class, stops CSS animation, and sets `window.__CALC3D_REDUCED_MOTION__`; the stage respects it, Unit 3 rings stop, and the OS media query is also honoured.

**Why.** Motion-sensitive users should not have to change their OS. The OS setting remains the default.

**Cost.** A few decorative pulses still run in scenes that do not check the flag. They are small and non-essential. See [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Local-only data

**Decision.** `localStorage` only. No analytics, no cookies, no account, no server.

**Why.** Student progress is personal. A static educational tool should not require identity. Export/import gives portability.

**Cost.** Clearing site data loses progress. There is no cross-device sync. Documented in the UI and FAQ.

## GitHub Pages branch deployment

**Decision.** `main` / root, `.nojekyll`, no Actions deploy workflow.

**Why.** The repository is already the artifact. A workflow would duplicate the mechanism and add a second failure mode. CI still runs tests separately.

**Cost.** No build-time checks before Pages serves. The live browser suite after each push is the guard.

## Self-test in the product

**Decision.** Ship a visible `?selftest` overlay with 27 checks and a `window.__calc3d.runSelfTest()` hook.

**Why.** The browser suite can assert its score, but a human can also see exactly what passed. It catches missing IDs, broken scenes, duplicate elements, and storage issues in the deployed copy.

**Cost.** It imports the Eight scenes and builds them, so it is not instant. It uses an in-memory mastery store and never mutates the user's progress.
