import { RunnableExample, RunnableOutcome } from "./types";
import { Option, Result, Validation } from "./structures";

/**
 * Stage 001 introduces the three foundational success/failure containers used
 * throughout the catalogue.  Each helper below mirrors a common beginner
 * scenario—parsing, guarded arithmetic, and input validation—and the runner
 * renders a labelled transcript of the outcomes.
 */

type CustomerRecord = {
  readonly name: string;
  readonly email: string;
};

/** Parse a trimmed string and report success/failure as a Result. */
function parseNumber(input: string): Result<string, number> {
  const value = Number(input.trim());
  if (Number.isFinite(value)) {
    return Result.ok(value);
  }
  return Result.err(`Could not parse "${input}" as a finite number.`);
}

/** Guard a division by returning `none` when the denominator is zero. */
function guardedDivide(numerator: number, denominator: number): Option<number> {
  if (denominator === 0) {
    return Option.none();
  }
  return Option.some(numerator / denominator);
}

/** Collect validation errors instead of failing fast so every issue is reported. */
function validateCustomer(record: Partial<CustomerRecord>): Validation<string, CustomerRecord> {
  const issues: string[] = [];

  if (!record.name || record.name.trim() === "") {
    issues.push("Name must be provided.");
  }

  if (!record.email || !record.email.includes("@")) {
    issues.push("Email must include an '@' symbol.");
  }

  if (issues.length > 0) {
    return Validation.invalid(issues);
  }

  return Validation.valid({ name: record.name!, email: record.email! });
}

function runOptionResultBasics(): RunnableOutcome {
  const parsedAge = parseNumber("42");
  const parsedFailure = parseNumber("not-a-number");

  const safeDivision = guardedDivide(10, 2);
  const divisionByZero = guardedDivide(5, 0);

  const validCustomer = validateCustomer({ name: "Ada Lovelace", email: "ada@example.com" });
  const invalidCustomer = validateCustomer({ name: "", email: "invalid" });

  const logs = [
    "== Parsing numbers with Result ==",
    parsedAge.kind === "ok" ? `✔ Parsed age: ${parsedAge.value}` : `✘ ${parsedAge.error}`,
    parsedFailure.kind === "ok" ? `✔ Parsed failure: ${parsedFailure.value}` : `✘ ${parsedFailure.error}`,
    "== Guarded division with Option ==",
    safeDivision.kind === "some" ? `✔ 10 / 2 = ${safeDivision.value}` : "✘ Division by zero prevented",
    divisionByZero.kind === "some" ? `✔ 5 / 0 = ${divisionByZero.value}` : "✘ Division by zero prevented",
    "== Accumulating validation errors ==",
    validCustomer.kind === "valid"
      ? `✔ Registered customer: ${validCustomer.value.name}`
      : `✘ ${validCustomer.errors.join(", ")}`,
    invalidCustomer.kind === "valid"
      ? `✔ Registered customer: ${invalidCustomer.value.name}`
      : `✘ ${invalidCustomer.errors.join("; ")}`,
  ];

  return { logs };
}

export const optionResultBasics: RunnableExample = {
  id: "001",
  title: "Option, Result, and Validation primitives",
  outlineReference: 1,
  summary:
    "Parsing, guarded division, and validation accumulation that demonstrate foundational success/failure container behaviour.",
  async run() {
    return runOptionResultBasics();
  },
};
