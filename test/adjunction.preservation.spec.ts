import { describe, expect, it } from "vitest";

import {
  constructAdjunctionWithWitness,
  type AdjunctionLimitPreservationSample,
  type AdjunctionColimitPreservationSample,
} from "../adjunction";
import { identityFunctorWithWitness } from "../functor";
import { identityNaturalTransformation } from "../natural-transformation";
import { CategoryLimits } from "../stdlib/category-limits";
import { IndexedFamilies } from "../stdlib/indexed-families";
import {
  SetCat,
  type SetHom,
  type SetObj,
} from "../set-cat";

type Index = "•";
type Arrow = "id_•";

const singleObjectShape = {
  objects: ["•" as Index],
  arrows: ["id_•" as Arrow],
  id: (_object: Index): Arrow => "id_•",
  compose: (g: Arrow, f: Arrow): Arrow => {
    if (g !== "id_•" || f !== "id_•") {
      throw new Error("singleObjectShape: attempted to compose non-identity arrows");
    }
    return "id_•";
  },
  src: (_arrow: Arrow): Index => "•",
  dst: (_arrow: Arrow): Index => "•",
  eq: (left: Arrow, right: Arrow): boolean => left === right,
};

const diagramForObject = (object: SetObj<unknown>) =>
  CategoryLimits.makeFiniteDiagram<Index, Arrow, SetObj<unknown>, SetHom<unknown, unknown>>({
    shape: singleObjectShape,
    onObjects: () => object,
    onMorphisms: () => SetCat.id(object),
  });

const makeIdentityLimit = (object: SetObj<unknown>) => {
  const diagram = diagramForObject(object);
  const legs = (index: Index): SetHom<unknown, unknown> => {
    if (index !== "•") {
      throw new Error(`makeIdentityLimit: unexpected index ${String(index)}`);
    }
    return SetCat.id(object);
  };
  return { diagram, cone: { tip: object, legs, diagram } };
};

const makeIdentityColimit = (object: SetObj<unknown>) => {
  const diagram = diagramForObject(object);
  const legs = (index: Index): SetHom<unknown, unknown> => {
    if (index !== "•") {
      throw new Error(`makeIdentityColimit: unexpected index ${String(index)}`);
    }
    return SetCat.id(object);
  };
  return { diagram, cocone: { coTip: object, legs, diagram } };
};

const makeLimitFactor = (object: SetObj<unknown>) =>
  (
    candidate: CategoryLimits.Cone<
      Index,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >,
  ) => {
    const leg = candidate.legs("•");
    if (leg.dom !== candidate.tip) {
      return {
        factored: false as const,
        reason: "Cone leg must originate at the candidate tip.",
      };
    }
    if (leg.cod !== object) {
      return {
        factored: false as const,
        reason: "Cone leg must land in the limiting object.",
      };
    }
    return { factored: true as const, mediator: leg };
  };

const makeColimitFactor = (object: SetObj<unknown>) =>
  (
    candidate: CategoryLimits.Cocone<
      Index,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >,
  ) => {
    const leg = candidate.legs("•");
    if (leg.cod !== candidate.coTip) {
      return {
        factored: false as const,
        reason: "Cocone leg must land at the candidate cotip.",
      };
    }
    if (leg.dom !== object) {
      return {
        factored: false as const,
        reason: "Cocone leg must originate at the diagram object.",
      };
    }
    return { factored: true as const, mediator: leg };
  };

const constantArrow = (
  domain: SetObj<unknown>,
  codomain: SetObj<unknown>,
  value: unknown,
): SetHom<unknown, unknown> =>
  SetCat.hom(domain, codomain, () => value);

