export interface RunnableOutcome {
  readonly logs: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface RunnableExampleFlag {
  readonly key: string;
  readonly value?: string;
}

export interface RunnableExampleContext {
  readonly rawFlags: ReadonlyArray<RunnableExampleFlag>;
  readonly flags: ReadonlyMap<string, ReadonlyArray<string>>;
}

export interface RunnableExample {
  readonly id: string;
  readonly title: string;
  readonly outlineReference: number;
  readonly summary: string;
  readonly tags?: readonly string[];
  run(context?: RunnableExampleContext): Promise<RunnableOutcome>;
}

export type RunnableRegistry = ReadonlyArray<RunnableExample>;

const normalizeKey = (key: string): string => key.trim().toLowerCase();

export const getRunnableFlagValues = (
  context: RunnableExampleContext | undefined,
  key: string,
): ReadonlyArray<string> => {
  if (!context) {
    return [];
  }
  const normalized = normalizeKey(key);
  return context.flags.get(normalized) ?? [];
};

export const getRunnableFlag = (
  context: RunnableExampleContext | undefined,
  key: string,
): string | undefined => getRunnableFlagValues(context, key)[0];

export const createRunnableExampleContext = (
  entries: ReadonlyArray<RunnableExampleFlag>,
): RunnableExampleContext => {
  const flags = new Map<string, string[]>();
  for (const entry of entries) {
    const key = normalizeKey(entry.key);
    if (key.length === 0) {
      continue;
    }
    const bucket = flags.get(key) ?? [];
    bucket.push(entry.value ?? "true");
    flags.set(key, bucket);
  }
  return { rawFlags: entries, flags };
};
