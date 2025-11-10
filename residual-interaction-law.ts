import type { FunctorInteractionLaw } from "./functor-interaction-law";

export interface ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value> {
  readonly base: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly residualMonadName: string;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface ResidualInteractionLawOptions {
  readonly residualMonadName?: string;
  readonly notes?: ReadonlyArray<string>;
}

export const makeResidualInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: ResidualInteractionLawOptions = {},
): ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value> => {
  const residualMonadName = options.residualMonadName ?? "R";
  const diagnostics: string[] = [
    `Residual interaction law placeholder for ${residualMonadName}: TODO materialise Section 5 residual diagrams.`,
    "Pending witnesses: residual unit compatibility, residual multiplication compatibility, morphism square `(id×f);θ' = θ;R(id×f)`, and monad-map bridge `ϑ : T ⇒ S^{t,Y}_R`.",
    "Callers may supply notes to track provisional witnesses; use attachResidualHandlers to record partial effect coverage on associated runners.",
  ];
  if (options.notes && options.notes.length > 0) {
    diagnostics.push(
      `User notes: ${options.notes
        .map((note) => note.trim())
        .filter(Boolean)
        .join("; ")}`,
    );
  }
  return { base: law, residualMonadName, diagnostics };
};
