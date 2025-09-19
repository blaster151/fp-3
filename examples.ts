/**
 * tiny-fp Examples
 * ================
 * 
 * This file contains runnable examples demonstrating the various concepts
 * and patterns in the tiny-fp library. Examples are organized from simple
 * to complex, following a logical learning progression.
 * 
 * To run these examples:
 * 1. Uncomment the code blocks you want to test
 * 2. Run: npx ts-node examples.ts
 */

import type {
  // Core types
  Option, Result, Validation, StateReaderTask, RWST, ReaderTaskOption
} from './allTS'

import {
  // Core values
  Some, None, Ok, Err, VOk, VErr,
  // Monads
  Reader, ReaderTask, TaskResult, State,
  // Combinators
  DoR, DoTR, SRT, runSRT, genRTO, genRWST, RTO_, RWST_,
  // Utilities
  sequenceArrayValidation, sequenceArrayResult, sequenceStructValidation, sequenceStructResult,
  partitionSet, partitionSetWith, productTR, zipWithTR, sequenceState, traverseSRT,
  // JSON streaming
  makeJsonStreamFolder, ev,
  // Fused pipelines
  fuseJson, coalgRangeUnary, coalgFullBinary, Alg_Json_pretty_fused, Alg_Json_sum_fused, Alg_Json_size_fused, Alg_Json_stats,
  sumRange_FUSED, prettyRange_FUSED, statsFullBinary_FUSED, prettyAndSize_FUSED,
  // Expr constructors
  lit, add, mul, neg, addN, mulN, vvar, lett, divE, evalExpr, showExpr, normalizeExprToNary,
  // Advanced evaluators
  evalExprNum2, evalExprR, evalExprRR, showExprMinParens2,
  // Monoids
  MonoidArray,
  // Categorical theory
  SemiringNat, makeDiagonalCoring, makeDiagonalComodule, comoduleCoassocHolds, comoduleCounitHolds,
  tensorBalancedMapSameR, idMap, composeMap, eqMat, FreeBimoduleStd, tensorBalancedObj,
  makeDiagonalBicomodule, bicomoduleCommutes,
  makeDiagonalAlgebra, makeDiagonalEntwining, entwiningCoassocHolds, entwiningMultHolds,
  entwiningUnitHolds, entwiningCounitHolds
} from './allTS'

// ====================================================================
// 1. BASIC CONCEPTS - Option, Result, Validation
// ====================================================================

namespace BasicConcepts {
  // Simple Option usage
  const parseNumber = (s: string): Option<number> => {
    const n = Number(s)
    return isNaN(n) ? None : Some(n)
  }

  const safeDivide = (a: number, b: number): Option<number> => 
    b === 0 ? None : Some(a / b)

  // Example usage:
  // const result = pipe(
  //   parseNumber("10"),
  //   flatMapO(n => safeDivide(n, 2))
  // )
  // console.log(result) // Some(5)
}

namespace ResultExamples {
  // Result for error handling
  const parseIntR = (s: string): Result<string, number> =>
    isNaN(Number(s)) ? Err(`not a number: ${s}`) : Ok(Number(s))

  const nonZero = (n: number): Result<string, number> =>
    n === 0 ? Err('zero not allowed') : Ok(n)

  // Example usage:
  // const result = pipe(
  //   parseIntR("10"),
  //   flatMapR(nonZero)
  // )
  // console.log(result) // Ok(10)
}

namespace ValidationExamples {
  // Validation for accumulating errors
  const validateEmail = (s: string): Validation<string, string> =>
    s.includes('@') ? VOk(s) : VErr('invalid email')

  const validateAge = (n: number): Validation<string, number> =>
    n >= 0 && n <= 150 ? VOk(n) : VErr('invalid age')

  // Example usage:
  // const userV = sequenceStructValidation({
  //   name: VOk('Ada'),
  //   email: validateEmail('ada@example.com'),
  //   age: validateAge(35)
  // }, (x, y) => [...x, ...y])
  // console.log(userV) // VOk({ name: 'Ada', email: 'ada@example.com', age: 35 })
}

