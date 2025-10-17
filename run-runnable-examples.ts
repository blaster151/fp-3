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
  let stepMode = false;
  let oneMode = false;

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
    if (token === "--step") {
      stepMode = true;
      continue;
    }
    if (token === "--one") {
      oneMode = true;
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
    const startTs = new Date().toISOString();
    console.log(`Starting example ${example.id} (${ordinal}/${totalTargets}) at ${startTs}...`);
    try {
      const outcome = await example.run();
      const endTs = new Date().toISOString();
      console.log(`Finished example ${example.id} at ${endTs}`);
      console.log(`Duration: ${new Date(endTs).getTime() - new Date(startTs).getTime()} ms`);
      if (stepMode) {
        console.log("Step mode: press Enter to continue to next example or Ctrl+C to abort...");
        // wait for Enter on stdin
        await new Promise<void>((resolve) => {
          const nodeProcess = (globalThis as any).process as NodeJS.Process;
          const stdin = nodeProcess.stdin;
          stdin.resume();
          stdin.once("data", () => {
            stdin.pause();
            resolve();
          });
        });
      }
      if (oneMode) {
        console.log("One-mode enabled: stopping after first example.");
        break;
      }
      if (!outcome) {
        console.warn(`Example ${example.id} completed with no outcome object.`);
      } else {
        if (Array.isArray(outcome.logs) && outcome.logs.length > 0) {
          for (const line of outcome.logs) {
            console.log(` • ${line}`);
          }
        }
        // RunnableOutcome currently exposes `logs` and optional `metadata`.
        // Print any metadata as a JSON blob instead of accessing a non-existent
        // `summary` property.
        if (outcome.metadata && Object.keys(outcome.metadata).length > 0) {
          try {
            console.log(`Result metadata: ${JSON.stringify(outcome.metadata)}`);
          } catch (_) {
            console.log("Result metadata: <unserializable>");
          }
        }
      }
      console.log(`Finished example ${example.id}.`);
    } catch (error) {
      console.error(`Example ${example.id} failed:`);
      console.error(error);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
