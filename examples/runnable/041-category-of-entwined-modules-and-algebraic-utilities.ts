import { RunnableExample } from "./types";

declare function require(id: string): any;

const all = require("../../allTS") as any;

const {
  SemiringNat,
  SemiringProb,
  makeDiagonalAlgebra,
  makeDiagonalCoring,
  makeDiagonalEntwining,
  makeDiagonalComodule,
  makeTaggedLeftModule,
  entwinedFromComodule_AotimesM,
  entwinedFromLeftModule_NotimesC,
  categoryOfEntwinedModules,
  isOk,
  graphAdjNat,
  graphAdjBool,
  graphAdjWeights,
  countPathsOfLength,
  reachableWithin,
  shortestPathsUpTo,
  transitiveClosureBool,
  compileRegexToWA,
  waRun,
  waAcceptsBool,
  diagFromVec,
  hmmForward,
} = all;

type Mat<R> = ReadonlyArray<ReadonlyArray<R>>;

type WeightedAutomaton<R, Sym extends string> = {
  readonly S: unknown;
  readonly n: number;
  readonly init: ReadonlyArray<R>;
  readonly final: ReadonlyArray<R>;
  readonly delta: Record<Sym, Mat<R>>;
};

type HMM<R, Obs extends string> = {
  readonly S: unknown;
  readonly n: number;
  readonly T: Mat<R>;
  readonly E: Record<Obs, Mat<R>>;
  readonly pi: ReadonlyArray<R>;
};

function formatNumberMatrix(matrix: ReadonlyArray<ReadonlyArray<number>>): string {
  return matrix
    .map((row) => `[${row.map((value) => value.toFixed(3).replace(/\.000$/, "")).join(", ")}]`)
    .join("; ");
}

function formatBooleanMatrix(matrix: ReadonlyArray<ReadonlyArray<boolean>>): string {
  return matrix.map((row) => `[${row.map((value) => (value ? "T" : "·")).join(" ")}]`).join("; ");
}

function permuteBasis(dimension: number, sigma: (index: number) => number): Mat<number> {
  const matrix: number[][] = Array.from({ length: dimension }, () => Array.from({ length: dimension }, () => 0));
  for (let i = 0; i < dimension; i++) {
    matrix[sigma(i)]![i] = 1;
  }
  return matrix;
}

