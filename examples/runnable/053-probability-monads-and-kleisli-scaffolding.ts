import type { RunnableExample } from "./types";

declare function require(id: string): any;

type Dist<T> = Map<T, number>;

type Fin<T> = {
  readonly elems: ReadonlyArray<T>;
  readonly eq: (a: T, b: T) => boolean;
  readonly show?: (value: T) => string;
};

type DistLikeMonadSpec = {
  of<T>(value: T): Dist<T>;
  map<A, B>(dist: Dist<A>, f: (value: A) => B): Dist<B>;
  bind<A, B>(dist: Dist<A>, k: (value: A) => Dist<B>): Dist<B>;
  product<A, B>(left: Dist<A>, right: Dist<B>): Dist<readonly [A, B]>;
  isAffine1: boolean;
};

type KleisliToolkit = {
  readonly composeK: <X, Y, Z>(
    f: (x: X) => Dist<Y>,
    g: (y: Y) => Dist<Z>,
  ) => (x: X) => Dist<Z>;
  readonly tensorK: <X1, Y1, X2, Y2>(
    f: (x: X1) => Dist<Y1>,
    g: (x: X2) => Dist<Y2>,
  ) => (input: readonly [X1, X2]) => Dist<readonly [Y1, Y2]>;
  // detKleisli requires the source and target finite types and a pure function
  // X->Y. The runtime implementation takes (Fin<X>, Fin<Y>, f) -> Kleisli.
  readonly detKleisli: <X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y) => (x: X) => Dist<Y>;
  readonly copyK: <X>() => (x: X) => Dist<readonly [X, X]>;
  readonly FinKleisli: new <X, Y>(X: Fin<X>, Y: Fin<Y>, k: (x: X) => Dist<Y>) => FinKleisli<X, Y>;
  readonly isMarkovCategory: boolean;
};

type FinKleisli<X, Y> = {
  readonly X: Fin<X>;
  readonly Y: Fin<Y>;
  readonly k: (x: X) => Dist<Y>;
  then<Z>(that: FinKleisli<Y, Z>): FinKleisli<X, Z>;
  tensor<Z, W>(that: FinKleisli<Z, W>): FinKleisli<readonly [X, Z], readonly [Y, W]>;
  matrix(): number[][];
  pretty(digits?: number): string;
};

type ProbabilityMonadsModule = {
  readonly DistMonad: DistLikeMonadSpec;
  readonly SubProbMonad: DistLikeMonadSpec;
  readonly WeightedMonad: DistLikeMonadSpec;
  readonly makeKleisli: (spec: DistLikeMonadSpec) => KleisliToolkit;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean) => Fin<T>;
};

const probabilityMonads = require("../../probability-monads") as ProbabilityMonadsModule;
const markovCategory = require("../../markov-category") as MarkovCategoryModule;

const { DistMonad, SubProbMonad, WeightedMonad, makeKleisli } = probabilityMonads;
const { mkFin } = markovCategory;

const distKit = makeKleisli(DistMonad);
const subProbKit = makeKleisli(SubProbMonad);
const weightedKit = makeKleisli(WeightedMonad);

type SpecDescriptor = {
  readonly name: string;
  readonly spec: DistLikeMonadSpec;
  readonly kit: KleisliToolkit;
};

const specs: ReadonlyArray<SpecDescriptor> = [
  { name: "Dist (probability)", spec: DistMonad, kit: distKit },
  { name: "SubProb (subprobability)", spec: SubProbMonad, kit: subProbKit },
  { name: "Weighted", spec: WeightedMonad, kit: weightedKit },
];

type Label = "keep" | "retry";
const baseDist: Dist<Label> = new Map<Label, number>([
  ["keep", 0.6],
  ["retry", 0.5],
]);

function totalMass<T>(dist: Dist<T>): number {
  let sum = 0;
  for (const weight of dist.values()) sum += weight;
  return sum;
}

function describeValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(describeValue).join(", ")}]`;
  }
  if (value instanceof Map) {
    return `Map(${value.size})`;
  }
  if (typeof value === "object" && value !== null && "name" in (value as Record<string, unknown>)) {
    const maybeName = (value as { name?: unknown }).name;
    if (typeof maybeName === "string") return maybeName;
  }
  return String(value);
}

function formatDistribution<T>(dist: Dist<T>): string {
  if (dist.size === 0) return "∅";
  return Array.from(dist.entries())
    .map(([value, weight]) => `${describeValue(value)}:${weight.toFixed(3)}`)
    .join(", ");
}

function branch(label: Label): Dist<string> {
  return label === "keep"
    ? new Map<string, number>([
        ["ship", 0.9],
        ["inspect", 0.1],
      ])
    : new Map<string, number>([
        ["ship", 0.3],
        ["inspect", 0.7],
      ]);
}

function describeSpecs(): readonly string[] {
  const heading = ["== Dist/SubProb/Weighted monad comparison =="];
  const sections = specs.map(({ name, spec, kit }) => {
    const mapped = spec.map(baseDist, (label) => label.toUpperCase());
    const bound = spec.bind(baseDist, branch);
    const paired = spec.product(baseDist, baseDist);
    return [
      `-- ${name} (affine=${spec.isAffine1 ? "yes" : "no"}, Markov=${kit.isMarkovCategory ? "yes" : "no"})`,
      `Map result: ${formatDistribution(mapped)} | mass=${totalMass(mapped).toFixed(3)}`,
      `Bind result: ${formatDistribution(bound)} | mass=${totalMass(bound).toFixed(3)}`,
      `Product result: ${formatDistribution(paired)} | mass=${totalMass(paired).toFixed(3)}`,
    ];
  });

  return sections.reduce<readonly string[]>((acc, section, index) => {
    const withSpacing = index === sections.length - 1 ? section : [...section, ""];
    return index === 0 ? [...heading, ...withSpacing] : [...acc, ...withSpacing];
  }, heading);
}

type WeatherState = "clear" | "cloudy" | "rain";
type MoodState = "optimistic" | "neutral" | "concerned";
type Activity = "cycle" | "train" | "plan" | "indoors";

const Weather = mkFin<WeatherState>(["clear", "cloudy", "rain"], (a, b) => a === b);
const Mood = mkFin<MoodState>(["optimistic", "neutral", "concerned"], (a, b) => a === b);
const Activities = mkFin<Activity>(["cycle", "train", "plan", "indoors"], (a, b) => a === b);

const weatherToMood: (state: WeatherState) => Dist<MoodState> = (state) => {
  switch (state) {
    case "clear":
      return new Map<MoodState, number>([
        ["optimistic", 0.7],
        ["neutral", 0.2],
        ["concerned", 0.1],
      ]);
    case "cloudy":
      return new Map<MoodState, number>([
        ["optimistic", 0.3],
        ["neutral", 0.5],
        ["concerned", 0.2],
      ]);
    case "rain":
    default:
      return new Map<MoodState, number>([
        ["optimistic", 0.1],
        ["neutral", 0.4],
        ["concerned", 0.5],
      ]);
  }
};

const moodToActivity: (mood: MoodState) => Dist<Activity> = (mood) => {
  switch (mood) {
    case "optimistic":
      return new Map<Activity, number>([
        ["cycle", 0.5],
        ["train", 0.2],
        ["plan", 0.3],
      ]);
    case "neutral":
      return new Map<Activity, number>([
        ["train", 0.4],
        ["plan", 0.4],
        ["indoors", 0.2],
      ]);
    case "concerned":
    default:
      return new Map<Activity, number>([
        ["train", 0.3],
        ["plan", 0.2],
        ["indoors", 0.5],
      ]);
  }
};

const WeatherToMood = new distKit.FinKleisli(Weather, Mood, weatherToMood);
const MoodToActivity = new distKit.FinKleisli(Mood, Activities, moodToActivity);
const WeatherToActivity = WeatherToMood.then(MoodToActivity);

function describeComposition(): readonly string[] {
  const matrixLines = WeatherToActivity.pretty(3)
    .split("\n")
    .map((row) => `    ${row}`);
  const clear = formatDistribution(WeatherToActivity.k("clear"));
  const rainy = formatDistribution(WeatherToActivity.k("rain"));
  return [
    "== Dist Kleisli composition ==",
    "Weather ▷ Activity via Mood (matrix rows: weather, columns: activities)",
    ...matrixLines,
    `clear ↦ ${clear}`,
    `rain ↦ ${rainy}`,
  ];
}

const tensorDemo = WeatherToMood.tensor(MoodToActivity);

function describeTensor(): readonly string[] {
  const sampleInput: readonly [WeatherState, MoodState] = ["clear", "optimistic"];
  const sample = tensorDemo.k(sampleInput);
  const formatted = formatDistribution(sample);
  return [
    "== Tensoring kernels ==",
    "Tensoring Weather→Mood with Mood→Activity yields a kernel on Weather×Mood.",
    `[clear ⊗ optimistic] ↦ ${formatted}`,
  ];
}

const commutePlanner = new distKit.FinKleisli(
  Weather,
  Activities,
  // detKleisli expects Fin<X>, Fin<Y>, and a pure function X->Y; previously the
  // call passed only the function which made `f` undefined inside the Kleisli
  // implementation (TypeError: f is not a function). Provide the Fin arguments.
  distKit.detKleisli(Weather, Activities, (state: WeatherState): Activity => (state === "clear" ? "cycle" : "train")),
);

function describeDeterministic(): readonly string[] {
  const copy = distKit.copyK<WeatherState>();
  const duplicated = formatDistribution(copy("cloudy"));
  const deterministic = formatDistribution(commutePlanner.k("cloudy"));
  return [
    "== Deterministic embeddings ==",
    "detKleisli lifts pure routing decisions into the probability Kleisli category.",
    `copyK(cloudy) ↦ ${duplicated}`,
    `commutePlanner(cloudy) ↦ ${deterministic}`,
  ];
}

export const stage053ProbabilityMonadsAndKleisliScaffolding: RunnableExample = {
  id: "053",
  title: "Probability monads and Kleisli scaffolding",
  outlineReference: 53,
  summary:
    "Compare Dist/SubProb/Weighted monads, then compose finite Kleisli kernels, tensor them, and surface deterministic embeddings.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      describeSpecs(),
      describeComposition(),
      describeTensor(),
      describeDeterministic(),
    ];

    const logs = sections.flatMap((section, index, array) =>
      index === array.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
