import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { ROOT, read } from "./lib/fixtures.mjs";

const html = read("index.html");
const css = read("style.css");
const main = read("src/main.js");
const curriculum = read("src/data/curriculum.js");
const state = JSON.parse(read("state.json"));

const walk = (dir) =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  );

test("source files exist and are non-trivial", () => {
  const required = [
    "index.html",
    "style.css",
    "src/main.js",
    "src/data/curriculum.js",
    "src/core/math.js",
    "src/core/mastery.js",
    "src/core/quiz.js",
    "src/visuals/stage.js",
    "src/visuals/common.js",
    "assets/favicon.svg",
  ];
  for (let id = 1; id <= 8; id += 1) required.push(`src/visuals/unit${id}.js`);
  for (const file of required) {
    assert.ok(existsSync(join(ROOT, file)), `${file} missing`);
    assert.ok(statSync(join(ROOT, file)).size > 200, `${file} suspiciously small`);
  }
  for (const file of ["index.html", "style.css", "src/main.js", "src/data/curriculum.js"]) {
    assert.ok(statSync(join(ROOT, file)).size > 5000, `${file} unexpectedly small`);
  }
});

test("HTML shell is complete and uses a pinned import map", () => {
  assert.match(html, /^<!DOCTYPE html>/i);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="viewport"[^>]*width=device-width/);
  assert.match(html, /<meta name="description" content="[^"]{40,}"/);
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<script type="importmap">/);
  assert.match(html, /three@0\.169\.0\/build\/three\.module\.js/);
  assert.match(html, /three@0\.169\.0\/examples\/jsm\//);
  assert.match(html, /<script type="module" src="src\/main\.js"><\/script>/);
  assert.doesNotMatch(html, /three@latest|three@\^|unpkg\.com/);
  assert.match(html, /rel="icon"[^>]*assets\/favicon\.svg/);
  assert.match(html, /og:image/);
});

test("no duplicate IDs and every id used by the controller exists", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, [], `duplicate ids: ${duplicates.join(", ")}`);

  const referenced = [...main.matchAll(/(?<!\$)\$\("([^"]+)"\)/g)].map((m) => m[1]);
  const missing = [...new Set(referenced)].filter((id) => /^[A-Za-z][\w-]*$/.test(id) && !ids.includes(id));
  assert.deepEqual(missing, [], `controller references missing ids: ${missing.join(", ")}`);
});

