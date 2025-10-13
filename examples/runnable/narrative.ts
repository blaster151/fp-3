import type { RunnableExample } from "./types";

type NarrativeConfig = {
  readonly id: string;
  readonly title: string;
  readonly outlineReference: number;
  readonly summary: string;
  readonly references?: string;
  readonly highlights?: ReadonlyArray<string>;
};

/**
 * Helper used by the narrative placeholder examples so that the catalogue can
 * provide context even before a full runnable rebuild is in place.
 */
export function makeNarrativeExample(config: NarrativeConfig): RunnableExample {
  const { id, title, outlineReference, summary, references, highlights } = config;
  const bulletLines = (highlights && highlights.length > 0 ? highlights : [summary])
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    id,
    title,
    outlineReference,
    summary,
    async run() {
      const logs: string[] = [`Stage ${id} — ${title}`];

      for (const entry of bulletLines) {
        logs.push(`• ${entry}`);
      }

      if (references && references.length > 0) {
        logs.push(`Referenced sources: ${references}`);
      } else {
        logs.push("Referenced sources: outline only");
      }

      logs.push("Status: Narrative preview awaiting executable rebuild.");

      return { logs };
    },
  };
}
