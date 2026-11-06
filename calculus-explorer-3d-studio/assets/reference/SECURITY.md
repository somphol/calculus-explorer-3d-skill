# Security policy

## Scope

This is a static educational app. It has no backend, authentication, database, uploads, or server-side code. The realistic attack surface is:

- the pinned Three.js CDN supply chain;
- the browser's `localStorage`;
- HTML injection through authored curriculum strings;
- the JSON import path.

## Design choices that reduce risk

- No user-generated content is rendered as HTML. Prompts and FRQ input use `textContent`; only authored formula/explanation strings use `innerHTML`.
- `parseNumericAnswer` is a whitelist parser; it does not `eval` or use `Function`.
- Import validates the app identifier and sanitises known fields; it never executes data.
- No cookies, tokens, or credentials are stored.
- No third-party analytics, error reporting, or ad scripts.
- Three.js is pinned to an exact version. Subresource Integrity is not used because CDN SRI would need updating with every version; the pin limits drift but does not eliminate CDN compromise.

## Reporting

If you find a vulnerability, please open a private security advisory on GitHub rather than a public issue. Include:

- a description and impact;
- steps to reproduce;
- the browser and version;
- any suggested fix.

There is no bug bounty. Good-faith reports will be acknowledged.

## Supported versions

The deployed `main` branch is the supported version. There are no maintained older releases.

## Dependency notices

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Three.js is MIT-licensed. The CDN is jsDelivr.
