// Defer heavy imports until after CLI parsing for faster startup
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
type ManifestModule = typeof import("./examples/runnable/manifest");
let manifestPromise: Promise<ManifestModule> | null = null;
const loadManifest = (): Promise<ManifestModule> => {
  if (!manifestPromise) {
    console.log("Loading runnable examples manifest...");
    manifestPromise = import("./examples/runnable/manifest").then((m) => {
      console.log("Manifest module imported.");
      return m;
    });
  }
  return manifestPromise;
};
import type {
  RunnableExample,
  RunnableExampleContext,
  RunnableExampleFlag,
  RunnableRegistry,
} from "./examples/runnable/types";

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
  const exampleFlagEntries: RunnableExampleFlag[] = [];

  let listRequested = false;

  const captureExampleFlag = (key: string | undefined, value?: string) => {
    if (!key) {
      console.warn("Ignoring example flag without a key.");
      return;
    }
    const trimmed = key.trim();
    if (trimmed.length === 0) {
      console.warn("Ignoring example flag with an empty key.");
      return;
    }
    if (value === undefined) {
      exampleFlagEntries.push({ key: trimmed });
    } else {
      exampleFlagEntries.push({ key: trimmed, value });
    }
  };

  const parseKeyValueToken = (token: string): [string, string | undefined] => {
    const eqIndex = token.indexOf("=");
    if (eqIndex === -1) {
      return [token, undefined];
    }
    return [token.slice(0, eqIndex), token.slice(eqIndex + 1)];
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }
    if (token === "--example-arg") {
      const value = argv[index + 1];
      if (value && !value.startsWith("--")) {
        const [key, parsedValue] = parseKeyValueToken(value);
        captureExampleFlag(key, parsedValue);
        index += 1;
      } else {
        console.warn("Ignoring --example-arg flag without a key/value payload.");
      }
      continue;
    }
    if (token.startsWith("--example-arg=")) {
      const raw = token.slice("--example-arg=".length);
      if (raw.length === 0) {
        console.warn("Ignoring --example-arg= flag without a key/value payload.");
      } else {
        const [key, parsedValue] = parseKeyValueToken(raw);
        captureExampleFlag(key, parsedValue);
      }
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
      const trimmed = token.slice(2);
      if (trimmed.length === 0) {
        console.warn("Ignoring malformed flag '--'.");
        continue;
      }
      if (trimmed.includes("=")) {
        const [key, parsedValue] = parseKeyValueToken(trimmed);
        captureExampleFlag(key, parsedValue);
      } else {
        const value = argv[index + 1];
        if (value && !value.startsWith("--")) {
          captureExampleFlag(trimmed, value);
          index += 1;
        } else {
          captureExampleFlag(trimmed);
        }
      }
      continue;
    }
    requestedIds.push(token);
  }

  const cachePath = resolve("dist/.cache/runnable-index.json");

  const buildRunnableExampleContext = (
    entries: ReadonlyArray<RunnableExampleFlag>,
  ): RunnableExampleContext => {
    const flags = new Map<string, string[]>();
    for (const entry of entries) {
      const key = entry.key.trim().toLowerCase();
      if (key.length === 0) {
        continue;
      }
      const bucket = flags.get(key) ?? [];
      bucket.push(entry.value ?? "true");
      flags.set(key, bucket);
    }
    return { rawFlags: entries, flags };
  };

  const runnableContext = buildRunnableExampleContext(exampleFlagEntries);

  // Fast path: if specific ids were requested and no tag filtering/listing is needed,
  // try to import only those example modules directly to avoid pulling the whole manifest graph.
  if (!listRequested && requestedIds.length > 0 && requestedTags.length === 0) {
    try {
      console.log("Fast path: attempting direct example imports for ids:", requestedIds.join(", "));
      const dir = resolve("examples/runnable");
      const fsModule = (await import("node:fs")) as unknown as {
        readdirSync: (path: string) => string[];
      };
      const files = fsModule.readdirSync(dir);
      const loaded: Array<Promise<RunnableExample | undefined>> = [];
      for (const id of requestedIds) {
        const match = files.find(
          (f: string) =>
            f.startsWith(`${id}-`) &&
            (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js") || f.endsWith(".mjs")),
        );
        if (!match) {
          console.warn(`Fast path: no file matching pattern '${id}-*.ts' found; falling back to manifest later.`);
          continue;
        }
        const modulePath = `./examples/runnable/${match.replace(/\.(ts|tsx|js|mjs)$/i, "")}`;
        console.log(`Fast path: importing ${modulePath} ...`);
        const p = import(modulePath).then((mod) => {
          for (const key of Object.keys(mod)) {
            const candidate = (mod as any)[key];
            if (
              candidate &&
              typeof candidate === "object" &&
              typeof candidate.id === "string" &&
              typeof candidate.title === "string" &&
              typeof candidate.run === "function" &&
              candidate.id === id
            ) {
              console.log(`Fast path: matched export '${key}' for id=${id}.`);
              return candidate as import("./examples/runnable/types").RunnableExample;
            }
          }
          console.warn(`Fast path: no matching export with id=${id} in module ${modulePath}.`);
          return undefined;
        });
        loaded.push(p);
      }

      const resolved = (await Promise.all(loaded)).filter(
        (ex): ex is RunnableExample => ex !== undefined,
      );

      if (resolved.length > 0) {
        console.log(`Fast path: executing ${resolved.length} example(s) without loading manifest.`);
        const candidates: RunnableRegistry = resolved;
        const totalTargets = candidates.length;
        const indexWidth = totalTargets.toString().length;
        for (const [index, example] of candidates.entries()) {
          const ordinal = (index + 1).toString().padStart(indexWidth, "0");
          console.log(`[${ordinal}/${totalTargets}] ${example.id} – ${example.title}`);
          console.log(`\n=== [${example.id}] ${example.title} ===`);
          console.log(example.summary);
          try {
            console.log(`About to run example id=${example.id}...`);
            const outcome = await example.run(runnableContext);
            console.log(`Example id=${example.id} completed. Log lines=${outcome.logs.length}.`);
            for (const line of outcome.logs) {
              console.log(` • ${line}`);
            }
          } catch (error) {
            console.error(error);
            process.exitCode = 1;
          }
        }
        return; // done
      }
      console.log("Fast path: no examples resolved; falling back to manifest.");
    } catch (error) {
      console.warn("Fast path: direct import failed; falling back to manifest.");
      console.warn(String(error));
    }
  }
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
  console.log(`Manifest loaded. Registry size=${runnableExamples.length}.`);

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

  console.log(`Initial candidate count=${candidates.length}. Applying tag filters: ${JSON.stringify(requestedTags)}.`);
  candidates = filterRunnableExamplesByTags(candidates, requestedTags);
  console.log(`Post-filter candidate count=${candidates.length}.`);

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
      console.log(`About to run example id=${example.id}...`);
      const outcome = await example.run(runnableContext);
      console.log(`Example id=${example.id} completed. Log lines=${outcome.logs.length}.`);
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
