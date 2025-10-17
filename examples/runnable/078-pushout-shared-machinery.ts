import type { FiniteCategory } from "../../finite-cat";
import type { PushoutCalc, PushoutData } from "../../pushout";
import { makeFinitePushoutCalc } from "../../pushout";
import { isEpi } from "../../kinds/mono-epi";
import type { RunnableExample } from "./types";

type Obj = "X" | "Z" | "A" | "B" | "Qf" | "Qg";

type Arrow = {
  readonly name: string;
  readonly src: Obj;
  readonly dst: Obj;
};

declare function require(id: string): any;

type PushoutFixture = {
  readonly PushoutCategory: FiniteCategory<Obj, Arrow>;
  readonly getArrow: (name: string) => Arrow;
};

const { PushoutCategory, getArrow } = require("../../test/pushout-fixture") as PushoutFixture;

const calculator: PushoutCalc<Obj, Arrow> = makeFinitePushoutCalc(PushoutCategory);

const compose = (g: Arrow, f: Arrow) => PushoutCategory.compose(g, f);

const describePushout = (label: string, data: PushoutData<Obj, Arrow>): readonly string[] => [
  `${label}: apex ${data.apex}`,
  `  • induced from codomain: ${data.fromDomain.name}`,
  `  • induced from anchor: ${data.fromAnchor.name}`,
];

const describeMediator = (
  mediator: Arrow,
  source: PushoutData<Obj, Arrow>,
  target: PushoutData<Obj, Arrow>,
): readonly string[] => {
  const domainCommutes = PushoutCategory.eq(
    compose(target.fromDomain, mediator),
    compose(getArrow("j"), source.fromDomain),
  );
  const anchorCommutes = PushoutCategory.eq(
    compose(target.fromAnchor, mediator),
    source.fromAnchor,
  );
  return [
    `Mediator ${mediator.name} factors coslice reindexing? ${domainCommutes && anchorCommutes}`,
    `  • domain leg condition: ${domainCommutes}`,
    `  • anchor leg condition: ${anchorCommutes}`,
  ];
};

const enumerateEpiStability = (anchor: Arrow): readonly string[] => {
  const epis = PushoutCategory.arrows.filter((arrow) =>
    isEpi(PushoutCategory, arrow) && PushoutCategory.src(arrow) === PushoutCategory.src(anchor),
  );

  if (epis.length === 0) {
    return ["No epimorphisms share the anchor domain; nothing to test."];
  }

  return epis.map((epi) => {
    const pushed = calculator.pushout(epi, anchor);
    const preserved = isEpi(PushoutCategory, pushed.fromAnchor);
    return `Epi ${epi.name} stays epi after pushout along ${anchor.name}? ${preserved} (leg ${pushed.fromAnchor.name})`;
  });
};

function runSharedPushoutMachinery(): readonly string[] {
  const f = getArrow("f");
  const g = getArrow("g");
  const h = getArrow("h");
  const j = getArrow("j");

  const qf = calculator.pushout(f, h);
  const qg = calculator.pushout(g, h);
  const mediator = calculator.coinduce(j, qg, qf);

  const dataMigrationLogs = [
    "== Coslice reindexing via universal pushout ==",
    ...describePushout("Pushout(f,h)", qf),
    ...describePushout("Pushout(g,h)", qg),
    ...describeMediator(mediator, qf, qg),
  ];

  const epiLogs = [
    "",
    "== Epimorphism stability across the same pushout data ==",
    ...enumerateEpiStability(h),
  ];

  return [...dataMigrationLogs, ...epiLogs];
}

export const stage078PushoutSharedMachinery: RunnableExample = {
  id: "078",
  title: "Pushout fixture shared across workflows",
  outlineReference: 78,
  summary:
    "Reuse the finite pushout fixture to power coslice reindexing (mediator computation) and epi-stability diagnostics with the same universal data.",
  run: async () => ({ logs: runSharedPushoutMachinery() }),
};

