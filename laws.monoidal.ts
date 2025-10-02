/* eslint-disable @typescript-eslint/no-floating-promises */
import fc from 'fast-check'

// ---------- small helpers (pure) ----------
const id = <A>(a: A) => a
const compose = <A,B,C>(g: (b:B)=>C, f:(a:A)=>B) => (a:A) => g(f(a))

const lFrom = <A>(a: A): readonly [void, A] => [undefined, a] as const
const rFrom = <A>(a: A): readonly [A, void] => [a, undefined] as const
const assocFrom = <A,B,C>(x: readonly [[A,B], C]): readonly [A, readonly [B, C]] =>
  [x[0][0], [x[0][1], x[1]] as const] as const
const bimap = <A,B,C,D>(f:(a:A)=>C, g:(b:B)=>D) =>
  ([a,b]: readonly [A,B]): readonly [C,D] => [f(a), g(b)] as const

// ---------- deep-ish equality for small structures ----------
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// run Reader/ReaderTask/RTE at a few env samples and compare
const sampleRs = [0, 1, 42]
const eqReader = <A>(ra: (r:number)=>A, rb: (r:number)=>A) =>
  sampleRs.every(r => eq(ra(r), rb(r)))

const eqReaderTask = async <A>(ra: (r:number)=>Promise<A>, rb: (r:number)=>Promise<A>) =>
  (await Promise.all(sampleRs.map(async r => eq(await ra(r), await rb(r))))).every(Boolean)

const eqReaderTaskUnknown = (
  ra: (r:number)=>Promise<unknown>,
  rb: (r:number)=>Promise<unknown>
) => eqReaderTask(ra, rb)

const eqRTE = async <E, A>(ra: RTE<number, E, A>, rb: RTE<number, E, A>) => {
  for (const r of sampleRs) {
    const [fa, fb] = await Promise.all([ra(r), rb(r)])
    if (!eq(fa, fb)) {
      return false
    }
  }
  return true
}

// ---------- Arbitraries for your datatypes ----------
// Option
const arbOption = <A>(arbA: fc.Arbitrary<A>) =>
  fc.oneof(fc.constant({ _tag:'None' as const }), arbA.map(a => ({ _tag:'Some' as const, value:a })))

// Result
const arbResult = <E, A>(arbE: fc.Arbitrary<E>, arbA: fc.Arbitrary<A>) =>
  fc.oneof(arbE.map(e => ({ _tag:'Err' as const, error:e })), arbA.map(a => ({ _tag:'Ok' as const, value:a })))

// Reader<R, A> ~ (r:R)=>A
const arbReader = <R, A>(arbA: fc.Arbitrary<A>) =>
  fc.func<[R], A>(arbA) as unknown as fc.Arbitrary<(r:R)=>A>

// ReaderTask<R,A> ~ (r:R)=>Promise<A>
const arbReaderTask = <R, A>(arbA: fc.Arbitrary<A>) =>
  arbReader<R, A>(arbA).map(f => async (r:R) => f(r))

// RTE<R,E,A> ~ (r:R)=>Promise<Result<E,A>>
const arbRTE = <R, E, A>(arbE: fc.Arbitrary<E>, arbA: fc.Arbitrary<A>) =>
  arbReaderTask<R, { _tag:'Err'; error:E } | { _tag:'Ok'; value:A }>(
    arbResult(arbE, arbA)
  )

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

// ---------- Generic law runners ----------
const testFunctorLaws = (
  F:{ map:<A,B>(f:(a:A)=>B)=>(fa:unknown)=>unknown },
  arbFA: fc.Arbitrary<unknown>,
  eqF:(x:unknown,y:unknown)=>boolean
) =>
  fc.assert(fc.property(arbFA, fc.func(fc.anything()), fa => eqF(F.map(id)(fa), fa))) &&
  fc.assert(fc.property(arbFA, fc.func(fc.anything()), fc.func(fc.anything()),
    (fa, f: (a:unknown)=>unknown, g: (a:unknown)=>unknown) =>
      eqF(F.map(compose(g,f))(fa), F.map(g)(F.map(f)(fa)))
  ))

