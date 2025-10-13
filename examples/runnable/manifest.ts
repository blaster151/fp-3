import type { RunnableExample, RunnableRegistry } from "./types";
import { registry as generatedRegistry } from "./catalogue";

const registry: RunnableRegistry = [...generatedRegistry];

const sortedRegistry = [...registry].sort((a, b) => a.id.localeCompare(b.id));

for (let index = 0; index < sortedRegistry.length; index += 1) {
  const expected = sortedRegistry[index];
  const actual = registry[index];
  if (expected !== actual) {
    throw new Error(
      "Runnable registry entries must be defined in ascending identifier order",
    );
  }
}

export const runnableExamples: RunnableRegistry = registry;

export function findRunnableExample(id: string): RunnableExample | undefined {
  return registry.find((example) => example.id === id);
}

export function describeCatalogue(): string {
  const header = "ID  Outline  Title";
  const separator = "--  -------  -----";
  const body = registry
    .map((example) =>
      [
        example.id.padStart(3, "0"),
        example.outlineReference.toString().padStart(7, " "),
        example.title,
      ].join("  "),
    )
    .join("\n");
  return `${header}\n${separator}\n${body}`;
}
