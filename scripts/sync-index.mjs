#!/usr/bin/env node
// Rebuilds index.json from calculus-explorer-3d-studio/.
// Run after any skill edit; the version is a content hash so clients refresh.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NAME = "calculus-explorer-3d-studio";
const DIR = join(ROOT, NAME);
const SKIP = new Set([".git", ".github", ".DS_Store", "node_modules", "dist", "shots"]);

function walk(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.isFile()) out.push(relative(base, full));
  }
  return out.sort();
}

const files = walk(DIR);
if (!files.includes("SKILL.md")) {
  console.error("SKILL.md missing from", DIR);
  process.exit(1);
}
const hash = createHash("sha256");
for (const file of files) hash.update(file).update(readFileSync(join(DIR, file)));
const version = hash.digest("hex").slice(0, 12);
const skill = readFileSync(join(DIR, "SKILL.md"), "utf8");
const description = skill.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";

const index = {
  name: "OpenCode skills by somphol",
  skills: [{
    name: NAME,
    version,
    description,
    license: "MIT",
    files,
  }],
};
writeFileSync(join(ROOT, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
const bytes = files.reduce((n, file) => n + statSync(join(DIR, file)).size, 0);
console.log(`index.json written: ${NAME} v${version}, ${files.length} files, ${(bytes / 1048576).toFixed(2)} MB`);
