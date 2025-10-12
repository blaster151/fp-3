import { describeCatalogue, findRunnableExample, runnableExamples } from "./examples/runnable/manifest";

declare const process: {
  readonly argv: ReadonlyArray<string>;
  readonly env: Record<string, string | undefined>;
  exitCode?: number;
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("--list")) {
    console.log(describeCatalogue());
    return;
  }

  const requestedIds = argv.filter((value) => !value.startsWith("--"));
  const targets = requestedIds.length > 0 ? requestedIds : runnableExamples.map((example) => example.id);

  for (const id of targets) {
    const example = findRunnableExample(id);
    if (!example) {
      console.warn(`Unknown runnable example id '${id}'.`);
      continue;
    }

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
