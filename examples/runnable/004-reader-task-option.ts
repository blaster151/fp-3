import type { RunnableExample } from "./types";
import { Option } from "./structures";

/**
 * Stage 004 demonstrates two generator-friendly effect stacks that lean on a
 * shared environment: ReaderTaskOption for feature-flag driven lookups and a
 * Reader-Writer-State-Task (RWST) composition for deployment bookkeeping.
 */

type ReaderTaskOption<R, A> = (env: R) => Promise<Option<A>>;

type FeatureEnv = {
  readonly featureFlags: Record<string, boolean>;
  readonly userPreferences: Record<string, string>;
};

function readerTaskOptionOf<R, A>(value: A): ReaderTaskOption<R, A> {
  return async () => Option.some(value);
}

function readerTaskOptionNone<R, A>(): ReaderTaskOption<R, A> {
  return async () => Option.none<A>();
}

function readerTaskOptionChain<R, A, B>(
  program: ReaderTaskOption<R, A>,
  mapper: (value: A) => ReaderTaskOption<R, B>,
): ReaderTaskOption<R, B> {
  return async (env) => {
    const current = await program(env);
    if (current.kind === "none") {
      return current;
    }
    return mapper(current.value)(env);
  };
}

function requireFlag(flag: string): ReaderTaskOption<FeatureEnv, boolean> {
  return async (env) => {
    const value = env.featureFlags[flag];
    return value === undefined ? Option.none<boolean>() : Option.some(value);
  };
}

function fetchPreference(username: string): ReaderTaskOption<FeatureEnv, string> {
  return async (env) => {
    const preference = env.userPreferences[username];
    if (!preference) {
      return Option.none<string>();
    }
    const resolved = await Promise.resolve(preference);
    return Option.some(resolved);
  };
}

function readerTaskOptionPipeline(flag: string, username: string): ReaderTaskOption<FeatureEnv, string> {
  return readerTaskOptionChain(requireFlag(flag), (enabled) => {
    if (!enabled) {
      return readerTaskOptionNone<FeatureEnv, string>();
    }
    return readerTaskOptionChain(fetchPreference(username), (preference) =>
      readerTaskOptionOf<FeatureEnv, string>(
        `Render ${username}'s dashboard with ${preference} theme while flag '${flag}' is active.`,
      ),
    );
  });
}

type RWST<R, W, S, A> = (env: R, state: S) => Promise<readonly [A, S, ReadonlyArray<W>]>;

type DeploymentEnv = {
  readonly region: string;
  readonly serviceBaseUrl: string;
};

type DeploymentState = {
  readonly version: number;
};

function rwstOf<R, W, S, A>(value: A): RWST<R, W, S, A> {
  return async (_env, state) => [value, state, []];
}

function rwstChain<R, W, S, A, B>(program: RWST<R, W, S, A>, mapper: (value: A) => RWST<R, W, S, B>): RWST<R, W, S, B> {
  return async (env, state) => {
    const [value, intermediateState, firstLog] = await program(env, state);
    const [next, finalState, secondLog] = await mapper(value)(env, intermediateState);
    return [next, finalState, [...firstLog, ...secondLog]];
  };
}

function rwstTell<R, W, S>(message: W): RWST<R, W, S, void> {
  return async (_env, state) => [undefined, state, [message]];
}

function rwstAsk<R, W, S>(): RWST<R, W, S, R> {
  return async (env, state) => [env, state, []];
}

function rwstModify<R, W, S>(update: (state: S) => S): RWST<R, W, S, S> {
  return async (_env, state) => {
    const next = update(state);
    return [next, next, []];
  };
}

function rwstFromTask<R, W, S, A>(task: () => Promise<A>): RWST<R, W, S, A> {
  return async (_env, state) => {
    const value = await task();
    return [value, state, []];
  };
}

function deploymentPipeline(path: string): RWST<DeploymentEnv, string, DeploymentState, string> {
  return rwstChain(rwstAsk<DeploymentEnv, string, DeploymentState>(), (env) =>
    rwstChain(rwstTell<DeploymentEnv, string, DeploymentState>(`Preparing request for ${env.serviceBaseUrl}${path}`), () =>
      rwstChain(
        rwstModify<DeploymentEnv, string, DeploymentState>((state) => ({ version: state.version + 1 })),
        (updated) =>
          rwstChain(rwstTell<DeploymentEnv, string, DeploymentState>(`Bumped deployment counter to ${updated.version}`), () =>
            rwstChain(
              rwstFromTask<DeploymentEnv, string, DeploymentState, string>(() =>
                Promise.resolve(`200 OK from ${env.serviceBaseUrl}${path}`),
              ),
              (response) =>
                rwstChain(
                  rwstTell<DeploymentEnv, string, DeploymentState>(`Observed response '${response}'`),
                  () =>
                    rwstOf<DeploymentEnv, string, DeploymentState, string>(
                      `Deployed v${updated.version} to ${env.region}.`,
                    ),
                ),
            ),
          ),
      ),
    ),
  );
}

export const readerTaskOptionAndRwst: RunnableExample = {
  id: "004",
  title: "ReaderTaskOption and Reader-Writer-State-Task generators",
  outlineReference: 4,
  summary:
    "Feature-flag gating with ReaderTaskOption and deployment bookkeeping with Reader-Writer-State-Task, both sharing a common environment.",
  async run() {
    const rtoProgram = readerTaskOptionPipeline("beta-dashboard", "ada");
    const enabledEnv: FeatureEnv = {
      featureFlags: { "beta-dashboard": true },
      userPreferences: { ada: "dark" },
    };
    const disabledEnv: FeatureEnv = {
      featureFlags: { "beta-dashboard": false },
      userPreferences: { ada: "light" },
    };
    const missingFlagEnv: FeatureEnv = {
      featureFlags: {},
      userPreferences: { ada: "dark" },
    };

    const enabledResult = await rtoProgram(enabledEnv);
    const disabledResult = await rtoProgram(disabledEnv);
    const missingResult = await rtoProgram(missingFlagEnv);

    const rtoLogs = [
      "== ReaderTaskOption feature flag gating ==",
      enabledResult.kind === "some"
        ? enabledResult.value
        : "beta-dashboard (enabled env): feature unavailable",
      disabledResult.kind === "some"
        ? disabledResult.value
        : "beta-dashboard (disabled env): feature unavailable",
      missingResult.kind === "some"
        ? missingResult.value
        : "beta-dashboard (missing flag env): feature unavailable",
    ];

    const pipeline = deploymentPipeline("/health");
    const [summary, finalState, writerLog] = await pipeline(
      { region: "us-east-1", serviceBaseUrl: "https://api.example" },
      { version: 10 },
    );

    const rwstLogs = [
      "== Reader-Writer-State-Task deployment pipeline ==",
      ...writerLog.map((entry) => entry),
      `Final deployment state version: ${finalState.version}`,
      `Outcome summary: ${summary}`,
    ];

    return { logs: [...rtoLogs, ...rwstLogs] };
  },
};
