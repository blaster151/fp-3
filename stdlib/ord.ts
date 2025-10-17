import type { Ord } from "../core"

export const ordNumber: Ord<number> = (x, y) => (x < y ? -1 : x > y ? 1 : 0)

export const ordString: Ord<string> = (x, y) => (x < y ? -1 : x > y ? 1 : 0)

export const sortBy = <A>(as: ReadonlyArray<A>, ord: Ord<A>): ReadonlyArray<A> =>
  [...as].sort(ord)
