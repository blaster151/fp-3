#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const gitDir = path.join(root, ".git");

try {
  const stats = fs.statSync(gitDir);
  if (!stats.isDirectory()) {
    console.log("setup-git-hooks: no .git directory; skipping pre-commit hook installation.");
    process.exit(0);
  }
} catch {
  console.log("setup-git-hooks: no .git directory; skipping pre-commit hook installation.");
  process.exit(0);
}

const hooksDir = path.join(gitDir, "hooks");
fs.mkdirSync(hooksDir, { recursive: true });

const hookPath = path.join(hooksDir, "pre-commit");
const hookScript = `#!/bin/sh
npm run check:stubs
status=$?
if [ "$status" -ne 0 ]; then
  exit "$status"
fi

git --no-pager diff --stat
`;

try {
  fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
  console.log("setup-git-hooks: installed pre-commit hook to run check:stubs.");
} catch (err) {
  console.warn("setup-git-hooks: failed to install pre-commit hook:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
