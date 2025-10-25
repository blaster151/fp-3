#!/usr/bin/env ts-node

/**
 * Scans LAWS.md for `Registry Path:` lines and ensures matching stubs exist.
 * It will:
 *  - Parse entries: title, registryPath, witnessBuilder?, checkFn?
 *  - Create a stub file under oracles/<registryPath>.ts if missing
 *  - Print a registry snippet to paste into markov-oracles.ts (no auto-edit)
 *
 * Usage:
 *   ts-node scripts/gen-oracle-stubs.ts
 *   ts-node scripts/gen-oracle-stubs.ts --dry
 *   ts-node scripts/gen-oracle-stubs.ts --refresh
 */

import * as fs from "node:fs";
import * as path from "node:path";

type Entry = {
  readonly title: string;
  readonly registryPath: string;
  readonly witnessBuilder?: string | undefined;
  readonly checkFn?: string | undefined;
};

type CliArgs = {
  readonly dryRun: boolean;
  readonly refresh: boolean;
  readonly rootDir: string;
};

type GenerationReport = {
  readonly created: readonly string[];
  readonly updated: readonly string[];
  readonly skipped: readonly string[];
  readonly snippets: readonly string[];
  readonly entries: readonly Entry[];
};

const DEFAULT_OUT_DIRS = ["oracles", path.join("src", "oracles")] as const;

const read = (file: string): string => fs.readFileSync(file, "utf-8");

const ensureDir = (dir: string): void => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const toFilePathFromRegistry = (
  outRoot: string,
  registryPath: string,
): { dir: string; file: string; full: string } => {
  const parts = registryPath.split(".");
  const file = parts.pop();
  if (!file) throw new Error(`Invalid registry path: ${registryPath}`);
  const dir = path.join(outRoot, ...parts);
  return { dir, file, full: path.join(dir, `${file}.ts`) };
};

const parseEntries = (lawsText: string): Entry[] => {
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
};

