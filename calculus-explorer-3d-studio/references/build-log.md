# Build log — what actually happened

## Session

- Project: Calculus Explorer 3D
- Date: 2026-11-06 (UTC)
- Tool: OpenCode
- Model: DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`)
- Starting point: empty `~/Projects/calculus-explorer-3d`
- Release: v1.0.0, MIT, GitHub Pages

The measured wall-clock time and token counters are in the shipped `state.json` and in the skill
repository. They were read from `session_v2` in `~/.local/share/opencode/opencode.db`, not estimated.
Cache reads dominate the token total; they are repeated prompt context, not unique content.

## Sequence that worked

1. **Content first.** Eight unit objects, 40 examples, 96 questions. Pure data, Node-importable.
2. **Core next.** Numerical calculus, mastery schema, quiz state machine with injected storage.
3. **Stage.** One renderer, lights, stars, OrbitControls, disposal, DPR cap.
4. **Unit 1** as the smoke test, then the controller, then the remaining seven scenes.
5. **Practice UI** after the visuals, because it depends on the mastery store but not on geometry.
6. **Tests** at three layers, with a dependency-free Chrome harness.
7. **Docs, screenshots, state, push, Pages, live suite.**
8. **Skill extraction** with the full project as `assets/reference/`.

## Bugs that cost real time

### Explore and Mastery visible together

`hidden` lost to the author `display:grid` / `display:flex` on the two top-level shells. The practice
DOM was interactive while invisible, so early tests passed even though the view was wrong. Fix:
global `[hidden] { display: none !important; }`. This is the single highest-value CSS line in the
project.

### Mobile page 1250 px wide

At 390 px, the horizontal unit rail's min-content width propagated through the grid, so the page was
three screens wide and the controls were clipped. Fix: `min-width:0` on `.explore-shell`,
`.unit-rail`, `.workspace`, `.inspector`, and `#main`; cap the rail at `100vw`; hide its scrollbar.
The browser suite now asserts `scrollWidth === 390`.

### Literal `<sub>` in the narration

The live formula was rendered with `innerHTML`, but the live note was rendered with `textContent`.
The note contained `lim<sub>x→1</sub>`, so the tags appeared on screen. Fix: `innerHTML` for authored
note/formula HTML; prompts and user input stay `textContent`.

### Ladder inside the wall

The wall was a 0.12×4.7×3.2 box centred at z=0, and the ladder was also at z=0, so the top was buried.
Fix: ladder at z=1.82, wall face at 1.61, arrows at 2.12. The screenshot now shows the ladder in
front.

### Partial lathe had no caps / threw on √x

`LatheGeometry` does not cap a partial sweep. `ShapeUtils.triangulateShape` on the closed profile
does. But √x starts at `(0,0)` and the profile added `(0,a)` at the end, producing a duplicate point
and a degenerate polygon. Fix: dedupe consecutive and closed points before triangulating.

### Slope-field trail invisible

A 1 px `LineBasicMaterial` disappeared at 1600 px. Fix: a faint glow tube plus additive `Points`
crumbs plus a bright growing line. The head and start ring make the direction obvious.

### Browser test hung on the deep link

`Page.navigate` to `#practice/4` was a same-document change, so `Page.loadEventFired` never fired and
the helper waited forever. Fix: set `location.hash` via `Runtime.evaluate` and wait for the app's
state, not for a load event.

### Self-test “failed” in the runner

The self-test summary stores `{name, pass}`, but the browser runner filtered `result.ok`. All checks
looked false. Fix: filter `result.pass`. The self-test itself was already 27/27.

## What was easy

- The visual contract: one stage, eight factories, descriptor-driven controls.
- Pure data: the curriculum file became the single source for counts and quiz content.
- The mastery store: injected storage made every edge case testable in Node.
- The harness: no Playwright, no npm; one Chrome and CDP.
- Screenshots: one browser instance, mock keychain, local server.

## What was harder than expected

- Making eight scenes feel distinct rather than reskins. Each needed its own math, not a palette swap.
- Unit 5 (terrain, beacons, tangent plane, MVT) and Unit 8 (partial lathe caps) had the most geometry
  edge cases.
- Keeping auto-animated sliders honest. Any scene that advances its own state must write the value
  back to the descriptor.
- Writing 96 correct questions with useful explanations. Content took roughly a third of the build.

## If starting again

- Put the `[hidden]` guard and `min-width:0` in the first CSS commit.
- Build the stage and Unit 1 together, then the controller, then content-heavy units.
- Write the harness before the fourth scene; it catches visual regressions immediately.
- Keep numerals out of prose claims until the final test run; update them once.
- Capture `state.json` only after the live suite passes.
- Package the skill from the shipped tree, not from memory; the reference must be the real artifact.

## Credits

Built with OpenCode and DeepSeek V4.1 Flash. Three.js r169, MIT. Curriculum structure follows the
public Khan Academy AP Calculus AB framework; all text, examples, questions and code are original.
No Khan Academy or College Board assets are redistributed.
