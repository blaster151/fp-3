import type { FiniteCategory } from "../finite-cat"

export interface HasTerminal<Obj, Arr> {
  readonly one: () => Obj
  readonly globals: (object: Obj) => ReadonlyArray<Arr>
}

/**
 * Decide monicity by probing arrows with global elements (maps from the
 * terminal object). Whenever two elements agree after composing with the
 * arrow, they must already be equal.
 */
export const isMonoByGlobals = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr> & HasTerminal<Obj, Arr>,
  f: Arr,
): boolean => {
  const terminal = category.one()
  const domain = category.src(f)
  const elements = category.globals(domain).filter((el) => category.src(el) === terminal)
  for (const x of elements) {
    for (const y of elements) {
      const fx = category.compose(f, x)
      const fy = category.compose(f, y)
      if (category.eq(fx, fy) && !category.eq(x, y)) {
        return false
      }
    }
  }
  return true
}
