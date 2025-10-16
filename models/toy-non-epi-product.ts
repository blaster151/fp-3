import type { FiniteCategory } from "../finite-cat"

export type ToyObject = "A" | "B" | "P" | "Z"

export interface ToyArrow {
  readonly name: string
  readonly dom: ToyObject
  readonly cod: ToyObject
}

export interface ToyNonEpicProductCategory extends FiniteCategory<ToyObject, ToyArrow> {
  readonly product: {
    readonly object: ToyObject
    readonly projections: readonly [ToyArrow, ToyArrow]
    readonly tuple: (domain: ToyObject, legs: readonly [ToyArrow, ToyArrow]) => ToyArrow
  }
  readonly nonEpicWitness: {
    readonly projection: ToyArrow
    readonly parallel: readonly [ToyArrow, ToyArrow]
    readonly composite: ToyArrow
  }
}

export const makeToyNonEpicProductCategory = (): ToyNonEpicProductCategory => {
  const idA: ToyArrow = { name: "id_A", dom: "A", cod: "A" }
  const idB: ToyArrow = { name: "id_B", dom: "B", cod: "B" }
  const idP: ToyArrow = { name: "id_P", dom: "P", cod: "P" }
  const idZ: ToyArrow = { name: "id_Z", dom: "Z", cod: "Z" }

  const pi1: ToyArrow = { name: "π1", dom: "P", cod: "A" }
  const pi2: ToyArrow = { name: "π2", dom: "P", cod: "B" }

  const sigma: ToyArrow = { name: "σ", dom: "A", cod: "Z" }
  const tau: ToyArrow = { name: "τ", dom: "A", cod: "Z" }
  const collapse: ToyArrow = { name: "collapse", dom: "P", cod: "Z" }

  const objects: ToyObject[] = ["A", "B", "P", "Z"]
  const arrows: ToyArrow[] = [idA, idB, idP, idZ, pi1, pi2, sigma, tau, collapse]

  const identities: Record<ToyObject, ToyArrow> = {
    A: idA,
    B: idB,
    P: idP,
    Z: idZ,
  }

  const eq = (left: ToyArrow, right: ToyArrow) => left === right

  const compose = (g: ToyArrow, f: ToyArrow): ToyArrow => {
    if (f.cod !== g.dom) {
      throw new Error(`compose(${g.name}, ${f.name}) domain/codomain mismatch`)
    }
    if (f === identities[f.dom]) return g
    if (g === identities[g.cod]) return f

    if (f === pi1 && g === sigma) return collapse
    if (f === pi1 && g === tau) return collapse

    throw new Error(`compose(${g.name}, ${f.name}) not specified`)
  }

  const src = (arrow: ToyArrow): ToyObject => arrow.dom
  const dst = (arrow: ToyArrow): ToyObject => arrow.cod

  const id = (object: ToyObject): ToyArrow => identities[object]

  return {
    objects,
    arrows,
    eq,
    compose,
    src,
    dst,
    id,
    product: {
      object: "P",
      projections: [pi1, pi2],
      tuple: (domain, legs) => {
        if (domain !== "P") {
          throw new Error(`Toy product only supplies tuples out of P, received ${domain}`)
        }
        if (legs.length !== 2) {
          throw new Error(`Toy product expects two legs, received ${legs.length}`)
        }
        const [first, second] = legs
        if (first !== pi1 || second !== pi2) {
          throw new Error("Toy product only supports the canonical pairing of π₁ and π₂")
        }
        return idP
      },
    },
    nonEpicWitness: {
      projection: pi1,
      parallel: [sigma, tau],
      composite: collapse,
    },
  }
}
