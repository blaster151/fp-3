#!/usr/bin/env ts-node

/**
 * Scans LAWS.md for `Registry Path:` lines and ensures matching stubs exist.
 * It will:
 *  - Parse entries: title, registryPath, witnessBuilder?, checkFn?
 *  - Create a stub file under src/oracles/<registryPath>.ts if missing
 *  - Print a registry snippet to paste into markov-oracles.ts (no auto-edit)
 *
 * Usage:
 *   ts-node scripts/gen-oracle-stubs.ts
 *   ts-node scripts/gen-oracle-stubs.ts --dry
 */

import * as fs from "node:fs";
import * as path from "node:path";

type Entry = {
  readonly title: string;
  readonly registryPath: string;
  readonly witnessBuilder?: string | undefined;
  readonly checkFn?: string | undefined;
};

const ROOT = process.cwd();
const LAWS = path.join(ROOT, "LAWS.md");
const OUT_ROOT = path.join(ROOT, "src", "oracles");
const DRY = process.argv.includes("--dry");

function read(file: string): string {
  return fs.readFileSync(file, "utf-8");
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function toFilePathFromRegistry(registryPath: string): { dir: string; file: string; full: string } {
  const parts = registryPath.split(".");
  const file = parts.pop();
  if (!file) throw new Error(`Invalid registry path: ${registryPath}`);
  const dir = path.join(OUT_ROOT, ...parts);
  return { dir, file, full: path.join(dir, `${file}.ts`) };
}

function parseEntries(lawsText: string): Entry[] {
  const lines = lawsText.split(/\r?\n/);
  const entries: Entry[] = [];
  let currentTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    const headerMatch = /^#{2,6}\s+(.*)$/.exec(line);
    if (headerMatch?.[1]) currentTitle = headerMatch[1].trim();

    const registryMatch = /Registry Path:[^A-Za-z0-9_.]*([A-Za-z0-9_.]+)/i.exec(line);
    if (!registryMatch?.[1]) continue;

    const registryPath = registryMatch[1].trim();
    let witnessBuilder: string | undefined;
    let checkFn: string | undefined;

    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      const lookahead = lines[j];
      if (lookahead === undefined) continue;
      const witnessMatch = /Witness Builder:[^`]*`([^`]+)`/i.exec(lookahead);
      if (witnessMatch?.[1]) witnessBuilder = witnessMatch[1].trim();
      const checkMatch = /Check:[^`]*`([^`]+)`/i.exec(lookahead);
      if (checkMatch?.[1]) checkFn = checkMatch[1].trim();
    }

    entries.push({
      title: currentTitle || registryPath,
      registryPath,
      witnessBuilder,
      checkFn,
    });
  }

  return entries;
}

function existsFile(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function stubContent(entry: Entry): string {
  const { registryPath } = entry;
  const exportedWitness = entry.witnessBuilder
    ? entry.witnessBuilder.split(".").pop()
    : "witness";
  const exportedCheck = entry.checkFn
    ? entry.checkFn.split(".").pop()
    : "check";
  const niceName = entry.title.replace(/`/g, "");
  return `// AUTO-GENERATED STUB for ${niceName}
// Registry Path: ${registryPath}
// This stub exists because LAWS.md documents this oracle but no implementation was found.
// Replace throws with real logic, wire into markov-oracles.ts under "${registryPath}".

export function ${exportedWitness}(...args: unknown[]): never {
  throw new Error("TODO(${registryPath}): implement witness builder. LAWS.md: ${niceName}");
}

export function ${exportedCheck}(...args: unknown[]): never {
  throw new Error("TODO(${registryPath}): implement check. LAWS.md: ${niceName}");
}
`;
}

function registrySnippet(entry: Entry): string {
  const namespaceSegments = entry.registryPath.split(".");
  const leaf = namespaceSegments.pop();
  if (!leaf) throw new Error(`Invalid registry path: ${entry.registryPath}`);
  const witnessName = entry.witnessBuilder ? entry.witnessBuilder.split(".").pop() : "witness";
  const checkName = entry.checkFn ? entry.checkFn.split(".").pop() : "check";
  const importPath = ["./oracles", ...namespaceSegments, leaf].filter(Boolean).join("/");
  const head = namespaceSegments.join(".");
  const headPrefix = head ? `${head}: {` : "";
  const headSuffix = head ? "}" : "";
  const indent = head ? "    " : "  ";

  return `// In markov-oracles.ts:
// import { ${witnessName}, ${checkName} } from "${importPath}";
//
// export const MarkovOracles = {
//   ...,
//   ${headPrefix}
//${indent}    ${leaf}: {
//${indent}      witness: ${witnessName},
//${indent}      check: ${checkName},
//${indent}    },
//   ${headSuffix}
// };`;
}

function main(): void {
  if (!fs.existsSync(LAWS)) {
    console.error(`LAWS.md not found at ${LAWS}`);
    process.exit(1);
  }

  const entries = parseEntries(read(LAWS));
  if (entries.length === 0) {
    console.error("No registry paths found in LAWS.md (look for lines like `Registry Path: zeroOne.borel`).");
    process.exit(1);
  }

  ensureDir(OUT_ROOT);

  const created: string[] = [];
  const skipped: string[] = [];
  const snippets: string[] = [];

  for (const entry of entries) {
    const { dir, full } = toFilePathFromRegistry(entry.registryPath);
    ensureDir(dir);
    if (existsFile(full)) {
      skipped.push(`${entry.registryPath} -> ${path.relative(ROOT, full)}`);
    } else {
      if (!DRY) fs.writeFileSync(full, stubContent(entry), "utf-8");
      created.push(`${entry.registryPath} -> ${path.relative(ROOT, full)}${DRY ? " (dry)" : ""}`);
    }
    snippets.push(registrySnippet(entry));
  }

  console.log("\n== Oracle entries discovered from LAWS.md ==");
  for (const entry of entries) {
    console.log(`- ${entry.title}  [${entry.registryPath}]`);
  }

  console.log("\n== Stub files ==");
  if (created.length === 0) {
    console.log("  (none created)");
  } else {
    created.forEach((info) => console.log(`  + ${info}`));
  }
  if (skipped.length > 0) {
    skipped.forEach((info) => console.log(`  = ${info}`));
  }

  console.log("\n== Registry snippets (paste into markov-oracles.ts) ==");
  console.log(snippets.join("\n\n"));

  console.log("\nDone." + (DRY ? " (dry run)" : ""));
}

main();
