# Contributing

## Ground rules

- Keep the app static. No backend, accounts, analytics, npm runtime dependencies, or build step.
- Pin Three.js exactly. Do not use `three@latest`.
- Keep the visual contract in `docs/ARCHITECTURE.md`. Every scene factory must return the same members.
- Keep curriculum data pure and importable by Node.
- Do not add an external font, image, audio file, or icon library. Draw it or inline it.
- Run all gates before opening a pull request.

## Setup

```sh
git clone https://github.com/somphol/calculus-explorer-3d.git
cd calculus-explorer-3d
python3 -m http.server 8000
```

No install step.

## Gates

```sh
node --test tests/curriculum.test.mjs
node --test tests/static.test.mjs
node tests/browser.test.mjs
```

Open `?selftest` and confirm 27/27. Regenerate screenshots if the UI changed:

```sh
node scripts/screenshot.mjs
```

## Adding a question

1. Append an `mc(...)` or `frq(...)` to the unit's `questions` array in `src/data/curriculum.js`.
2. Use a new unique ID `u<unit>-q<two digits>`.
3. For MC: exactly four distinct choices and a zero-based `answer`.
4. For FRQ: a finite `answer`, a positive `tolerance`, and a `unitHint`.
5. Write an explanation that shows the method and a hint that does not reveal the value.
6. Update the counts in README, CURRICULUM, and any test that asserts 12 per unit. The current contract is **12 questions per unit**; adding a 13th requires changing the copy and the self-test.
7. Run the Node tests.

## Changing a scene

- Read `docs/VISUALS.md` for the unit.
- Keep `readout()` to six items; the stage chips are designed for six.
- Keep `narration().formula` short enough for the inspector; it scrolls horizontally.
- Dispose old geometry/material when rebuilding.
- If an auto-animation changes a value, write it back to the control descriptor.
- If a control should hide, use `visibleWhen`; the controller handles it.
- Add or update a browser check when the change is user-visible.

## Style

- Vanilla ES2022 modules, no TypeScript.
- 2-space indentation, double quotes in JS, semicolons.
- CSS custom properties for colour; do not hard-code new hues outside the palette.
- British/american spelling: the UI uses “mastery”, “visualizer”, and “colour” in comments. Keep copy consistent within a file; the product copy is American English.
- Comments explain why, not what.

## Pull requests

Include:

- what changed and why;
- the commands you ran and their results;
- a screenshot for visual changes;
- any known limitation.

Do not include credentials, personal data, or generated build output.

## Licensing

By contributing, you agree that your contribution is licensed under the repository's MIT license. Do not paste text or assets from Khan Academy, the College Board, textbooks, or other copyrighted sources.
