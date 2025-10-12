import { RunnableExample } from "./types";
import { Result } from "./structures";
import {
  ReaderArrow,
  TaskArrow,
  ReaderTaskResultArrow,
  composeReaderArrows,
  composeTaskArrows,
  composeReaderTaskResultArrows,
  runReaderArrow,
  runTaskArrow,
  runReaderTaskResultArrow,
} from "./effects";

/**
 * Stage 018 rebuilds the Kleisli pipelines that previously lived inside the
 * monolithic demo script.  The new module showcases how Reader, Task, and
 * ReaderTaskResult arrows can be assembled declaratively and executed in a
 * predictable order without mixing concerns about environments, asynchrony, or
 * failure handling.
 */

type ServiceConfig = {
  readonly domain: string;
  readonly port: number;
};

type ServiceEnvironment = {
  readonly regionDomains: Record<string, string>;
  readonly defaultRegion: string;
  readonly fallbackDomain: string;
  readonly services: Record<string, ServiceConfig>;
  readonly defaultService: ServiceConfig;
};

type ServiceRequest = {
  readonly serviceId: string;
  readonly path: string;
  readonly region: string;
};

const attachConfig: ReaderArrow<ServiceEnvironment, ServiceRequest, readonly [ServiceRequest, ServiceConfig]> =
  (request) =>
  (environment) => {
    const config = environment.services[request.serviceId] ?? environment.defaultService;
    return [request, config];
  };

const resolveRegion: ReaderArrow<
  ServiceEnvironment,
  readonly [ServiceRequest, ServiceConfig],
  readonly [ServiceRequest, ServiceConfig, string]
> = ([request, config]) => (environment) => {
  const domain = environment.regionDomains[request.region] ?? environment.fallbackDomain;
  return [request, config, domain];
};

const buildUrl: ReaderArrow<
  ServiceEnvironment,
  readonly [ServiceRequest, ServiceConfig, string],
  string
> = ([request, config, domain]) =>
  () => `https://${domain}.${config.domain}:${config.port}${request.path}`;

const describeDispatch: ReaderArrow<ServiceEnvironment, string, string> = (url) => (environment) =>
  `Dispatch from ${environment.defaultRegion.toUpperCase()} control plane → ${url}`;

const readerPipeline = composeReaderArrows(
  describeDispatch,
  composeReaderArrows(buildUrl, composeReaderArrows(resolveRegion, attachConfig)),
);

type UserRecord = {
  readonly id: string;
  readonly tier: "standard" | "premium";
};

type Purchase = {
  readonly amount: number;
};

const fetchUser: TaskArrow<string, UserRecord> = (userId) => async () => ({
  id: userId,
  tier: userId === "ada" ? "premium" : "standard",
});

const fetchRecentPurchases: TaskArrow<UserRecord, readonly Purchase[]> = (user) => async () =>
  user.tier === "premium"
    ? [{ amount: 210 }, { amount: 135 }]
    : [{ amount: 20 }, { amount: 45 }, { amount: 15 }];

const summarisePurchases: TaskArrow<readonly Purchase[], string> = (purchases) => async () => {
  const total = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const average = purchases.length === 0 ? 0 : total / purchases.length;
  return `Processed ${purchases.length} purchases totalling $${total} (avg $${average.toFixed(2)}).`;
};

const taskPipeline = composeTaskArrows(
  summarisePurchases,
  composeTaskArrows(fetchRecentPurchases, fetchUser),
);

type LedgerRecord = {
  readonly balance: number;
  readonly currency: string;
};

type LedgerEnvironment = {
  readonly ledger: Record<string, LedgerRecord>;
  readonly fxRates: Record<string, number>;
};

type Statement = {
  readonly account: string;
  readonly balance: number;
  readonly currency: string;
};

const parseAccount: ReaderTaskResultArrow<LedgerEnvironment, string, string, string> = (raw) => async () => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return Result.err("Account identifier cannot be blank.");
  }
  return Result.ok(trimmed);
};

const fetchLedgerRecord: ReaderTaskResultArrow<LedgerEnvironment, string, string, Statement> =
  (account) =>
  async (environment) => {
    const record = environment.ledger[account];
    if (!record) {
      return Result.err(`No ledger entry found for ${account}.`);
    }
    return Result.ok({ account, balance: record.balance, currency: record.currency });
  };

const convertToUsd: ReaderTaskResultArrow<LedgerEnvironment, string, Statement, Statement> =
  (statement) =>
  async (environment) => {
    if (statement.currency === "USD") {
      return Result.ok(statement);
    }
    const rate = environment.fxRates[statement.currency];
    if (rate === undefined) {
      return Result.err(`Missing FX rate for ${statement.currency}.`);
    }
    const balance = statement.balance * rate;
    return Result.ok({ account: statement.account, balance, currency: "USD" });
  };

const readerTaskResultPipeline = composeReaderTaskResultArrows(
  convertToUsd,
  composeReaderTaskResultArrows(fetchLedgerRecord, parseAccount),
);

function formatResult(result: Result<string, Statement>): string {
  return result.kind === "ok"
    ? `✔ ${result.value.account}: ${result.value.balance.toFixed(2)} ${result.value.currency}`
    : `✘ ${result.error}`;
}

export const kleisliArrowPipelinesForReaderTaskAndReaderTaskResult: RunnableExample = {
  id: "018",
  title: "Kleisli arrow pipelines for Reader, Task, and ReaderTaskResult",
  outlineReference: 18,
  summary:
    "Demonstrates Reader, Task, and ReaderTaskResult Kleisli composition by rebuilding dispatch, purchase summarisation, and ledger lookup pipelines.",
  async run() {
    const environment: ServiceEnvironment = {
      regionDomains: { us: "us", eu: "eu", apac: "ap" },
      defaultRegion: "us",
      fallbackDomain: "global",
      services: {
        analytics: { domain: "analytics.internal", port: 8443 },
        billing: { domain: "billing.internal", port: 9443 },
      },
      defaultService: { domain: "fallback.internal", port: 8080 },
    };

    const readerLogs = [
      "== Reader Kleisli pipeline ==",
      runReaderArrow(
        readerPipeline,
        { serviceId: "analytics", path: "/status", region: "eu" },
        environment,
      ),
      runReaderArrow(
        readerPipeline,
        { serviceId: "missing", path: "/info", region: "apac" },
        environment,
      ),
    ];

    const taskLogs = [
      "== Task Kleisli pipeline ==",
      await runTaskArrow(taskPipeline, "ada"),
      await runTaskArrow(taskPipeline, "grace"),
    ];

    const ledgerEnvironment: LedgerEnvironment = {
      ledger: {
        "acct-001": { balance: 1250, currency: "USD" },
        "acct-002": { balance: 930, currency: "EUR" },
      },
      fxRates: { EUR: 1.08 },
    };

    const readerTaskResultLogs = [
      "== ReaderTaskResult Kleisli pipeline ==",
      formatResult(
        await runReaderTaskResultArrow(
          readerTaskResultPipeline,
          "acct-001",
          ledgerEnvironment,
        ),
      ),
      formatResult(
        await runReaderTaskResultArrow(
          readerTaskResultPipeline,
          "acct-002",
          ledgerEnvironment,
        ),
      ),
      formatResult(
        await runReaderTaskResultArrow(readerTaskResultPipeline, "   ", ledgerEnvironment),
      ),
      formatResult(
        await runReaderTaskResultArrow(
          readerTaskResultPipeline,
          "acct-999",
          ledgerEnvironment,
        ),
      ),
    ];

    return { logs: [...readerLogs, ...taskLogs, ...readerTaskResultLogs] };
  },
};
