export interface RunnableOutcome {
  readonly logs: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface RunnableExample {
  readonly id: string;
  readonly title: string;
  readonly outlineReference: number;
  readonly summary: string;
  readonly tags?: readonly string[];
  run(): Promise<RunnableOutcome>;
}

export type RunnableRegistry = ReadonlyArray<RunnableExample>;
