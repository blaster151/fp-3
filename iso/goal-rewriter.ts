import type { FiniteCategory } from "../finite-cat"
import type { IsoRegistry } from "./registry"

export interface IncomingGoalRewrite<Arr> {
  readonly predicateOnTarget: (candidate: Arr) => boolean
  readonly liftOriginal: (arrow: Arr) => Arr
  readonly lowerToOriginal: (arrow: Arr) => Arr
}

export interface OutgoingGoalRewrite<Arr> {
  readonly predicateOnTarget: (candidate: Arr) => boolean
  readonly liftOriginal: (arrow: Arr) => Arr
  readonly lowerToOriginal: (arrow: Arr) => Arr
}

export class GoalRewriter<Obj, Arr> {
  constructor(
    private readonly category: FiniteCategory<Obj, Arr>,
    private readonly registry: IsoRegistry<Obj, Arr>,
  ) {}

  rewriteIncomingGoal(
    from: Obj,
    to: Obj,
    predicate: (arrow: Arr) => boolean,
  ): IncomingGoalRewrite<Arr> | null {
    const witness = this.registry.getWitness(from, to)
    if (!witness) return null

    return {
      predicateOnTarget: (candidate) => predicate(this.category.compose(witness.backward, candidate)),
      liftOriginal: (arrow) => this.category.compose(witness.forward, arrow),
      lowerToOriginal: (candidate) => this.category.compose(witness.backward, candidate),
    }
  }

  rewriteOutgoingGoal(
    target: Obj,
    from: Obj,
    to: Obj,
    predicate: (arrow: Arr) => boolean,
  ): OutgoingGoalRewrite<Arr> | null {
    const witness = this.registry.getWitness(from, to)
    if (!witness) return null

    return {
      predicateOnTarget: (candidate) => predicate(this.category.compose(candidate, witness.forward)),
      liftOriginal: (arrow) => this.category.compose(arrow, witness.backward),
      lowerToOriginal: (candidate) => this.category.compose(candidate, witness.forward),
    }
  }
}
