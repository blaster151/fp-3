import type { FiniteCategory } from "./finite-cat"

export type TwoObject = "•" | "★"

export interface TwoArrow {
  readonly name: string
  readonly src: TwoObject
  readonly dst: TwoObject
}

const id = (object: TwoObject): TwoArrow => ({ name: `id_${object}`, src: object, dst: object })

const idDot = id("•")
const idStar = id("★")

const f: TwoArrow = { name: "f", src: "•", dst: "★" }

const arrows: readonly TwoArrow[] = [idDot, idStar, f]

const compose = (g: TwoArrow, h: TwoArrow): TwoArrow => {
  if (h.dst !== g.src) {
    throw new Error("TwoObjectCategory: non-composable arrows")
  }
  if (h.name.startsWith("id_")) return g
  if (g.name.startsWith("id_")) return h
  throw new Error("TwoObjectCategory: no non-identity composites")
}

export const TwoObjectCategory: FiniteCategory<TwoObject, TwoArrow> = {
  objects: ["•", "★"],
  arrows,
  id,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (x, y) => x.name === y.name && x.src === y.src && x.dst === y.dst,
}

export const nonIdentity = f
