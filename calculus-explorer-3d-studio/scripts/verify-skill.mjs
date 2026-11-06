#!/usr/bin/env node
// Proves the reference still satisfies the release gates.
//
//   node scripts/verify-skill.mjs [--browser]
//
// Core + static tests run by default. --browser additionally launches headless
// Chrome (network + Chrome required, mock keychain, throwaway profile).

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REF = join(HERE, "..", "assets", "reference");
const failures = [];

const requireFile = (relative) => {
  const full = join(REF, relative);
  if (!existsSync(full)) failures.push(`missing ${relative}`);
};

for (const file of [
  "index.html",
  "style.css",
  "src/main.js",
  "src/data/curriculum.js",
  "src/core/math.js",
  "src/core/mastery.js",
  "src/core/quiz.js",
  "src/visuals/stage.js",
  "src/visuals/unit1.js",
  "src/visuals/unit8.js",
  "tests/curriculum.test.mjs",
  "tests/static.test.mjs",
  "tests/browser.test.mjs",
  "state.json",
  "AGENTS.md",
]) requireFile(file);

if (!failures.length) {
  const state = JSON.parse(readFileSync(join(REF, "state.json"), "utf8"));
  if (state.project !== "Calculus Explorer 3D") failures.push("state.json project name changed");
  if (!state.usage || state.usage.totalTokens <= 0) failures.push("state.json usage missing");
  if (state.credits?.tool !== "OpenCode") failures.push("state.json credits missing OpenCode");
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

try {
  execFileSync(process.execPath, ["--test", "tests/curriculum.test.mjs", "tests/static.test.mjs"], {
    cwd: REF,
    stdio: "inherit",
  });
} catch {
  process.exit(1);
}

if (process.argv.includes("--browser")) {
  try {
    execFileSync(process.execPath, ["tests/browser.test.mjs"], { cwd: REF, stdio: "inherit" });
  } catch {
    process.exit(1);
  }
}

console.log("\nReference verified: 16 core + 17 static" + (process.argv.includes("--browser") ? " + 47 browser" : "") + " checks.");
