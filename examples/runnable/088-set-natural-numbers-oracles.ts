import { SetOracles } from "../../oracles/set-oracles";
import { SetCat } from "../../set-cat";
import { SetNaturalNumbersObject, SetSubobjectClassifier } from "../../set-subobject-classifier";
import type { RunnableExample } from "./types";

const formatBoolean = (value: boolean): string => (value ? "yes" : "no");

const terminalPoint = (): unknown => {
  const iterator = SetSubobjectClassifier.terminalObj.values().next();
  if (iterator.done) {
    throw new Error("Set natural numbers example: terminal object must expose a unique point.");
  }
  return iterator.value;
};

const describeZeroSeparation = (): readonly string[] => {
  const verdict = SetOracles.naturalNumbers.zeroSeparation();
  return [
    "== Zero vs successor separation ==",
    `Zero separated from successor? ${formatBoolean(verdict.separated)}`,
    `Characteristic equals false arrow → ${formatBoolean(verdict.equalsFalse)}`,
    `Classification matches equalizer → ${formatBoolean(verdict.classificationAgrees)}`,
    `Details: ${verdict.details}`,
    verdict.reason ? `Reason: ${verdict.reason}` : undefined,
  ].filter((entry): entry is string => entry !== undefined);
};

const describeInduction = (): readonly string[] => {
  const witness = SetOracles.naturalNumbers.induction();
  return [
    "",
    "== Inductive subobject identity inclusion ==",
    `Induction holds? ${formatBoolean(witness.holds)}`,
    `Monomorphism certified → ${formatBoolean(witness.monomorphismCertified)}`,
    `Details: ${witness.details}`,
    witness.reason ? `Reason: ${witness.reason}` : undefined,
  ].filter((entry): entry is string => entry !== undefined);
};

const describePrimitiveRecursion = (): readonly string[] => {
  const recursion = SetOracles.naturalNumbers.primitiveRecursion();
  const lines: string[] = [
    "",
    "== Primitive recursion mediator (identity) ==",
    `Primitive recursion established → ${formatBoolean(recursion.holds)}`,
    `Details: ${recursion.details}`,
  ];
  if (recursion.reason) {
    lines.push(`Reason: ${recursion.reason}`);
  }

  const product = SetCat.product(
    SetNaturalNumbersObject.carrier,
    SetSubobjectClassifier.terminalObj,
  );
  if (!product.lookup) {
    throw new Error("SetCat.product must expose a lookup when generating primitive recursion samples.");
  }
  const star = terminalPoint();
  const samples = [0, 1, 2, 3, 4];
  lines.push("Mediator samples:");
  for (const value of samples) {
    const pair = product.lookup(value, star);
    const image = recursion.mediator.map(pair);
    lines.push(`  f(${value}) = ${image}`);
  }

  return lines;
};

const describeInitialAlgebra = (): readonly string[] => {
  const verdict = SetOracles.naturalNumbers.initialAlgebra();
  const lines: string[] = [
    "",
    "== Initial algebra for 1 + ℕ ==",
    `Initial algebra witness holds → ${formatBoolean(verdict.holds)}`,
    `Details: ${verdict.details}`,
  ];
  if (verdict.reason) {
    lines.push(`Reason: ${verdict.reason}`);
  }
  if (verdict.morphism) {
    lines.push(`Zero triangle holds → ${formatBoolean(verdict.morphism.zeroTriangle.holds)}`);
    lines.push(`Successor square holds → ${formatBoolean(verdict.morphism.successorSquare.holds)}`);
    lines.push(`Comparison commute → ${formatBoolean(verdict.morphism.comparison.holds)}`);
  }
  return lines;
};

const runExample = (): readonly string[] => {
  return [
    ...describeZeroSeparation(),
    ...describeInduction(),
    ...describePrimitiveRecursion(),
    ...describeInitialAlgebra(),
  ];
};

export const stage088SetNaturalNumbersOracles: RunnableExample = {
  id: "088",
  title: "Set natural numbers oracles",
  outlineReference: 88,
  summary:
    "Exercise the Set natural-numbers object via zero/successor separation, inductive subobjects, primitive recursion, and the canonical 1 + ℕ algebra witness.",
  run: async () => ({ logs: runExample() }),
};
