# Hosting — GitHub Pages, credentials, catalog

## Pages

The repository root is the artifact. `.nojekyll` prevents Jekyll processing.

1. Push `main`.
2. `POST /repos/{owner}/{repo}/pages` with `{"source":{"branch":"main","path":"/"}}`.
3. Poll `GET /repos/{owner}/{repo}/pages` until `"status": "built"`.
4. Check `GET /`, `/style.css`, `/src/main.js` return 200.
5. Run `TEST_URL=https://owner.github.io/repo/ node tests/browser.test.mjs`.

A local pass is not a deployment check: the CDN import map, Pages path, MIME types, and cache all
differ.

## Credentials without Keychain storms

The build environment may have no `gh` binary and no SSH key. A GitHub token can exist as an internet
password item. Read it **once** into a temporary file and use it through `GIT_ASKPASS`:

```sh
security find-internet-password -s github.com -w > /private/tmp/.ghtok
chmod 600 /private/tmp/.ghtok

cat > /private/tmp/askpass.sh <<'EOF'
#!/bin/sh
case "$1" in
  *sername*) printf 'x-access-token\n' ;;
  *) cat /private/tmp/.ghtok ;;
esac
EOF
chmod 700 /private/tmp/askpass.sh

GIT_ASKPASS=/private/tmp/askpass.sh GIT_TERMINAL_PROMPT=0 \
  git -c credential.helper= push -u origin main
```

Then remove `/private/tmp/.ghtok` and the askpass script. Never:

- put the token in the remote URL;
- commit it;
- echo it;
- call the credential helper from every test.

For Chrome, `--use-mock-keychain --password-store=basic` plus one throwaway profile is what prevents
repeated macOS prompts. The browser harness already does this.

For the API:

```sh
curl -H "Authorization: Bearer $TOKEN" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/owner/repo
```

## Repository metadata

Set the description and homepage at creation:

```
description: Calculus Explorer 3D: AP Calculus AB interactive 3D visualizer with
             8 WebGL units, 40 worked examples, and a 96-question adaptive mastery engine.
homepage:    https://owner.github.io/repo/
```

## Documentation in the same push

`AGENTS.md` must be at the repo root in the same push as the code. It is the first file another agent
reads. Keep continuity links (live URL, repo, local path, state.json) current.

## Skill catalog

A single-skill catalog repository can be laid out as:

```
/
├── README.md
├── AGENTS.md
├── ATTRIBUTION.md
├── LICENSE
├── index.json
├── docs/preview.png
└── calculus-explorer-3d-studio/
    ├── SKILL.md
    ├── references/
    ├── assets/reference/
    └── scripts/
```

`index.json`:

```json
{
  "name": "OpenCode skills by owner",
  "skills": [{
    "name": "calculus-explorer-3d-studio",
    "version": "<12-hex content hash>",
    "description": "…",
    "license": "MIT",
    "files": ["SKILL.md", "ATTRIBUTION.md", "scripts/new-project.mjs", "references/method.md", "..."]
  }]
}
```

Base URL: `https://owner.github.io/<catalog>/`. Every listed path resolves under
`<base>/<name>/<file>`. The version must change when any file changes. A stale version means clients
keep the old copy.

Enable Pages on `main` / root, then verify:

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://owner.github.io/<catalog>/index.json
curl -s https://owner.github.io/<catalog>/index.json | head -20
curl -s -o /dev/null -w "%{http_code}\n" https://owner.github.io/<catalog>/<id>/SKILL.md
```

A catalog that serves `index.json` but 404s a listed file is worse than no catalog.

## Caches

GitHub Pages serves `index.html` with revalidation but caches assets. There is no hashed build output.
After a push, use `?v=...` in a smoke test or check response headers. There is no service worker, so
the app does not keep a stale shell beyond normal HTTP caching.

## Rollback

Revert the commit and push; Pages rebuilds. Re-run the live browser suite. If you change the Pages
source branch, update `.nojekyll`, canonical/OG URLs, sitemap, and robots in the same commit.
