import { RunnableExample } from "./types";

declare function require(id: string): any;

type CSRig<R> = {
  readonly zero: R;
  readonly one: R;
  add(a: R, b: R): R;
  mul(a: R, b: R): R;
  eq(a: R, b: R): boolean;
};

type Fin<T> = { readonly elems: ReadonlyArray<T>; readonly eq: (a: T, b: T) => boolean };
type Pair<X, Y> = readonly [X, Y];

type FinMarkov<X, Y> = {
  readonly X: Fin<X>;
  readonly Y: Fin<Y>;
  readonly k: (x: X) => Map<Y, number>;
  then<Z>(that: FinMarkov<Y, Z>): FinMarkov<X, Z>;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean) => Fin<T>;
  readonly tensorObj: <X, Y>(X: Fin<X>, Y: Fin<Y>) => Fin<Pair<X, Y>>;
  readonly detK: <X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y) => FinMarkov<X, Y>;
  readonly FinMarkov: new <X, Y>(X: Fin<X>, Y: Fin<Y>, k: (x: X) => Map<Y, number>) => FinMarkov<X, Y>;
};

type MarkovComonoidWitness<X> = { readonly object: Fin<X>; readonly label?: string };

type MarkovComonoidReport<X> = {
  readonly holds: boolean;
  readonly copyCoassoc: boolean;
  readonly copyCommut: boolean;
  readonly copyCounitL: boolean;
  readonly copyCounitR: boolean;
  readonly details: string;
  readonly witness: MarkovComonoidWitness<X>;
};

type MarkovComonoidHomReport = {
  readonly preservesCopy: boolean;
  readonly preservesDiscard: boolean;
};

type MarkovComonoidModule = {
  readonly buildMarkovComonoidWitness: <X>(object: Fin<X>, options?: { readonly label?: string }) => MarkovComonoidWitness<X>;
  readonly checkMarkovComonoid: <X>(witness: MarkovComonoidWitness<X>) => MarkovComonoidReport<X>;
  readonly checkMarkovComonoidHom: <X, Y>(
    domain: MarkovComonoidWitness<X>,
    codomain: MarkovComonoidWitness<Y>,
    morphism: (x: X) => Map<Y, number>,
  ) => MarkovComonoidHomReport;
};

type MarkovDeterministicWitness<X, Y> = {
  readonly domain: MarkovComonoidWitness<X>;
  readonly codomain: MarkovComonoidWitness<Y>;
  readonly arrow: FinMarkov<X, Y>;
  readonly label?: string;
};

type MarkovDeterminismReport<X, Y> = {
  readonly holds: boolean;
  readonly deterministic: boolean;
  readonly comonoidHom: boolean;
  readonly details: string;
  readonly failures: ReadonlyArray<{ readonly message: string }>;
  readonly witness: MarkovDeterministicWitness<X, Y>;
};

type MarkovDeterministicModule = {
  readonly buildMarkovDeterministicWitness: <X, Y>(
    domain: MarkovComonoidWitness<X>,
    codomain: MarkovComonoidWitness<Y>,
    arrow: FinMarkov<X, Y>,
    options?: { readonly label?: string },
  ) => MarkovDeterministicWitness<X, Y>;
  readonly checkDeterministicComonoid: <X, Y>(
    witness: MarkovDeterministicWitness<X, Y>,
  ) => MarkovDeterminismReport<X, Y>;
};

type SetMultObj<T> = {
  readonly eq: (a: T, b: T) => boolean;
  readonly show: (value: T) => string;
  readonly label?: string;
  readonly samples?: ReadonlyArray<T>;
};

type SetMulti<A, B> = (a: A) => ReadonlySet<B>;

type SetMultCategoryModule = {
  readonly setMultObjFromFin: <T>(fin: Fin<T>, label?: string) => SetMultObj<T>;
  readonly kernelToSetMulti: <A, B>(codomain: Fin<B>, kernel: (a: A) => Map<B, number>) => SetMulti<A, B>;
};

