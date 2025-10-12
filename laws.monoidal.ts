/* eslint-disable @typescript-eslint/no-floating-promises */

/*
 * Property suites executed in this file:
 *
 * - Functor and lax monoidal functor coherence for Option.
 * - Functor and lax monoidal functor coherence for short-circuiting Result<E,_>.
 * - Functor and lax monoidal functor coherence for Reader<R,_>.
 * - Lax monoidal coherence for ReaderTask<R,_> (async applicative reader).
 * - Lax monoidal coherence for ReaderTaskEither<R, E, _>.
 *
 * Each suite checks:
 *   • Functor identity and composition where the structure exposes `.map`.
 *   • Lax monoidal unit, associativity, and naturality laws over representative
 *     arbitraries (synchronous for pure data types, asynchronous for effectful ones).
 */
// ---------- small helpers (pure) ----------
const id = <A>(a: A) => a
const compose = <A, B, C>(g: (b: B) => C, f: (a: A) => B) => (a: A) => g(f(a))

const lFrom = <A>(a: A): readonly [void, A] => [undefined, a] as const
const rFrom = <A>(a: A): readonly [A, void] => [a, undefined] as const
const assocFrom = <A,B,C>(x: readonly [[A,B], C]): readonly [A, readonly [B, C]] =>
  [x[0][0], [x[0][1], x[1]] as const] as const
type UnknownFn = (value: unknown) => unknown

const bimap = (f: UnknownFn, g: UnknownFn) =>
  ([a, b]: readonly [unknown, unknown]): readonly [unknown, unknown] => [f(a), g(b)] as const

const assocUnknown: UnknownFn = value =>
  assocFrom(value as readonly [[unknown, unknown], unknown])

const pairTransforms = (f: UnknownFn, g: UnknownFn): UnknownFn =>
  value => bimap(f, g)(value as readonly [unknown, unknown])

// ---------- deep-ish equality for small structures ----------
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// run Reader/ReaderTask/RTE at a few env samples and compare
const sampleRs = [0, 1, 42]
const eqReader = <A>(ra: (r:number)=>A, rb: (r:number)=>A) =>
  sampleRs.every(r => eq(ra(r), rb(r)))

const eqReaderTask = async <A>(ra: (r:number)=>Promise<A>, rb: (r:number)=>Promise<A>) =>
  (await Promise.all(sampleRs.map(async r => eq(await ra(r), await rb(r))))).every(Boolean)

const eqReaderTaskUnknown = (ra: unknown, rb: unknown) =>
  eqReaderTask(
    ra as (r: number) => Promise<unknown>,
    rb as (r: number) => Promise<unknown>,
  )

const eqRTE = async <E, A>(ra: RTE<number, E, A>, rb: RTE<number, E, A>) => {
  for (const r of sampleRs) {
    const [fa, fb] = await Promise.all([ra(r), rb(r)])
    if (!eq(fa, fb)) {
      return false
    }
  }
  return true
}

const eqReaderUnknown = (ra: unknown, rb: unknown): boolean =>
  eqReader(ra as (r: number) => unknown, rb as (r: number) => unknown)

const eqRTEUnknown = (ra: unknown, rb: unknown) =>
  eqRTE(ra as RTE<number, string, unknown>, rb as RTE<number, string, unknown>)

const liftTransforms = <A>(fns: ReadonlyArray<(value: A) => unknown>): ReadonlyArray<UnknownFn> =>
  fns.map<UnknownFn>(fn => (value: unknown) => fn(value as A))

const numberTransforms = liftTransforms<number>([
  value => value,
  value => value + 1,
  value => ({ value }),
])

const stringTransforms = liftTransforms<string>([
  value => value,
  value => value.length,
  value => value.toUpperCase(),
])


// ---------- Instances under test (use the ones from your lib) ----------
// Option
type None = { _tag:'None' }
type Some<A> = { _tag:'Some'; value:A }
type Option<A> = None | Some<A>

const None: None = { _tag:'None' }
const Some = <A>(a: A): Option<A> => ({ _tag:'Some', value:a })
const isSome = <A>(o: Option<A>): o is Some<A> => o._tag === 'Some'

