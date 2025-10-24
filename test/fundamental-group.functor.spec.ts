import { describe, expect, it } from "vitest";

import {
  annulusCW,
  circleCW,
  diskCW,
  annulusRetractionToCircle,
  circleIntoAnnulusInclusion,
  circleIntoDiskInclusion,
  diskRadialRetractionToCircle,
  type PointedCWMap,
  pointedCWCategory,
  validatePointedCWComplex,
  validatePointedCWMap,
} from "../pointed-cw-complex";
import {
  buildFundamentalGroupFunctor,
  brouwerFixedPointFromNoRetraction,
  computeFundamentalGroup,
  retractionObstructionFromPi1,
} from "../fundamental-group";
import { wordEquals, wordFromGenerator } from "../free-group";

const collectComposablePairs = <Obj, Arr>(
  arrows: ReadonlyArray<Arr>,
  category: { src: (arrow: Arr) => Obj; dst: (arrow: Arr) => Obj },
): ReadonlyArray<{ readonly f: Arr; readonly g: Arr }> =>
  arrows.flatMap((f) =>
    arrows.filter((g) => category.src(g) === category.dst(f)).map((g) => ({ f, g })),
  );

describe("fundamental group functor", () => {
  const circle = circleCW();
  const disk = diskCW();
  const annulus = annulusCW();
  const inclusionCircleAnnulus = circleIntoAnnulusInclusion(circle, annulus);
  const retractionAnnulusCircle = annulusRetractionToCircle(annulus, circle);
  const inclusionCircleDisk = circleIntoDiskInclusion(circle, disk);
  const retractionDiskCircle = diskRadialRetractionToCircle(disk, circle);
  const category = pointedCWCategory("CW¹", [circle, annulus, disk], [
    inclusionCircleAnnulus,
    retractionAnnulusCircle,
    inclusionCircleDisk,
    retractionDiskCircle,
  ]);

  it("validates the CW complexes", () => {
    expect(validatePointedCWComplex(circle).valid).toBe(true);
    expect(validatePointedCWComplex(annulus).valid).toBe(true);
    expect(validatePointedCWComplex(disk).valid).toBe(true);
  });

  it("computes fundamental groups with expected generators", () => {
    const circleData = computeFundamentalGroup(circle);
    const annulusData = computeFundamentalGroup(annulus);
    const diskData = computeFundamentalGroup(disk);
    expect(circleData.group.generators).toHaveLength(1);
    expect(annulusData.group.generators).toHaveLength(1);
    expect(diskData.group.generators).toHaveLength(0);
    expect(circleData.generatorLoops[0]?.loop).toEqual(["loop"]);
    expect(annulusData.generatorLoops[0]?.loop).toContain("loop");
  });

  const { functor, objectData, arrowData, category: groupCategory } = buildFundamentalGroupFunctor(category);

  it("produces a functor that preserves identities and composition on samples", () => {
    expect(functor.report.holds).toBe(true);
    expect(functor.report.preservesIdentities).toBe(true);
    expect(functor.report.preservesComposition).toBe(true);
    expect(collectComposablePairs(groupCategory.arrows, groupCategory).length).toBeGreaterThan(0);
  });

  it("sends the circle generator to the identity inside the disk", () => {
    const circleData = objectData.get(circle);
    const inclusionHom = arrowData.get(inclusionCircleDisk);
    expect(circleData).toBeDefined();
    expect(inclusionHom).toBeDefined();
    if (circleData === undefined || inclusionHom === undefined) {
      return;
    }
    const generator = wordFromGenerator(circleData.generatorLoops[0]!.id);
    expect(inclusionHom.map(generator)).toEqual([]);
  });

  it("detects annulus retraction as π₁-compatible", () => {
    const circleData = objectData.get(circle);
    const inclusionHom = arrowData.get(inclusionCircleAnnulus);
    const retractionHom = arrowData.get(retractionAnnulusCircle);
    expect(circleData).toBeDefined();
    expect(inclusionHom).toBeDefined();
    expect(retractionHom).toBeDefined();
    if (
      circleData === undefined ||
      inclusionHom === undefined ||
      retractionHom === undefined ||
      circleData.generatorLoops.length === 0
    ) {
      return;
    }
    const generator = wordFromGenerator(circleData.generatorLoops[0]!.id);
    const roundTrip = retractionHom.map(inclusionHom.map(generator));
    expect(wordEquals(generator, roundTrip)).toBe(true);
  });

  it("obstructs the disk-to-circle retraction attempt using π₁", () => {
    const obstruction = retractionObstructionFromPi1(retractionDiskCircle, inclusionCircleDisk);
    expect(obstruction.obstructed).toBe(true);
    expect(obstruction.details).toContain("π₁(r) ∘ π₁(i) fails to be the identity");
  });

  it("confirms the annulus deformation retract succeeds", () => {
    const obstruction = retractionObstructionFromPi1(retractionAnnulusCircle, inclusionCircleAnnulus);
    expect(obstruction.obstructed).toBe(false);
  });

  it("packages Brouwer's fixed-point corollary", () => {
    const result = brouwerFixedPointFromNoRetraction(disk, circle, inclusionCircleDisk, retractionDiskCircle);
    expect(result.holds).toBe(true);
    expect(result.obstruction?.details).toContain("fails to be the identity");
  });

  it("rejects non-basepoint-preserving maps during validation", () => {
    const badMap: PointedCWMap<string, string> = {
      name: "bad",
      source: circle,
      target: annulus,
      onVertex: () => "i",
      edgeImages: new Map<string, ReadonlyArray<string>>([
        ["loop", ["loop"]],
        ["loop_inv", ["loop_inv"]],
      ]),
    };
    const validation = validatePointedCWMap(badMap);
    expect(validation.valid).toBe(false);
    expect(validation.issues[0]).toContain("basepoint");
  });
});
