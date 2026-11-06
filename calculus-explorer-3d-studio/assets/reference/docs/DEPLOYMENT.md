# Deployment

## Target

GitHub Pages, `main` branch, repository root. The artifact is the repository itself. No build, no `dist/`, no GitHub Actions deployment workflow is required.

- Repository: <https://github.com/somphol/calculus-explorer-3d>
- Live: <https://somphol.github.io/calculus-explorer-3d/>
- `.nojekyll` prevents Jekyll from touching underscored paths or ignoring files.

## First release

```sh
cd ~/Projects/calculus-explorer-3d
git add .
git commit -m "Release Calculus Explorer 3D v1.0.0"
git remote add origin https://github.com/somphol/calculus-explorer-3d.git
git push -u origin main
```

Enable Pages through the API (no browser needed):

```sh
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/somphol/calculus-explorer-3d/pages \
  -d '{"source":{"branch":"main","path":"/"}}'
```

Poll:

```sh
curl -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/repos/somphol/calculus-explorer-3d/pages
```

Wait for `"status": "built"` and the `html_url`. Then verify:

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://somphol.github.io/calculus-explorer-3d/
curl -s -o /dev/null -w "%{http_code}\n" https://somphol.github.io/calculus-explorer-3d/style.css
curl -s -o /dev/null -w "%{http_code}\n" https://somphol.github.io/calculus-explorer-3d/src/main.js
TEST_URL=https://somphol.github.io/calculus-explorer-3d/ node tests/browser.test.mjs
```

The live browser run is the real deployment check. A local pass is not enough: CDN, import map, Pages path, and MIME types all differ from `localhost`.

## Credentials and Keychain

This project was published without `gh` and without repeated Keychain prompts:

- read the GitHub token once from the existing internet-password item;
- use it through a temporary `GIT_ASKPASS` script or an Authorization header;
- never put the token in the remote URL, a committed file, or a shell history line;
- remove the temporary askpass file after the push.

For Chrome, always use `--use-mock-keychain`, `--password-store=basic`, a throwaway `--user-data-dir`, and one browser instance. The test harness does this. Repeated `security`/Chrome access is the usual cause of Keychain prompt storms.

## Caching

GitHub Pages caches aggressively. `index.html` is usually revalidated; hashed filenames do not exist because there is no build. For a smoke test after a push, append a cache-busting query (`?v=...`) or check the response headers. The app itself does not use a service worker, so there is no stale-cache trap beyond the browser's HTTP cache.

## Custom 404

`404.html` is a tiny static page pointing back to the studio. It has no dependency on the app bundle, so it still works if a deep link is mistyped.

## Updating

1. Edit source.
2. Run all gates in [TESTING.md](TESTING.md).
3. Regenerate screenshots if the UI changed.
4. Update `state.json` only when the release metadata genuinely changed.
5. Push. Pages rebuilds on `main`.
6. Run the live browser suite.

## Rollback

Pages serves the current `main`. To roll back, revert the offending commit and push; or use the Pages API to point at a tag/branch, but the repository is configured for `main` / root. Re-run the live suite after any rollback.

## Domain

The default `somphol.github.io/calculus-explorer-3d/` URL is used in the canonical, OG tags, sitemap, and README. If a custom domain is added, update all four in the same commit.