const mapO = <A,B>(f:(a:A)=>B) => (oa: Option<A>): Option<B> => isSome(oa) ? Some(f(oa.value)) : None
const apO  = <A,B>(ff: Option<(a:A)=>B>) => (fa: Option<A>): Option<B> =>
  isSome(ff) && isSome(fa) ? Some(ff.value(fa.value)) : None
const AppOption = { of: Some, map: mapO, ap: apO }
const MonoidalOption = {
  unit: AppOption.of<void>(undefined),
  tensor: <A,B>(fa: Option<A>, fb: Option<B>): Option<readonly [A, B]> =>
    AppOption.ap(AppOption.map((a:A)=>(b:B)=>[a,b] as const)(fa))(fb),
  map: AppOption.map
}

// Result<E,_>
type Err<E> = { _tag:'Err'; error:E }
type Ok<A> = { _tag:'Ok'; value:A }
type Result<E, A> = Err<E> | Ok<A>

const Ok = <A>(a:A): Result<never, A> => ({ _tag:'Ok', value:a })
const Err = <E>(e:E): Result<E, never> => ({ _tag:'Err', error:e })
const isOk = <E, A>(r: Result<E, A>): r is Ok<A> => r._tag === 'Ok'
const mapResult = <E>() => <A,B>(f:(a:A)=>B) => (ra: Result<E, A>): Result<E, B> =>
  isOk(ra) ? Ok(f(ra.value)) : ra
const apResult  = <E>() => <A,B>(rf: Result<E, (a:A)=>B>) => (ra: Result<E, A>): Result<E, B> => {
  if (!isOk(rf)) return rf
  if (!isOk(ra)) return ra
  return Ok(rf.value(ra.value))
}
const AppResult = <E>() => ({
  of: <A>(a:A): Result<E, A> => Ok(a) as Result<E, A>,
  map: mapResult<E>(),
  ap: apResult<E>()
})
const MonoidalResult = <E>() => ({
  unit: AppResult<E>().of<void>(undefined),
  tensor: <A,B>(fa: Result<E, A>, fb: Result<E, B>): Result<E, readonly [A, B]> =>
    AppResult<E>().ap(AppResult<E>().map((a:A)=>(b:B)=>[a,b] as const)(fa))(fb),
  map: AppResult<E>().map
})

// Reader<R,_>
type Reader<R,A> = (r:R)=>A
const Reader = {
  of:  <R,A>(a:A): Reader<R,A> => (_:R)=>a,
  map: <A,B>(f:(a:A)=>B) => <R>(ra:Reader<R,A>): Reader<R,B> => (r)=>f(ra(r)),
  ap:  <R,A,B>(rf:Reader<R,(a:A)=>B>) => (ra:Reader<R,A>): Reader<R,B> => (r)=>rf(r)(ra(r)),
}
const MonoidalReader = <R>() => ({
  unit: Reader.of<R, void>(undefined),
  tensor: <A,B>(fa:Reader<R,A>, fb:Reader<R,B>): Reader<R, readonly[A,B]> =>
    (r:R) => [fa(r), fb(r)] as const,
  map: Reader.map
})

// ReaderTask<R,_>
type ReaderTask<R,A> = (r:R)=>Promise<A>
const ReaderTask = {
  of:  <R,A>(a:A): ReaderTask<R,A> => async (_:R)=>a,
  map: <A,B>(f:(a:A)=>B) => <R>(rta:ReaderTask<R,A>): ReaderTask<R,B> => async (r)=>f(await rta(r)),
  ap:  <R,A,B>(rtf:ReaderTask<R,(a:A)=>B>) => (rta:ReaderTask<R,A>): ReaderTask<R,B> => async (r) => {
    const [f,a] = await Promise.all([rtf(r), rta(r)])
    return f(a)
  },
}
const MonoidalReaderTask = <R>() => ({
  unit: ReaderTask.of<R, void>(undefined),
  tensor: <A,B>(fa:ReaderTask<R,A>, fb:ReaderTask<R,B>): ReaderTask<R, readonly[A,B]> =>
    async (r:R) => {
      const [a,b] = await Promise.all([fa(r), fb(r)])
      return [a,b] as const
    },
  map: ReaderTask.map
})

