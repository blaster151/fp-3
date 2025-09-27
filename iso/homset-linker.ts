import type { FiniteCategory } from "../finite-cat"
import type { IsoWitness } from "./types"

export interface HomTransport<Arr> {
  readonly original: ReadonlyArray<Arr>
  readonly transported: ReadonlyArray<Arr>
  readonly roundTrip: ReadonlyArray<Arr>
}

export class HomSetLinker<Obj, Arr> {
  constructor(
    private readonly category: FiniteCategory<Obj, Arr>,
    private readonly witness: IsoWitness<Arr>,
  ) {}

  transportInto(source: Obj, left: Obj): HomTransport<Arr> {
    const originals = this.category.arrows.filter(
      (arrow) => this.category.src(arrow) === source && this.category.dst(arrow) === left,
    )
    const transported = originals.map((arrow) => this.category.compose(this.witness.forward, arrow))
    const roundTrip = transported.map((arrow) => this.category.compose(this.witness.backward, arrow))
    return { original: originals, transported, roundTrip }
  }

  transportOutOf(target: Obj, left: Obj): HomTransport<Arr> {
    const originals = this.category.arrows.filter(
      (arrow) => this.category.src(arrow) === left && this.category.dst(arrow) === target,
    )
    const transported = originals.map((arrow) => this.category.compose(arrow, this.witness.backward))
    const roundTrip = transported.map((arrow) => this.category.compose(arrow, this.witness.forward))
    return { original: originals, transported, roundTrip }
  }
}
