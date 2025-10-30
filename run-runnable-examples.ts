import {
  describeCatalogue,
  filterRunnableExamplesByTags,
  findRunnableExample,
  runnableExamples,
} from "./examples/runnable/manifest";
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

  if (listRequested) {
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