type DeterministicSetMultWitness<A, B> = {
  readonly domain: SetMultObj<A>;
  readonly codomain: SetMultObj<B>;
  readonly morphism: SetMulti<A, B>;
  readonly label?: string;
};

type DeterministicSetMultResult<A, B> = {
  readonly deterministic: boolean;
  readonly holds: boolean;
  readonly details: string;
  readonly base?: (a: A) => B;
  readonly counterexample?: { readonly input: A; readonly fibre: ReadonlySet<B> };
};

type SetMultDeterminismSummary<A, B> = {
  readonly holds: boolean;
  readonly details: string;
  readonly report: DeterministicSetMultResult<A, B>;
};

type SetMultOracleModule = {
  readonly checkSetMultDeterministic: <A, B>(
    witness: DeterministicSetMultWitness<A, B>,
    samples: Iterable<A>,
  ) => SetMultDeterminismSummary<A, B>;
};

const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const markovComonoids = require("../../markov-comonoid-structure") as MarkovComonoidModule;
const markovDeterministic = require("../../markov-deterministic-structure") as MarkovDeterministicModule;
const setMultCategory = require("../../setmult-category") as SetMultCategoryModule;
const setMultOracles = require("../../setmult-oracles") as SetMultOracleModule;

const { mkFin, detK, FinMarkov } = markovCategory;
const { buildMarkovComonoidWitness, checkMarkovComonoid, checkMarkovComonoidHom } = markovComonoids;
const { buildMarkovDeterministicWitness, checkDeterministicComonoid } = markovDeterministic;
const { setMultObjFromFin, kernelToSetMulti } = setMultCategory;
const { checkSetMultDeterministic } = setMultOracles;

const describeBoolean = (value: boolean): string => (value ? "yes" : "no");

function comonoidSection(): readonly string[] {
  type Device = "sensor-A" | "sensor-B" | "sensor-C";
  type Status = "stable" | "unstable";

  const Devices = mkFin<Device>(["sensor-A", "sensor-B", "sensor-C"], (a, b) => a === b);
  const Statuses = mkFin<Status>(["stable", "unstable"], (a, b) => a === b);

  const deviceWitness = buildMarkovComonoidWitness(Devices, { label: "device state" });
  const statusWitness = buildMarkovComonoidWitness(Statuses, { label: "status" });

  const deviceReport = checkMarkovComonoid(deviceWitness);
  const statusReport = checkMarkovComonoid(statusWitness);

  const describeReport = <X>(label: string, report: MarkovComonoidReport<X>): string =>
    `${label}: holds=${describeBoolean(report.holds)} (Δ comm=${describeBoolean(report.copyCommut)}, counitL=${describeBoolean(report.copyCounitL)}, counitR=${describeBoolean(report.copyCounitR)})`;

  return [
    "== Comonoid witnesses for device and status objects ==",
    describeReport("Device comonoid", deviceReport),
    describeReport("Status comonoid", statusReport),
  ];
}

function deterministicVsNoisySection(): readonly string[] {
  type Device = "sensor-A" | "sensor-B" | "sensor-C";
  type Status = "stable" | "unstable";

  const Devices = mkFin<Device>(["sensor-A", "sensor-B", "sensor-C"], (a, b) => a === b);
  const Statuses = mkFin<Status>(["stable", "unstable"], (a, b) => a === b);

  const deviceWitness = buildMarkovComonoidWitness(Devices, { label: "device state" });
  const statusWitness = buildMarkovComonoidWitness(Statuses, { label: "status" });

  const calibrate = detK(Devices, Statuses, (device) => (device === "sensor-C" ? "unstable" : "stable"));
  const calibrationWitness = buildMarkovDeterministicWitness(deviceWitness, statusWitness, calibrate, {
    label: "calibration",
  });
  const calibrationReport = checkDeterministicComonoid(calibrationWitness);

  const calibrationHom = checkMarkovComonoidHom(deviceWitness, statusWitness, calibrate.k);

  const noisyArrow = new FinMarkov<Device, Status>(
    Devices,
    Statuses,
    (device) =>
      device === "sensor-C"
        ? new Map<Status, number>([
            ["stable", 0.25],
            ["unstable", 0.75],
          ])
        : new Map<Status, number>([
            ["stable", 0.6],
            ["unstable", 0.4],
          ]),
  );
  const noisyWitness = buildMarkovDeterministicWitness(deviceWitness, statusWitness, noisyArrow, {
    label: "noisy dispatch",
  });
  const noisyReport = checkDeterministicComonoid(noisyWitness);

  const firstFailure = noisyReport.failures[0]?.message ?? "no failures recorded";

  return [
    "== Deterministic vs noisy Markov morphisms ==",
    `Calibration morphism: deterministic=${describeBoolean(calibrationReport.deterministic)}, preserves copy=${describeBoolean(calibrationHom.preservesCopy)}, preserves discard=${describeBoolean(calibrationHom.preservesDiscard)}`,
    `Noisy morphism: deterministic=${describeBoolean(noisyReport.deterministic)}, comonoid-hom=${describeBoolean(noisyReport.comonoidHom)} (${firstFailure})`,
  ];
}

