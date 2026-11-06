# Privacy

## Short version

No accounts. No analytics. No cookies. No server. Mastery stays in `localStorage` in the browser. The only network request beyond the page itself is the pinned Three.js module from jsDelivr.

## What is stored

| Key | Contents | Where |
| --- | --- | --- |
| `calc3d.mastery.v1` | per-question mastery, attempts, correct, lapses, timestamps; global answered/correct/streak | browser `localStorage` |
| `calc3d.prefs.v1` | current unit, view, sound, reduced motion, focus | browser `localStorage` |

No name, email, account ID, location, device fingerprint, or free-text answer is stored. FRQ input is checked in memory and not persisted.

## What leaves the browser

- The page, CSS, JS, and favicon from GitHub Pages.
- The Three.js module and OrbitControls from `cdn.jsdelivr.net` (pinned `0.169.0`).
- Nothing else. There are no analytics beacons, fonts, images, ads, or error reporters.

GitHub Pages and jsDelivr may log standard request metadata (IP, user agent, URL) under their own policies. That is infrastructure, not application telemetry. The app does not control it.

## Export

“Export mastery JSON” creates a local Blob and downloads it. The file contains question IDs and counters, not personal data. Import replaces the local state after validating the app identifier.

## Clearing

- Settings → Reset progress clears mastery and leaves preferences.
- Browser site-data clearing removes both keys.
- Private/incognito mode usually discards `localStorage` when the window closes.

## Children and classroom use

The app is suitable for classroom use because it collects nothing. It is not COPPA/GDPR-certified; it simply has no personal data flow. If you add accounts, analytics, or a backend, this document is no longer true and must be rewritten.

## Security

There is no backend, no authentication, and no user-generated content rendered as HTML. Formula strings are authored. The FRQ input is never inserted into the DOM as HTML. The import path parses JSON and sanitises known fields; it does not execute code. See [SECURITY.md](../SECURITY.md).