// RTE<R,E,_>
type RTE<R,E,A> = (r:R)=>Promise<Result<E, A>>
const RTE = {
  of:  <R,E,A>(a:A): RTE<R,E,A> => async (_:R)=>Ok(a),
  map: <E,A,B>(f:(a:A)=>B) => <R>(rte:RTE<R,E,A>): RTE<R,E,B> =>
    async (r) => {
      const ra = await rte(r)
      return isOk(ra) ? Ok(f(ra.value)) : ra
    },
  ap:  <R,E,A,B>(rf:RTE<R,E,(a:A)=>B>) => (ra:RTE<R,E,A>): RTE<R,E,B> =>
    async (r)=> {
      const [f, a] = await Promise.all([rf(r), ra(r)])
      if (!isOk(f)) return f
      if (!isOk(a)) return a
      return Ok(f.value(a.value))
    }
}
const MonoidalRTE = <R,E>() => ({
  unit: RTE.of<R,E, void>(undefined),
  tensor: <A,B>(fa:RTE<R,E,A>, fb:RTE<R,E,B>): RTE<R,E, readonly[A,B]> =>
    async (r:R) => {
      const [ra, rb] = await Promise.all([fa(r), fb(r)])
      if (!isOk(ra)) return ra
      if (!isOk(rb)) return rb
      return Ok([ra.value, rb.value] as const)
    },
  map: RTE.map
})

const optionNumberSamples: ReadonlyArray<Option<number>> = [None, Some(0), Some(2)]
const optionStringSamples: ReadonlyArray<Option<string>> = [None, Some('hi'), Some('bye')]
const optionBooleanSamples: ReadonlyArray<Option<boolean>> = [None, Some(true), Some(false)]

const resultNumberSamples: ReadonlyArray<Result<string, number>> = [Err('err'), Ok(0), Ok(3)]
const resultStringSamples: ReadonlyArray<Result<string, string>> = [Err('err'), Ok('hi'), Ok('bye')]
const resultBooleanSamples: ReadonlyArray<Result<string, boolean>> = [Err('err'), Ok(true), Ok(false)]

const readerNumberSamples: ReadonlyArray<Reader<number, number>> = [
  r => r,
  r => r + 1,
  () => 5,
]

const readerStringSamples: ReadonlyArray<Reader<number, string>> = [
  r => `r:${r}`,
  () => 'constant',
  r => `${r * 2}`,
]

const readerBooleanSamples: ReadonlyArray<Reader<number, boolean>> = [
  r => r % 2 === 0,
  () => true,
  r => r > 10,
]

const readerTaskNumberSamples: ReadonlyArray<ReaderTask<number, number>> = [
  async r => r,
  async r => r + 1,
  async () => 7,
]

const readerTaskStringSamples: ReadonlyArray<ReaderTask<number, string>> = [
  async r => `r:${r}`,
  async () => 'task',
  async r => `${r * 3}`,
]

const readerTaskBooleanSamples: ReadonlyArray<ReaderTask<number, boolean>> = [
  async r => r % 2 === 0,
  async () => true,
  async r => r > 5,
]

const rteNumberSamples: ReadonlyArray<RTE<number, string, number>> = [
  async r => (r % 2 === 0 ? Ok(r) : Err('odd')),
  async r => Ok(r + 1),
  async () => Err('fail'),
]

const rteStringSamples: ReadonlyArray<RTE<number, string, string>> = [
  async r => (r % 2 === 0 ? Ok(`r${r}`) : Err('odd')),
  async () => Ok('value'),
  async () => Err('fail'),
]

const rteBooleanSamples: ReadonlyArray<RTE<number, string, boolean>> = [
  async r => (r % 2 === 0 ? Ok(true) : Err('odd')),
  async () => Ok(false),
  async () => Err('fail'),
]

// ---------- Generic law runners ----------
const assertLaw = (condition: boolean, label: string): void => {
  if (!condition) {
    throw new Error(label)
  }
}

