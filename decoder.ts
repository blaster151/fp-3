import { Err, Ok, isOk, mapR } from "./result"
import type { Err as ErrT, Result } from "./result"
import type { ReaderTask, Task } from "./task"

// =======================
// Decoder — a tiny “zod-lite” for parsing unknown data
// =======================
//
// Design
//  - A Decoder<A> tries to turn unknown input into A, returning Result<string[], A>
//  - Compose with map / andThen / refine
//  - Batteries included: string, number, boolean, literal, arrayOf, union, object, nullable
//

export type Decoder<A> = (u: unknown, path?: string) => Result<ReadonlyArray<string>, A>

// Constructors
export const succeed =
  <A>(a: A): Decoder<A> =>
  () => Ok(a)

export const fail =
  (msg: string): Decoder<never> =>
  (_u, path = '$') =>
    Err([`${path}: ${msg}`])

// Combinators
export const mapD =
  <A, B>(f: (a: A) => B) =>
  (da: Decoder<A>): Decoder<B> =>
  (u, p) => mapR<ReadonlyArray<string>, A, B>(f)(da(u, p))

export const andThenD =
  <A, B>(f: (a: A) => Decoder<B>) =>
  (da: Decoder<A>): Decoder<B> =>
  (u, p) => {
    const r = da(u, p)
    return isOk(r) ? f(r.value)(u, p) : r
  }

// Predicate guard with custom message
export const refineD =
  <A>(msg: string, pred: (a: A) => boolean) =>
  (da: Decoder<A>): Decoder<A> =>
  (u, p) => {
    const r = da(u, p)
    return isOk(r) ? (pred(r.value) ? r : Err([`${p ?? '$'}: ${msg}`])) : r
  }

// Primitives
export const stringD: Decoder<string> = (u, p = '$') =>
  typeof u === 'string' ? Ok(u) : Err([`${p}: expected string`])

export const numberD: Decoder<number> = (u, p = '$') =>
  typeof u === 'number' && Number.isFinite(u) ? Ok(u) : Err([`${p}: expected finite number`])

export const booleanD: Decoder<boolean> = (u, p = '$') =>
  typeof u === 'boolean' ? Ok(u) : Err([`${p}: expected boolean`])

  // Optional-with-default (object field utility)
export const withDefaultD =
  <A>(d: Decoder<A>, def: A): Decoder<A> =>
  (u, p) =>
    u === undefined ? Ok(def) : d(u, p)

// Non-empty string
export const nonEmptyStringD: Decoder<string> = refineD<string>("expected non-empty string", s => s.trim().length > 0)(stringD)

// Int (no decimals)
export const intD: Decoder<number> = refineD<number>("expected integer", n => Number.isInteger(n))(numberD)

// Record<string, A>
export const recordOf =
  <A>(d: Decoder<A>): Decoder<Record<string, A>> =>
  (u, p = "$") => {
    if (typeof u !== "object" || u === null || Array.isArray(u)) return Err([`${p}: expected object`])
    const rec = u as Record<string, unknown>
    const out: Record<string, A> = {}
    const errs: string[] = []
    for (const k of Object.keys(rec)) {
      const r = d(rec[k], `${p}.${k}`)
      if (isOk(r)) out[k] = r.value
      else errs.push(...r.error)
    }
    return errs.length ? Err(errs) : Ok(out)
  }

// Literal(s)
export const literalD =
  <L extends string | number | boolean>(...lits: readonly L[]): Decoder<L> =>
  (u, p = '$') =>
    (lits as readonly unknown[]).some(x => Object.is(x, u))
      ? Ok(u as L)
      : Err([`${p}: expected one of ${lits.map(String).join(', ')}`])

// Nullable wrapper (accepts null -> Ok(null), otherwise run decoder)
export const nullableD =
  <A>(d: Decoder<A>): Decoder<A | null> =>
  (u, p) =>
    u === null ? Ok(null) : d(u, p)

// Array
export const arrayOf =
  <A>(d: Decoder<A>): Decoder<ReadonlyArray<A>> =>
  (u, p = '$') => {
    if (!Array.isArray(u)) return Err([`${p}: expected array`])
    const out: A[] = []
    const errs: string[] = []
    u.forEach((item, i) => {
      const r = d(item, `${p}[${i}]`)
      if (isOk(r)) out.push(r.value)
      else errs.push(...r.error)
    })
    return errs.length ? Err(errs) : Ok(out)
  }

// Object (exact shape; extra keys are allowed but ignored)
type DecoderShapeValue<S extends Record<string, Decoder<unknown>>> = {
  [K in keyof S]: S[K] extends Decoder<infer A> ? A : never
}

export const object =
  <S extends Record<string, Decoder<unknown>>>(shape: S): Decoder<DecoderShapeValue<S>> =>
  (u, p = '$') => {
    if (typeof u !== 'object' || u === null || Array.isArray(u)) return Err([`${p}: expected object`])
    const rec = u as Record<string, unknown>
    const out: Partial<DecoderShapeValue<S>> = {}
    const errs: string[] = []
    for (const key of Object.keys(shape) as Array<keyof S>) {
      const decoder = shape[key] as Decoder<DecoderShapeValue<S>[typeof key]>
      const result = decoder(rec[key as string], `${p}.${String(key)}`)
      if (isOk(result)) out[key] = result.value
      else errs.push(...result.error)
    }
    return errs.length ? Err(errs) : Ok(out as DecoderShapeValue<S>)
  }