const testMonoidalLawsSync = (
  M:{ unit:unknown; tensor:(fa:unknown,fb:unknown)=>unknown; map:<A,B>(f:(a:A)=>B)=>(fa:unknown)=>unknown },
  arbFA: fc.Arbitrary<unknown>, arbFB: fc.Arbitrary<unknown>, arbFC: fc.Arbitrary<unknown>,
  eqF: (x:unknown,y:unknown)=>boolean) => {
  // Left/Right unit
  fc.assert(fc.property(arbFA, fa => eqF(M.map(lFrom)(fa), M.tensor(M.unit, fa))))
  fc.assert(fc.property(arbFA, fa => eqF(M.map(rFrom)(fa), M.tensor(fa, M.unit))))
  // Associativity
  fc.assert(fc.property(arbFA, arbFB, arbFC, (fa, fb, fc_) => {
    const left  = M.map(assocFrom)(M.tensor(M.tensor(fa, fb), fc_))
    const right = M.tensor(fa, M.tensor(fb, fc_))
    return eqF(left, right)
  }))
  // Naturality
  fc.assert(fc.property(
    arbFA, arbFB, fc.func(fc.anything()), fc.func(fc.anything()),
    (fa, fb, f: (a:unknown)=>unknown, g: (a:unknown)=>unknown) => {
      const left  = M.tensor(M.map(f)(fa), M.map(g)(fb))
      const right = M.map(bimap(f,g))(M.tensor(fa, fb))
      return eqF(left, right)
    }))
}

// Async version (ReaderTask / RTE)
const testMonoidalLawsAsync = async (
  M:{ unit:unknown; tensor:(fa:unknown,fb:unknown)=>unknown; map:<A,B>(f:(a:A)=>B)=>(fa:unknown)=>unknown },
  arbFA: fc.Arbitrary<unknown>, arbFB: fc.Arbitrary<unknown>, arbFC: fc.Arbitrary<unknown>,
  eqAF: (x:unknown,y:unknown)=>Promise<boolean>
) => {
  await fc.assert(
    fc.asyncProperty(arbFA, async (fa) => await eqAF(M.map(lFrom)(fa), M.tensor(M.unit, fa)))
  )
  await fc.assert(
    fc.asyncProperty(arbFA, async (fa) => await eqAF(M.map(rFrom)(fa), M.tensor(fa, M.unit)))
  )
  await fc.assert(
    fc.asyncProperty(arbFA, arbFB, arbFC, async (fa, fb, fc_) => {
      const left  = M.map(assocFrom)(M.tensor(M.tensor(fa, fb), fc_))
      const right = M.tensor(fa, M.tensor(fb, fc_))
      return await eqAF(left, right)
    })
  )
  await fc.assert(
    fc.asyncProperty(arbFA, arbFB, fc.func(fc.anything()), fc.func(fc.anything()),
      async (fa, fb, f: (a:unknown)=>unknown, g: (a:unknown)=>unknown) => {
        const left  = M.tensor(M.map(f)(fa), M.map(g)(fb))
        const right = M.map(bimap(f,g))(M.tensor(fa, fb))
        return await eqAF(left, right)
      })
  )
}

// ---------- Run the suites ----------
const runTests = async () => {
  // Option<number>
  testFunctorLaws(MonoidalOption, arbOption(fc.integer()), eq)
  testMonoidalLawsSync(MonoidalOption, arbOption(fc.integer()), arbOption(fc.string()), arbOption(fc.boolean()), eq)
  // Result<string, _>
  testFunctorLaws(MonoidalResult<string>(), arbResult(fc.string(), fc.integer()), eq)
  testMonoidalLawsSync(MonoidalResult<string>(), arbResult(fc.string(), fc.integer()), arbResult(fc.string(), fc.integer()), arbResult(fc.string(), fc.integer()), eq)
  // Reader<number, _>
  testFunctorLaws(MonoidalReader<number>(), arbReader<number, number>(fc.integer()), (x,y)=>eqReader(x,y))
  testMonoidalLawsSync(MonoidalReader<number>(), arbReader<number, number>(fc.integer()), arbReader<number, string>(fc.string()), arbReader<number, boolean>(fc.boolean()), (x,y)=>eqReader(x,y))

  // ReaderTask<number, _>
  await testMonoidalLawsAsync(
    MonoidalReaderTask<number>(),
    arbReaderTask<number, number>(fc.integer()),
    arbReaderTask<number, string>(fc.string()),
    arbReaderTask<number, boolean>(fc.boolean()),
    eqReaderTaskUnknown
  )

  // RTE<number, string, _>
  await testMonoidalLawsAsync(
    MonoidalRTE<number,string>(),
    arbRTE<number, string, number>(fc.string(), fc.integer()),
    arbRTE<number, string, string>(fc.string(), fc.string()),
    arbRTE<number, string, boolean>(fc.string(), fc.boolean()),
    (f, g) => eqRTE(f, g)
  )

  console.log('✓ Monoidal functor laws passed for Option, Result<string,_>, Reader, ReaderTask, ReaderTaskEither')
}

runTests().catch(console.error)
