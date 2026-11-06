# AGENTS.md

## What it is

A static, single-page AP Calculus AB studio. Eight Khan Academy units each get a procedural Three.js scene, live narration, five worked examples, and a 12-question adaptive quiz that removes mastered questions. Mastery is local-only. There is no backend, build step, package manager, framework, analytics, or account system. The deployed artifact is the repository root served by GitHub Pages.

Read [README.md](README.md) for the product view and [docs/README.md](docs/README.md) for the doc index.

## Commands

Run from the repository root.

| Task | Command |
| --- | --- |
| Serve locally | `python3 -m http.server 8000` → <http://localhost:8000/> |
| Curriculum + math + mastery tests | `node --test tests/curriculum.test.mjs` |
| Repository/static tests | `node --test tests/static.test.mjs` |
| Headless browser suite | `node tests/browser.test.mjs` |
| Verify the live deployment | `TEST_URL=https://somphol.github.io/calculus-explorer-3d/ node tests/browser.test.mjs` |
| Built-in page suite | <http://localhost:8000/?selftest> |
| Regenerate screenshots | `node scripts/screenshot.mjs` |
| Deploy | `git push origin main`; Pages serves `main` / root |

The browser harness launches one headless Chrome with `--use-mock-keychain`, `--password-store=basic`, a throwaway profile, and a local server on an ephemeral port. Set `CHROME` if Chrome is not at the macOS default. It needs network access for the pinned Three.js CDN.

## Architecture

No build. Three source layers:

1. **Pure data** — `src/data/curriculum.js`: eight unit objects, 40 examples, 96 questions. No DOM, no imports.
2. **Pure core** — `src/core/math.js`, `mastery.js`, `quiz.js`: numerical calculus, storage schema, adaptive queue, quiz state machine. Safe in Node.
3. **Browser shell** — `index.html`, `style.css`, `src/main.js`, `src/visuals/*`: one renderer, eight scene factories, one controller.

**Visual contract.** Every `src/visuals/unitN.js` returns:

```js
{
  group, camera, controls, set(key, value), action(key)?,
  readout() -> [{label,value,tone}], narration() -> {title,lead,formula,note,status},
  update(dt, elapsed), getState()?, getHint()?, onPointer(raycast)?, dispose()?
}
```

`CalculusStage.setVisual()` disposes and removes the previous group. Scenes own their geometries/materials; the stage owns the renderer, camera, lights, OrbitControls, stars, and resize. Do not add a second renderer or camera.

**Construction order.** imports → curriculum data → core stores → stage → controller helpers → unit meta → visual factory → controls → readouts/narration → practice UI → boot. `boot()` sets `document.body.dataset.ready = "true"` only after the first visual, rail, and practice chrome are ready. Browser tests wait on that attribute.

**Routing.** Explore is `#unit-N`; Mastery is `#practice` or `#practice/N`. `history.replaceState` is used, so changing units does not create history spam. `hashchange` is handled for back/forward and deep links.

**Mastery keys.** `calc3d.mastery.v1` (records + stats) and `calc3d.prefs.v1` (unit, view, sound, motion, focus). Records are `{mastered, attempts, correct, lapses, lastResult, lastAt}`. A correct answer masters a question; a later review miss increments `lapses` but does not revoke mastery.

**Control dock.** Controls are descriptor objects returned by the scene: `range`, `select`, or `button`, with optional `visibleWhen`, `suffix`, and `reflect`. The controller renders them and calls `visual.set` / `visual.action`. Auto-animations must mutate the matching descriptor's `value` so the slider stays in sync (`unit1`, `unit2`, `unit4`, `unit6` do this).

**Hidden.** `[hidden] { display: none !important; }` is deliberate: `.explore-shell` and `.practice-shell` have explicit `display` values that would otherwise override the UA hidden rule. Do not remove it.

## Decisions and constraints

- **Pin Three.js `0.169.0`** in the import map. Addon paths move between versions. Do not use `three@latest`.
- **No framework, no bundler, no npm runtime dependency.** ES modules are served directly.
- **No external assets** beyond the Three.js CDN: no fonts, no images in the app, no audio files. Audio is synthesized with Web Audio. Textures (labels, favicon) are procedural or inline SVG.
- **Mastery is adaptive, not a fixed exam.** The queue is built from unmastered questions only. `includeMastered` exists for review mode. Do not mark a question mastered for merely seeing it.
- **FRQ answers are numeric.** The parser accepts decimals, fractions, and simple π multiples. Do not add free-text grading.
- **Correct answer indices are zero-based** in the data; the UI letter is `String.fromCharCode(65 + answer)`.
- **The unit hue is a CSS custom property** (`--unit-hue`) set on `document.body`; the stage and accents follow it.
- **`state.json` is generated from the OpenCode session database** at the end of the build. Do not invent token counts.

## Known issues

- The Three.js CDN is required on first load. The repository is not a fully offline bundle. A cached browser may run offline after the first visit, but that is not guaranteed by the CDN.
- The browser suite needs network access and Chrome. It is not run in the GitHub Actions workflow by default; the workflow runs Node tests only.
- Unit 5's terrain uses vertex colours for concavity and can look visually busy at very steep camera angles. The readouts remain authoritative.
- Unit 7's solution curves are intentionally clipped at ±4.3 in x/y and ±60 in the RK4 integrator. Explosive fields can produce very short curves.
- Fractional device pixel ratios above 2 are deliberately capped; the canvas is not a print-resolution capture.
- The numeric FRQ checker accepts a tolerance per question. It is not a symbolic grader.

## Continuity

- Live: <https://somphol.github.io/calculus-explorer-3d/>
- Repository: <https://github.com/somphol/calculus-explorer-3d>
- Local checkout: `~/Projects/calculus-explorer-3d`
- Build provenance and token totals: [state.json](state.json)
- Reusable skill / scaffold: <https://github.com/somphol/calculus-explorer-3d-skill>
- Credits: OpenCode + DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`), Three.js r169 (MIT).

Update this file in the same push as any change that makes it stale. Do not record secrets, tokens, credentials, or personal data.