export const stage041CategoryOfEntwinedModulesAndAlgebraicUtilities: RunnableExample = {
  id: "041",
  title: "Category of entwined modules and algebraic utilities",
  outlineReference: 41,
  summary:
    "Build entwined-module morphisms, verify categorical composition, and exercise weighted automata, HMM, regex, and graph analytics utilities.",
  async run() {
    // ===== Entwined modules and categorical structure =====
    const algebra = makeDiagonalAlgebra(SemiringNat)(2);
    const coring = makeDiagonalCoring(SemiringNat)(3);
    const entwining = makeDiagonalEntwining(algebra, coring);

    const comoduleShifts = [0, 1, 2] as const;
    const comodules = comoduleShifts.map((shift) =>
      makeDiagonalComodule(coring)(2, (k: number) => (k + shift) % coring.n),
    );

    const aTensorM = comodules.map((comodule) => entwinedFromComodule_AotimesM(entwining)(comodule));
    const nTensorC = makeTaggedLeftModule(algebra)(2, (j: number) => j % algebra.k);
    const liftedLeftModule = entwinedFromLeftModule_NotimesC(entwining)(nTensorC);

    const category = categoryOfEntwinedModules(entwining);
    const [X, Y, Z] = aTensorM as [any, any, any];

    const swapWithinBlock = (index: number): number => {
      const block = Math.floor(index / 2);
      const position = index % 2;
      return block * 2 + (position ^ 1);
    };

    const homXY = permuteBasis(X.m, swapWithinBlock);
    const homYZ = permuteBasis(Y.m, swapWithinBlock);
    const composed = category.compose(X, Y, Z)(homYZ, homXY);

    const compositionSummary = isOk(composed)
      ? `Composition succeeds → dim ${composed.value.length}×${composed.value[0]?.length ?? 0}`
      : `Composition failed → ${composed.error}`;

    const entwinedSection = [
      "== Entwined module category ==",
      `Algebra rank: ${algebra.k}, Coring rank: ${coring.n}`,
      `A⊗M objects dimensions → X=${X.m}, Y=${Y.m}, Z=${Z.m}`,
      `N⊗C construction dimension → ${liftedLeftModule.m}`,
      `X→Y morphism respects entwining → ${category.isHom(X, Y, homXY) ? "yes" : "no"}`,
      `Y→Z morphism respects entwining → ${category.isHom(Y, Z, homYZ) ? "yes" : "no"}`,
      compositionSummary,
      `Identity on X remains lawful → ${category.isHom(X, X, category.id(X)) ? "yes" : "no"}`,
    ];

    // ===== Graph analytics over multiple semirings =====
    const edges: ReadonlyArray<readonly [number, number, number?]> = [
      [0, 1, 1],
      [1, 2, 1],
      [0, 2, 5],
      [2, 3, 2],
    ];
    const adjacencyNat = graphAdjNat(4, edges.map(([u, v]) => [u, v] as const));
    const adjacencyBool = graphAdjBool(4, edges.map(([u, v]) => [u, v] as const));
    const adjacencyWeights = graphAdjWeights(4, edges);

    const twoStepCounts = countPathsOfLength(adjacencyNat, 2);
    const reachability = reachableWithin(adjacencyBool, 3);
    const shortest = shortestPathsUpTo(adjacencyWeights, 3);

    const graphSection = [
      "== Graph analytics across semirings ==",
      `2-step path counts (0→3) → ${twoStepCounts[0]?.[3] ?? 0}`,
      `Reachability ≤3 steps (0→3) → ${reachability[0]?.[3] ? "reachable" : "blocked"}`,
      `Shortest path cost (0→3) → ${shortest[0]?.[3] ?? Number.POSITIVE_INFINITY}`,
      `Adjacency (ℕ) → ${formatNumberMatrix(adjacencyNat)}`,
      `Reachability closure → ${formatBooleanMatrix(reachability)}`,
    ];

    // ===== Weighted automata, HMM, and regex compilation =====
    const automaton: WeightedAutomaton<number, "a" | "b"> = {
      S: SemiringNat,
      n: 2,
      init: [1, 0],
      final: [0, 1],
      delta: {
        a: [
          [0, 1],
          [0, 0],
        ],
        b: [
          [0, 0],
          [0, 1],
        ],
      },
    };

    const automatonSection = [
      "== Weighted automata and regular languages ==",
      `Weight of "ab" → ${waRun(automaton)(["a", "b"])}`,
      `Weight of "aa" → ${waRun(automaton)(["a", "a"])}`,
      `Regex a+ accepts "aa" → ${waAcceptsBool(compileRegexToWA("a+", ["a"]))(["a", "a"])}`,
      `Regex b? accepts "" → ${waAcceptsBool(compileRegexToWA("b?", ["b"]))([])}`,
      `Regex ([a-c]b)* accepts "abcb" → ${waAcceptsBool(compileRegexToWA("([a-c]b)*", ["a", "b", "c"]))([
        "a",
        "b",
        "c",
        "b",
      ])}`,
    ];

    const emissionX = diagFromVec(SemiringProb)([0.7, 0.1]);
    const emissionY = diagFromVec(SemiringProb)([0.3, 0.9]);
    const hmm: HMM<number, "x" | "y"> = {
      S: SemiringProb,
      n: 2,
      T: [
        [0.9, 0.1],
        [0.2, 0.8],
      ],
      E: { x: emissionX, y: emissionY },
      pi: [0.5, 0.5],
    };

    const hmmSection = [
      "== Hidden Markov inference ==",
      `Forward probability P(xyy) → ${hmmForward(hmm)(["x", "y", "y"]).toFixed(6)}`,
    ];

    const transitive = transitiveClosureBool(
      [
        [false, true, false],
        [false, false, true],
        [false, false, false],
      ],
      true,
    );

    const closureSection = [
      "== Transitive closure diagnostics ==",
      `Reflexive reachability matrix → ${formatBooleanMatrix(transitive)}`,
    ];

    const logs = [
      ...entwinedSection,
      ...graphSection,
      ...automatonSection,
      ...hmmSection,
      ...closureSection,
    ];

    return { logs };
  },
};