const existsFile = (filePath: string): boolean => {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const GENERATED_STUB_HEADER = "// AUTO-GENERATED STUB for";

const stubContent = (entry: Entry): string => {
  const { registryPath } = entry;
  const exportedWitness = entry.witnessBuilder
    ? entry.witnessBuilder.split(".").pop()
    : "witness";
  const exportedCheck = entry.checkFn
    ? entry.checkFn.split(".").pop()
    : "check";
  const niceName = entry.title.replace(/`/g, "");
  const detailLiteral = JSON.stringify(
    `LAWS.md entry "${niceName}" is pending: implement ${registryPath}.`,
  );

  return `${GENERATED_STUB_HEADER} ${niceName}
// Registry Path: ${registryPath}
// This stub exists because LAWS.md documents this oracle but no implementation was found.
// Replace the pending placeholder with real logic, then wire the implementation into markov-oracles.ts under "${registryPath}".

const REGISTRY_PATH = "${registryPath}" as const;

type PendingOracleResult = {
  readonly holds: false;
  readonly pending: true;
  readonly registryPath: typeof REGISTRY_PATH;
  readonly details: string;
};

const pendingResult: PendingOracleResult = {
  holds: false,
  pending: true,
  registryPath: REGISTRY_PATH,
  details: ${detailLiteral},
};

export function ${exportedWitness}(...args: unknown[]): never {
  void args;
  return pendingResult as never;
}

export function ${exportedCheck}(...args: unknown[]): never {
  void args;
  return pendingResult as never;
}
`;
};

const registrySnippet = (entry: Entry, relativeImportPath: string): string => {
  const namespaceSegments = entry.registryPath.split(".");
  const leaf = namespaceSegments.pop();
  if (!leaf) throw new Error(`Invalid registry path: ${entry.registryPath}`);
  const witnessName = entry.witnessBuilder ? entry.witnessBuilder.split(".").pop() : "witness";
  const checkName = entry.checkFn ? entry.checkFn.split(".").pop() : "check";
  const normalizedImportPath = relativeImportPath.startsWith(".")
    ? relativeImportPath
    : `./${relativeImportPath}`;
  const head = namespaceSegments.join(".");
  const headPrefix = head ? `${head}: {` : "";
  const headSuffix = head ? "}" : "";
  const indent = head ? "    " : "  ";

  return `// In markov-oracles.ts:
// import { ${witnessName}, ${checkName} } from "${normalizedImportPath}";
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
};

const determineOutRoot = (rootDir: string): string => {
  for (const candidate of DEFAULT_OUT_DIRS) {
    const full = path.join(rootDir, candidate);
    if (fs.existsSync(full)) return full;
  }
  return path.join(rootDir, DEFAULT_OUT_DIRS[0]);
};

const isGeneratedStub = (contents: string): boolean => contents.startsWith(GENERATED_STUB_HEADER);

const parseCliArgs = (argv: readonly string[]): CliArgs => {
  const dryRun = argv.includes("--dry");
  const refresh = argv.includes("--refresh") || argv.includes("--force");
  return { dryRun, refresh, rootDir: process.cwd() };
};

export const run = ({ dryRun, refresh, rootDir }: CliArgs): GenerationReport => {
  const lawsPath = path.join(rootDir, "LAWS.md");
  if (!fs.existsSync(lawsPath)) {
    throw new Error(`LAWS.md not found at ${lawsPath}`);
  }

  const entries = parseEntries(read(lawsPath));
  if (entries.length === 0) {
    throw new Error(
      "No registry paths found in LAWS.md (look for lines like `Registry Path: zeroOne.borel`).",
    );
  }

  const outRoot = determineOutRoot(rootDir);
  ensureDir(outRoot);

  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const snippets: string[] = [];

  for (const entry of entries) {
    const { dir, full } = toFilePathFromRegistry(outRoot, entry.registryPath);
    ensureDir(dir);
    const relativePath = path.relative(rootDir, full);
    const relativeImport = path.relative(rootDir, full).replace(/\\/g, "/").replace(/\.ts$/, "");
    snippets.push(registrySnippet(entry, relativeImport));

    if (existsFile(full)) {
      const current = read(full);
      if (refresh && isGeneratedStub(current)) {
        if (!dryRun) fs.writeFileSync(full, stubContent(entry), "utf-8");
        updated.push(`${entry.registryPath} -> ${relativePath}${dryRun ? " (dry)" : ""}`);
      } else {
        skipped.push(`${entry.registryPath} -> ${relativePath}`);
      }
    } else {
      if (!dryRun) fs.writeFileSync(full, stubContent(entry), "utf-8");
      created.push(`${entry.registryPath} -> ${relativePath}${dryRun ? " (dry)" : ""}`);
    }
  }

  return { created, updated, skipped, snippets, entries };
};

const logReport = (report: GenerationReport, dryRun: boolean): void => {
  const { entries, created, updated, skipped, snippets } = report;

  console.log("\n== Oracle entries discovered from LAWS.md ==");
  for (const entry of entries) {
    console.log(`- ${entry.title}  [${entry.registryPath}]`);
  }

  console.log("\n== Stub files ==");
  if (created.length === 0 && updated.length === 0) {
    console.log("  (none created or refreshed)");
  } else {
    created.forEach((info) => console.log(`  + ${info}`));
    updated.forEach((info) => console.log(`  ~ ${info}`));
  }
  if (skipped.length > 0) {
    skipped.forEach((info) => console.log(`  = ${info}`));
  }

  console.log("\n== Registry snippets (paste into markov-oracles.ts) ==");
  console.log(snippets.join("\n\n"));

  console.log("\nDone." + (dryRun ? " (dry run)" : ""));
};

const main = (argv: readonly string[]): void => {
  const args = parseCliArgs(argv);
  const report = run(args);
  logReport(report, args.dryRun);
};

if (require.main === module) {
  main(process.argv.slice(2));
}
