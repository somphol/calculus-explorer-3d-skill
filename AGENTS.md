# AGENTS.md

## What it is

The public catalog copy of the OpenCode skill **Calculus Explorer 3D Studio**. It teaches an agent to build a static, eight-unit AP Calculus AB studio with procedural Three.js scenes, 40 worked examples, a 96-question adaptive mastery engine, three verification layers, release docs, and GitHub Pages. The complete reference app is in `calculus-explorer-3d-studio/assets/reference/`.

It is not the live app. The app lives at <https://somphol.github.io/calculus-explorer-3d/> and <https://github.com/somphol/calculus-explorer-3d>.

## Commands

Run from the repository root.

| Task | Command |
| --- | --- |
| Validate the skill | `node ~/.config/opencode/skills/skill-publish/scripts/check-skill.mjs ./calculus-explorer-3d-studio` |
| Prove the reference | `node calculus-explorer-3d-studio/scripts/verify-skill.mjs` |
| Scaffold a project | `node calculus-explorer-3d-studio/scripts/new-project.mjs --out /tmp/calc-studio` |
| Test the scaffold | `cd /tmp/calc-studio && node --test tests/curriculum.test.mjs tests/static.test.mjs` |
| Browser-test the scaffold | `cd /tmp/calc-studio && node tests/browser.test.mjs` |
| Rebuild the catalog | `node scripts/sync-index.mjs` |
| Serve the catalog | `python3 -m http.server 8000` |
| Deploy | `git push origin main`; Pages serves `main` / root |

## Layout

- `index.json` — catalog manifest. `version` is a SHA-256 content hash; regenerate after every edit.
- `calculus-explorer-3d-studio/SKILL.md` — the model-facing skill.
- `calculus-explorer-3d-studio/references/` — method, content, visuals, verification, hosting, build log.
- `calculus-explorer-3d-studio/assets/reference/` — the shipped v1.0.0 source, tests, docs, screenshots, state.
- `calculus-explorer-3d-studio/scripts/new-project.mjs` — copies the reference; refuses a non-empty directory unless `--force`.
- `calculus-explorer-3d-studio/scripts/verify-skill.mjs` — file checks + Node suites; `--browser` adds the 47-check Chrome suite.
- `scripts/sync-index.mjs` — walks the skill folder, hashes it, writes `index.json` (includes dotfiles).
- `docs/preview.png` — 2×2 contact sheet used in the README.

## Constraints

- **The reference must remain runnable.** Do not edit `assets/reference` without running the 33 Node tests and, when visuals change, the 47 browser checks.
- **`index.json` must list every shipped file**, including `.nojekyll` and `.github/workflows/ci.yml`. A scaffold from the catalog must pass the static suite, which requires `.nojekyll`.
- **Version must change on every edit.** `node scripts/sync-index.mjs` handles it. Never hand-edit the hash.
- **Paths in `index.json` are relative to `<base>/<name>/`.** No `..`, no absolute URLs.
- **No secrets, tokens, credentials, or personal email.** The build log describes the keychain method without a token.
- **No Khan Academy or College Board content.** The unit structure is public; all prose, questions, and code are original.
- **MIT.** Keep attribution and the Three.js notice.
- **Skills are loaded unsandboxed.** Do not add scripts that exfiltrate data or write outside the requested output.

## Known issues

- The scaffold is a full copy, not a renamed generator. It prints a checklist; another agent must replace URLs, content, and `state.json`.
- The reference depends on the Three.js CDN for the first load. Offline use requires vendoring.
- The catalog has one skill. A second skill would need the same folder/hash pattern.
- GitHub Pages caches; bump the version (already automatic) and cache-bust `index.json` when verifying a fresh copy.
- The skill's build log records the reference session's time/tokens; it is not your session.

## Continuity

- Catalog: <https://somphol.github.io/calculus-explorer-3d-skill/>
- Repository: <https://github.com/somphol/calculus-explorer-3d-skill>
- Reference app: <https://github.com/somphol/calculus-explorer-3d>
- Live app: <https://somphol.github.io/calculus-explorer-3d/>
- Local skill source: `~/.config/opencode/skills/calculus-explorer-3d-studio`
- Local catalog: `~/Projects/calculus-explorer-3d-skill`

Update this file in the same push as any change that makes it stale.
