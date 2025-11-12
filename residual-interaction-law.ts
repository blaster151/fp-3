import type { FunctorInteractionLaw } from "./functor-interaction-law";
import type {
  ResidualFunctorSummary,
  ResidualDiagramWitness,
} from "./residual-stateful-runner";

export interface ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value> {
  readonly base: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly residualMonadName: string;
  readonly diagnostics: ReadonlyArray<string>;
  readonly residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value>;
  readonly thetaWitness?: ResidualDiagramWitness<Obj>;
  readonly etaWitness?: ResidualDiagramWitness<Obj>;
  readonly muWitness?: ResidualDiagramWitness<Obj>;
}

export interface ResidualInteractionLawOptions<
  Obj,
  Left,
  Right,
  Value
> {
  readonly residualMonadName?: string;
  readonly notes?: ReadonlyArray<string>;
  readonly residualFunctor?: ResidualFunctorSummary<Obj, Left, Right, Value>;
  readonly thetaWitness?: ResidualDiagramWitness<Obj>;
  readonly etaWitness?: ResidualDiagramWitness<Obj>;
  readonly muWitness?: ResidualDiagramWitness<Obj>;
}

export const makeResidualInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: ResidualInteractionLawOptions<Obj, Left, Right, Value> = {},
): ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value> => {
  const residualMonadName = options.residualMonadName ?? "R";
  const residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value> =
    options.residualFunctor ?? {
      name: residualMonadName,
      description: `Residual functor for ${residualMonadName}`,
      objectCarrier: () => new Set<unknown>(),
      metadata: [`Residual interaction law ${residualMonadName}: default residual functor.`],
    };
  const diagnostics: string[] = [
    `Residual interaction law ${residualMonadName}: ${
      options.residualFunctor ? "custom residual functor supplied." : "using default residual functor (Set carrier)."
    }`,
  ];
  if (options.notes && options.notes.length > 0) {
    diagnostics.push(
      `Notes: ${options.notes
        .map((note) => note.trim())
        .filter(Boolean)
        .join("; ")}`,
    );
  }
  if (!options.thetaWitness || !options.etaWitness || !options.muWitness) {
    diagnostics.push(
      "Residual witnesses (theta/eta/mu) not provided; downstream builders may synthesise defaults from runners.",
    );
  }
  return {
    base: law,
    residualMonadName,
    diagnostics,
    residualFunctor,
    ...(options.thetaWitness ? { thetaWitness: options.thetaWitness } : {}),
    ...(options.etaWitness ? { etaWitness: options.etaWitness } : {}),
    ...(options.muWitness ? { muWitness: options.muWitness } : {}),
  };
};