// ====================================================================
// 2. DO NOTATION - Clean monadic composition
// ====================================================================

namespace DoNotationExamples {
  // Result example with Do notation
  const parseIntR = (s: string): Result<string, number> =>
    isNaN(Number(s)) ? Err(`not a number: ${s}`) : Ok(Number(s))

  const nonZero = (n: number): Result<string, number> =>
    n === 0 ? Err('zero not allowed') : Ok(n)

  const rSum: Result<string, number> = DoR<string>()
    .bind('a', parseIntR('10'))
    .bind('b', parseIntR('5'))
    .bind('nz', nonZero(1))
    .map(({ a, b }) => a + b)
  // -> Ok(15)

  // TaskResult example (async)
  const delayOk = <A>(ms: number, a: A): TaskResult<string, A> =>
    () => new Promise(res => setTimeout(() => res(Ok(a)), ms))
  
  const delayErr = (ms: number, e: string): TaskResult<string, never> =>
    () => new Promise(res => setTimeout(() => res(Err(e)), ms))

  const tr: TaskResult<string, { total: number }> =
    DoTR<string>()
      .bind('x', delayOk(5, 2))
      .bind('y', delayOk(5, 3))
      .map(({ x, y }) => ({ total: x + y }))

  // Example usage:
  // (async () => console.log(await tr()))() // { total: 5 }
}

// ====================================================================
// 3. STATE MANAGEMENT - Pure stateful computations
// ====================================================================

namespace StateExamples {
  // Simple counter/log demo using State + sequenceState
  type S = { n: number; log: ReadonlyArray<string> }

  // One tick: increment and report new value
  const tick: State<S, number> = (s0) => {
    const s1 = { ...s0, n: s0.n + 1 }
    return [s1.n, s1] as const
  }

  const labeled = (label: string): State<S, number> =>
    State.map<number, number>(n => n)((s) => {
      const [n1, s1] = tick(s)
      const s2 = { ...s1, log: [...s1.log, `${label}:${n1}`] }
      return [n1, s2] as const
    })

  const program = sequenceState([labeled("a"), labeled("b"), labeled("c")])

  // Example usage:
  // const [vals, sFinal] = State.run(program, { n: 0, log: [] })
  // vals: [1, 2, 3]
  // sFinal.log: ["a:1","b:2","c:3"]
}

// ====================================================================
// 4. READER PATTERN - Dependency injection
// ====================================================================

namespace ReaderExamples {
  // Environment-based configuration
  type Env = { apiBase: string; token: string }

  const authHeader: Reader<Env, Record<string, string>> = Reader.asks((env) => ({
    'Authorization': `Bearer ${env.token}`
  }))

  const url: Reader<Env, string> = Reader.asks((env) => `${env.apiBase}/users/me`)

  const headersThenUrl = Reader.chain<Record<string, string>, string, Env>((h) =>
    Reader.map<string, string>((u) => `${u}?auth=${!!h['Authorization']}`)(url)
  )(authHeader)

  // Example usage:
  // const env: Env = { apiBase: "https://api.example.com", token: "secret" }
  // const result = headersThenUrl(env)
  // console.log(result) // "https://api.example.com/users/me?auth=true"
}

// ====================================================================
// 5. ASYNC PATTERNS - TaskResult and parallel execution
// ====================================================================

namespace AsyncExamples {
  // Parallel execution with TaskResult
  const okAfter = <A>(ms: number, a: A): TaskResult<string, A> =>
    () => new Promise(res => setTimeout(() => res(Ok(a)), ms))

  // Pair the results in parallel (number, string) -> [number, string]
  const pairTR: TaskResult<string, readonly [number, string]> =
    productTR<string, number, string>(
      okAfter(10, 42)
    )(
      okAfter(20, 'hi')
    )

  // Or with a custom combiner:
  const pairTR2 =
    zipWithTR<string, number, string, readonly [number, string]>((n, s) => [n, s] as const)(
      okAfter(10, 42)
    )(
      okAfter(20, 'hi')
    )