describe("constructAdjunctionWithWitness – preservation metadata", () => {
  it("derives limit and colimit preservation analyses from supplied samples", () => {
    const left = identityFunctorWithWitness(SetCat);
    const right = identityFunctorWithWitness(SetCat);
    const unit = identityNaturalTransformation(left);
    const counit = identityNaturalTransformation(right);

    const baseObject = SetCat.obj(new Set([0, 1]));
    const altObject = SetCat.obj(new Set(["a", "b"]));
    const indexCarrier = IndexedFamilies.finiteIndex<Index>(["•"]);

    const { diagram: limitDiagram, cone: limitCone } = makeIdentityLimit(baseObject);
    const limitFactor = makeLimitFactor(baseObject);
    const limitSample: AdjunctionLimitPreservationSample<
      Index,
      SetObj<unknown>,
      SetHom<unknown, unknown>,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    > = {
      label: "identity-diagram",
      indices: indexCarrier.carrier,
      diagram: limitDiagram,
      limit: limitCone,
      factor: limitFactor,
      cones: [
        {
          tip: altObject,
          legs: () => constantArrow(altObject, baseObject, 0),
          diagram: limitDiagram,
        },
        {
          tip: baseObject,
          legs: () => SetCat.id(baseObject),
          diagram: limitDiagram,
        },
      ],
      sourceCones: [
        {
          tip: altObject,
          legs: () => constantArrow(altObject, baseObject, 1),
          diagram: limitDiagram,
        },
      ],
      details: ["Identity diagram limit preservation should hold exactly."],
    };

    const sabotagedLimitSample: AdjunctionLimitPreservationSample<
      Index,
      SetObj<unknown>,
      SetHom<unknown, unknown>,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    > = {
      label: "sabotaged-limit",
      indices: indexCarrier.carrier,
      diagram: limitDiagram,
      limit: limitCone,
      factor: () => ({ factored: false as const, reason: "Sabotaged mediator" }),
      cones: [
        {
          tip: altObject,
          legs: () => constantArrow(altObject, baseObject, 0),
          diagram: limitDiagram,
        },
      ],
      details: ["This sample intentionally fails to provide a mediator."],
    };

    const { diagram: colimitDiagram, cocone: colimitCocone } = makeIdentityColimit(
      baseObject,
    );
    const colimitFactor = makeColimitFactor(baseObject);
    const colimitSample: AdjunctionColimitPreservationSample<
      Index,
      SetObj<unknown>,
      SetHom<unknown, unknown>,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    > = {
      label: "identity-colimit",
      indices: indexCarrier.carrier,
      diagram: colimitDiagram,
      colimit: colimitCocone,
      factor: colimitFactor,
      cocones: [
        {
          coTip: altObject,
          legs: () => constantArrow(baseObject, altObject, "a"),
          diagram: colimitDiagram,
        },
      ],
      sourceCocones: [
        {
          coTip: baseObject,
          legs: () => SetCat.id(baseObject),
          diagram: colimitDiagram,
        },
      ],
      details: ["Identity diagram colimit preservation should hold exactly."],
    };

    const sabotagedColimitSample: AdjunctionColimitPreservationSample<
      Index,
      SetObj<unknown>,
      SetHom<unknown, unknown>,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    > = {
      label: "sabotaged-colimit",
      indices: indexCarrier.carrier,
      diagram: colimitDiagram,
      colimit: colimitCocone,
      factor: () => ({ factored: false as const, reason: "Sabotaged mediator" }),
      cocones: [
        {
          coTip: altObject,
          legs: () => constantArrow(baseObject, altObject, "b"),
          diagram: colimitDiagram,
        },
      ],
      details: ["This sample intentionally fails to provide a mediator."],
    };

    const adjunction = constructAdjunctionWithWitness(left, right, unit, counit, {
      limitPreservation: {
        samples: [limitSample, sabotagedLimitSample],
      },
      colimitPreservation: {
        samples: [colimitSample, sabotagedColimitSample],
      },
    });

    expect(adjunction.preservation).toBeDefined();
    expect(adjunction.preservation?.rightPreservesLimits).toHaveLength(2);
    expect(adjunction.preservation?.leftPreservesColimits).toHaveLength(2);

    const limitAnalyses = adjunction.right.properties?.filter((analysis) =>
      analysis.property.startsWith("limit-preservation"),
    );
    expect(limitAnalyses).toHaveLength(2);
    expect(limitAnalyses?.find((analysis) => analysis.property.includes("identity-diagram"))?.holds).toBe(true);
    const sabotagedLimit = limitAnalyses?.find((analysis) =>
      analysis.property.includes("sabotaged-limit"),
    );
    expect(sabotagedLimit?.holds).toBe(false);
    expect(sabotagedLimit?.details.some((line) => line.includes("Sabotaged mediator"))).toBe(true);

    const colimitAnalyses = adjunction.left.properties?.filter((analysis) =>
      analysis.property.startsWith("colimit-preservation"),
    );
    expect(colimitAnalyses).toHaveLength(2);
    expect(
      colimitAnalyses?.find((analysis) => analysis.property.includes("identity-colimit"))?.holds,
    ).toBe(true);
    const sabotagedColimit = colimitAnalyses?.find((analysis) =>
      analysis.property.includes("sabotaged-colimit"),
    );
    expect(sabotagedColimit?.holds).toBe(false);
    expect(sabotagedColimit?.details.some((line) => line.includes("Sabotaged mediator"))).toBe(true);

    const metadata = adjunction.preservation!;
    const [recordedLimit] = metadata.rightPreservesLimits!;
    expect(recordedLimit.analysis.property).toContain("identity-diagram");
    const [recordedColimit] = metadata.leftPreservesColimits!;
    expect(recordedColimit.analysis.property).toContain("identity-colimit");
  });
});

