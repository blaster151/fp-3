import type { RunnableExample } from "./types";

type AlgebraElement = "1" | "x";
type CoalgebraElement = "c0" | "c1";
type ModuleElement = "m0" | "m1";

type MultiplicationTable = Record<AlgebraElement, Record<AlgebraElement, AlgebraElement>>;
type DeltaTable = Record<CoalgebraElement, ReadonlyArray<readonly [CoalgebraElement, CoalgebraElement]>>;
type EntwiningTable = Record<CoalgebraElement, Record<AlgebraElement, ReadonlyArray<readonly [AlgebraElement, CoalgebraElement]>>>;
type ModuleActionTable = Record<ModuleElement, Record<AlgebraElement, ModuleElement>>;
type CoactionTable = Record<ModuleElement, ReadonlyArray<readonly [ModuleElement, CoalgebraElement]>>;

type MultisetKey<T> = (value: T) => string;

type LawCheck = { readonly label: string; readonly holds: boolean; readonly details: ReadonlyArray<string> };

type EntwinedCondition = {
  readonly element: ModuleElement;
  readonly algebra: AlgebraElement;
  readonly holds: boolean;
  readonly left: ReadonlyArray<readonly [ModuleElement, CoalgebraElement]>;
  readonly right: ReadonlyArray<readonly [ModuleElement, CoalgebraElement]>;
};

const algebraElements: ReadonlyArray<AlgebraElement> = ["1", "x"];
const coalgebraElements: ReadonlyArray<CoalgebraElement> = ["c0", "c1"];
const moduleElements: ReadonlyArray<ModuleElement> = ["m0", "m1"];

const multiplication: MultiplicationTable = {
  "1": { "1": "1", x: "x" },
  x: { "1": "x", x: "1" },
};

const delta: DeltaTable = {
  c0: [["c0", "c0"]],
  c1: [["c1", "c0"], ["c0", "c1"]],
};

const counit: Record<CoalgebraElement, number> = {
  c0: 1,
  c1: 0,
};

const entwining: EntwiningTable = {
  c0: {
    "1": [["1", "c0"]],
    x: [["x", "c0"]],
  },
  c1: {
    "1": [["1", "c1"]],
    x: [["x", "c1"]],
  },
};

const moduleAction: ModuleActionTable = {
  m0: { "1": "m0", x: "m1" },
  m1: { "1": "m1", x: "m1" },
};

const coaction: CoactionTable = {
  m0: [["m0", "c0"]],
  m1: [["m1", "c0"], ["m0", "c1"]],
};

function multiplyElements(left: AlgebraElement, right: AlgebraElement): AlgebraElement {
  return multiplication[left][right];
}

function deltaElements(element: CoalgebraElement): ReadonlyArray<readonly [CoalgebraElement, CoalgebraElement]> {
  return delta[element];
}

function entwineElements(
  coalgebra: CoalgebraElement,
  algebra: AlgebraElement,
): ReadonlyArray<readonly [AlgebraElement, CoalgebraElement]> {
  return entwining[coalgebra][algebra];
}

function actModule(element: ModuleElement, algebra: AlgebraElement): ModuleElement {
  return moduleAction[element][algebra];
}

function coactModule(element: ModuleElement): ReadonlyArray<readonly [ModuleElement, CoalgebraElement]> {
  return coaction[element];
}

function multisetEquals<T>(
  left: ReadonlyArray<T>,
  right: ReadonlyArray<T>,
  key: MultisetKey<T>,
): boolean {
  const leftKeys = left.map(key).sort();
  const rightKeys = right.map(key).sort();
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every((entry, index) => entry === rightKeys[index]);
}

function checkAlgebraAssociativity(): LawCheck {
  const failures: string[] = [];
  algebraElements.forEach((a) => {
    algebraElements.forEach((b) => {
      algebraElements.forEach((c) => {
        const leftProduct = multiplyElements(multiplyElements(a, b), c);
        const rightProduct = multiplyElements(a, multiplyElements(b, c));
        if (leftProduct !== rightProduct) {
          failures.push(`  • (${a}·${b})·${c} ≠ ${a}·(${b}·${c})`);
        }
      });
    });
  });
  return { label: "Algebra associativity", holds: failures.length === 0, details: failures };
}

function checkAlgebraUnit(): LawCheck {
  const failures = algebraElements
    .filter((element) => multiplyElements("1", element) !== element || multiplyElements(element, "1") !== element)
    .map((element) => `  • Unit failed on ${element}`);
  return { label: "Unit element", holds: failures.length === 0, details: failures };
}

function coalTripleKey(value: readonly [CoalgebraElement, CoalgebraElement, CoalgebraElement]): string {
  return value.join("|");
}

function pairKey<T extends readonly [unknown, unknown]>(value: T): string {
  return `${value[0]}|${value[1]}`;
}

function entwiningTripleKey(value: readonly [AlgebraElement, CoalgebraElement, CoalgebraElement]): string {
  return `${value[0]}|${value[1]}|${value[2]}`;
}

function checkCoalgebraCoassociativity(): LawCheck {
  const failures: string[] = [];
  coalgebraElements.forEach((element) => {
    const left = deltaElements(element).flatMap(([first, second]) =>
      deltaElements(first).map((tail) => [tail[0], tail[1], second] as const),
    );
    const right = deltaElements(element).flatMap(([first, second]) =>
      deltaElements(second).map((tail) => [first, tail[0], tail[1]] as const),
    );
    if (!multisetEquals(left, right, coalTripleKey)) {
      failures.push(`  • Δ⊗id and id⊗Δ disagree on ${element}`);
    }
  });
  return { label: "Coalgebra coassociativity", holds: failures.length === 0, details: failures };
}

