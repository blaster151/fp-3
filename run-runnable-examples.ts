// Defer heavy imports until after CLI parsing for faster startup
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
type ManifestModule = typeof import("./examples/runnable/manifest");
let manifestPromise: Promise<ManifestModule> | null = null;
const loadManifest = (): Promise<ManifestModule> => {
  if (!manifestPromise) {
  console.log("Loading runnable examples manifest...");
  manifestPromise = import("./examples/runnable/manifest");
  }
  return manifestPromise;
};
import type { RunnableRegistry } from "./examples/runnable/types";

declare const process: {
  readonly argv: ReadonlyArray<string>;
  readonly env: Record<string, string | undefined>;
  exitCode?: number;
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  console.log("=== Runnable Examples Runner ===");

  const requestedTags: string[] = [];
  const requestedIds: string[] = [];

  let listRequested = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }
    if (token === "--list") {
      listRequested = true;
      continue;
    }
    if (token === "--tag") {
      const value = argv[index + 1];
      if (value && !value.startsWith("--")) {
        requestedTags.push(value);
        index += 1;
      } else {
        console.warn("Ignoring --tag flag without a value.");
      }
      continue;
    }
    if (token.startsWith("--tag=")) {
      const [, raw] = token.split("=", 2);
      if (raw) {
        requestedTags.push(raw);
      }
      continue;
    }
    if (token.startsWith("--")) {
      console.warn(`Ignoring unknown flag '${token}'.`);
      continue;
    }
    requestedIds.push(token);
  }

  const cachePath = resolve("dist/.cache/runnable-index.json");
  if (listRequested) {
    // Try fast path: list from cache without importing all examples
    if (existsSync(cachePath)) {
      try {
        const raw = readFileSync(cachePath, "utf8");
        const items: Array<{ id: string; title: string; outlineReference: number; tags?: readonly string[] }>
          = JSON.parse(raw);
        const normalizeTag = (v: string) => v.trim().toLowerCase();
        const filtered = (requestedTags.length === 0)
          ? items
          : items.filter((ex) => {
              if (!ex.tags || ex.tags.length === 0) return false;
              const tags = ex.tags.map(normalizeTag);
              return requestedTags.every((t) => tags.includes(normalizeTag(t)));
            });
        const header = "ID  Outline  Title";
        const separator = "--  -------  -----";
        if (filtered.length === 0) {
          console.log(`${header}\n${separator}\n<no matching runnable examples>`);
          return;
        }
        const body = filtered
          .map((ex) => [ex.id.padStart(3, "0"), ex.outlineReference.toString().padStart(7, " "), ex.title].join("  "))
          .join("\n");
        console.log(`${header}\n${separator}\n${body}`);
        return;
      } catch {
        // fall through to slow path if cache is unreadable
      }
    }
  }

  const { describeCatalogue, filterRunnableExamplesByTags, findRunnableExample, runnableExamples } = await loadManifest();

  if (listRequested) {
    // Populate cache for future fast listings
    try {
      const items = runnableExamples.map((ex) => ({
        id: ex.id,
        title: ex.title,
        outlineReference: ex.outlineReference,
        tags: ex.tags,
      }));
      const dir = dirname(cachePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(cachePath, JSON.stringify(items, null, 2), "utf8");
    } catch {
      // ignore cache write errors
    }
    console.log(describeCatalogue({ tags: requestedTags }));
    return;
  }

  let candidates: RunnableRegistry = requestedIds.length > 0
    ? requestedIds
        .map((id) => {
          const example = findRunnableExample(id);
          if (!example) {
            console.warn(`Unknown runnable example id '${id}'.`);
          }
          return example;
        })
        .filter((example): example is NonNullable<typeof example> => example !== undefined)
    : runnableExamples;

  candidates = filterRunnableExamplesByTags(candidates, requestedTags);

  if (candidates.length === 0) {
    console.warn("No runnable examples matched the supplied filters.");
    return;
  }
  const totalTargets = candidates.length;
  const indexWidth = totalTargets.toString().length;

  for (const [index, example] of candidates.entries()) {
    const ordinal = (index + 1).toString().padStart(indexWidth, "0");
    console.log(`[${ordinal}/${totalTargets}] ${example.id} – ${example.title}`);
    console.log(`\n=== [${example.id}] ${example.title} ===`);
    console.log(example.summary);
    try {
      const outcome = await example.run();
      for (const line of outcome.logs) {
        console.log(` • ${line}`);
      }
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
