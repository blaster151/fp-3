import type { RunnableExample } from "./types";

/**
 * Stage 003 focuses on how basic State, Reader, and Task programs compose.  We
 * first demonstrate the individual helpers (tick counters, configuration
 * lookups, and simulated requests) and then build a Reader→Task→State pipeline
 * that threads data across all three layers.
 */

export type State<S, A> = (state: S) => readonly [A, S];
export type Reader<R, A> = (env: R) => A;
export type Task<A> = () => Promise<A>;

/** Sequentially compose two State programs by threading the intermediate state forward. */
function stateChain<S, A, B>(state: State<S, A>, mapper: (value: A) => State<S, B>): State<S, B> {
  return (initial) => {
    const [value, intermediate] = state(initial);
    return mapper(value)(intermediate);
  };
}

/** Compose Reader programs while reusing the same environment for each step. */
function readerChain<R, A, B>(reader: Reader<R, A>, mapper: (value: A) => Reader<R, B>): Reader<R, B> {
  return (env) => mapper(reader(env))(env);
}

/** Await a Task and feed the resolved value to the next asynchronous stage. */
function taskChain<A, B>(task: Task<A>, mapper: (value: A) => Task<B>): Task<B> {
  return async () => mapper(await task())();
}

type Env = {
  readonly serviceBaseUrl: string;
  readonly retries: number;
};

function counterTick(step: number): State<number, number> {
  return (current) => {
    const next = current + step;
    return [next, next];
  };
}

function readConfig(): Reader<Env, string> {
  return (env) => `Base URL: ${env.serviceBaseUrl}, retries: ${env.retries}`;
}

function simulatedRequest(path: string): Task<string> {
  return async () => `Response from ${path}`;
}

function stateReaderTaskProgram(path: string): Reader<Env, Task<readonly [string, number]>> {
  return readerChain(readConfig(), (configSummary) => () =>
    taskChain(simulatedRequest(path), (response) => async () => {
      const stateProgram = stateChain(counterTick(1), (first) =>
        stateChain(counterTick(2), (second) => (count: number) => [
            `${configSummary} | ${response} | ticks: ${first}, ${second}`,
            count,
          ]),
      );
      return stateProgram(0);
    }),
  );
}

export const effectCompositionPatterns: RunnableExample = {
  id: "003",
  title: "State, Reader, and Task composition patterns",
  outlineReference: 3,
  summary:
    "State ticks, environment-driven readers, async tasks, and a combined Reader→Task→State pipeline that shows how information flows across all three effects.",
  async run() {
    const firstTick = counterTick(1)(0);
    const twoTicks = stateChain(counterTick(1), counterTick)(0);
    const envSummary = readConfig()({ serviceBaseUrl: "https://api.example", retries: 2 });
    const program = stateReaderTaskProgram("/status");
    const task = program({ serviceBaseUrl: "https://api.example", retries: 1 });
    const [message, finalCount] = await task();
    const logs = [
      "== State monad ticks ==",
      `✔ Counter after +1: ${firstTick[0]} (state now ${firstTick[1]})`,
      `✔ Counter after +1 then +current: ${twoTicks[0]} (state now ${twoTicks[1]})`,
      "== Reader configuration lookup ==",
      `✔ ${envSummary}`,
      "== Combined Reader → Task → State pipeline ==",
      `✔ ${message}`,
      `✔ Final counter emitted by State: ${finalCount}`,
    ];

    return { logs };
  },
};
