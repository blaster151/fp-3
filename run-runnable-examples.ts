import { describeCatalogue, findRunnableExample, runnableExamples } from "./examples/runnable/manifest";

declare const process: {
  readonly argv: ReadonlyArray<string>;
  readonly env: Record<string, string | undefined>;
  exitCode?: number;
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  console.log("=== Runnable Examples Runner ===");

  if (argv.includes("--list")) {
    console.log(describeCatalogue());
    return;
  }

  const requestedIds = argv.filter((value) => !value.startsWith("--"));
  const targets = requestedIds.length > 0 ? requestedIds : runnableExamples.map((example) => example.id);

  const totalTargets = targets.length;
  const indexWidth = totalTargets.toString().length;

  for (const [index, id] of targets.entries()) {
    const example = findRunnableExample(id);
    if (!example) {
      console.warn(`Unknown runnable example id '${id}'.`);
      continue;
    }

    const ordinal = (index + 1).toString().padStart(indexWidth, "0");
    console.log(`[${ordinal}/${totalTargets}] ${example.id} – ${example.title}`);
    console.log(`\n=== [${example.id}] ${example.title} ===`);
    console.log(example.summary);
    const outcome = await example.run();
    for (const line of outcome.logs) {
      console.log(` • ${line}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
