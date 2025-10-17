import type { ContinuityWitness } from "../../src/top/ContinuousMap";
import type { RunnableExample } from "./types";

declare function require(id: string): any;

type ContinuousMapModule = typeof import("../../src/top/ContinuousMap");
type ContRegistryModule = typeof import("../../src/top/ContRegistry");
type SpacesModule = typeof import("../../src/top/Spaces");
type TopologyModule = typeof import("../../src/top/Topology");

type ContinuityError<X, Y> = Error & { readonly witness?: ContinuityWitness<X, Y> };

const { makeContinuousMap, compose, identity } = require("../../src/top/ContinuousMap") as ContinuousMapModule;
const { summarizeCont, runContAll } = require("../../src/top/ContRegistry") as ContRegistryModule;
const { sierpinskiStructure, discreteSpace, coSierpinskiStructure } = require("../../src/top/Spaces") as SpacesModule;
const { indiscrete } = require("../../src/top/Topology") as TopologyModule;

require("../../src/top/cont_packs");

const eqNum = (a: number, b: number) => a === b;

function formatSet(items: ReadonlyArray<number>): string {
  return `{ ${items.join(", ") || "∅"} }`;
}

function describeFailure<X, Y>(witness: ContinuityWitness<X, Y> | undefined): readonly string[] {
  if (!witness || witness.holds) {
    return ["  No continuity failure detected."];
  }
  const failures = witness.failures.map((entry, index) => {
    const open = formatSet(entry.open as ReadonlyArray<number>);
    const preimage = formatSet(entry.preimage as ReadonlyArray<number>);
    return `  Failure #${index + 1}: open ${open} has non-open preimage ${preimage}`;
  });
  return [
    `  holds? ${witness.holds}`,
    ...failures,
    `  verify() ⇒ ${witness.verify()}`,
  ];
}

function inspectNonContinuousMap(): readonly string[] {
  const source = sierpinskiStructure();
  const target = discreteSpace([0, 1], eqNum);
  const logs: string[] = ["== Non-continuous map detection =="];
  try {
    makeContinuousMap<number, number>({
      source,
      target,
      map: (x) => x,
    });
    logs.push("  Unexpected success while constructing the witness.");
  } catch (error) {
    const continuityError = error as ContinuityError<number, number>;
    logs.push(`  Error: ${continuityError.message}`);
    logs.push(...describeFailure(continuityError.witness));
  }
  return logs;
}

function inspectComposedWitness(): readonly string[] {
  const binary = discreteSpace([0, 1], eqNum);
  const identityBinary = identity(binary);
  const constantZero = makeContinuousMap<number, number>({
    source: binary,
    target: binary,
    map: () => 0,
  });
  const composite = compose(constantZero, identityBinary);
  const note = composite.witness.witness?.note ?? "<missing>";
  const structuredCount = (note.match(/via structured verification/g) ?? []).length;
  return [
    "== Composed witness notes ==",
    `  constant witness note: ${constantZero.witness.witness?.note ?? "<none>"}`,
    `  identity witness note: ${identityBinary.witness.witness?.note ?? "<none>"}`,
    `  composite witness note: ${note}`,
    `  structured-note count: ${structuredCount}`,
    `  composite verify() ⇒ ${composite.witness.verify()}`,
  ];
}

function summarizeRegistry(): readonly string[] {
  const report = runContAll();
  const summary = summarizeCont(report);
  const quotient = report.find((entry) => entry.tag === "Top/cont/quotient:classify-parity");
  const note = quotient?.witness?.note ?? "<no note>";
  const parityPreimage = quotient?.witness?.preimages.find((record) => record.open.length === 1 && record.open[0] === 0);
  const formattedPreimage = parityPreimage ? formatSet(parityPreimage.preimage as ReadonlyArray<number>) : "{ }";
  return [
    "== Registry snapshot ==",
    `  Entries: ${summary.total}, Passes: ${summary.passes}, Failures: ${summary.failures}`,
    `  Quotient classifier note: ${note}`,
    `  Even-class preimage: ${formattedPreimage}`,
  ];
}

function describeContinuityDiagnostics(): readonly string[] {
  const point = indiscrete([0]);
  const pointWitness = makeContinuousMap<number, number>({
    source: point,
    target: coSierpinskiStructure(),
    eqSource: eqNum,
    eqTarget: eqNum,
    map: () => 0,
  });
  return [
    "== Direct witness construction ==",
    `  indiscrete witness holds? ${pointWitness.witness.holds}`,
    `  note: ${pointWitness.witness.witness?.note ?? "<none>"}`,
  ];
}

export const stage082TopContinuityDiagnostics: RunnableExample = {
  id: "082",
  title: "Continuity diagnostics and registry reporters",
  outlineReference: 82,
  summary:
    "Capture enriched continuity witnesses, detect non-continuous maps, and surface registry summaries that reuse the shared descriptors.",
  run: async () => ({
    logs: [
      ...inspectNonContinuousMap(),
      "",
      ...inspectComposedWitness(),
      "",
      ...summarizeRegistry(),
      "",
      ...describeContinuityDiagnostics(),
    ],
  }),
};