  // Example usage:
  // (async () => console.log(await pairTR()))() // [42, 'hi']
}

// ====================================================================
// 6. COMBINED PATTERNS - StateReaderTask (SRT)
// ====================================================================

namespace SRTExamples {
  // Avoid DOM types; make a tiny "HTTP-like" client for demo.
  type MiniResponse = { text: () => Promise<string> }
  type MiniHttp = (url: string) => Promise<MiniResponse>
  type Env = { apiBase: string; http: MiniHttp }
  type S = { calls: number }

  // mock http that returns a short string after a tick
  const mockHttp: MiniHttp = async (url) => ({
    text: async () => `pong from ${url}`,
  })

  // one SRT step: "GET /ping", increment call count, return response text
  const ping: StateReaderTask<Env, S, string> =
    (env) => async (s0) => {
      const res = await env.http(`${env.apiBase}/ping`)
      const txt = await res.text()
      const s1 = { ...s0, calls: s0.calls + 1 }
      return [txt, s1] as const
    }

  // compose two pings using SRT combinators
  const twoPings: StateReaderTask<Env, S, readonly [string, string]> =
    SRT.chain<string, readonly [string, string], S, Env>((first) =>
      SRT.map<string, readonly [string, string]>(second => [first, second] as const)<S>()<Env>(ping)
    )(ping)

  // Example usage:
  // (async () => {
  //   const env: Env = { apiBase: "https://example.test", http: mockHttp }
  //   const [result, sFinal] = await runSRT(twoPings, env, { calls: 0 })
  //   // result: ["pong from https://example.test/ping", "pong from https://example.test/ping"]
  //   // sFinal.calls: 2
  // })()
}

namespace SRTBatchExamples {
  // Batch processing with SRT
  type Env = { seed: number }
  type S = { log: ReadonlyArray<string> }

  // One step: add i to seed, log it, return the sum
  const step = (i: number): StateReaderTask<Env, S, number> =>
    (env) => async (s0) => {
      const n = env.seed + i
      const s1 = { ...s0, log: [...s0.log, `saw:${n}`] }
      return [n, s1] as const
    }

  // Build steps for [0,1,2,3] and run them in order
  const program = traverseSRT<Env, S, number, number>([0, 1, 2, 3], step)

  // Example usage:
  // (async () => {
  //   const [vals, sFinal] = await program({ seed: 10 })({ log: [] })
  //   // vals: [10, 11, 12, 13]
  //   // sFinal.log: ["saw:10","saw:11","saw:12","saw:13"]
  // })()
}

// ====================================================================
// 7. ADVANCED PATTERNS - ReaderTaskOption (RTO) and RWST
// ====================================================================

namespace RTOExamples {
  // ReaderTaskOption example
  type Env = { n: number }
  
  const stepA: ReaderTaskOption<Env, number> = async (r) => Some(r.n)
  const stepB = (x: number): ReaderTaskOption<Env, number> => async () => (x > 0 ? Some(x + 1) : None)

  const prog = genRTO<Env>()(function* () {
    const a = yield* RTO_(stepA)
    const b = yield* RTO_(stepB(a))
    return a + b
  })

  // Example usage:
  // (async () => {
  //   const result = await prog({ n: 2 })
  //   console.log(result) // Some(5)
  // })()
}

namespace RWSTExamples {
  // Reader-Writer-State-Transformer example
  type Env = { inc: number }
  type S = { log: ReadonlyArray<string> }
  const M = MonoidArray<string>()

  const step = (label: string): RWST<Env, ReadonlyArray<string>, S, number> =>
    (r) => async (s0) => {
      const n = r.inc
      const s1 = { ...s0, log: [...s0.log, label] }
      return [n, s1, [label]] as const
    }

  const prog = genRWST(M)<Env, S>()(function* () {
    const a = yield* RWST_(step('a'))
    const b = yield* RWST_(step('b'))
    return a + b
  })

