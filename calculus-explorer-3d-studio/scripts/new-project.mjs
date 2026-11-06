#!/usr/bin/env node
// Scaffolds a fresh project from the shipped reference implementation.
//
//   node scripts/new-project.mjs --out ~/Projects/my-calculus-studio [--force]
//
// The reference is a complete static app: no npm install, no build.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REFERENCE = join(HERE, "..", "assets", "reference");
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? args[outIndex + 1] : "";
const force = args.includes("--force");

if (!out) {
  console.error("Usage: node scripts/new-project.mjs --out <directory> [--force]");
  process.exit(2);
}
if (!existsSync(join(REFERENCE, "index.html"))) {
  console.error(`Reference is missing or incomplete: ${REFERENCE}`);
  process.exit(2);
}

const target = resolve(out.replace(/^~(?=$|\/)/, process.env.HOME || "~"));
if (existsSync(target) && readdirSync(target).length && !force) {
  console.error(`${target} is not empty. Pass --force to copy into it anyway.`);
  process.exit(2);
}
mkdirSync(target, { recursive: true });
cpSync(REFERENCE, target, {
  recursive: true,
  filter: (source) => !source.split("/").includes(".git"),
});

const state = JSON.parse(readFileSync(join(target, "state.json"), "utf8"));
console.log(`Scaffolded ${state.project} v${state.release.version} into ${target}`);
console.log(`
Next:
  cd ${target}
  python3 -m http.server 8000          # http://localhost:8000/
  node --test tests/curriculum.test.mjs tests/static.test.mjs
  node tests/browser.test.mjs          # needs Chrome + network for the Three.js CDN

Before publishing:
  1. Replace the canonical/OG/GitHub URLs with your own.
  2. Replace the curriculum content and unit hues as needed.
  3. Rewrite state.json with your session's measured time and tokens.
  4. Keep the visual contract, the [hidden] guard, and the keychain-safe harness.

The reference intentionally ships its build state. Do not present it as your own session.
`);
