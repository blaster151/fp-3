import * as fs from "fs";
import * as path from "path";
import type { RunnableRegistry, RunnableExample } from "./examples/runnable/types";

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
  let timeoutMs: number | undefined = undefined;
  let childRun = false;

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
    if (token.startsWith("--timeout=")) {
      const [, raw] = token.split("=", 2);
      if (raw) {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) {
          timeoutMs = parsed;
        }
      }
      continue;
    }
    if (token === "--child-run") {
      childRun = true;
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
    // Allow commas in a single token to specify multiple example ids: "001,003,043"
    const parts = token.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    for (const part of parts) {
      requestedIds.push(part);
    }
  }

  const examplesDir = path.join(__dirname, "examples", "runnable");

  if (listRequested && requestedIds.length === 0) {
    // Lightweight listing that avoids importing example modules.
  const files = fs.readdirSync(examplesDir).filter((f: string) => f.endsWith(".ts") || f.endsWith(".js"));
    const rows: string[] = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(examplesDir, file), "utf8");
        const idMatch = content.match(/id:\s*"(\d{3})"/);
        const titleMatch = content.match(/title:\s*"([^"]+)"/);
        const id = idMatch ? idMatch[1] : "???";
        const title = titleMatch ? titleMatch[1] : file;
        rows.push(`${id}  ${file}  ${title}`);
      } catch {
        // ignore
      }
    }
    if (rows.length === 0) {
      console.log("<no runnable example files found>");
    } else {
      console.log(rows.join("\n"));
    }
    return;
  }

  let candidates: RunnableRegistry = [];

  const normalizeTag = (value: string): string => value.trim().toLowerCase();
  const matchesTags = (example: any, tags: ReadonlyArray<string>): boolean => {
    if (tags.length === 0) return true;
    if (!example.tags || example.tags.length === 0) return false;
    const exampleTags = example.tags.map(normalizeTag);
    return tags.every((tag) => exampleTags.includes(normalizeTag(tag)));
  };
  const filterByTags = (input: RunnableRegistry, tags: ReadonlyArray<string>): RunnableRegistry =>
    tags.length === 0 ? input : input.filter((ex) => matchesTags(ex, tags));

  if (requestedIds.length > 0) {
    // Dynamically load only the requested example modules to avoid importing the whole catalogue.
    const loaded: RunnableExample[] = [];
    for (const id of requestedIds) {
      const pattern = new RegExp(`^${id}-`);
  const files = fs.readdirSync(examplesDir).filter((f: string) => pattern.test(f));
      if (files.length === 0) {
        console.warn(`Unknown runnable example id '${id}'.`);
        continue;
      }
      const file = files[0]!;
      try {
        const modulePath = path.join(examplesDir, file);
        // Use dynamic import so module top-level code runs inside the child/ts-node environment only when needed.
        // Note: require() with absolute path may load compiled .js; ts-node supports dynamic import with file://
        const imported = await import(modulePath);
        // Find an exported value that looks like a RunnableExample with matching id.
        const exported = Object.values(imported).find((v: any) => v && v.id === id);
        if (exported) {
          loaded.push(exported as RunnableExample);
        } else {
          console.warn(`Module ${file} did not export an example with id ${id}.`);
        }
      } catch (err) {
        console.warn(`Failed to load example module ${file}: ${String(err)}`);
      }
    }
    candidates = loaded;
  } else {
    // No specific ids requested — fall back to loading the generated catalogue (heavy).
    // Import here to keep the common fast-path (single example) light.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const manifest = require("./examples/runnable/manifest");
    const registry: RunnableRegistry = manifest.runnableExamples;
  candidates = filterByTags(registry, requestedTags);
  }

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
      // If we're the parent runner and the user requested running a single
      // example with isolation/timeout, spawn a child process that runs
      // only that example. The child will be invoked with `--child-run`.
      if (!childRun && (oneMode || timeoutMs !== undefined)) {
        const { spawn } = require("child_process");
        const args = [
          "ts-node",
          "--project",
          "tsconfig.runnable-plan.json",
          "run-runnable-examples.ts",
          example.id,
          "--child-run",
        ];
        if (timeoutMs !== undefined) {
          args.push(`--timeout=${timeoutMs}`);
        }
        console.log(`Spawning child to run ${example.id}: npx ${args.join(" ")}`);
        const child = spawn("npx", args, { stdio: "inherit", shell: false });
        let killed = false;
        let timer: NodeJS.Timeout | undefined = undefined;
        if (timeoutMs !== undefined) {
          timer = setTimeout(() => {
            console.log(`Child running ${example.id} exceeded timeout ${timeoutMs} ms — killing.`);
            try {
              child.kill("SIGKILL");
            } catch (_) {
              // ignore
            }
            killed = true;
          }, timeoutMs);
        }
        const exitCode: number | null = await new Promise((resolve) => {
          child.on("exit", (code: number | null) => resolve(code));
        });
        if (timer) clearTimeout(timer);
        if (killed) {
          throw new Error(`Child timed out while running example ${example.id}`);
        }
        if (exitCode !== 0) {
          throw new Error(`Child process exited with code ${String(exitCode)}`);
        }
        // Child ran successfully — treat as finished and continue or stop.
        const endTs = new Date().toISOString();
        console.log(`Child finished example ${example.id} at ${endTs}`);
        console.log(`Duration: ${new Date(endTs).getTime() - new Date(startTs).getTime()} ms`);
        if (oneMode) {
          console.log("One-mode enabled: stopping after first example.");
          break;
        }
        continue;
      }

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
