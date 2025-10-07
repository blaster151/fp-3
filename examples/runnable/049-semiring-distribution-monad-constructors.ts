import { RunnableExample } from "./types";

declare function require(id: string): any;

type Distribution<T> = Map<T, any>;

type Rig<R> = {
  readonly add: (a: R, b: R) => R;
  readonly mul: (a: R, b: R) => R;
  readonly zero: R;
  readonly one: R;
  readonly eq?: (a: R, b: R) => boolean;
};

type DistMonad<R> = {
  readonly map: <A, B>(dist: Distribution<A>, f: (value: A) => B) => Distribution<B>;
  readonly bind: <A, B>(dist: Distribution<A>, f: (value: A) => Distribution<B>) => Distribution<B>;
  readonly product: <A, B>(a: Distribution<A>, b: Distribution<B>) => Distribution<[A, B]>;
};

type SemiringUtils = {
  readonly Prob: Rig<number>;
  readonly LogProb: Rig<number>;
  readonly MaxPlus: Rig<number>;
  readonly BoolRig: Rig<boolean>;
};

type SemiringDist = {
  readonly DRMonad: <R>(rig: Rig<R>) => DistMonad<R>;
  readonly mkRDist: <T, R>(rig: Rig<R>, pairs: ReadonlyArray<[T, R]>) => Distribution<T>;
  readonly normalizeR: <T, R>(rig: Rig<R>, dist: Distribution<T>) => Distribution<T>;
  readonly isDirac: <T, R>(rig: Rig<R>, dist: Distribution<T>) => boolean;
  readonly delta: <T>(value: T) => Distribution<T>;
};

const semiringUtils = require("../../semiring-utils") as SemiringUtils;
const semiringDist = require("../../semiring-dist") as SemiringDist;

const { Prob, LogProb, MaxPlus, BoolRig } = semiringUtils;
const { DRMonad, mkRDist, normalizeR, isDirac, delta } = semiringDist;

type Summary = readonly string[];

type DistributionFormatter = <T>(dist: Distribution<T>) => string;

const formatDistribution: DistributionFormatter = (dist) => {
  const entries = Array.from(dist.entries()).map(([value, weight]) => {
    const formatted = typeof weight === 'number' ? weight.toFixed(3) : String(weight);
    return `${String(value)}:${formatted}`;
  });
  return entries.length > 0 ? entries.join(", ") : "∅";
};

function probabilitySuite(): Summary {
  const monad = DRMonad(Prob);
  const coin = mkRDist(Prob, [
    ["heads", 0.6],
    ["tails", 0.4],
  ]);
  const weather = mkRDist(Prob, [
    ["rain", 0.2],
    ["sun", 0.8],
  ]);
  const payouts = (outcome: string) =>
    outcome === "heads"
      ? mkRDist(Prob, [
          ["win", 0.85],
          ["lose", 0.15],
        ])
      : mkRDist(Prob, [
          ["win", 0.25],
          ["lose", 0.75],
        ]);

  const mapped = monad.map(coin, (side) => side.toUpperCase());
  const bound = monad.bind(coin, payouts);
  const product = monad.product(coin, weather);

  return [
    "== Probability DR monad ==",
    `Coin distribution → ${formatDistribution(coin)}`,
    `Uppercased via fmap → ${formatDistribution(mapped)}`,
    `Bind with conditional payouts → ${formatDistribution(bound)}`,
    `Product coin×weather → ${formatDistribution(product)}`,
    `Dirac check on δ_heads → ${isDirac(Prob, delta("heads")) ? "true" : "false"}`,
  ];
}

function logProbabilitySuite(): Summary {
  const monad = DRMonad(LogProb);
  const logits = normalizeR(
    LogProb,
    mkRDist(LogProb, [
      ["accept", Math.log(0.7)],
      ["reject", Math.log(0.3)],
    ]),
  );
  const mapped = monad.map(logits, (label) => label.toUpperCase());
  const resampled = monad.bind(logits, (label) =>
    label === "accept"
      ? normalizeR(
          LogProb,
          mkRDist(LogProb, [
            ["ship", Math.log(0.9)],
            ["rework", Math.log(0.1)],
          ]),
        )
      : normalizeR(
          LogProb,
          mkRDist(LogProb, [
            ["ship", Math.log(0.2)],
            ["rework", Math.log(0.8)],
          ]),
        ),
  );

  return [
    "== Log-probability DR monad ==",
    `Logit distribution (normalised) → ${formatDistribution(logits)}`,
    `Map to uppercase tags → ${formatDistribution(mapped)}`,
    `Bind into shipping outcomes → ${formatDistribution(resampled)}`,
  ];
}

function maxPlusSuite(): Summary {
  const monad = DRMonad(MaxPlus);
  const travel = normalizeR(
    MaxPlus,
    mkRDist(MaxPlus, [
      ["fast", 0],
      ["slow", -3],
    ]),
  );
  const alternative = normalizeR(
    MaxPlus,
    mkRDist(MaxPlus, [
      ["direct", 0],
      ["detour", -2],
    ]),
  );
  const product = monad.product(travel, alternative);

  return [
    "== Max-plus DR monad ==",
    `Travel options (max-normalised) → ${formatDistribution(travel)}`,
    `Alternative legs → ${formatDistribution(alternative)}`,
    `Product path scores → ${formatDistribution(product)}`,
  ];
}

function booleanSuite(): Summary {
  const monad = DRMonad(BoolRig);
  const predicates = mkRDist(BoolRig, [
    ["p", true],
    ["q", true],
  ]);
  const conjunction = monad.product(predicates, predicates);

  return [
    "== Boolean DR monad ==",
    `Predicate support → ${formatDistribution(predicates)}`,
    `Cartesian product (logical conjunction) → ${formatDistribution(conjunction)}`,
  ];
}

export const stage049SemiringDistributionMonadConstructors: RunnableExample = {
  id: "049",
  title: "Semiring distribution monad constructors",
  outlineReference: 49,
  summary:
    "Construct DR monads for probability, log-probability, max-plus, and Boolean rigs with map/bind/product diagnostics and normalisation helpers.",
  async run() {
    const sections: Summary[] = [
      probabilitySuite(),
      logProbabilitySuite(),
      maxPlusSuite(),
      booleanSuite(),
    ];

    const logs = sections.flatMap((section, index, array) =>
      index === array.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
