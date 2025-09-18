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
const eqReader = <R, A>(ra: (r:R)=>A, rb: (r:R)=>A) =>
  sampleRs.every(r => eq(ra(r as any), rb(r as any)))

const eqReaderTask = async <R, A>(ra: (r:R)=>Promise<A>, rb: (r:R)=>Promise<A>) =>
  (await Promise.all(sampleRs.map(async r => eq(await ra(r as any), await rb(r as any))))).every(Boolean)

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
const None = { _tag:'None' } as const
const Some = <A>(a: A) => ({ _tag:'Some' as const, value:a })
const isSome = <A>(o:any): o is { _tag:'Some'; value:A } => o && o._tag === 'Some'

const mapO = <A,B>(f:(a:A)=>B) => (oa:any) => isSome<A>(oa) ? Some(f(oa.value)) : None
const apO  = <A,B>(ff:any) => (fa:any) => isSome<(a:A)=>B>(ff) && isSome<A>(fa) ? Some(ff.value(fa.value)) : None
const AppOption = { of: Some, map: mapO as any, ap: apO as any }
const MonoidalOption = {
  unit: AppOption.of<void>(undefined),
  tensor: <A,B>(fa:any, fb:any) => AppOption.ap(AppOption.map((a:A)=>(b:B)=>[a,b] as const)(fa))(fb),
  map: AppOption.map
}

