import type { FiniteCategory } from "./finite-cat";
import { constructFunctorWithWitness, type FunctorCheckSamples } from "./functor";
import type { FunctorWithWitness } from "./functor";

export type CollapseObject = "•";

export interface CollapseArrow {
  readonly name: "id_•";
  readonly src: CollapseObject;
  readonly dst: CollapseObject;
}

const collapseIdentity: CollapseArrow = { name: "id_•", src: "•", dst: "•" };

export const collapseCategory: FiniteCategory<CollapseObject, CollapseArrow> = {
  objects: ["•"],
  arrows: [collapseIdentity],
  id: () => collapseIdentity,
  compose: () => collapseIdentity,
  src: () => "•",
  dst: () => "•",
  eq: () => true,
};

export interface CollapseFunctorOptions {
  readonly metadata?: ReadonlyArray<string>;
}

export const collapseFunctorToPoint = <SrcObj, SrcArr>(
  source: FiniteCategory<SrcObj, SrcArr>,
  options: CollapseFunctorOptions = {},
): FunctorWithWitness<SrcObj, SrcArr, CollapseObject, CollapseArrow> => {
  const samples: FunctorCheckSamples<SrcObj, SrcArr> = {
    objects: source.objects,
    arrows: source.arrows,
  };
  const metadata = [
    "Collapse functor maps every object and arrow to the unique point of the terminal category.",
    "Serves as a counterexample for reflection properties: it turns many non-isomorphisms into an isomorphism.",
    ...(options.metadata ?? []),
  ];
  return constructFunctorWithWitness(
    source,
    collapseCategory,
    {
      F0: () => "•",
      F1: () => collapseIdentity,
    },
    samples,
    metadata,
  );
};

