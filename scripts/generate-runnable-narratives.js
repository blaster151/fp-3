const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outlinePath = path.join(root, "runnable-examples-outline.md");
const runnableDir = path.join(root, "examples", "runnable");

const outlineText = fs.readFileSync(outlinePath, "utf8");
const lines = outlineText.split(/\r?\n/);

/**
 * Entries 1-5 already have bespoke implementations.
 * We record their module exports to keep the generated catalogue in order.
 */
const manualEntries = new Map([
  [1, { importPath: "./001-option-result-basics", exportName: "optionResultBasics" }],
  [2, { importPath: "./002-result-do-notation", exportName: "resultDoNotation" }],
  [3, { importPath: "./003-effect-composition", exportName: "effectCompositionPatterns" }],
  [4, { importPath: "./004-reader-task-option", exportName: "readerTaskOptionAndRwst" }],
  [5, { importPath: "./005-partition-and-sequence", exportName: "partitionAndSequenceContainers" }],
]);

function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function toIdentifier(prefix, title) {
  const segments = title
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));
  const base = segments.join("") || "Example";
  return `${prefix}${base}`;
}

const parsedEntries = [];

for (const line of lines) {
  const match = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*(?:–\s+)?(.+)?$/);
  if (!match) {
    continue;
  }
  const number = Number(match[1]);
  const title = match[2].trim();
  const rest = (match[3] || "").trim();
  if (!rest) {
    parsedEntries.push({ number, title, summary: "", references: undefined });
    continue;
  }

  const lastOpen = rest.lastIndexOf("(");
  const lastClose = rest.lastIndexOf(")");
  let summary = rest;
  let references;
  if (lastOpen !== -1 && lastClose !== -1 && lastClose === rest.length - 1 && lastOpen < lastClose) {
    summary = rest.slice(0, lastOpen).trim();
    references = rest.slice(lastOpen + 1, lastClose).trim();
  }
  summary = summary.replace(/\.$/, "").trim();
  parsedEntries.push({ number, title, summary, references });
}

const generatedEntries = parsedEntries.filter((entry) => entry.number >= 6 && entry.number <= 71);

if (generatedEntries.length === 0) {
  throw new Error("No entries detected for generation.");
}

const narrativeHelperPath = path.join(runnableDir, "narrative.ts");
if (!fs.existsSync(narrativeHelperPath)) {
  throw new Error("Expected helper narrative.ts to exist before generation.");
}

const catalogueEntries = [];

for (const entry of parsedEntries) {
  if (manualEntries.has(entry.number)) {
    catalogueEntries.push({
      number: entry.number,
      importPath: manualEntries.get(entry.number).importPath,
      exportName: manualEntries.get(entry.number).exportName,
    });
    continue;
  }

  if (entry.number < 6 || entry.number > 71) {
    continue;
  }

  const slug = toSlug(entry.title);
  const padded = entry.number.toString().padStart(3, "0");
  const fileName = `${padded}-${slug}.ts`;
  const filePath = path.join(runnableDir, fileName);
  const exportName = toIdentifier(`stage${padded}`, entry.title);

  const highlightCandidates = entry.summary
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const highlightSource = highlightCandidates
    .map((text) => `    "${text.replace(/"/g, '\\"')}"`)
    .join(",\n");

  const moduleSource = `import { makeNarrativeExample } from "./narrative";\n\nexport const ${exportName} = makeNarrativeExample({\n  id: "${padded}",\n  title: "${entry.title.replace(/"/g, '\\"')}",\n  outlineReference: ${entry.number},\n  summary: "${entry.summary.replace(/"/g, '\\"')}",\n  references: ${entry.references ? `"${entry.references.replace(/"/g, '\\"')}"` : "undefined"},\n  highlights: [\n${highlightSource}\n  ],\n});\n`;

  fs.writeFileSync(filePath, moduleSource);

  catalogueEntries.push({
    number: entry.number,
    importPath: `./${padded}-${slug}`,
    exportName,
  });
}

catalogueEntries.sort((a, b) => a.number - b.number);

const catalogueImports = catalogueEntries
  .map((entry) => `import { ${entry.exportName} } from "${entry.importPath}";`)
  .join("\n");

const catalogueList = catalogueEntries
  .map((entry) => `  ${entry.exportName},`)
  .join("\n");

const catalogueSource = `import { RunnableRegistry } from "./types";\n${catalogueImports}\n\nexport const registry: RunnableRegistry = [\n${catalogueList}\n];\n`;

fs.writeFileSync(path.join(runnableDir, "catalogue.ts"), catalogueSource);

typecheckGeneration(catalogueEntries);

function typecheckGeneration(entries) {
  const expectedCount = parsedEntries.filter((entry) => entry.number <= 71).length;
  if (entries.length !== expectedCount) {
    throw new Error(`Catalogue entries (${entries.length}) do not match outline count (${expectedCount}).`);
  }
}

