import { Result } from "./structures";
import { Task } from "./effects";
import { RunnableExample } from "./types";
import {
  Store,
  collectStore,
  sequenceStoreResult,
  storeFromArray,
} from "./store";

function distributeResultStore<E, Position, Value>(
  input: Result<E, Store<Position, Value>>,
  fallback: (error: E) => Store<Position, Value>,
): { readonly store: Store<Position, Result<E, Value>>; readonly status: "ok" | "fallback"; readonly error?: E } {
  if (input.kind === "ok") {
    const source = input.value;
    const store: Store<Position, Result<E, Value>> = {
      pos: source.pos,
      peek: (position) => Result.ok(source.peek(position)),
    };
    return { store, status: "ok" };
  }
  const fallbackStore = fallback(input.error);
  const store: Store<Position, Result<E, Value>> = {
    pos: fallbackStore.pos,
    peek: (position) => {
      void fallbackStore.peek(position);
      return Result.err(input.error);
    },
  };
  return { store, status: "fallback", error: input.error };
}

async function distributeTaskStore<Position, Value>(
  task: Task<Store<Position, Value>>,
): Promise<Store<Position, Task<Value>>> {
  const resolved = await task();
  return {
    pos: resolved.pos,
    peek: (position) => async () => resolved.peek(position),
  };
}

function liftMonadToCoalgebra<E, Position, Value>(
  gamma: (value: Value) => Store<Position, Value>,
  fallback: (error: E) => Store<Position, Value>,
): (result: Result<E, Value>) => Store<Position, Result<E, Value>> {
  return (result) => {
    const lifted =
      result.kind === "ok"
        ? Result.ok<E, Store<Position, Value>>(gamma(result.value))
        : Result.err<E, Store<Position, Value>>(result.error);
    return distributeResultStore(lifted, fallback).store;
  };
}

function aggregateStoreResults<E>(
  store: Store<number, Result<E, number>>,
): Result<E, number> {
  const sequence = sequenceStoreResult(store, [0, 1, 2]);
  if (sequence.kind === "err") {
    return sequence;
  }
  const values = sequence.value;
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return Result.ok(average);
}