  // Example usage:
  // (async () => {
  //   const [sum, sFinal, w] = await prog({ inc: 2 })({ log: [] })
  //   // sum === 4, sFinal.log === ['a','b'], w === ['a','b']
  //   console.log({ sum, sFinal, w })
  // })()
}

// ====================================================================
// 8. UTILITY PATTERNS - Partitioning and sequencing
// ====================================================================

namespace PartitionExamples {
  // Partition sets based on predicates
  const isNum = (x: string | number): x is number => typeof x === 'number'
  const [nums, strs] = partitionSet(new Set(['x', 1, 2, 'y']), isNum)
  // nums: Set([1, 2]), strs: Set(['x', 'y'])

  const parseIntR = (s: string): Result<string, number> =>
    isNaN(+s) ? Err(`bad:${s}`) : Ok(+s)
  const [errs, oks] = partitionSetWith(new Set(['1','nope','2']), parseIntR)
  // errs: Set(['nope']), oks: Set([1, 2])
}

namespace SequenceExamples {
  // Array sequencing
  const concat = <E>(x: ReadonlyArray<E>, y: ReadonlyArray<E>) => [...x, ...y]
  const v1 = sequenceArrayValidation([VOk(1), VErr('e1'), VErr('e2'), VOk(2)], concat)
  // -> VErr(['e1','e2'])
  const r1 = sequenceArrayResult([Ok(1), Err('boom'), Ok(2)])
  // -> Err('boom')

  // Struct sequencing
  const userV = sequenceStructValidation({
    name: VOk('Ada'),
    email: VErr('bad email'),
    age: VOk(35)
  }, concat)
  // -> VErr(['bad email'])

  const userR = sequenceStructResult({
    id: Ok('u1'),
    profile: Err(new Error('404'))
  })
  // -> Err(Error('404'))
}

// ====================================================================
// 9. JSON STREAMING - Event-driven JSON processing
// ====================================================================

namespace JsonStreamingExamples {
  // Count all nodes in a JSON stream
  const CountAlg = {
    JNull: () => 1,
    JBool: () => 1,
    JNum: () => 1,
    JStr: () => 1,
    Arr: {
      begin: () => 1,
      step: (acc: number, child: number) => acc + child,
      done: (acc: number) => acc
    },
    Obj: {
      begin: () => 1,
      step: (acc: number, kv: readonly [string, number]) => acc + kv[1],
      done: (acc: number) => acc
    }
  }

  const counter = makeJsonStreamFolder(CountAlg)

  // Example usage:
  // counter.push(ev.startObj())
  // counter.push(ev.key('users'))
  // counter.push(ev.startArr())
  //   counter.push(ev.startObj())
  //     counter.push(ev.key('id')); counter.push(ev.num(1))
  //     counter.push(ev.key('name')); counter.push(ev.str('Ada'))
  //   counter.push(ev.endObj())
  // counter.push(ev.endArr())
  // counter.push(ev.endObj())
  // const result = counter.done() // Result<Error, number>
}

// ====================================================================
// 10. FUSED PIPELINES - Deforested generation and consumption
// ====================================================================

namespace FusedPipelineExamples {
  // Fused pipelines demonstrate the power of hylomorphism: composing coalgebras
  // (generators) with algebras (consumers) to create deforested pipelines that
  // never build intermediate data structures. This is especially useful for
  // processing large or infinite data streams efficiently.
  
  // The key insight: instead of generating a full tree and then consuming it,
  // we fuse the generation and consumption into a single pass, avoiding
  // intermediate memory allocation.

  // Example 1: Range sum (no intermediate JSON tree)
  // Instead of: generate [4,3,2,1,0] → sum → 10
  // We do: generate-and-sum in one pass → 10
  const rangeSum = sumRange_FUSED(5)  // -> 15 (1+2+3+4+5)

  // Example 2: Range pretty-printing (illustrative)
  // Shows "generate → pretty" fused, though pretty-printing a unary array
  // is a bit silly in practice
  const rangePretty = prettyRange_FUSED(3)  // -> "[2, 1, ]"

