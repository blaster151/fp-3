// Result (aka Either) module extracted from allTS.ts

type Lazy<T> = () => T

type _ObjectLike = Record<string, unknown>

export type Err<E> = { readonly _tag: 'Err'; readonly error: E }
export type Ok<A> = { readonly _tag: 'Ok'; readonly value: A }
export type Result<E, A> = Err<E> | Ok<A>

export const Err = <E>(error: E): Result<E, never> => ({ _tag: 'Err', error })
export const Ok = <A>(value: A): Result<never, A> => ({ _tag: 'Ok', value })

export const Result = {
  Err,
  Ok,
}

export const isErr = <E, A>(ra: Result<E, A>): ra is Err<E> => ra._tag === 'Err'
export const isOk = <E, A>(ra: Result<E, A>): ra is Ok<A> => ra._tag === 'Ok'

export const mapR = <E, A, B>(f: (a: A) => B) => (ra: Result<E, A>): Result<E, B> =>
  isOk(ra) ? Ok(f(ra.value)) : ra
export const mapErr = <E, F, A>(f: (e: E) => F) => (ra: Result<E, A>): Result<F, A> =>
  isErr(ra) ? Err(f(ra.error)) : ra
export const flatMapR = <E, A, F, B>(f: (a: A) => Result<F, B>) => (ra: Result<E, A>): Result<E | F, B> =>
  (isErr(ra) ? ra : f(ra.value))
export const getOrElseR = <E, A>(onErr: (e: E) => A) => (ra: Result<E, A>): A =>
  (isOk(ra) ? ra.value : onErr(ra.error))

export const tryCatch = <A>(
  thunk: Lazy<A>,
  onThrow: (u: unknown) => Error = (u) => (u instanceof Error ? u : new Error(String(u)))
): Result<Error, A> => {
  try {
    return Ok(thunk())
  } catch (u) {
    return Err(onThrow(u))
  }
}

export type DoResultBuilder<E, T extends _ObjectLike> = {
  /** Bind a Result under property `K` (accumulates on Ok; short-circuits on Err) */
  bind: <K extends string, A>(
    k: K,
    ra: Result<E, A>
  ) => DoResultBuilder<E, T & { readonly [P in K]: A }>

  /** Insert a pure value under `K` (no Result involved) */
  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoResultBuilder<E, T & { readonly [P in K]: A }>

  /** Map the final accumulated object into B, yielding Result<E, B> */
  map: <B>(f: (t: T) => B) => Result<E, B>

  /** Finish and return Result<E, T> */
  done: () => Result<E, T>
}

export const DoR = <E = never>() => {
  const start: Result<E, {}> = Ok({})
  const make = <T extends _ObjectLike>(acc: Result<E, T>): DoResultBuilder<E, T> => ({
    bind: <K extends string, A>(k: K, ra: Result<E, A>) => {
      if (isErr(acc)) {
        return make(acc as Result<E, T & { readonly [P in K]: A }>)
      }
      if (isErr(ra)) {
        return make(ra as Result<E, T & { readonly [P in K]: A }>)
      }
      const next = { ...acc.value, [k]: ra.value } as T & { readonly [P in K]: A }
      return make(Ok(next))
    },
    let: <K extends string, A>(k: K, a: A) => {
      if (isErr(acc)) {
        return make(acc as Result<E, T & { readonly [P in K]: A }>)
      }
      const next = { ...acc.value, [k]: a } as T & { readonly [P in K]: A }
      return make(Ok(next))
    },
    map: <B>(f: (t: T) => B): Result<E, B> => (isOk(acc) ? Ok(f(acc.value)) : acc),
    done: () => acc,
  })
  return make(start)
}
