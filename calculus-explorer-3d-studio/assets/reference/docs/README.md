# Documentation

| Document | What it answers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Module map, visual contract, lifecycle, storage, routing |
| [CURRICULUM.md](CURRICULUM.md) | Eight-unit alignment, content inventory, question design, accuracy policy |
| [VISUALS.md](VISUALS.md) | What each of the eight scenes draws and how each parameter maps to the math |
| [MASTERY.md](MASTERY.md) | `localStorage` schema, adaptive queue, export/import, reset semantics |
| [REPRODUCTION.md](REPRODUCTION.md) | Exact blueprint another agent can follow, including pitfalls and acceptance gates |
| [TESTING.md](TESTING.md) | Three test layers, commands, expected counts, screenshots |
| [DEPLOYMENT.md](DEPLOYMENT.md) | GitHub Pages release, API recipe, live verification, rollback |
| [DECISIONS.md](DECISIONS.md) | Why the app is static, why Three.js is pinned, why FRQs are numeric, and what was traded away |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | Keyboard map, ARIA, contrast, motion, known limitations |
| [PERFORMANCE.md](PERFORMANCE.md) | GPU budgets, caps, rebuild strategy, disposal, measurement |
| [PRIVACY.md](PRIVACY.md) | Stored keys, network requests, export, clearing |
| [FAQ.md](FAQ.md) | Common questions and honest answers |
| [STATE.md](STATE.md) | How `state.json` is measured and what its fields mean |

The root [README](../README.md) is the product view. [AGENTS.md](../AGENTS.md) is the one-minute handoff for another agent.

## Reading order for a new maintainer

1. `README.md` — what the product is.
2. `AGENTS.md` — commands, architecture, constraints.
3. `docs/ARCHITECTURE.md` — how the pieces fit.
4. `docs/REPRODUCTION.md` — rebuild from zero.
5. `docs/TESTING.md` — prove it still works.
6. `docs/VISUALS.md` — change a scene without breaking the contract.

## Reading order for a new agent

1. `AGENTS.md`.
2. `docs/ARCHITECTURE.md` sections “Visual contract” and “Construction order”.
3. `docs/MASTERY.md` before touching quiz code.
4. `docs/REPRODUCTION.md` pitfalls before debugging a visual.
5. `docs/TESTING.md` before claiming a fix.

## Documentation rules

- Keep claims in sync with the test suite. If a count changes, change it everywhere.
- Do not copy the README into the docs; link.
- Record hard-won failure modes, not marketing.
- No secrets, tokens, credentials, or personal data.
- Update `AGENTS.md` in the same push as any change that makes it stale.