  // Example 3: Full binary tree statistics in one pass
  // Computes sum, count, max, and height without building the tree
  const binaryStats = statsFullBinary_FUSED(3)  // -> { sum: 8, count: 15, max: 1, height: 4 }

  // Example 4: Multiple results in one pass
  // Gets both pretty representation and size without building intermediate tree
  const prettyAndSize = prettyAndSize_FUSED(2)  // -> ["[[1, 1], [1, 1]]", 7]

  // Example usage:
  // (() => {
  //   console.log('Range sum (fused):', rangeSum)
  //   console.log('Range pretty (fused):', rangePretty)
  //   console.log('Binary tree stats (fused):', binaryStats)
  //   console.log('Pretty and size (fused):', prettyAndSize)
  // })()

  // Why this is useful:
  // 1. Deforestation: hylo composes unfold and fold so nothing intermediate is built
  // 2. Swap meanings: keep coalg* the same, plug different algebras to evaluate vs. pretty vs. stats
  // 3. Single pass, multiple results: product algebras give you "N results in one traversal"
  // 4. Memory efficient: no intermediate data structures for large or infinite streams
  // 5. Composable: mix and match coalgebras and algebras for different behaviors
}

// ====================================================================
// 11. SAFE AST EVOLUTION - Compiler-enforced refactoring
// ====================================================================

namespace SafeASTEvolutionExamples {
  // This demonstrates the power of HKT + recursion schemes for safe AST evolution.
  // When you add a new node type (like Neg), the compiler forces every algebra
  // to handle it, preventing bugs and ensuring consistency.
  
  // Example: Using the new Neg constructor
  const simpleNeg = neg(lit(5))  // -5
  const negExpr = neg(add(lit(2), lit(3)))  // -(2 + 3) = -5
  
  // All algebras automatically work with the new Neg node:
  const result1 = evalExpr(simpleNeg)  // -5
  const result2 = evalExpr(negExpr)  // -5
  const pretty1 = showExpr(simpleNeg)  // "(-5)"
  const pretty2 = showExpr(negExpr)  // "(-(2 + 3))"
  
  // Example: N-ary operations for better associativity
  const narySum = addN([lit(1), lit(2), lit(3), lit(4)])  // 1+2+3+4 = 10
  const naryProduct = mulN([lit(2), lit(3), lit(4)])  // 2*3*4 = 24
  const mixedExpr = addN([lit(1), neg(lit(2)), lit(3)])  // 1+(-2)+3 = 2
  
  const sumResult = evalExpr(narySum)  // 10
  const productResult = evalExpr(naryProduct)  // 24
  const mixedResult = evalExpr(mixedExpr)  // 2
  
  const sumPretty = showExpr(narySum)  // "(1 + 2 + 3 + 4)"
  const productPretty = showExpr(naryProduct)  // "(2 * 3 * 4)"
  const mixedPretty = showExpr(mixedExpr)  // "(1 + (-2) + 3)"
  
  // Example: Migration from binary to N-ary
  const binaryChain = add(add(lit(1), lit(2)), add(lit(3), lit(4)))  // ((1+2)+(3+4))
  const normalized = normalizeExprToNary(binaryChain)  // Converts to AddN
  const normalizedResult = evalExpr(normalized)  // 10
  const normalizedPretty = showExpr(normalized)  // "(1 + 2 + 3 + 4)"
  
  // Example: Advanced evaluators with variables and let-binding
  const varExpr = add(vvar('x'), lit(5))  // x + 5
  const letExpr = lett('x', lit(10), add(vvar('x'), lit(3)))  // let x = 10 in x + 3
  const divExpr = divE(lit(10), lit(2))  // 10 / 2
  
  // Using different evaluators
  const simpleResult = evalExprNum2(divExpr)  // 5 (no vars/let)
  const readerResult = evalExprR(varExpr)({ x: 7 })  // 12 (with env)
  const letResult = evalExprR(letExpr)({})  // 13 (let binding)
  const resultWithError = evalExprRR(divE(lit(10), lit(0)))({})  // Err('div by zero')
  
