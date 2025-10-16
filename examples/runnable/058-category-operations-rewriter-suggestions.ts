import type {
  OperationContext,
  OperationRule,
  Suggestion,
  Rewrite,
} from "../../operations/rewriter";
import type { FinSetCategory, FuncArr } from "../../models/finset-cat";
import type { RunnableExample } from "./types";

declare function require(id: string): unknown;

const { FinSetCat } = require("../../models/finset-cat") as {
  FinSetCat: (universe: Record<string, readonly string[]>) => FinSetCategory;
};

const { Rewriter, defaultOperationRules } = require("../../operations/rewriter") as {
  Rewriter: new <Obj, Arr>(rules?: ReadonlyArray<OperationRule<Obj, Arr>>) => {
    analyze(context: OperationContext<Obj, Arr>): Suggestion<Obj, Arr>[];
  };
  defaultOperationRules: <Obj, Arr>() => OperationRule<Obj, Arr>[];
};

type Section = readonly string[];

type Universe = Record<string, readonly string[]>;

const universe: Universe = {
  A: ["a1", "a2"],
  B: ["b1", "b2"],
  R: ["r1", "r2"],
  S: ["s1", "s2"],
  X: ["x1", "x2"],
};

function registerSampleArrows(category: FinSetCategory): {
  readonly u: FuncArr;
  readonly v: FuncArr;
  readonly r: FuncArr;
  readonly s: FuncArr;
  readonly g: FuncArr;
  readonly h: FuncArr;
} {
  const registry = category.arrows as FuncArr[];

  const u: FuncArr = {
    name: "u",
    dom: "A",
    cod: "B",
    map: (value) => (value === "a1" ? "b2" : "b1"),
  };

  const v: FuncArr = {
    name: "v",
    dom: "B",
    cod: "A",
    map: (value) => (value === "b1" ? "a2" : "a1"),
  };

  const r: FuncArr = {
    name: "r",
    dom: "R",
    cod: "X",
    map: (value) => (value === "r1" ? "x1" : "x2"),
  };

  const s: FuncArr = {
    name: "s",
    dom: "S",
    cod: "X",
    map: (value) => (value === "s1" ? "x1" : "x2"),
  };

  const g: FuncArr = {
    name: "g",
    dom: "R",
    cod: "S",
    map: (value) => (value === "r1" ? "s1" : "s2"),
  };

  const h: FuncArr = {
    name: "h",
    dom: "S",
    cod: "R",
    map: (value) => (value === "s1" ? "r1" : "r2"),
  };

  registry.push(u, v, r, s, g, h);

  return { u, v, r, s, g, h };
}

function describeRewrite(rewrite: Rewrite<string, FuncArr>): string {
  switch (rewrite.kind) {
    case "NormalizeComposite":
      return `Cancel path positions ${rewrite.removeStart}–${rewrite.removeStart + rewrite.removeCount - 1}: ${rewrite.description}`;
    case "UpgradeToIso":
      return `Upgrade ${rewrite.arrow.name} with inverse ${rewrite.inverse.name}`;
    case "ReplaceWithIdentity":
      return `Replace (${rewrite.composite[0]?.name ?? "?"}) ∘ (${rewrite.composite[1]?.name ?? "?"}) by identity: ${rewrite.description}`;
    case "MergeSubobjects":
      return `Merge subobjects ${rewrite.left} and ${rewrite.right} via ${rewrite.forward.name}/${rewrite.backward.name}`;
    case "MergeObjects":
      return `Merge objects ${rewrite.left} and ${rewrite.right} using ${rewrite.forward.name}/${rewrite.backward.name}`;
    case "FactorThroughEpiMono":
      return `Factor ${rewrite.arrow.name} as ${rewrite.mono.name} ∘ ${rewrite.epi.name}`;
    default:
      return `Unhandled rewrite ${JSON.stringify(rewrite)}`;
  }
}

function summariseSuggestions(
  headline: string,
  suggestions: readonly Suggestion<string, FuncArr>[],
): Section {
  if (suggestions.length === 0) {
    return [headline, "  • no suggestions produced"];
  }

  const entries = suggestions.flatMap((suggestion) => [
    `  • [${suggestion.severity}] ${suggestion.message} (oracle: ${suggestion.oracle})`,
    ...suggestion.rewrites.map((rewrite) => `    - ${describeRewrite(rewrite)}`),
  ]);

  return [headline, ...entries];
}

function describeOperations(category: FinSetCategory): readonly Section[] {
  const rules = defaultOperationRules<string, FuncArr>();
  const [isoRule, upgradeRule, balancedRule, epiMonoRule, mergeObjectsRule, mergeSubobjectsRule] =
    rules;

  if (!isoRule || !upgradeRule || !balancedRule || !epiMonoRule || !mergeObjectsRule || !mergeSubobjectsRule) {
    throw new Error("defaultOperationRules returned an unexpected rule set");
  }

  const { u, v, r, s } = registerSampleArrows(category);

  const inversePass = new Rewriter<string, FuncArr>([isoRule]);
  const inverseSuggestions = inversePass.analyze({ category, path: [u, v, u] });

  const upgradePass = new Rewriter<string, FuncArr>([upgradeRule]);
  const upgradeSuggestions = upgradePass.analyze({ category, focus: u });

  const balancedPass = new Rewriter<string, FuncArr>([balancedRule]);
  const balancedSuggestions = balancedPass.analyze({ category, focus: u });

  const epiMonoPass = new Rewriter<string, FuncArr>([epiMonoRule]);
  const epiMonoSuggestions = epiMonoPass.analyze({ category, focus: r });

  const mergeObjectsPass = new Rewriter<string, FuncArr>([mergeObjectsRule]);
  const mergeObjectSuggestions = mergeObjectsPass.analyze({ category });

  const mergeSubobjectsPass = new Rewriter<string, FuncArr>([mergeSubobjectsRule]);
  const mergeSubobjectSuggestions = mergeSubobjectsPass.analyze({ category });

  return [
    summariseSuggestions("== Cancel inverse pairs ==", inverseSuggestions),
    summariseSuggestions("== Upgrade monic arrows with sections ==", upgradeSuggestions),
    summariseSuggestions("== Balanced mono+epi promotions ==", balancedSuggestions),
    summariseSuggestions("== Epi-mono factorisations ==", epiMonoSuggestions),
    summariseSuggestions("== Merge isomorphic objects ==", mergeObjectSuggestions),
    summariseSuggestions("== Merge mutually factoring monos ==", mergeSubobjectSuggestions),
  ];
}

export const stage058CategoryOperationsRewriterSuggestions: RunnableExample = {
  id: "058",
  title: "Category operations rewriter suggestions",
  outlineReference: 58,
  summary:
    "Execute the rewrite rules to expose inverse cancellation, monic upgrades, balanced promotions, epi–mono factors, and merge hints in FinSet.",
  async run() {
    const category = FinSetCat(universe);
    const sections = describeOperations(category);

    const logs = sections.flatMap((section, index, array) =>
      index === array.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