const testFunctorLaws = (
  mapFn: (f: UnknownFn) => (fa: unknown) => unknown,
  values: ReadonlyArray<unknown>,
  eqF: (x: unknown, y: unknown) => boolean,
  transforms: ReadonlyArray<UnknownFn>,
  label: string,
): void => {
  for (const fa of values) {
    assertLaw(eqF(mapFn(id)(fa), fa), `${label}: functor identity`)
  }

  for (const fa of values) {
    for (const f of transforms) {
      for (const g of transforms) {
        const composed = mapFn(compose(g, f))(fa)
        const sequential = mapFn(g)(mapFn(f)(fa))
        assertLaw(eqF(composed, sequential), `${label}: functor composition`)
      }
    }
  }
}

const testMonoidalLawsSync = (
  M: { unit: unknown; tensor: (fa: unknown, fb: unknown) => unknown; map: (f: UnknownFn) => (fa: unknown) => unknown },
  faValues: ReadonlyArray<unknown>,
  fbValues: ReadonlyArray<unknown>,
  fcValues: ReadonlyArray<unknown>,
  eqF: (x: unknown, y: unknown) => boolean,
  leftTransforms: ReadonlyArray<UnknownFn>,
  rightTransforms: ReadonlyArray<UnknownFn>,
  label: string,
): void => {
  for (const fa of faValues) {
    assertLaw(eqF(M.map(lFrom)(fa), M.tensor(M.unit, fa)), `${label}: left unit`)
    assertLaw(eqF(M.map(rFrom)(fa), M.tensor(fa, M.unit)), `${label}: right unit`)
  }

  for (const fa of faValues) {
    for (const fb of fbValues) {
      for (const fcValue of fcValues) {
        const left = M.map(assocUnknown)(M.tensor(M.tensor(fa, fb), fcValue))
        const right = M.tensor(fa, M.tensor(fb, fcValue))
        assertLaw(eqF(left, right), `${label}: associativity`)
      }
    }
  }

  for (const fa of faValues) {
    for (const fb of fbValues) {
      for (const f of leftTransforms) {
        for (const g of rightTransforms) {
          const left = M.tensor(M.map(f)(fa), M.map(g)(fb))
          const right = M.map(pairTransforms(f, g))(M.tensor(fa, fb))
          assertLaw(eqF(left, right), `${label}: naturality`)
        }
      }
    }
  }
}

// Async version (ReaderTask / RTE)
const testMonoidalLawsAsync = async (
  M: { unit: unknown; tensor: (fa: unknown, fb: unknown) => unknown; map: (f: UnknownFn) => (fa: unknown) => unknown },
  faValues: ReadonlyArray<unknown>,
  fbValues: ReadonlyArray<unknown>,
  fcValues: ReadonlyArray<unknown>,
  eqAF: (x: unknown, y: unknown) => Promise<boolean>,
  leftTransforms: ReadonlyArray<UnknownFn>,
  rightTransforms: ReadonlyArray<UnknownFn>,
  label: string,
): Promise<void> => {
  for (const fa of faValues) {
    assertLaw(await eqAF(M.map(lFrom)(fa), M.tensor(M.unit, fa)), `${label}: left unit`)
    assertLaw(await eqAF(M.map(rFrom)(fa), M.tensor(fa, M.unit)), `${label}: right unit`)
  }

  for (const fa of faValues) {
    for (const fb of fbValues) {
      for (const fcValue of fcValues) {
        const left = M.map(assocUnknown)(M.tensor(M.tensor(fa, fb), fcValue))
        const right = M.tensor(fa, M.tensor(fb, fcValue))
        assertLaw(await eqAF(left, right), `${label}: associativity`)
      }
    }
  }

  for (const fa of faValues) {
    for (const fb of fbValues) {
      for (const f of leftTransforms) {
        for (const g of rightTransforms) {
          const left = M.tensor(M.map(f)(fa), M.map(g)(fb))
          const right = M.map(pairTransforms(f, g))(M.tensor(fa, fb))
          assertLaw(await eqAF(left, right), `${label}: naturality`)
        }
      }
    }
  }
}