  // Precedence-aware pretty printing
  const complexExpr = add(mul(lit(2), lit(3)), divE(lit(10), lit(2)))  // 2*3 + 10/2
  const minParensPretty = showExprMinParens2(complexExpr)  // "2 * 3 + 10 / 2" (no extra parens)
  
  // Example usage:
  // (() => {
  //   console.log('Simple negation:', result1, '→', pretty1)
  //   console.log('Complex negation:', result2, '→', pretty2)
  //   console.log('N-ary sum:', sumResult, '→', sumPretty)
  //   console.log('N-ary product:', productResult, '→', productPretty)
  //   console.log('Mixed expression:', mixedResult, '→', mixedPretty)
  //   console.log('Binary chain:', normalizedResult, '→', normalizedPretty)
  //   console.log('Simple division:', simpleResult)
  //   console.log('Reader with env:', readerResult)
  //   console.log('Let binding:', letResult)
  //   console.log('Division by zero:', resultWithError)
  //   console.log('Min parens pretty:', minParensPretty)
  // })()
  
  // Why this is powerful:
  // 1. Compiler safety: Adding Neg/AddN/MulN/Var/Let/Div forced updates to all algebras
  // 2. No recursion code to touch: cataExpr/anaExpr/hyloExpr stay the same
  // 3. Exhaustiveness: _exhaustive helper catches missing cases
  // 4. Uniform evolution: All algebras evolve together consistently
  // 5. Zero runtime cost: Pure type-level safety
  // 6. Better associativity: N-ary operations flatten skewed trees
  // 7. Migration support: normalizeExprToNary converts binary chains
  // 8. Composable: Mix binary and N-ary operations seamlessly
  // 9. Multiple evaluation strategies: Simple, Reader-based, Result-typed
  // 10. Variable binding: Let expressions with proper scoping
  // 11. Error handling: Typed failures for division by zero, unbound variables
  // 12. Precedence-aware printing: Minimal parentheses for readability
}

// ====================================================================
// 8. CATEGORICAL THEORY - Comodules over Corings
// ====================================================================

namespace ComoduleExamples {
  export function runAll() {
    console.log('\n--- Comodule Examples ---')
    
    // Create a diagonal coring on R^3
    const C = makeDiagonalCoring(SemiringNat)(3)
    console.log('Diagonal coring C on R^3 created')
    
    // Create a diagonal comodule M ≅ R^2 with ρ(e0)=e0⊗c0, ρ(e1)=e1⊗c1
    const M = makeDiagonalComodule(C)(2, k => k % 3)
    console.log('Diagonal comodule M ≅ R^2 created with tagging function k ↦ k mod 3')
    
    // Check coaction laws
    const coassocHolds = comoduleCoassocHolds(M)
    const counitHolds = comoduleCounitHolds(M)
    
    console.log(`Coassociativity law holds: ${coassocHolds}`)
    console.log(`Counit law holds: ${counitHolds}`)
    
    if (coassocHolds && counitHolds) {
      console.log('✓ M is a lawful right C-comodule!')
    } else {
      console.log('✗ M violates comodule laws')
    }
  }

  export function tensorBalancedMapsExample() {
    console.log('\n--- Balanced Tensor of Maps Example ---')
    
    const S = SemiringNat
    // f : R^2 -> R^3  (3x2)
    const f: number[][] = [
      [1,0],
      [0,1],
      [1,1],
    ]
    // g : R^2 -> R^2  (2x2)
    const g: number[][] = [
      [1,1],
      [0,1],
    ]

    const f_ten_g = tensorBalancedMapSameR(S)(f, g) // (3*2) x (2*2) = 6x4
    console.log('shape f⊗g:', f_ten_g.length, 'x', f_ten_g[0]?.length) // 6 x 4

    // Law check: (f∘id)⊗(g∘id) == (f⊗g)∘(id⊗id)
    const id2 = idMap(S)(2)
    const left  = tensorBalancedMapSameR(S)(composeMap(S)(f, id2), composeMap(S)(g, id2))
    const right = composeMap(S)(
      tensorBalancedMapSameR(S)(f, g),
      tensorBalancedMapSameR(S)(id2, id2)
    )
    console.log('composition law holds:', eqMat(S)(left, right)) // true
  }

