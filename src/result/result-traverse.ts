import { Err, Ok, isErr, isOk } from "../../result"
import type { Result, Ok as OkResult } from "../../result"

export const sequenceArrayResult = <E, A>(
  rs: ReadonlyArray<Result<E, A>>
): Result<E, ReadonlyArray<A>> => {
  const out: A[] = []
  for (const r of rs) {
    if (isErr(r)) return r
    out.push((r as OkResult<A>).value)
  }
  return Ok(out)
}

export const traverseArrayResult = <E, A, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => Result<E, B>
): Result<E, ReadonlyArray<B>> => {
  const out: B[] = []
  for (let i = 0; i < as.length; i++) {
    const r = f(as[i]!, i)
    if (isErr(r)) return r
    out.push((r as OkResult<B>).value)
  }
  return Ok(out)
}

export const bimapR =
  <E, F, A, B>(l: (e: E) => F, r: (a: A) => B) =>
  (ra: Result<E, A>): Result<F, B> =>
    isOk(ra) ? Ok(r(ra.value)) : Err(l(ra.error))