export const mixedDistributiveLawsForMonadComonadPairs: RunnableExample = {
  id: "031",
  title: "Mixed distributive laws for monad×comonad pairs",
  outlineReference: 31,
  summary:
    "Result×Store validation, Task×Store async contexts, and lifting monads to coalgebras or comonads to algebras through mixed distributive scaffolds.",
  async run() {
    type UserProfile = { readonly name: string; readonly age: number; readonly email: string };
    type ValidationError = "INVALID_EMAIL" | "UNDERAGE" | "MISSING_NAME" | "UNAUTHORIZED";
    type ProfileField = keyof UserProfile;

    const validators: Store<ProfileField, (profile: UserProfile) => Result<ValidationError, UserProfile[ProfileField]>> = {
      pos: "email",
      peek: (field) => {
        switch (field) {
          case "email":
            return (profile) =>
              profile.email.includes("@")
                ? Result.ok(profile.email)
                : Result.err("INVALID_EMAIL");
          case "age":
            return (profile) => (profile.age >= 18 ? Result.ok(profile.age) : Result.err("UNDERAGE"));
          case "name":
          default:
            return (profile) => (profile.name.trim().length > 0 ? Result.ok(profile.name.trim()) : Result.err("MISSING_NAME"));
        }
      },
    };

    const getValidationStore = (authorized: boolean): Result<ValidationError, typeof validators> =>
      authorized ? Result.ok(validators) : Result.err("UNAUTHORIZED");

    const fallbackValidators = (error: ValidationError): typeof validators => ({
      pos: "name",
      peek: (field) => {
        void field;
        return () => Result.err(error);
      },
    });

    const goodProfile: UserProfile = { name: "Alice", age: 26, email: "alice@example.com" };
    const badProfile: UserProfile = { name: "", age: 15, email: "not-an-email" };
    const fields: ReadonlyArray<ProfileField> = ["name", "age", "email"];

    const authorizedDistribution = distributeResultStore(getValidationStore(true), fallbackValidators);
    const unauthorizedDistribution = distributeResultStore(getValidationStore(false), fallbackValidators);

    const evaluateProfile = (
      profile: UserProfile,
      store: Store<ProfileField, Result<ValidationError, (profile: UserProfile) => Result<ValidationError, unknown>>>,
    ): ReadonlyArray<string> =>
      fields.map((field) => {
        const entry = store.peek(field);
        if (entry.kind === "err") {
          return `${field}: error(${entry.error})`;
        }
        const outcome = entry.value(profile);
        return outcome.kind === "ok"
          ? `${field}: ok(${JSON.stringify(outcome.value)})`
          : `${field}: error(${outcome.error})`;
      });

    const resultSection = [
      "== Result × Store validation ==",
      `Authorized profile (Alice) → ${evaluateProfile(goodProfile, authorizedDistribution.store).join("; ")}`,
      `Authorized profile (invalid fields) → ${evaluateProfile(badProfile, authorizedDistribution.store).join("; ")}`,
      `Unauthorized profile (fallback validators) → ${evaluateProfile(goodProfile, unauthorizedDistribution.store).join("; ")}`,
      `Distribution status → ok:${authorizedDistribution.status} / fallback:${unauthorizedDistribution.status} error:${unauthorizedDistribution.error}`,
    ];

    type APIEndpoint = "users" | "posts" | "comments";
    type APIConfig = { readonly baseUrl: string; readonly apiKey: string };
    type ApiResponse = { readonly endpoint: APIEndpoint; readonly payload: string; readonly keyPrefix: string };

    const configureApiStore = async (): Promise<Store<APIEndpoint, (config: APIConfig) => Promise<ApiResponse>>> => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        pos: "users",
        peek: (endpoint) => async (config) => ({
          endpoint,
          payload: `${config.baseUrl}/${endpoint}`,
          keyPrefix: config.apiKey.slice(0, 3),
        }),
      };
    };

    const distributedApiStore = await distributeTaskStore(configureApiStore);
    const prodConfig: APIConfig = { baseUrl: "https://prod.example.com", apiKey: "prod-key" };
    const devConfig: APIConfig = { baseUrl: "https://dev.example.com", apiKey: "dev-key" };

    const apiSection = await (async () => {
      const usersExecutor = await distributedApiStore.peek("users")();
      const postsExecutor = await distributedApiStore.peek("posts")();
      const commentsExecutor = await distributedApiStore.peek("comments")();
      const [users, posts, comments] = await Promise.all([
        usersExecutor(prodConfig),
        postsExecutor(devConfig),
        commentsExecutor(prodConfig),
      ]);
      return [
        "== Task × Store async context ==",
        `users → ${JSON.stringify(users)}`,
        `posts → ${JSON.stringify(posts)}`,
        `comments → ${JSON.stringify(comments)}`,
      ];
    })();

    const gamma = (value: number): Store<number, number> => {
      const offsets = [value - 1, value, value + 1];
      return storeFromArray(offsets, 1);
    };

    const fallbackGamma = (_error: string): Store<number, number> => storeFromArray([0, 0, 0], 1);

    const liftedGamma = liftMonadToCoalgebra(gamma, fallbackGamma);

    const liftedSuccess = liftedGamma(Result.ok<string, number>(12));
    const liftedFailure = liftedGamma(Result.err<string, number>("boom"));

    const collapse = (store: Store<number, Result<string, number>>): string => {
      const aggregate = aggregateStoreResults(store);
      return aggregate.kind === "ok" ? `ok(${aggregate.value.toFixed(2)})` : `error(${aggregate.error})`;
    };

    const cofreeSection = [
      "== Lifting via mixed distributive laws ==",
      `Lifted success store samples → [${collectStore<Result<string, number>>(3)(liftedSuccess).map((entry) =>
        entry.kind === "ok" ? entry.value.toFixed(0) : `error(${entry.error})`,
      ).join(", ")}]`,
      `Lifted failure store samples → [${collectStore<Result<string, number>>(3)(liftedFailure).map((entry) =>
        entry.kind === "ok" ? entry.value.toFixed(0) : `error(${entry.error})`,
      ).join(", ")}]`,
      `Collapsed success average → ${collapse(liftedSuccess)}`,
      `Collapsed failure average → ${collapse(liftedFailure)}`,
    ];

    return {
      logs: [...resultSection, ...apiSection, ...cofreeSection],
    };
  },
};
