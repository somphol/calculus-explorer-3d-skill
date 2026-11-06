# Build state and provenance

`state.json` is a machine-readable record of the build session: start/end timestamps, wall-clock elapsed time, token counters, model/provider, source line counts, verification results, deployment links, and credits.

It is not application state. The app never reads it.

## How it was measured

The OpenCode session database is a SQLite file at `~/.local/share/opencode/opencode.db`. The relevant table is `session_v2` (the current schema; older builds used `session`). Counters are cumulative for the session:

```sh
sqlite3 ~/.local/share/opencode/opencode.db \
  "select id, title,
          datetime(time_created/1000,'unixepoch'),
          datetime(time_updated/1000,'unixepoch'),
          tokens_input, tokens_output, tokens_reasoning,
          tokens_cache_read, tokens_cache_write, cost
   from session_v2
   order by time_updated desc
   limit 5;"
```

Fields:

| Field | Meaning |
| --- | --- |
| `startedAt` | `time_created` of the build session |
| `capturedAt` | UTC time the file was written |
| `elapsedSeconds` | wall-clock difference, not token time |
| `tokens_input` | fresh prompt tokens |
| `tokens_output` | generated tokens |
| `tokens_reasoning` | reasoning tokens reported by the provider |
| `tokens_cache_read` | repeated prompt context read from cache |
| `tokens_cache_write` | cache writes |
| `cost` | provider-reported cost; 0 on a flat-rate plan |

`totalTokens` is the sum of all five counters. Cache reads dominate the number and are not a measure of unique content.

## Rules

- Measure at the end, after deployment and verification.
- Do not invent, round up, or back-fill token counts.
- Record the model and provider exactly as OpenCode reports them.
- The elapsed time is wall-clock, including waiting on the CDN, Chrome, and GitHub Pages.
- `state.json` must be valid JSON and is checked by `tests/static.test.mjs`.
- Do not record secrets, tokens, credentials, or personal data.

## Current release

See [../state.json](../state.json). If you rebuild the project, create a new state file rather than editing the old one; the history is more useful than a false current number.
