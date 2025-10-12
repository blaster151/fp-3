import { UnionFind } from "../operations/union-find"
import type { FiniteCategory } from "../finite-cat"
import { HomSetLinker } from "./homset-linker"
import type { IsoRegistryOptions, IsoWitness } from "./types"

export interface IsoEvent<Obj, Arr> {
  readonly left: Obj
  readonly right: Obj
  readonly witness: IsoWitness<Arr>
  readonly linker: HomSetLinker<Obj, Arr>
}

export type IsoListener<Obj, Arr> = (event: IsoEvent<Obj, Arr>) => void

export class IsoRegistry<Obj, Arr> {
  private readonly unionFind: UnionFind<Obj>
  private readonly witnesses = new Map<Obj, Map<Obj, IsoWitness<Arr>>>()
  private readonly listeners: IsoListener<Obj, Arr>[] = []

  constructor(
    private readonly category: FiniteCategory<Obj, Arr>,
    private readonly options: IsoRegistryOptions<Obj> = {},
  ) {
    const seeds = options.objects ?? category.objects
    this.unionFind = new UnionFind(seeds)
  }

  onIsomorphism(listener: IsoListener<Obj, Arr>): void {
    this.listeners.push(listener)
  }

  addIsomorphism(left: Obj, right: Obj, witness: IsoWitness<Arr>): void {
    this.ensureTracked(left)
    this.ensureTracked(right)

    const { forward, backward } = witness
    const leftIdentity = this.category.id(left)
    const rightIdentity = this.category.id(right)
    const leftComposite = this.category.compose(backward, forward)
    const rightComposite = this.category.compose(forward, backward)

    const leftOk = this.category.eq(leftComposite, leftIdentity)
    const rightOk = this.category.eq(rightComposite, rightIdentity)

    if (!leftOk || !rightOk) {
      const details = [
        `Invalid isomorphism witness between ${String(left)} and ${String(right)}.`,
        `Expected backward ∘ forward = id_${String(left)}, got ${describe(leftComposite)}.`,
        `Expected forward ∘ backward = id_${String(right)}, got ${describe(rightComposite)}.`,
      ].join(" ")
      throw new Error(details)
    }

    this.guardSkeletal(left, right)

    this.storeWitness(left, right, witness)
    this.storeWitness(right, left, { forward: witness.backward, backward: witness.forward })

    if (!this.options.isSkeletal || Object.is(left, right)) {
      this.unionFind.union(left, right)
    }

    const linker = new HomSetLinker(this.category, witness)
    for (const listener of this.listeners) listener({ left, right, witness, linker })
  }

  getWitness(left: Obj, right: Obj): IsoWitness<Arr> | null {
    return this.witnesses.get(left)?.get(right) ?? null
  }

  representative(object: Obj): Obj {
    return this.unionFind.find(object)
  }

  equivalenceRepresentatives(): Map<Obj, Obj> {
    return this.unionFind.representatives()
  }

  createHomSetLinker(left: Obj, right: Obj): HomSetLinker<Obj, Arr> | null {
    const witness = this.getWitness(left, right)
    if (!witness) return null
    return new HomSetLinker(this.category, witness)
  }

  private ensureTracked(object: Obj): void {
    try {
      this.unionFind.find(object)
    } catch {
      this.unionFind.makeSet(object)
    }
  }

  private guardSkeletal(left: Obj, right: Obj): void {
    if (!this.options.isSkeletal || Object.is(left, right)) return

    const policy = this.options.skeletalPolicy ?? "error"
    const message = `Skeletal category forbids merging distinct objects: ${String(left)} ≅ ${String(right)}.`
    this.options.onSkeletalViolation?.({ left, right, message })
    if (policy === "warn") {
      console.warn(message)
      return
    }
    if (policy === "ignore") return
    throw new Error(message)
  }

  private storeWitness(left: Obj, right: Obj, witness: IsoWitness<Arr>): void {
    let mapping = this.witnesses.get(left)
    if (!mapping) {
      mapping = new Map()
      this.witnesses.set(left, mapping)
    }
    mapping.set(right, witness)
  }
}

type MaybeIdentified = { readonly id?: unknown }

const describe = (arrow: unknown): string => {
  if (arrow == null) return "<missing>"

  if (typeof arrow === "object") {
    const candidate = arrow as MaybeIdentified
    if (typeof candidate.id === "string") return candidate.id
  }

  return String(arrow)
}