function setMultBridgeSection(): readonly string[] {
  type Device = "sensor-A" | "sensor-B" | "sensor-C";
  type Status = "stable" | "unstable";

  const Devices = mkFin<Device>(["sensor-A", "sensor-B", "sensor-C"], (a, b) => a === b);
  const Statuses = mkFin<Status>(["stable", "unstable"], (a, b) => a === b);

  const deviceWitness = buildMarkovComonoidWitness(Devices, { label: "device state" });
  const statusWitness = buildMarkovComonoidWitness(Statuses, { label: "status" });

  const calibrate = detK(Devices, Statuses, (device) => (device === "sensor-C" ? "unstable" : "stable"));
  const noisyArrow = new FinMarkov<Device, Status>(
    Devices,
    Statuses,
    (device) =>
      device === "sensor-C"
        ? new Map<Status, number>([
            ["stable", 0.25],
            ["unstable", 0.75],
          ])
        : new Map<Status, number>([
            ["stable", 0.6],
            ["unstable", 0.4],
          ]),
  );

  const deviceSet = setMultObjFromFin(Devices, "device state");
  const statusSet = setMultObjFromFin(Statuses, "status classification");

  const calibrationSetWitness: DeterministicSetMultWitness<Device, Status> = {
    domain: deviceSet,
    codomain: statusSet,
    morphism: kernelToSetMulti(Statuses, calibrate.k),
    label: "calibration",
  };
  const calibrationSetReport = checkSetMultDeterministic(calibrationSetWitness, Devices.elems);

  const noisySetWitness: DeterministicSetMultWitness<Device, Status> = {
    domain: deviceSet,
    codomain: statusSet,
    morphism: kernelToSetMulti(Statuses, noisyArrow.k),
    label: "noisy dispatch",
  };
  const noisySetReport = checkSetMultDeterministic(noisySetWitness, Devices.elems);

  const counterexampleDescription = noisySetReport.report.counterexample
    ? `${noisySetReport.report.counterexample.input} fibre=${Array.from(noisySetReport.report.counterexample.fibre).join(",")}`
    : "no counterexample";

  return [
    "== SetMult determinism bridge ==",
    `Calibration SetMult witness: deterministic=${describeBoolean(calibrationSetReport.holds)} (${calibrationSetReport.details})`,
    `Noisy SetMult witness: deterministic=${describeBoolean(noisySetReport.holds)} (${noisySetReport.details}; ${counterexampleDescription})`,
  ];
}

export const stage061MarkovComonoidAndSetMultDeterministicBridge: RunnableExample = {
  id: "061",
  title: "Markov comonoid and SetMult deterministic bridge",
  outlineReference: 61,
  summary:
    "Build comonoid witnesses, verify copy/discard homomorphisms, and translate deterministic Markov kernels into SetMult witnesses with counterexamples when laws fail.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      comonoidSection(),
      [""],
      deterministicVsNoisySection(),
      [""],
      setMultBridgeSection(),
    ];

    const logs = sections.flatMap((section, index) =>
      index === sections.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