// Result<E,_>
const Ok = <A>(a:A) => ({ _tag:'Ok' as const, value:a })
const Err = <E>(e:E) => ({ _tag:'Err' as const, error:e })
const isOk = (r:any) => r && r._tag === 'Ok'
const mapR = <E,A,B>(f:(a:A)=>B) => (ra:any) => isOk(ra) ? Ok(f(ra.value)) : ra
const apR  = <E,A,B>(rf:any) => (ra:any) => isOk(rf)&&isOk(ra) ? Ok(rf.value(ra.value)) : (rf._tag==='Err'? rf: ra)
const AppResult = <E>() => ({ of: Ok as any, map: mapR as any, ap: apR as any })
const MonoidalResult = <E>() => ({
  unit: AppResult<E>().of<void>(undefined),
  tensor: <A,B>(fa:any, fb:any) => AppResult<E>().ap(AppResult<E>().map((a:A)=>(b:B)=>[a,b] as const)(fa))(fb),
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
type RTE<R,E,A> = (r:R)=>Promise<{ _tag:'Err'; error:E } | { _tag:'Ok'; value:A }>
const RTE = {
  of:  <R,E,A>(a:A): RTE<R,E,A> => async (_:R)=>Ok(a),
  map: <E,A,B>(f:(a:A)=>B) => <R>(rte:RTE<R,E,A>): RTE<R,E,B> =>
    async (r)=>{ const ra = await rte(r); return isOk(ra)? Ok(f(ra.value)): ra as any },
  ap:  <R,E,A,B>(rf:RTE<R,E,(a:A)=>B>) => (ra:RTE<R,E,A>): RTE<R,E,B> =>
    async (r)=> {
      const [f, a] = await Promise.all([rf(r), ra(r)])
      if (!isOk(f)) return f as any
      if (!isOk(a)) return a as any
      return Ok(f.value(a.value))
    }
}
const MonoidalRTE = <R,E>() => ({
  unit: RTE.of<R,E, void>(undefined),
  tensor: <A,B>(fa:RTE<R,E,A>, fb:RTE<R,E,B>): RTE<R,E, readonly[A,B]> =>
    async (r:R) => {
      const [ra, rb] = await Promise.all([fa(r), fb(r)])
      if (!isOk(ra)) return ra as any
      if (!isOk(rb)) return rb as any
      return Ok([ra.value, rb.value] as const)
    },
  map: RTE.map
})

// ---------- Generic law runners ----------
const testFunctorLaws = <F>(F:{ map:<A,B>(f:(a:A)=>B)=>(fa:any)=>any }, arbFA: fc.Arbitrary<any>, eqF:(x:any,y:any)=>boolean) =>
  fc.assert(fc.property(arbFA, fc.func(fc.anything()), fa => eqF(F.map(id as any)(fa), fa))) &&
  fc.assert(fc.property(arbFA, fc.func(fc.anything()), fc.func(fc.anything()),
    (fa, f:any, g:any) => eqF(F.map(compose(g,f) as any)(fa), F.map(g as any)(F.map(f as any)(fa)))
  ))

const testMonoidalLawsSync = <F>(M:{ unit:any; tensor:(fa:any,fb:any)=>any; map:<A,B>(f:(a:A)=>B)=>(fa:any)=>any },
  arbFA: fc.Arbitrary<any>, arbFB: fc.Arbitrary<any>, arbFC: fc.Arbitrary<any>,
  eqF: (x:any,y:any)=>boolean) => {
  // Left/Right unit
  fc.assert(fc.property(arbFA, fa => eqF(M.map(lFrom as any)(fa), M.tensor(M.unit, fa))))
  fc.assert(fc.property(arbFA, fa => eqF(M.map(rFrom as any)(fa), M.tensor(fa, M.unit))))
  // Associativity
  fc.assert(fc.property(arbFA, arbFB, arbFC, (fa, fb, fc_) => {
    const left  = M.map(assocFrom as any)(M.tensor(M.tensor(fa, fb), fc_))
    const right = M.tensor(fa, M.tensor(fb, fc_))
    return eqF(left, right)
  }))
  // Naturality
  fc.assert(fc.property(
    arbFA, arbFB, fc.func(fc.anything()), fc.func(fc.anything()),
    (fa, fb, f:any, g:any) => {
      const left  = M.tensor(M.map(f)(fa), M.map(g)(fb))
      const right = M.map(bimap(f,g) as any)(M.tensor(fa, fb))
      return eqF(left, right)
    }))
}

// Async version (ReaderTask / RTE)
const testMonoidalLawsAsync = async <F>(
  M:{ unit:any; tensor:(fa:any,fb:any)=>any; map:<A,B>(f:(a:A)=>B)=>(fa:any)=>any },
  arbFA: fc.Arbitrary<any>, arbFB: fc.Arbitrary<any>, arbFC: fc.Arbitrary<any>,
  eqAF: (x:any,y:any)=>Promise<boolean>
) => {
  await fc.assert(
    fc.asyncProperty(arbFA, async (fa) => await eqAF(M.map(lFrom as any)(fa), M.tensor(M.unit, fa)))
  )
  await fc.assert(
    fc.asyncProperty(arbFA, async (fa) => await eqAF(M.map(rFrom as any)(fa), M.tensor(fa, M.unit)))
  )
  await fc.assert(
    fc.asyncProperty(arbFA, arbFB, arbFC, async (fa, fb, fc_) => {
      const left  = M.map(assocFrom as any)(M.tensor(M.tensor(fa, fb), fc_))
      const right = M.tensor(fa, M.tensor(fb, fc_))
      return await eqAF(left, right)
    })
  )
  await fc.assert(
    fc.asyncProperty(arbFA, arbFB, fc.func(fc.anything()), fc.func(fc.anything()),
      async (fa, fb, f:any, g:any) => {
        const left  = M.tensor(M.map(f)(fa), M.map(g)(fb))
        const right = M.map(bimap(f,g) as any)(M.tensor(fa, fb))
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
    (x:any,y:any)=>eqReaderTask(x,y)
  )

  // RTE<number, string, _>
  await testMonoidalLawsAsync(
    MonoidalRTE<number,string>(),
    arbRTE<number, string, number>(fc.string(), fc.integer()),
    arbRTE<number, string, string>(fc.string(), fc.string()),
    arbRTE<number, string, boolean>(fc.string(), fc.boolean()),
    async (f:any,g:any)=> {
      // eq over envs
      for (const r of sampleRs) {
        const [ra, rb] = await Promise.all([f(r as any), g(r as any)])
        if (!eq(ra, rb)) return false
      }
      return true
    }
  )

  console.log('✓ Monoidal functor laws passed for Option, Result<string,_>, Reader, ReaderTask, ReaderTaskEither')
}

runTests().catch(console.error)