// Union — try decoders in order and collect why each failed
export const union =
  <A>(...ds: Decoder<A>[]): Decoder<A> =>
  (u, p = '$') => {
    const errors: string[] = []
    for (const d of ds) {
      const r = d(u, p)
      if (isOk(r)) return r
      errors.push(...r.error)
    }
    return Err([`${p}: no union variant matched` , ...errors])
  }

// Optional (for object fields): treat undefined as Ok(undefined), otherwise decode
export const optionalD =
  <A>(d: Decoder<A>): Decoder<A | undefined> =>
  (u, p) =>
    u === undefined ? Ok(undefined) : d(u, p)

// Convenience: run a decoder
export const decode =
  <A>(d: Decoder<A>) =>
  (u: unknown): Result<ReadonlyArray<string>, A> =>
    d(u, '$')

// =======================
// DecoderResult / Async interop
// =======================
//
// Goal: ergonomic helpers when a Decoder runs in Task / ReaderTask contexts.
// Types used from your lib: Result, Task, ReaderTask, mapR/isOk/Err/Ok

// Run a decoder against a value inside Task
export const decodeTask =
  <A>(d: Decoder<A>) =>
  (thunk: () => Promise<unknown>): Task<Result<ReadonlyArray<string>, A>> =>
  async () => {
    const u = await thunk()
    return decode(d)(u)
  }

// Run a decoder against a value inside ReaderTask<R, unknown>
export const decodeReaderTask =
  <R, A>(d: Decoder<A>) =>
  (rta: ReaderTask<R, unknown>): ReaderTask<R, Result<ReadonlyArray<string>, A>> =>
  async (r) => decode(d)(await rta(r))

// Convenience: decode JSON (string -> A), with parse failure captured in Result
export const decodeJson =
  <A>(d: Decoder<A>): Decoder<A> =>
  (u: unknown, p) => {
    if (typeof u !== "string") return Err([`${p ?? "$"}: expected JSON string`])
    try {
      const parsed = JSON.parse(u)
      return d(parsed, p)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return Err([`${p ?? "$"}: invalid JSON (${msg})`])
    }
  }

// Map/chain over Result within ReaderTask (common pattern)
export const mapRTResult =
  <R, E, A, B>(f: (a: A) => B) =>
  (rtra: ReaderTask<R, Result<E, A>>): ReaderTask<R, Result<E, B>> =>
  async (r) => mapR<E, A, B>(f)(await rtra(r))

export const chainRTResult =
  <R, E, A, F, B>(f: (a: A) => ReaderTask<R, Result<F, B>>) =>
  (rtra: ReaderTask<R, Result<E, A>>): ReaderTask<R, Result<E | F, B>> =>
  async (r) => {
    const ra = await rtra(r)
    return isOk(ra) ? f(ra.value)(r) : (ra as ErrT<E>)
  }

// Helpful: pretty-print the error path list from Decoder results
export const formatDecodeErrors = (errs: ReadonlyArray<string>): string =>
  errs.join("\n")

// =======================
// Convenience aliases
// =======================
export type DecodeErr = ReadonlyArray<string>
export type DecoderResult<A> = Result<DecodeErr, A>
export type ReaderTaskDecoder<R, A> = ReaderTask<R, DecoderResult<A>>
export type TaskDecoder<A> = Task<DecoderResult<A>>

// =======================
// ReaderTask decoding helpers (HTTP-flavored)
// =======================

// rename to avoid merging with your existing `Http`
export type HttpFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>
export type EnvHttp = { apiBase: string; http: HttpFn }

// GET a JSON endpoint and decode it in one go
export const getJsonD =
  <A>(path: string, d: Decoder<A>): ReaderTaskDecoder<EnvHttp, A> =>
  async (env) => {
    try {
      const res = await env.http(`${env.apiBase}${path}`)
      if (!res.ok) return Err([`$.: HTTP ${res.status}`])
      const data = await res.json()
      return decode(d)(data)
    } catch (u) {
      return Err([`$.: network error: ${u instanceof Error ? u.message : String(u)}`])
    }
  }

// Same but with a RequestInit (headers, method…)
export const fetchJsonD =
  <A>(input: string, init: RequestInit | undefined, d: Decoder<A>): ReaderTaskDecoder<EnvHttp, A> =>
  async (env) => {
    try {
      const res = await env.http(input.startsWith("http") ? input : `${env.apiBase}${input}`, init)
      if (!res.ok) return Err([`$.: HTTP ${res.status}`])
      const data = await res.json()
      return decode(d)(data)
    } catch (u) {
      return Err([`$.: network error: ${u instanceof Error ? u.message : String(u)}`])
    }
  }