// ---------- Run the suites ----------
const runTests = async () => {
  const resultSuite = MonoidalResult<string>()
  const readerSuite = MonoidalReader<number>()
  const readerTaskSuite = MonoidalReaderTask<number>()
  const rteSuite = MonoidalRTE<number, string>()

  const optionMap = (f: UnknownFn) => (fa: unknown) =>
    MonoidalOption.map((value: unknown) => f(value))(fa as Option<unknown>) as unknown
  const optionHarness = {
    unit: MonoidalOption.unit as unknown,
    tensor: (fa: unknown, fb: unknown) =>
      MonoidalOption.tensor(fa as Option<unknown>, fb as Option<unknown>) as unknown,
    map: optionMap,
  }

  const resultMap = (f: UnknownFn) => (fa: unknown) =>
    resultSuite.map((value: unknown) => f(value))(fa as Result<string, unknown>) as unknown
  const resultHarness = {
    unit: resultSuite.unit as unknown,
    tensor: (fa: unknown, fb: unknown) =>
      resultSuite.tensor(fa as Result<string, unknown>, fb as Result<string, unknown>) as unknown,
    map: resultMap,
  }

  const readerMap = (f: UnknownFn) => (fa: unknown) =>
    readerSuite.map((value: unknown) => f(value))(fa as Reader<number, unknown>) as unknown
  const readerHarness = {
    unit: readerSuite.unit as unknown,
    tensor: (fa: unknown, fb: unknown) =>
      readerSuite.tensor(fa as Reader<number, unknown>, fb as Reader<number, unknown>) as unknown,
    map: readerMap,
  }

  const readerTaskMap = (f: UnknownFn) => (fa: unknown) =>
    readerTaskSuite.map((value: unknown) => f(value))(fa as ReaderTask<number, unknown>) as unknown
  const readerTaskHarness = {
    unit: readerTaskSuite.unit as unknown,
    tensor: (fa: unknown, fb: unknown) =>
      readerTaskSuite.tensor(fa as ReaderTask<number, unknown>, fb as ReaderTask<number, unknown>) as unknown,
    map: readerTaskMap,
  }

  const rteMap = (f: UnknownFn) => (fa: unknown) =>
    rteSuite.map((value: unknown) => f(value))(fa as RTE<number, string, unknown>) as unknown
  const rteHarness = {
    unit: rteSuite.unit as unknown,
    tensor: (fa: unknown, fb: unknown) =>
      rteSuite.tensor(fa as RTE<number, string, unknown>, fb as RTE<number, string, unknown>) as unknown,
    map: rteMap,
  }

  // Option<number>
  testFunctorLaws(optionMap, optionNumberSamples, eq, numberTransforms, 'Option')
  testMonoidalLawsSync(
    optionHarness,
    optionNumberSamples,
    optionStringSamples,
    optionBooleanSamples,
    eq,
    numberTransforms,
    stringTransforms,
    'Option',
  )

  // Result<string, _>
  testFunctorLaws(resultMap, resultNumberSamples, eq, numberTransforms, 'Result<string,_>')
  testMonoidalLawsSync(
    resultHarness,
    resultNumberSamples,
    resultNumberSamples,
    resultNumberSamples,
    eq,
    numberTransforms,
    numberTransforms,
    'Result<string,_>',
  )

  // Reader<number, _>
  testFunctorLaws(readerMap, readerNumberSamples, eqReaderUnknown, numberTransforms, 'Reader<number,_>')
  testMonoidalLawsSync(
    readerHarness,
    readerNumberSamples,
    readerStringSamples,
    readerBooleanSamples,
    eqReaderUnknown,
    numberTransforms,
    stringTransforms,
    'Reader<number,_>',
  )

  // ReaderTask<number, _>
  await testMonoidalLawsAsync(
    readerTaskHarness,
    readerTaskNumberSamples,
    readerTaskStringSamples,
    readerTaskBooleanSamples,
    eqReaderTaskUnknown,
    numberTransforms,
    stringTransforms,
    'ReaderTask<number,_>',
  )

  // RTE<number, string, _>
  await testMonoidalLawsAsync(
    rteHarness,
    rteNumberSamples,
    rteStringSamples,
    rteBooleanSamples,
    (f, g) => eqRTEUnknown(f, g),
    numberTransforms,
    stringTransforms,
    'ReaderTaskEither<number,string,_>',
  )

  console.log('✓ Monoidal functor laws passed for Option, Result<string,_>, Reader, ReaderTask, ReaderTaskEither')
}

runTests().catch(console.error)
