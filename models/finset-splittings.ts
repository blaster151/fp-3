import type { FinSetCategory, FuncArr } from "./finset-cat"

export interface SplitIdempotentResult {
  readonly object: string
  readonly retraction: FuncArr
  readonly section: FuncArr
}

export const splitMonoWitness = (category: FinSetCategory, arrow: FuncArr): FuncArr =>
  category.splitMonoWitness(arrow)

export const splitEpiWitness = (category: FinSetCategory, arrow: FuncArr): FuncArr =>
  category.splitEpiWitness(arrow)

export const splitIdempotent = (
  category: FinSetCategory,
  arrow: FuncArr,
): SplitIdempotentResult => {
  if (category.src(arrow) !== category.dst(arrow)) {
    throw new Error("splitIdempotent: arrow must be an endomorphism")
  }
  const composite = category.compose(arrow, arrow)
  if (!category.eq(composite, arrow)) {
    throw new Error("splitIdempotent: arrow is not idempotent")
  }

  const carrier = category.carrier(category.dst(arrow))
  const fixed = carrier.filter((value) => arrow.map(value) === value)
  const object = `${arrow.cod}_fix(${arrow.name})`
  category.registerObject(object, fixed)

  const retraction: FuncArr = {
    name: `r_${arrow.name}`,
    dom: arrow.cod,
    cod: object,
    map: (value: string) => arrow.map(value),
  }

  const section: FuncArr = {
    name: `s_${arrow.name}`,
    dom: object,
    cod: arrow.cod,
    map: (value: string) => value,
  }

  return { object, retraction, section }
}