function checkCoalgebraCounit(): LawCheck {
  const failures: string[] = [];
  coalgebraElements.forEach((element) => {
    const deltaPairs = deltaElements(element);
    const left = deltaPairs.filter(([first]) => counit[first] !== 0).map(([, second]) => second);
    const right = deltaPairs.filter(([, second]) => counit[second] !== 0).map(([first]) => first);
    const leftMatches = left.length === 1 && left[0] === element;
    const rightMatches = right.length === 1 && right[0] === element;
    if (!leftMatches || !rightMatches) {
      failures.push(`  • Counit law violated on ${element}`);
    }
  });
  return { label: "Counit laws", holds: failures.length === 0, details: failures };
}

function checkEntwiningDeltaCompatibility(): LawCheck {
  const failures: string[] = [];
  coalgebraElements.forEach((coal) => {
    algebraElements.forEach((alg) => {
      const left = deltaElements(coal).flatMap(([first, second]) =>
        entwineElements(first, alg).map((entry) => [entry[0], entry[1], second] as const),
      );
      const right = entwineElements(coal, alg).flatMap((entry) =>
        deltaElements(entry[1]).map((tail) => [entry[0], tail[0], tail[1]] as const),
      );
      if (!multisetEquals(left, right, entwiningTripleKey)) {
        failures.push(`  • (ψ⊗id)∘(id⊗Δ) ≠ (Δ⊗id)∘ψ on (${coal}, ${alg})`);
      }
    });
  });
  return { label: "Entwining respects comultiplication", holds: failures.length === 0, details: failures };
}

function checkEntwiningMultiplicationCompatibility(): LawCheck {
  const failures: string[] = [];
  coalgebraElements.forEach((coal) => {
    algebraElements.forEach((a) => {
      algebraElements.forEach((b) => {
        const left = entwineElements(coal, a).flatMap((entry) =>
          entwineElements(entry[1], b).map((second) => [multiplyElements(entry[0], second[0]), second[1]] as const),
        );
        const right = entwineElements(coal, multiplyElements(a, b));
        if (!multisetEquals(left, right, pairKey)) {
          failures.push(`  • ψ(${coal}, ${a}·${b}) differs from (μ⊗id)(id⊗ψ)ψ`);
        }
      });
    });
  });
  return { label: "Entwining respects multiplication", holds: failures.length === 0, details: failures };
}

function checkEntwiningUnitCompatibility(): LawCheck {
  const failures = coalgebraElements
    .filter((coal) => !multisetEquals(entwineElements(coal, "1"), [["1", coal]], pairKey))
    .map((coal) => `  • ψ(${coal}, 1) ≠ 1⊗${coal}`);
  return { label: "Entwining preserves the unit", holds: failures.length === 0, details: failures };
}

function checkEntwinedModuleCompatibility(): readonly EntwinedCondition[] {
  return moduleElements.flatMap((element) =>
    algebraElements.map((alg) => {
      const left = coactModule(actModule(element, alg));
      const right = coactModule(element).flatMap((entry) =>
        entwineElements(entry[1], alg).map((entwined) => [actModule(entry[0], entwined[0]), entwined[1]] as const),
      );
      return { element, algebra: alg, holds: multisetEquals(left, right, pairKey), left, right };
    }),
  );
}

function renderLaw(check: LawCheck): readonly string[] {
  const header = `${check.holds ? "✔" : "✘"} ${check.label}`;
  return check.details.length === 0 ? [header] : [header, ...check.details];
}

function renderEntwinedCondition(condition: EntwinedCondition): readonly string[] {
  const header = `${condition.holds ? "✔" : "✘"} ρ(${condition.element}·${condition.algebra}) condition`;
  if (condition.holds) {
    return [header];
  }
  const left = condition.left.map((pair) => `    • Left: ${pair[0]} ⊗ ${pair[1]}`);
  const right = condition.right.map((pair) => `    • Right: ${pair[0]} ⊗ ${pair[1]}`);
  return [header, "    Left side:", ...left, "    Right side:", ...right];
}

function runComoduleEntwiningAndEntwinedModuleMachinery() {
  const algebraChecks: ReadonlyArray<LawCheck> = [checkAlgebraAssociativity(), checkAlgebraUnit()];
  const coalgebraChecks: ReadonlyArray<LawCheck> = [checkCoalgebraCoassociativity(), checkCoalgebraCounit()];
  const entwiningChecks: ReadonlyArray<LawCheck> = [
    checkEntwiningDeltaCompatibility(),
    checkEntwiningMultiplicationCompatibility(),
    checkEntwiningUnitCompatibility(),
  ];
  const entwinedConditions = checkEntwinedModuleCompatibility();

  const logs = [
    "== Algebra structure ==",
    ...algebraChecks.flatMap(renderLaw),
    "",
    "== Coalgebra structure ==",
    ...coalgebraChecks.flatMap(renderLaw),
    "",
    "== Entwining diagnostics ==",
    ...entwiningChecks.flatMap(renderLaw),
    "",
    "== Entwined module compatibility ==",
    ...entwinedConditions.flatMap(renderEntwinedCondition),
  ];

  return { logs };
}

export const stage040ComoduleEntwiningAndEntwinedModuleMachinery: RunnableExample = {
  id: "040",
  title: "Comodule, entwining, and entwined module machinery",
  outlineReference: 40,
  summary:
    "Verifies algebra, coalgebra, entwining, and entwined module compatibility for a finite dual-number example with explicit tables.",
  async run() {
    return runComoduleEntwiningAndEntwinedModuleMachinery();
  },
};
