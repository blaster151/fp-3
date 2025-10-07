import { RunnableExample } from "./types";
import { Result, TaskResult, resultDo, taskResultDo } from "./structures";

/**
 * Stage 002 demonstrates how the same Result workflow is written twice: once
 * as a synchronous generator program and once as an asynchronous TaskResult
 * flow.  Additional logging makes the sequencing steps explicit when the
 * example is executed from the CLI runner.
 */

type UserRecord = {
  readonly username: string;
  readonly email: string;
  readonly preferredName?: string;
};

const USERS: ReadonlyArray<UserRecord> = [
  { username: "ada", email: "ada@example.com", preferredName: "Ada" },
  { username: "emmy", email: "emmy@example.net" },
];

function findUser(username: string): Result<string, UserRecord> {
  const user = USERS.find((candidate) => candidate.username === username);
  return user ? Result.ok(user) : Result.err(`User '${username}' was not found.`);
}

function ensureEmailVerified(user: UserRecord): Result<string, UserRecord> {
  if (user.email.endsWith(".example.com") || user.email.endsWith(".example.net")) {
    return Result.ok(user);
  }
  return Result.err(`User '${user.username}' has an unverified email.`);
}

function deriveDisplayName(user: UserRecord): string {
  return user.preferredName ?? user.username;
}

function synchronousGreeting(username: string): Result<string, string> {
  return resultDo<string, string>(function* resultProgram() {
    const trimmed = (yield Result.ok(username.trim())) as string;
    if (trimmed === "") {
      return Result.err("Username must not be blank.");
    }

    const user = (yield findUser(trimmed)) as UserRecord;
    const verified = (yield ensureEmailVerified(user)) as UserRecord;

    return Result.ok(`Welcome, ${deriveDisplayName(verified)}!`);
  });
}

/** Wrap a Result in a TaskResult that settles after a configurable delay. */
function delayResult<E, A>(value: Result<E, A>, delayMs: number): TaskResult<E, A> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delayMs);
  });
}

/** The asynchronous variant mirrors the synchronous pipeline but yields through async boundaries. */
async function asynchronousGreeting(username: string): Promise<Result<string, string>> {
  return taskResultDo<string, string>(async function* asyncProgram() {
    const trimmed = (yield Result.ok(username.trim())) as string;
    if (trimmed === "") {
      return Result.err("Username must not be blank.");
    }

    const user = (yield delayResult(findUser(trimmed), 10)) as UserRecord;
    const verified = (yield delayResult(ensureEmailVerified(user), 10)) as UserRecord;
    const greeting = `Welcome, ${deriveDisplayName(verified)}!`;

    return Result.ok(greeting);
  });
}

export const resultDoNotation: RunnableExample = {
  id: "002",
  title: "Do-notation for synchronous and asynchronous Results",
  outlineReference: 2,
  summary:
    "Generator-based sequencing for Result and TaskResult computations that showcases monadic control flow in synchronous and async contexts.",
  async run() {
    const greeting = synchronousGreeting(" ada ");
    const missing = synchronousGreeting("unknown");
    const asyncGreeting = await asynchronousGreeting("emmy");
    const blank = await asynchronousGreeting("   ");
    const logs = [
      "== Synchronous do-notation ==",
      greeting.kind === "ok" ? `✔ ${greeting.value}` : `✘ ${greeting.error}`,
      missing.kind === "ok" ? `✔ ${missing.value}` : `✘ ${missing.error}`,
      "== Asynchronous do-notation (TaskResult) ==",
      asyncGreeting.kind === "ok" ? `✔ ${asyncGreeting.value}` : `✘ ${asyncGreeting.error}`,
      blank.kind === "ok" ? `✔ ${blank.value}` : `✘ ${blank.error}`,
    ];

    return { logs };
  },
};
