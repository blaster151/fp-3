import type { RunnableExample, RunnableRegistry } from "./types";
import { registry as generatedRegistry } from "./catalogue";

const registry: RunnableRegistry = [...generatedRegistry];

const sortedRegistry = [...registry];
sortedRegistry.sort((a, b) => a.id.localeCompare(b.id));

for (let index = 0; index < sortedRegistry.length; index += 1) {
  const expected = sortedRegistry[index];
  const actual = registry[index];
  if (expected !== actual) {
    throw new Error(
      "Runnable registry entries must be defined in ascending identifier order",
    );
  }
}

const normalizeTag = (value: string): string => value.trim().toLowerCase();

const matchesTags = (example: RunnableExample, tags: ReadonlyArray<string>): boolean => {
  if (tags.length === 0) {
    return true;
  }
  if (!example.tags || example.tags.length === 0) {
    return false;
  }
  const exampleTags = example.tags.map(normalizeTag);
  return tags.every((tag) => exampleTags.includes(normalizeTag(tag)));
};

export const runnableExamples: RunnableRegistry = registry;

export function findRunnableExample(id: string): RunnableExample | undefined {
  return registry.find((example) => example.id === id);
}

export function filterRunnableExamplesByTags(
  input: RunnableRegistry,
  tags: ReadonlyArray<string>,
): RunnableRegistry {
  if (tags.length === 0) {
    return input;
  }
  const normalized = tags
    .map(normalizeTag)
    .filter((tag) => tag.length > 0);
  if (normalized.length === 0) {
    return input;
  }
  return input.filter((example) => matchesTags(example, normalized));
}

export function describeCatalogue(options?: { readonly tags?: ReadonlyArray<string> }): string {
  const header = "ID  Outline  Title";
  const separator = "--  -------  -----";
  const filtered = filterRunnableExamplesByTags(registry, options?.tags ?? []);
  if (filtered.length === 0) {
    return `${header}\n${separator}\n<no matching runnable examples>`;
  }
  const body = filtered
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
