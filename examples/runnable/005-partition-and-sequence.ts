import type { RunnableExample } from "./types";
import { Result, Validation } from "./structures";

/**
 * Stage 005 highlights container-wide operations that either partition inputs
 * into themed groups or sequence a collection into a single aggregated
 * structure. These helpers keep the behaviours of Option/Result/Validation
 * collections predictable when refactoring larger data pipelines.
 */

type Partition<T> = {
  readonly matches: ReadonlyArray<T>;
  readonly misses: ReadonlyArray<T>;
};

type ResultPartition<E, A> = {
  readonly successes: ReadonlyArray<A>;
  readonly failures: ReadonlyArray<E>;
};

function partitionByPredicate<T>(
  values: ReadonlyArray<T>,
  predicate: (value: T) => boolean,
): Partition<T> {
  return values.reduce<Partition<T>>(
    (acc, value) =>
      predicate(value)
        ? { matches: [...acc.matches, value], misses: acc.misses }
        : { matches: acc.matches, misses: [...acc.misses, value] },
    { matches: [], misses: [] },
  );
}

function partitionResults<E, A>(values: ReadonlyArray<Result<E, A>>): ResultPartition<E, A> {
  return values.reduce<ResultPartition<E, A>>(
    (acc, value) =>
      value.kind === "ok"
        ? { successes: [...acc.successes, value.value], failures: acc.failures }
        : { successes: acc.successes, failures: [...acc.failures, value.error] },
    { successes: [], failures: [] },
  );
}

function sequenceResults<E, A>(values: ReadonlyArray<Result<E, A>>): Result<E, ReadonlyArray<A>> {
  return values.reduce<Result<E, ReadonlyArray<A>>>(
    (acc, value) => {
      if (acc.kind === "err") {
        return acc;
      }
      if (value.kind === "err") {
        return value;
      }
      return Result.ok([...acc.value, value.value]);
    },
    Result.ok<ReadonlyArray<A>>([]),
  );
}

function sequenceValidation<E, A>(values: ReadonlyArray<Validation<E, A>>): Validation<E, ReadonlyArray<A>> {
  return values.reduce<Validation<E, ReadonlyArray<A>>>(
    (acc, value) => {
      if (acc.kind === "invalid" && value.kind === "invalid") {
        return Validation.invalid([...acc.errors, ...value.errors]);
      }
      if (acc.kind === "invalid") {
        return acc;
      }
      if (value.kind === "invalid") {
        return Validation.invalid(value.errors);
      }
      return Validation.valid([...acc.value, value.value]);
    },
    Validation.valid<E, ReadonlyArray<A>>([]),
  );
}

export const partitionAndSequenceContainers: RunnableExample = {
  id: "005",
  title: "Partitioning and sequencing containers",
  outlineReference: 5,
  summary:
    "Partitions data with predicates or Result outcomes and sequences Validation/Result collections into aggregated structures.",
  async run() {
    const readingMinutes = [12, 8, 30, 3, 18];
    const partitioned = partitionByPredicate(readingMinutes, (value) => value >= 10);

    const invoiceResults: ReadonlyArray<Result<string, number>> = [
      Result.ok(120),
      Result.err("Missing customer ID"),
      Result.ok(75),
      Result.err("Currency mismatch"),
    ];
    const invoicePartition = partitionResults(invoiceResults);

    const shipmentSteps: ReadonlyArray<Result<string, string>> = [
      Result.ok("Boxed inventory"),
      Result.ok("Generated shipping label"),
      Result.err("Carrier API unavailable"),
      Result.ok("Queued manifest upload"),
    ];
    const shipmentSequenced = sequenceResults(shipmentSteps);

    const customerValidations: ReadonlyArray<Validation<string, string>> = [
      Validation.valid("Grace Hopper"),
      Validation.invalid(["Missing email"]),
      Validation.invalid(["Unsupported country"]),
    ];
    const validationSequenced = sequenceValidation(customerValidations);

    const partitionLogs = [
      "== Predicate-driven partitioning ==",
      `Reading slots >= 10 minutes: [${partitioned.matches.join(", ")}]`,
      `Reading slots < 10 minutes: [${partitioned.misses.join(", ")}]`,
      "== Result partitioning ==",
      `Invoices succeeded: [${invoicePartition.successes.join(", ")}]`,
      `Invoices failed: [${invoicePartition.failures.join("; ")}]`,
    ];

    const sequenceLogs = [
      "== Sequencing Result collections ==",
      shipmentSequenced.kind === "ok"
        ? `All shipment stages succeeded: [${shipmentSequenced.value.join(" → ")}]`
        : `Shipment halted at error: ${shipmentSequenced.error}`,
      "== Sequencing Validation collections ==",
      validationSequenced.kind === "valid"
        ? `All customers valid: [${validationSequenced.value.join(", ")}]`
        : `Collected validation issues: [${validationSequenced.errors.join("; ")}]`,
    ];

    return { logs: [...partitionLogs, ...sequenceLogs] };
  },
};