  export function bicomoduleExample() {
    console.log('\n--- Bicomodule Example ---')
    
    const S = SemiringNat
    const D = makeDiagonalCoring(S)(2) // left coring on R^2
    const C = makeDiagonalCoring(S)(3) // right coring on R^3

    // M ≅ R^2; tag left by [0,1], right by [1,2]
    const B = makeDiagonalBicomodule(D, C)(2, k => k, k => (k+1))

    console.log('bicomodule laws hold:', bicomoduleCommutes(B)) // true
  }

  export function objectMathExample() {
    console.log('\n--- Object Math (Dimension Bookkeeping) Example ---')
    
    // Objects (0-cells): semirings R,S,T (we only use their identity here)
    const R = SemiringNat
    const S = SemiringNat
    const T = SemiringNat

    // 1-cells: free bimodules R–S, S–T
    const RS = FreeBimoduleStd(R, S)(2) // rank 2
    const ST = FreeBimoduleStd(S, T)(5) // rank 5

    // Composition via balanced tensor on objects
    const RT = tensorBalancedObj(RS, ST)
    console.log('rank(RS ⊗_S ST) =', RT.rank) // 10 (= 2*5)
  }

  export function entwiningExample() {
    console.log('\n--- Entwining Example ---')
    
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(3)   // A ≅ R^3 diagonal algebra
    const C = makeDiagonalCoring(S)(4)    // C ≅ R^4 diagonal coring
    const E = makeDiagonalEntwining(A, C)

    console.log('Algebra A has dimension:', A.k)
    console.log('Coring C has dimension:', C.n)
    console.log('Entwining Ψ has shape:', E.Psi.length, 'x', E.Psi[0]?.length)

    // Check all four Brzeziński–Majid laws
    const coassoc = entwiningCoassocHolds(E)
    const mult = entwiningMultHolds(E)
    const unit = entwiningUnitHolds(E)
    const counit = entwiningCounitHolds(E)

    console.log('coassoc law holds:', coassoc)
    console.log('mult law holds:   ', mult)
    console.log('unit law holds:   ', unit)
    console.log('counit law holds: ', counit)

    if (coassoc && mult && unit && counit) {
      console.log('✓ E is a lawful entwining between A and C!')
    } else {
      console.log('✗ E violates entwining laws')
    }
  }
}

// ====================================================================
// RUNNER - Uncomment examples to test them
// ====================================================================

async function runExamples() {
  console.log('tiny-fp Examples')
  console.log('================')
  
  // Uncomment the examples you want to run:
  
  // BasicConcepts
  // ResultExamples  
  // ValidationExamples
  // DoNotationExamples
  // StateExamples
  // ReaderExamples
  // AsyncExamples
  // SRTExamples
  // SRTBatchExamples
  // RTOExamples
  // RWSTExamples
  // PartitionExamples
  // SequenceExamples
  // JsonStreamingExamples
  // FusedPipelineExamples
  // SafeASTEvolutionExamples
  ComoduleExamples.runAll()
  ComoduleExamples.tensorBalancedMapsExample()
  ComoduleExamples.bicomoduleExample()
  ComoduleExamples.objectMathExample()
  ComoduleExamples.entwiningExample()
  
  console.log('Examples ready to run! Uncomment the ones you want to test.')
}

// Export for potential use in other files
export type {
  BasicConcepts,
  ResultExamples,
  ValidationExamples,
  DoNotationExamples,
  StateExamples,
  ReaderExamples,
  AsyncExamples,
  SRTExamples,
  SRTBatchExamples,
  RTOExamples,
  RWSTExamples,
  PartitionExamples,
  SequenceExamples,
  JsonStreamingExamples,
  FusedPipelineExamples,
  SafeASTEvolutionExamples,
  ComoduleExamples
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples()
}