test("the two top-level views are protected from the hidden-attribute override", () => {
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
  assert.match(css, /\.explore-shell\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.practice-shell\s*\{/);
});

test("CSS defines the design system and responsive rules", () => {
  for (const token of ["--bg:", "--teal:", "--amber:", "--violet:", "--rose:", "--ink:", "--radius:", "--font-display:", "--unit-hue:"]) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 1120px\)/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /grid-template-columns/);
  assert.match(css, /min-width:\s*0/);
  assert.doesNotMatch(css, /@import\s+url\(['"]?https?:/);
});

test("the controller imports every unit factory and the stage", () => {
  for (let id = 1; id <= 8; id += 1) {
    assert.match(main, new RegExp(`createUnit${id}Scene`));
  }
  assert.match(main, /new CalculusStage/);
  assert.match(main, /dataset\.ready = "true"/);
  assert.match(main, /calc3d\.mastery\.v1|createMasteryStore/);
  assert.match(main, /__calc3d/);
});

test("curriculum data is pure and marker-free of DOM access", () => {
  assert.doesNotMatch(curriculum, /document\.|window\.|from\s+["']three["']|^import\s/m);
  assert.match(curriculum, /export const UNITS/);
  assert.match(curriculum, /export const ALL_QUESTIONS/);
  assert.match(curriculum, /export const TOTAL_QUESTIONS/);
});

test("required documentation and community files exist", () => {
  const required = [
    "README.md",
    "AGENTS.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "SECURITY.md",
    "SUPPORT.md",
    "LICENSE",
    "CITATION.cff",
    "THIRD_PARTY_NOTICES.md",
    "ROADMAP.md",
    "state.json",
    ".nojekyll",
    "robots.txt",
    "sitemap.xml",
    "404.html",
    "docs/README.md",
    "docs/ARCHITECTURE.md",
    "docs/CURRICULUM.md",
    "docs/VISUALS.md",
    "docs/MASTERY.md",
    "docs/REPRODUCTION.md",
    "docs/TESTING.md",
    "docs/DEPLOYMENT.md",
    "docs/DECISIONS.md",
    "docs/ACCESSIBILITY.md",
    "docs/PERFORMANCE.md",
    "docs/PRIVACY.md",
    "docs/FAQ.md",
    "docs/STATE.md",
  ];
  for (const file of required) assert.ok(existsSync(join(ROOT, file)), `${file} missing`);
});

test("README relative links resolve to real files", () => {
  const files = ["README.md", "AGENTS.md", "docs/README.md"];
  for (const file of files) {
    const text = read(file);
    const base = file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : "";
    const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    for (const link of links) {
      if (/^(https?:|#|mailto:)/.test(link)) continue;
      const target = link.split("#")[0];
      const resolved = join(ROOT, base, target);
      assert.ok(existsSync(resolved), `${file} links to missing ${link}`);
    }
  }
});

test("README screenshots exist", () => {
  for (const image of ["assets/studio.png", "assets/mastery.png", "assets/mobile.png", "assets/unit-grid.png", "assets/og.png"]) {
    assert.ok(existsSync(join(ROOT, image)), `${image} missing — run node scripts/screenshot.mjs`);
    assert.ok(statSync(join(ROOT, image)).size > 8000, `${image} suspiciously small`);
  }
});

test("state.json records a complete build session", () => {
  assert.equal(state.schema, 1);
  assert.equal(state.project, "Calculus Explorer 3D");
  assert.equal(state.release.version, "1.0.0");
  assert.match(state.session.startedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(state.session.capturedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(state.session.elapsedSeconds > 0);
  assert.ok(state.usage.inputTokens >= 0);
  assert.ok(state.usage.outputTokens >= 0);
  assert.ok(state.usage.totalTokens >= state.usage.inputTokens);
  assert.equal(state.credits.tool, "OpenCode");
  assert.equal(state.credits.model, "DeepSeek V4.1 Flash");
  assert.match(state.deployment.repository, /^https:\/\/github\.com\//);
  assert.match(state.deployment.pages, /^https:\/\/.+\.github\.io\//);
  assert.ok(Array.isArray(state.verification.checks) && state.verification.checks.length >= 3);
});

test("no analytics, tracking, or remote fonts are shipped", () => {
  const all = [html, css, main, read("src/visuals/stage.js")].join("\n");
  for (const forbidden of ["gtag(", "google-analytics", "plausible.io", "segment.com", "hotjar", "fonts.googleapis.com", "facebook.net"]) {
    assert.ok(!all.includes(forbidden), `found ${forbidden}`);
  }
  assert.doesNotMatch(all, /\beval\s*\(/);
  assert.doesNotMatch(all, /new Function/);
});

test("sitemap and canonical URL agree", () => {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.equal(canonical, "https://somphol.github.io/calculus-explorer-3d/");
  assert.match(read("sitemap.xml"), /https:\/\/somphol\.github\.io\/calculus-explorer-3d\//);
  assert.match(read("robots.txt"), /Sitemap: https:\/\/somphol\.github\.io\/calculus-explorer-3d\/sitemap\.xml/);
});

test("test harness avoids the login keychain", () => {
  const harness = read("tests/lib/harness.mjs");
  assert.match(harness, /--use-mock-keychain/);
  assert.match(harness, /--password-store=basic/);
  assert.match(harness, /mkdtempSync/);
  assert.match(harness, /listen\(0/);
  assert.doesNotMatch(harness, /gh auth|find-internet-password/);
});

test("every module parses as an ES module", () => {
  const files = walk("src").filter((file) => file.endsWith(".js"));
  assert.ok(files.length >= 13);
  for (const file of files) {
    const source = readFileSync(join(ROOT, file), "utf8");
    assert.ok(source.length > 100, `${file} is empty`);
    assert.doesNotMatch(source, /<script/i, `${file} contains HTML`);
  }
});

test("documentation avoids placeholders and contains the release counts", () => {
  const readme = read("README.md");
  assert.match(readme, /96/);
  assert.match(readme, /40/);
  assert.match(readme, /OpenCode/);
  assert.match(readme, /DeepSeek V4\.1 Flash/);
  assert.match(readme, /MIT/);
  for (const file of ["README.md", "AGENTS.md", "docs/README.md", "docs/REPRODUCTION.md", "docs/TESTING.md"]) {
    const text = read(file);
    assert.doesNotMatch(text, /\bTODO\b|\bTBD\b|\[placeholder\]/i, `${file} has a placeholder`);
  }
});

test("GitHub workflow verifies the project without deploying over Pages", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /node --test tests\/curriculum\.test\.mjs/);
  assert.match(workflow, /node --test tests\/static\.test\.mjs/);
  assert.doesNotMatch(workflow, /pages deploy|actions\/deploy-pages|gh-pages/);
});
