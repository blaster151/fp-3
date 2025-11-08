import { describe, expect, it } from "vitest";

import {
  applyRunnerCooperation,
  makeAlgebraicOperation,
  makeAlgebraicSignature,
  makeRunnerCooperation,
  makeStateRunner,
} from "../algebraic-effects";
import { SetCat } from "../set-cat";

describe("algebraic-effects", () => {
  it("constructs signature operations with metadata", () => {
    const boolCarrier = SetCat.obj([false, true], { tag: "Bool" });
    const unitCarrier = SetCat.terminal().object;

    const op = makeAlgebraicOperation("flip", unitCarrier, boolCarrier, [
      "boolean flip operation",
    ]);
    const signature = makeAlgebraicSignature({ flip: op }, [
      "Boolean signature",
    ]);

    expect(signature.operations.flip).toBe(op);
    expect(signature.metadata).toContain("Boolean signature");
    expect(op.metadata).toContain("boolean flip operation");
  });

  it("evaluates Example 1 state runner operations", () => {
    type Traffic = "green" | "amber" | "red";
    const stateCarrier = SetCat.obj<Traffic>([
      "green",
      "amber",
      "red",
    ], { tag: "Traffic" });

    const runner = makeStateRunner(stateCarrier);
    const unitCarrier = runner.signature.operations.getenv.parameterCarrier;
    const unit = Array.from(unitCarrier)[0]!;

    const getenvResult = applyRunnerCooperation(
      runner.cooperations.getenv,
      unit,
      "amber",
    );
    expect(getenvResult).toEqual(["amber", "amber"]);

    const setenvResult = applyRunnerCooperation(
      runner.cooperations.setenv,
      "red",
      "amber",
    );
    expect(setenvResult[0]).toEqual(unit);
    expect(setenvResult[1]).toEqual("red");
  });

  it("builds runner cooperations with currying witnesses", () => {
    const numbers = SetCat.obj([0, 1, 2], { tag: "Numbers" });
    const unitCarrier = SetCat.terminal().object;
    const operation = makeAlgebraicOperation("count", unitCarrier, numbers);
    const runner = makeRunnerCooperation(operation, numbers, (_input, state) => [
      (state + 1) % 3,
      (state + 1) % 3,
    ] as const);

    const unit = Array.from(unitCarrier)[0]!;
    const [result, next] = applyRunnerCooperation(runner, unit, 1);
    expect(result).toBe(2);
    expect(next).toBe(2);

    const curried = runner.curried.map(unit);
    const pair = curried(0);
    const projected = {
      result: runner.codomain.projections.fst.map(pair),
      state: runner.codomain.projections.snd.map(pair),
    };
    expect(projected).toEqual({ result: 1, state: 1 });
  });
});

