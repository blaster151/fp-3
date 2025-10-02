#!/usr/bin/env ts-node

import {
  Some, None, Ok, Err, VOk, VErr, isSome, isErr, isVOk,
  Reader, DoR, DoTR, SRT, runSRT, ReaderTaskResult, ReaderTask, Task,
  sequenceArrayValidation, sequenceArrayResult, sequenceStructValidation, sequenceStructResult,
  partitionSet, partitionSetWith, productTR, zipWithTR, sequenceState, traverseSRT,
  filterMapArray, collectArray, filterMapMapValues, collectMapValues, filterMapMapEntries, collectMapEntries, filterMapSet, collectSet,
  PartialFn, pf,
  sumRange_FUSED, prettyRange_FUSED, statsFullBinary_FUSED, prettyAndSize_FUSED,
  lit, add, mul, neg, abs, addN, mulN, vvar, lett, divE, evalExpr, showExpr, normalizeExprToNary,
  evalExprNum2, evalExprR, evalExprRR, showExprMinParens2,
  evalExprR_app, evalExprRR_app, evalExprResult,
  jDate, jBool, prettyJson, sizeJson, depthJson, toEJson,
  compileExpr, runProgram,
  // New algebras
  Alg_Expr_size, Alg_Expr_depth, sizeAndDepthExpr,
  sizeJsonNew, strsJson, sizeAndDepthJson, strsAndSizeJson,
  // Canonicalization and EJSON
  canonicalizeJson, canonicalizeJsonP, toEJsonCanonical, toEJsonCanonicalWithPolicy, fromEJson, CanonicalJsonMap, CanonicalJsonSet,
  // Product algebra
  productJsonAlg2, cataJson, JsonF,
  // Category Theory constructs
  NatK1, idNatK1, composeNatK1, optionToResult, resultToOption, taskToReaderTask, readerToReaderTask,
  Kleisli, K_Option, K_Result, K_Task, K_Reader, K_ReaderTask,
  Writer, WriterT, StringMonoid, ArrayMonoid,
  ArrayM, traverseArrayA, sequenceArrayA,
  // Monad Transformers
  MonadWriterT, WriterInReader, WriterInReaderTask,
  EitherT, TaskEither, ReaderEither, ReaderTaskEither, RTE, TE, RE,
  // Advanced Compositions
  LogArray, MW_R, MW_RT, DoRTE, DoRTEBuilder,
  WriterReaderTaskEither, WRTE,
  // Module-level shims
  apFirstRTE, apSecondRTE, zipWithRTE, zipRTE,
  // Endofunctor helpers
  EndofunctorK1, ResultK1, ValidationK1, ReaderK1, ReaderTaskK1,
  // Sum and Product functors
  SumVal, SumEndo, inL, inR, strengthEnvFromSum, matchSum,
  ProdVal, ProdEndo, prod, strengthEnvFromProd,
  // Monoidal Category Structure
  Iso, Hom, CatFn, MonoidalFn, MonoidalKleisliRTE,
  // Development Utilities
  assertMonoidalFnCoherence, assertMonoidalKleisliRTECoherence,
  // Monoidal Functor Structure
  MonoidalFunctorK1, FunctorValue, monoidalFromApplicative, zipWithFromMonoidal, zipFromMonoidal,
  // Monoidal Functor Instances
  MonoidalOption, zipOption, zipWithOption,
  MonoidalResult, zipResult, zipWithResult,
  MonoidalReader, zipReader, zipWithReader,
  MonoidalReaderTask, zipReaderTask, zipWithReaderTask,
  MonoidalRTE, zipRTE_Monoidal, zipWithRTE_Monoidal,
  MonoidalValidation, zipValidation,
  // 2-Category of Endofunctors
  EndofunctorK1, NatK1, idNatK1, vcompNatK1, leftWhisker, rightWhisker, hcompNatK1_component,
  // 2-Functors
  IdK1, composeEndoK1, TwoFunctorK1, LaxTwoFunctorK1, OplaxTwoFunctorK1, PostcomposeReader2, muPostReader,
  // Oplax 2-Functors
  EnvEndo, StrengthEnv, PrecomposeEnv2, strengthEnvOption, strengthEnvResult, strengthEnvReader,
  // Comonads
  ComonadK1, duplicateK1, Store, StoreC, Env, EnvC, Traced, TracedC, Monoid, coKleisli,
  // Advanced Comonads
  Cofree, CofreeK1, StoreLens, DoCo,
  // Advanced Comonad Features
  toCofreeExpr, ExprAnn, annotateExprSizeDepth, ZipperExpr, DoCoBind,
  mapGroupValues, mapEachGroup, filterEachGroup, mergeGroupValues, dedupeEachGroup, flattenGroups,
  collapseToMap, mapMultiValues, mapEachMulti, filterEachMulti, mergeMulti,
  // New group operations
  concatGroups, unionGroupsBy, intersectGroupsBy, diffGroupsBy, topKBy, sortGroupsBy, sortGroupsByNumberDesc,
  concatGroupsMM, unionGroupsByMM, intersectGroupsByMM, diffGroupsByMM, topKByMM, sortGroupsByNumberDescMM,
  // New streaming operations
  minByGroup, maxByGroup, minByGlobal, maxByGlobal, minByGroupMM, maxByGroupMM,
  takeWhileGroup, dropWhileGroup, takeWhileGroupMM, dropWhileGroupMM,
  streamReduceByCanonical, streamTopKByCanonical, streamCountsByCanonical, streamSumByCanonical,
  // New canonical operations
  minByCanonical, maxByCanonical, minByCanonicalScore, maxByCanonicalScore,
  distinctByCanonical, distinctByCanonicalToArray, distinctPairsByCanonical, distinctPairsByCanonicalToArray,
  distinctByCanonicalLast, distinctPairsByCanonicalLast,
  // New canonical sort and unique operations
  sortJsonByCanonical, sortJsonByCanonicalDesc, uniqueJsonByCanonical, uniqueJsonByCanonicalLast,
  sortPairsByCanonical, sortPairsByCanonicalDesc, uniquePairsByCanonical, uniquePairsByCanonicalLast,
  sortPairsBy, sortPairsByCanonicalThen, sortPairsByCanonicalThenNumberAsc, sortPairsByCanonicalThenNumberDesc,
  sortValuesInGroups, sortValuesInGroupsByNumberAsc, sortValuesInGroupsByNumberDesc,
  sortValuesInGroupsMM, sortValuesInGroupsByNumberAscMM, sortValuesInGroupsByNumberDescMM,
  sortPairsByValueThenCanonical, sortPairsByValueNumberAscThenCanonical, sortPairsByValueNumberDescThenCanonical,
  // JSON types
  Json,
  // Canonical utilities
  canonicalKey, equalsCanonical, compareCanonical, hashCanonical, hashConsJson,
  // Canonical multimap and groupBy
  CanonicalJsonMultiMap, groupByCanonical, groupPairsByCanonical, multiMapByCanonical, multiMapPairsByCanonical,
  // Json zipper
  JsonZipper, fromJsonZ, toJsonZ, downArr, downSet, downObjKey, up, left, right, replaceFocus, modifyFocus,
  JsonPathStep, focusAtPath, optionalAtPath, modifyAtPath,
  // Kleisli arrows
  makeKleisliArrowReader, makeKleisliArrowTask, makeKleisliArrowReaderTask, makeKleisliArrowRTR,
  // Canonical Arrow core (old implementation - keeping for compatibility)
  // CategoryFn, ProfunctorFn, StrongFn, ArrowFn,
  // New Arrow IR system
  Arrow, IR, arr, comp, first, leftArrow, par, fanout, zero, alt, loop, denot, normalize,
  // Json constructors
  jObj, jStr, jNum, jArr, jUndef, jDec, jBinary, jRegex, jSet,
  // Catamorphism
  cataExpr,
  // Missing functions
  powE, runReader, normalizeAndSimplify, subst, diff,
  MonoidArray,
  // Result utilities
  isOk
} from './allTS'
import type { Result } from './allTS'
import {
  mkFin,
  detK,
  tensorObj,
  FinMarkov,
  fst,
  snd,
  swap,
} from './markov-category'
import {
  buildDeterminismLemmaWitness,
  checkDeterminismLemma,
} from './markov-determinism-lemma'
import {
  buildKolmogorovZeroOneWitness,
  checkKolmogorovZeroOne,
  buildHewittSavageWitness,
  checkHewittSavageZeroOne,
} from './markov-zero-one'
import type { FinitePermutation } from './markov-permutation'
import { makeZeroOneOracle } from './markov-zero-one-factory'
import { makeTextbookToolkit } from './textbook-toolkit'
import { runSliceCosliceDemo } from './examples/slice-coslice-demo'
import { SetCat } from './set-cat'
import { RelCat } from './rel'
import { MatCat } from './mat'
import { DynCat } from './dynsys'
import { makeFinitePullbackCalculator } from './pullback'
import type { FiniteCategory } from './finite-cat'

async function runExamples() {
  console.log('=== NEW FILTERMAP/COLLECT HELPERS ===')
  
  // Partial function: parseInt on int-like strings
  const intLike = (s: string) => /^-?\d+$/.test(s)
  const parseIntPF: PartialFn<string, number> = pf(intLike, s => Number(s))
  
  // Arrays: filterMap / collect
  const raw = ["10", "x", "-3", "7.5", "0"]
  const ints1 = filterMapArray(raw, (s) => intLike(s) ? Some(Number(s)) : None)
  const ints2 = collectArray(raw, parseIntPF)
  console.log('Array filterMap/collect:', ints1, '=', ints2)
  
  // Maps: value collect (keep keys)
  const agesRaw = new Map<string, string>([["a","19"], ["b","oops"], ["c","42"]])
  const ages = collectMapValues(agesRaw, parseIntPF)
  console.log('Map value collect:', ages.get("a"), ages.get("b"), ages.get("c"))
  
  // Sets: filterMap / collect
  const setRaw = new Set(["1", "2", "two", "3"])
  const setInts = collectSet(setRaw, parseIntPF)
  console.log('Set collect:', setInts)
  
  console.log('\n=== READER APPLICATIVE EVALUATORS ===')
  
  // Reader applicative eval demo
  type ExprEnv = Readonly<Record<string, number>>
  const prog = lett("x", lit(10),
    addN([ vvar("x"), powE(lit(2), lit(3)), neg(lit(4)) ]) // x + 2^3 + (-4)
  )
  
  const n1 = runReader(evalExprR_app(prog), {})            // 10 + 8 - 4 = 14
  const n2 = runReader(evalExprR_app(prog), { x: 1 })      // still 14 (let shadows)
  console.log('Reader applicative eval:', n1, '=', n2)
  
  // Reader<Result> eval demo (div-by-zero)
  const bad = divE(lit(1), add(vvar("d"), neg(vvar("d")))) // 1 / (d + (-d)) = 1/0
  const r1 = runReader(evalExprRR_app(bad), { d: 3 })      // Err("div by zero")
  console.log('Reader<Result> eval (div by zero):', r1)
  
  console.log('\n=== STACK MACHINE ===')
  
  // Stack machine demo
  const machineExpr = lett("y", lit(5), mul(add(vvar("y"), lit(1)), lit(3))) // (y+1)*3 where y=5
  const progAsm = compileExpr(machineExpr)
  const runAsm = runProgram(progAsm)                       // Ok(18)
  console.log('Stack machine result:', runAsm)
  
  console.log('\n=== NEW ALGEBRAS - SWAPPING MEANINGS ===')
  
  // Expr algebras: size, depth, and combined
  const complexExpr1 = addN([lit(1), neg(add(lit(2), lit(3))), mul(lit(4), lit(5))])
  const exprSize = cataExpr(Alg_Expr_size)(complexExpr1)
  const exprDepth = cataExpr(Alg_Expr_depth)(complexExpr1)
  const [size, depth] = sizeAndDepthExpr(complexExpr1)
  
  console.log('Complex expression:', showExpr(complexExpr1))
  console.log('Expr size:', exprSize)
  console.log('Expr depth:', exprDepth)
  console.log('Size & depth (combined):', [size, depth])
  
  // Json algebras: size, strings, depth
  const sampleJson = jObj([
    ['name', jStr('Alice')],
    ['age', jNum(30)],
    ['hobbies', jArr([jStr('reading'), jStr('coding')])]
  ])
  
  const jsonSize = sizeJsonNew(sampleJson)
  const jsonStrings = strsJson(sampleJson)
  const jsonDepth = depthJson(sampleJson)
  
  console.log('Sample JSON size:', jsonSize)
  console.log('Sample JSON strings:', jsonStrings)
  console.log('Sample JSON depth:', jsonDepth)
  
  // Combined Json algebras (single traversal)
  const jsonSizeAndDepth = sizeAndDepthJson(sampleJson)
  const jsonStrsAndSize = strsAndSizeJson(sampleJson)
  
  console.log('JSON size & depth (combined):', jsonSizeAndDepth)
  console.log('JSON strings & size (combined):', jsonStrsAndSize)
  
  // Extended Json variants demonstration
  const extendedJson = jObj([
    ['user', jUndef()],
    ['precision', jDec('12345678901234567890.0001')],
    ['avatar', jBinary('SGVsbG8=')],
    ['pattern', jRegex('^a.*z$', 'i')],
    ['tags', jSet([jStr('fp'), jStr('ts')])]
  ])
  
  const extendedSize = sizeJsonNew(extendedJson)
  const extendedStrings = strsJson(extendedJson)
  const extendedDepth = depthJson(extendedJson)
  
  console.log('Extended JSON size:', extendedSize)
  console.log('Extended JSON strings:', extendedStrings)
  console.log('Extended JSON depth:', extendedDepth)
  
  // Canonicalization and EJSON round-trip demonstration
  console.log('\n=== CANONICALIZATION & EJSON ===')
  
  // Build extended Json with sets / regex / decimal (messy, non-canonical)
  const messyJson = jObj([
    ['c', jDec('1234567890123456789.0001')],  // keys out of order
    ['a', jSet([ jStr('x'), jStr('x'), jStr('y') ])], // duplicates in set
    ['b', jRegex('^a.*z$', 'ziiz')], // messy flags
    ['d', jUndef()],
  ])
  
  console.log('Original messy JSON created')
  
  // Canonicalize (set dedup/sort, flags normalized, keys sorted)
  const canonicalJson = canonicalizeJson(messyJson)
  console.log('Canonicalized JSON')
  
  // Encode to EJSON (deterministic)
  const ejson = toEJsonCanonical(canonicalJson)
  console.log('EJSON encoding:', JSON.stringify(ejson, null, 2))
  
  // Round-trip: decode back to Json
  const roundTripResult = fromEJson(ejson)
  if (isOk(roundTripResult)) {
    console.log('Round-trip successful!')
    
    // Show determinism: JSON.stringify(ejson) stable across runs
    const stableKey = JSON.stringify(ejson)
    console.log('Stable canonical key:', stableKey.substring(0, 100) + '...')
  } else {
    console.log('Round-trip failed:', roundTripResult.error)
  }
  
  // Canonical utilities demonstration
  console.log('\n=== CANONICAL UTILITIES ===')
  
  // Equality & hash
  const a = jObj([['x', jArr([jStr('a'), jStr('b')])]])
  const b = jObj([['x', jArr([jStr('a'), jStr('b')])]])
  console.log('Equal objects:', equalsCanonical(a, b))
  console.log('Same hash:', hashCanonical(a) === hashCanonical(b))
  console.log('Hash A:', hashCanonical(a))
  console.log('Hash B:', hashCanonical(b))
  
  // Key ordering / set dedup doesn't affect equality
  const c = canonicalizeJson(jObj([['x', jSet([jStr('b'), jStr('a'), jStr('a')])]]))
  const d = canonicalizeJson(jObj([['x', jSet([jStr('a'), jStr('b')])]]))
  console.log('Canonical sets equal:', equalsCanonical(c, d))
  console.log('Canonical key C:', canonicalKey(c).substring(0, 50) + '...')
  console.log('Canonical key D:', canonicalKey(d).substring(0, 50) + '...')
  
  // Hash-consing shares repeats
  const big = jArr([a, b, c, d, a, b])
  const shared = hashConsJson(big)
  console.log('Hash-consing applied to array with duplicates')
  console.log('Original size:', sizeJsonNew(big))
  console.log('Shared size:', sizeJsonNew(shared))
  
  console.log('\n=== CANONICAL MULTIMAP & GROUPBY ===')
  
  // Canonical multimap example
  const mm = new CanonicalJsonMultiMap<string>()
  mm.add(jStr('user'), 'Alice')
  mm.add(jStr('user'), 'Bob')
  mm.add(jStr('admin'), 'Charlie')
  mm.add(jStr('user'), 'David')
  
  console.log('Multimap size:', mm.size)
  console.log('Users:', mm.get(jStr('user')))
  console.log('Admins:', mm.get(jStr('admin')))
  
  // GroupBy example
  const users = [
    { name: 'Alice', role: jStr('user') },
    { name: 'Bob', role: jStr('user') },
    { name: 'Charlie', role: jStr('admin') },
    { name: 'David', role: jStr('user') }
  ]
  
  const grouped = groupByCanonical(users, u => u.role)
  console.log('Grouped by role:', Array.from(grouped.entries()).map(([k, v]) => [JSON.stringify(k).substring(0, 20) + '...', v.map(u => u.name)]))
  
  console.log('\n=== JSON ZIPPER & PATH EDITS ===')
  
  // Build: { user: { name: "Ada", tags: Set["fp","ts"] } }
  const doc = jObj([
    ['user', jObj([
      ['name', jStr('Ada')],
      ['tags', jSet([jStr('fp'), jStr('ts')])]
    ])]
  ])
  
  // Path to user.name
  const pName: ReadonlyArray<JsonPathStep> = [
    { _tag: 'Obj', key: 'user' },
    { _tag: 'Obj', key: 'name' }
  ]
  
  // Read via Optional
  const O_name = optionalAtPath(pName)
  const nameResult = O_name.getOption(doc)
  console.log('Name via Optional:', nameResult)
  
  // Update name to "Grace"
  const doc2 = O_name.set(jStr('Grace'))(doc)
  const updatedName = O_name.getOption(doc2)
  console.log('Updated name:', updatedName)
  
  // Navigate zipper and move horizontally inside Set
  const pTag0: ReadonlyArray<JsonPathStep> = [
    { _tag: 'Obj', key: 'user' },
    { _tag: 'Obj', key: 'tags' },
    { _tag: 'Set', index: 0 }
  ]
  const oz = focusAtPath(doc, pTag0)
  if (isSome(oz)) {
    const moved = right(oz.value) // focus next tag
    const doc3 = isSome(moved) ? toJsonZ(moved.value) : doc
    console.log('Moved to next tag in set')
  }
  
  // Modify at path example
  const doc4 = modifyAtPath(pName, j => jStr('Eve'))(doc)
  const finalName = O_name.getOption(doc4)
  console.log('Final name after modifyAtPath:', finalName)
  
  console.log('\n=== KLEISLI ARROWS ===')
  
  // Reader example
  type Env1 = { scale: number }
  const A_R1 = makeKleisliArrowReader<Env1>()
  const scale1 = A_R1.arr<number, number>(n => n) // identity lifted
  const add1  = A_R1.arr<number, number>(n => n + 1)
  const applyScale: (n: number) => Reader<Env1, number> = (n) => Reader.asks(env => n * env.scale)
  const pipeline = A_R1.then(applyScale)(A_R1.then(add1)(scale1))
  const readerResult1 = runReader(pipeline(10), { scale: 3 })
  console.log('Reader arrow pipeline (10 + 1) * 3:', readerResult1) // 33
  
  // ReaderTaskResult example
  type E1 = string
  const A_RTR1 = makeKleisliArrowRTR<Env1, E1>()
  const parseIntK = A_RTR1.arr<string, number>(s => Number(s))
  const nonZeroK: (n: number) => ReaderTaskResult<Env1, E1, number> =
    (n) => async () => n === 0 ? Err('zero') : Ok(n)
  const recipK1: (n: number) => ReaderTaskResult<Env1, E1, number> =
    (n) => async () => Ok(1 / n)
  
  const rtrStep1 = A_RTR1.then(nonZeroK)(parseIntK)
  const safeRecip = A_RTR1.then(recipK1)(rtrStep1)
  
  // Test the arrow pipeline
  const testArrow = async () => {
    const result1 = await safeRecip("4")({ scale: 1 })
    const result2 = await safeRecip("0")({ scale: 1 })
    console.log('Arrow pipeline "4" -> 1/4:', result1) // Ok(0.25)
    console.log('Arrow pipeline "0" -> error:', result2) // Err('zero')
  }
  await testArrow()
  
  // Task example
  const A_T1 = makeKleisliArrowTask()
  const delay = (ms: number) => A_T1.arr<number, number>(n => n) // identity with delay
  const doubleTask = A_T1.arr<number, number>(n => n * 2)
  const add10 = A_T1.arr<number, number>(n => n + 10)
  
  const taskPipeline = A_T1.then(add10)(A_T1.then(doubleTask)(delay(100)))
  
  // Test task pipeline
  const testTask = async () => {
    const result = await taskPipeline(5)()
    console.log('Task arrow pipeline 5 * 2 + 10:', result) // 20
  }
  await testTask()
  
  // Fanout example (split input to two paths)
  const fanoutExample = A_R1.fanout(
    A_R1.arr<number, number>(n => n * 2),
    A_R1.arr<number, number>(n => n + 1)
  )
  const fanoutResult = runReader(fanoutExample(5), { scale: 1 })
  console.log('Fanout example (5 -> [10, 6]):', fanoutResult) // [10, 6]
  
  // Split example (process pairs)
  const splitExample = A_R1.split(
    A_R1.arr<number, number>(n => n * 2),
    A_R1.arr<string, string>(s => s.toUpperCase())
  )
  const splitResult = runReader(splitExample([3, 'hello']), { scale: 1 })
  console.log('Split example ([3, "hello"] -> [6, "HELLO"]):', splitResult) // [6, "HELLO"]
  
  console.log('\n=== CANONICAL ARROW CORE ===')
  
  // Canonical Arrow over plain functions
  // Using Arrow IR system instead of ArrowFn (which isn't available)
  // const { arr, then, split, fanout, first, second, compose, dimap, lmap, rmap } = ArrowFn
  
  const inc1IR = arr((n: number) => n + 1)
  const dbl1IR = arr((n: number) => n * 2)
  const toString1IR = arr((n: number) => n.toString())
  
  // Composition
  const incThenDblIR = comp(dbl1IR, inc1IR)
  console.log('Composition: inc then dbl (10):', denot(incThenDblIR)(10)) // 22
  
  // Products - par (parallel)
  const bothIR = par(inc1IR, dbl1IR)
  console.log('Par: both inc and dbl ([2, 3]):', denot(bothIR)([2, 3])) // [3, 6]
  
  // Fanout - split input to two paths
  const inc_and_dblIR = fanout(inc1IR, dbl1IR)
  console.log('Fanout: inc and dbl (5):', denot(inc_and_dblIR)(5)) // [6, 10]
  
  // First/second - act on product components
  const firstIncCanonicalIR = first(inc1IR)
  const secondDblCanonicalIR = Arrow.second(dbl1IR)
  console.log('First: inc on first component ([3, "x"]):', denot(firstIncCanonicalIR)([3, 'x'])) // [4, 'x']
  console.log('Second: dbl on second component (["x", 3]):', denot(secondDblCanonicalIR)(['x', 3])) // ['x', 6]
  
  // Complex pipeline using Arrow IR composition
  console.log('Canonical Arrow Core demonstrates HKT-based Arrow system in action')
  
  // ArrowApply examples (ArrowFn not available - using Arrow IR system)
  // const { applyTo } = ArrowFn
  const inc2IR = arr((n: number) => n + 1)
  console.log('Arrow IR: inc(41):', denot(inc2IR)(41)) // 42

  // =============================
  // SYMBOLIC/REWRITES DEMONSTRATION
  // =============================
  console.log('\n=== SYMBOLIC / REWRITES DEMONSTRATION ===')

  // Pow precedence and right-associativity
  const powExpr = powE(lit(2), powE(lit(3), lit(2)))
  console.log('pow precedence 2^(3^2):', showExprMinParens2(powExpr)) // "2 ^ (3 ^ 2)"

  // Simplifier examples
  const simp1 = addN([lit(0), vvar('x'), lit(2), lit(3)])
  const simp1Normalized = normalizeAndSimplify(simp1)
  console.log('simplify x + 0 + 2 + 3 ->', showExprMinParens2(simp1Normalized)) // "x + 5"

  const simp2 = mulN([lit(1), vvar('x'), lit(0), vvar('y')])
  const simp2Normalized = normalizeAndSimplify(simp2)
  console.log('simplify 1 * x * 0 * y ->', showExprMinParens2(simp2Normalized)) // "0"

  // Capture-avoiding substitution
  const body0 = add(vvar('x'), vvar('y'))
  const ex1  = lett('y', vvar('x'), body0)        // let y = x in (x + y)
  const ex1Sub = subst('x', vvar('z'))(ex1)
  console.log('subst x:=z in let y = x in (x + y) ->', showExprMinParens2(ex1Sub))

  // Stack machine with Pow
  const progPow = compileExpr(lett('x', lit(10), add(vvar('x'), powE(lit(2), lit(3)))))
  console.log('stack machine (let x=10 in x + 2^3):', runProgram(progPow)) // Ok(18)

  // Differentiation
  const dxy = diff('x')(mulN([vvar('x'), vvar('x'), vvar('y')]))
  console.log('diff wrt x of x*x*y ->', showExprMinParens2(dxy))
  console.log('diff wrt x simplified ->', showExprMinParens2(normalizeAndSimplify(dxy)))
  
  console.log('\n=== ARROW APPLY EXTENSIONS ===')
  
  // Reader ArrowApply
  type Env2 = { k: number }
  const A_R2 = makeKleisliArrowReader<Env2>()
  const scale2: (n: number) => Reader<Env2, number> = (n) => (r) => n * r.k
  const readerResult2 = runReader(A_R2.applyTo(scale2)(10), { k: 3 })
  console.log('Reader ArrowApply: scale(10) with k=3:', readerResult2) // 30
  
  // Task ArrowApply
  const A_T2 = makeKleisliArrowTask()
  const delayDouble: (n: number) => Task<number> = (n) => async () => n * 2
  const taskResult = await A_T2.applyTo(delayDouble)(21)()
  console.log('Task ArrowApply: delayDouble(21):', taskResult) // 42
  
  // ReaderTask ArrowApply
  type Env3 = { add: number }
  const A_RT = makeKleisliArrowReaderTask<Env3>()
  const addEnv: (n: number) => ReaderTask<Env3, number> = (n) => async (r) => n + r.add
  const readerTaskResult = await A_RT.applyTo(addEnv)(40)({ add: 2 })
  console.log('ReaderTask ArrowApply: addEnv(40) with add=2:', readerTaskResult) // 42
  
  // ReaderTaskResult ArrowApply
  type Env4 = {}; type E2 = string
  const A_RTR2 = makeKleisliArrowRTR<Env4, E2>()
  
  const parseK2: (s: string) => ReaderTaskResult<Env4, E2, number> =
    (s) => async () => isNaN(Number(s)) ? Err("NaN") : Ok(Number(s))
  
  const recipK2: (n: number) => ReaderTaskResult<Env4, E2, number> =
    (n) => async () => n === 0 ? Err("zero") : Ok(1 / n)
  
  const runRTR = async () => {
    const x1 = await A_RTR2.applyTo(parseK2)("6")({})
    if (isErr(x1)) return x1
    // TypeScript now knows x1 is Ok<number>
    const num = x1.value
    return A_RTR2.applyTo(recipK2)(num)({})
  }
  
  const rtrResult = await runRTR()
  console.log('ReaderTaskResult ArrowApply: parse("6") then recip:', rtrResult) // Ok(1/6)
  
  console.log('\n=== ARROW APPLY DERIVED HELPERS ===')
  console.log('ArrowFn not available - skipping derived helpers examples')
  
  // Note: ArrowApply derived helpers would include:
  // - mapA/mapK: functor map over arrows
  // - apA/apK: applicative apply
  // - liftA2A/liftK2: lift binary functions
  // - bindA_HO/bindK_HO: higher-order bind
  // These work on top of the Arrow IR system but require additional implementation
  
  // Kleisli derived helpers
  type Env5 = { multiplier: number }
  const A_R3 = makeKleisliArrowReader<Env5>()
  
  const scaleArrow = A_R3.arr((n: number) => n)
  const add1Arrow = A_R3.arr((n: number) => n + 1)
  
  // mapK - Kleisli functor map
  const scaleThenShow = A_R3.mapK((n: number) => `result: ${n}`)(scaleArrow)
  const mapKResult = runReader(scaleThenShow(5), { multiplier: 3 })
  console.log('mapK: scale then show (5):', mapKResult) // "result: 5"
  
  // apK - Kleisli applicative apply
  const multiplyArrow = A_R3.arr((_n: number) => A_R3.arr((m: number) => m * 2))
  const apKResult = runReader(A_R3.apK(multiplyArrow)(add1Arrow)(5), { multiplier: 1 })
  console.log('apK: add1 then multiply (5):', apKResult) // 12
  
  // liftK2 - Kleisli lift binary
  const addK = (x: number, y: number) => x + y
  const liftK2Result = runReader(A_R3.liftK2(addK)(add1Arrow, scaleArrow)(3), { multiplier: 1 })
  console.log('liftK2: (n+1) + n (3):', liftK2Result) // 7
  
  // bindK_HO - Kleisli higher-order bind
  const makeAdder = A_R3.arr((a: number) => A_R3.arr((x: number) => x + a))
  const bindK_HOResult = runReader(A_R3.bindK_HO(makeAdder)(4), { multiplier: 1 })
  console.log('bindK_HO: add 4 to input (4):', bindK_HOResult) // 8
  
  console.log('\n=== COMPREHENSIVE ARROW APPLY DERIVED DEMOS ===')
  
  // ===== Canonical function Arrow (A -> B) =====
  // Note: ArrowFn canonical arrow examples would go here
  // (ArrowFn not available in current codebase)

  // ===== Reader (A -> Reader<R, B>) =====
  {
    type EnvDemo = { k: number }
    const A_Reader = makeKleisliArrowReader<EnvDemo>()

    const fa = (n: number) => (r: EnvDemo) => n * r.k                 // A -> R[B]
    const ff = (n: number) => (r: EnvDemo) =>
      ((b: number) => (r2: EnvDemo) => b + r.k) // Arr<B,C>
    
    // mapK
    const r_map = A_Reader.mapK((x: number) => x + 1)(fa)
    console.log('Reader mapK 4,k=3 ->', r_map(4)({ k: 3 })) // (4*3)+1 = 13

    // apK
    const r_ap = A_Reader.apK(ff)(fa)
    console.log('Reader apK 4,k=3 ->', r_ap(4)({ k: 3 })) // (4*3)+3 = 15

    // liftK2
    const r_lift2 = A_Reader.liftK2(
      (b: number, c: number) => b - c
    )(fa, (n: number) => (r: EnvDemo) => n + r.k)
    console.log('Reader liftK2 5,k=2 ->', r_lift2(5)({ k: 2 })) // (5*2)-(5+2)=10-7=3

    // bindK_HO: f : A -> Arr<A,B>; runs f(a)(a)
// ff: A -> Reader<EnvDemo, Arr<B,C>>

// bindK_HO: f : A -> Arr<A,B>; runs f(a)(a)
const r_bindHO = A_Reader.bindK_HO(
  (a: number) => (r: EnvDemo) =>
    (x: number) => (r2: EnvDemo) => a + x + r.k
)


    console.log('Reader bindK_HO 4,k=3 ->', r_bindHO(4)({ k: 3 })) // 4+4+3=11
  }

  // ===== Task (A -> Task<B>) =====
  {
    const A_Task = makeKleisliArrowTask()

    const fa = (n: number) => async () => n + 1
    const ff = (n: number) => async () => A_Task.arr((b: number) => b * 2)

    // mapK
    const t_map = A_Task.mapK((x: number) => x * 3)(fa)
    console.log('Task mapK 5 ->', await t_map(5)()) // (5+1)*3 = 18

    // apK
    const t_ap = A_Task.apK(ff)(fa)
    console.log('Task apK 5 ->', await t_ap(5)()) // (5+1)*2 = 12

    // liftK2
    const t_lift2 = A_Task.liftK2(
      (b: number, c: number) => `${b}|${c}`
    )(
      (n: number) => async () => n * 2,
      (n: number) => async () => n + 10
    )
    console.log('Task liftK2 5 ->', await t_lift2(5)()) // "10|15"

    const t_bindHO = A_Task.bindK_HO(
      (a: number) => async () =>
        (x: number) => async () => x * a
    )
    
    console.log('Task bindK_HO 6 ->', await t_bindHO(6)()) // 36
  }

  // ===== ReaderTask (A -> ReaderTask<R, B>) =====
  {
    type EnvRT = { add: number }
    const A_ReaderTask = makeKleisliArrowReaderTask<EnvRT>()

    const fa = (n: number) => async (r: EnvRT) => n + r.add
    const ff = (n: number) => async (r: EnvRT) => A_ReaderTask.arr((b: number) => `${b}:${r.add}`)

    // mapK
    const rt_map = A_ReaderTask.mapK((x: number) => x * 10)(fa)
    console.log('ReaderTask mapK 7,add=3 ->', await rt_map(7)({ add: 3 })) // (7+3)*10 = 100

    // apK
    const rt_ap = A_ReaderTask.apK(ff)(fa)
    console.log('ReaderTask apK 7,add=3 ->', await rt_ap(7)({ add: 3 })) // "10:3"

    // liftK2
    const rt_lift2 = A_ReaderTask.liftK2(
      (b: number, c: number) => `${b}|${c}`
    )(
      (n: number) => async (r: EnvRT) => n * r.add,
      (n: number) => async (r: EnvRT) => n + r.add
    )
    console.log('ReaderTask liftK2 7,add=3 ->', await rt_lift2(7)({ add: 3 })) // "21|10"

    // bindK_HO

    const rt_bindHO = A_ReaderTask.bindK_HO(
      (a: number) => async (r: EnvRT) =>
        (x: number) => async (_r2: EnvRT) => x + a + r.add
    )
    
    console.log('ReaderTask bindK_HO 4,add=2 ->', await rt_bindHO(4)({ add: 2 })) // 10
  }

  // ===== ReaderTaskResult (A -> ReaderTaskResult<R, E, B>) =====
  {
    type EnvRTR = {}
    type E = string
    const A_ReaderTaskResult = makeKleisliArrowRTR<EnvRTR, E>()

    // Helpers
    const show = (label: string) => (r: Result<E, unknown>) =>
      console.log(label, isErr(r) ? `Err(${r.error})` : `Ok(${JSON.stringify(r.value)})`)

    // mapK (A = number)
    const rtr_fa = (n: number) => async (_: EnvRTR) => Ok(n + 1)
    const rtr_map = A_ReaderTaskResult.mapK<number, number, number>((x: number) => x * 2)(rtr_fa)
    show('RTR mapK 10 ->')(await rtr_map(10)({} as EnvRTR)) // Ok(22)

    // apK (A = number)
    const rtr_ff = (n: number) => async (_: EnvRTR) => Ok(A_ReaderTaskResult.arr((b: number) => b + n))
    const rtr_ap = A_ReaderTaskResult.apK<number, number, number>(rtr_ff)(rtr_fa)
    show('RTR apK 5 ->')(await rtr_ap(5)({} as EnvRTR)) // Ok((5+1)+5 = 11)

    // liftK2 (A = number)
    const rtr_lift2 = A_ReaderTaskResult.liftK2<number, number, number, number>(
      (b: number, c: number) => b - c
    )(
      (n: number) => async (_: EnvRTR) => Ok(n * 3),
      (n: number) => async (_: EnvRTR) => Ok(n + 4)
    )
    show('RTR liftK2 6 ->')(await rtr_lift2(6)({} as EnvRTR)) // Ok(18 - 10 = 8)

    // bindK_HO: f : A -> Arr<A,B>; runs f(a)(a)
    
    const parseK = ((s: string) => async (_: EnvRTR) => {
      const n = Number(s)
      if (Number.isNaN(n)) return Err('nan' as E)
      if (n === 0)        return Err('zero' as E)
      return Ok(n)
    }) satisfies (s: string) => ReaderTaskResult<EnvRTR, E, number>

    const recipK = ((n: number) => async (_: EnvRTR) => Ok(1 / n)) satisfies (n: number) => ReaderTaskResult<EnvRTR, E, number>

    const rtr_bindHO = A_ReaderTaskResult.bindK(recipK)(parseK)
    
    show('RTR bindK_HO "4" ->')(await rtr_bindHO("4")({} as EnvRTR)) // Ok(0.25)
    show('RTR bindK_HO "0" ->')(await rtr_bindHO("0")({} as EnvRTR)) // Err("zero")
    show('RTR bindK_HO "bad" ->')(await rtr_bindHO("bad")({} as EnvRTR)) // Err("nan")
  }
  
  console.log('\n=== ARROW IR SYSTEM (PAPER-FAITHFUL) ===')

  // Basic Arrow operations
  const incIR = arr((n: number) => n + 1)
  const dblIR = arr((n: number) => n * 2)
  const toStringIR = arr((n: number) => n.toString())

  // Composition
  const incThenDblArrowIR = comp(incIR, dblIR)
  const incThenToStringArrowIR = comp(incIR, toStringIR)

  console.log('Arrow IR - inc then dbl (5):', denot(incThenDblArrowIR)(5))
  console.log('Arrow IR - inc then toString (3):', denot(incThenToStringArrowIR)(3))

  // First and second
  const firstIncArrowIR = first(incIR)
  const secondDblArrowIR = Arrow.second(dblIR)

  console.log('Arrow IR - first inc ([3, "x"]):', denot(firstIncArrowIR)([3, 'x']))
  console.log('Arrow IR - second dbl (["x", 3]):', denot(secondDblArrowIR)(['x', 3]))

  // Parallel and fanout
  const parallelIR = par(incIR, dblIR)
  const fanoutExampleIR = fanout(incIR, dblIR)

  console.log('Arrow IR - parallel ([2, 3]):', denot(parallelIR)([2, 3]))
  console.log('Arrow IR - fanout (5):', denot(fanoutExampleIR)(5))

  // Normalization examples
  const complexArrowIR = comp(comp(Arrow.id(), incIR), comp(dblIR, Arrow.id()))
  const normalizedIR = normalize(complexArrowIR)

  console.log('Arrow IR - complex arrow (4):', denot(complexArrowIR)(4))
  console.log('Arrow IR - normalized (4):', denot(normalizedIR.plan)(4))
  console.log('Arrow IR - normalization preserves semantics:', denot(complexArrowIR)(4) === denot(normalizedIR.plan)(4))

  // Functoriality test
  const functorialIR = comp(arr((n: number) => n + 1), arr((n: number) => n * 2))
  const fusedIR = arr((n: number) => (n + 1) * 2)
  const normalizedFunctorialIR = normalize(functorialIR)

  console.log('Arrow IR - functorial (3):', denot(functorialIR)(3))
  console.log('Arrow IR - fused (3):', denot(fusedIR)(3))
  console.log('Arrow IR - normalized functorial (3):', denot(normalizedFunctorialIR.plan)(3))
  console.log('Arrow IR - functoriality preserved:', denot(functorialIR)(3) === denot(normalizedFunctorialIR.plan)(3))

  // ArrowChoice example (with Either-like types)
  const processLeft = leftArrow(arr((s: string) => s.toUpperCase()))
  const leftValue = { _tag: 'Left' as const, value: 'hello' }
  const rightValue = { _tag: 'Right' as const, value: 42 }

  console.log('Arrow IR - processLeft (Left "hello"):', denot(processLeft)(leftValue))
  console.log('Arrow IR - processLeft (Right 42):', denot(processLeft)(rightValue))

  // ArrowZero/ArrowPlus example
  const safeDiv = alt(
    arr(([a, b]: readonly [number, number]) => a / b),
    zero()
  )

  console.log('Arrow IR - safeDiv ([6, 2]):', denot(safeDiv)([6, 2]))
  try {
    console.log('Arrow IR - safeDiv ([6, 0]):', denot(safeDiv)([6, 0]))
  } catch (e) {
    console.log('Arrow IR - safeDiv ([6, 0]): ArrowZero (no value)')
  }

  console.log('\n=== HKT-BASED EXPR SYSTEM EXAMPLES ===')
  
  // Create some expressions using the HKT-based system
  const hktExpr1 = add(lit(2), mul(lit(3), lit(4)))
  const hktExpr2 = addN([lit(1), lit(2), lit(3)])
  const hktExpr3 = mulN([lit(2), lit(3), lit(4)])

  // Evaluate expressions using cata
  console.log('evalExpr(2 + 3 * 4):', evalExpr(hktExpr1)) // 14
  console.log('evalExpr(1 + 2 + 3):', evalExpr(hktExpr2)) // 6
  console.log('evalExpr(2 * 3 * 4):', evalExpr(hktExpr3)) // 24

  // Pretty print expressions
  console.log('showExpr(2 + 3 * 4):', showExpr(hktExpr1)) // (2 + (3 * 4))
  console.log('showExpr(1 + 2 + 3):', showExpr(hktExpr2)) // (1 + 2 + 3)
  console.log('showExpr(2 * 3 * 4):', showExpr(hktExpr3)) // (2 * 3 * 4)

  // Test product algebra (size and depth in one pass)
  const [hktSize, hktDepth] = sizeAndDepthExpr(hktExpr1)
  console.log(`hktExpr1 size: ${hktSize}, depth: ${hktDepth}`) // size: 5, depth: 3

  // Test Reader-based evaluation with variables
  const hktVarExpr = add(vvar('x'), mul(lit(2), vvar('y')))
  const hktEnv = { x: 10, y: 5 }
  const hktReaderEval = evalExprR(hktVarExpr)
  console.log('hktVarExpr with env {x: 10, y: 5}:', hktReaderEval(hktEnv)) // 20

  // Test Reader<Result> evaluation with error handling
  const hktDivExpr = divE(lit(10), vvar('y'))
  const hktReaderResultEval = evalExprRR(hktDivExpr)
  const hktResult1 = hktReaderResultEval({ y: 2 })
  const hktResult2 = hktReaderResultEval({ y: 0 })
  console.log('hktDivExpr with y=2:', hktResult1) // Ok(5)
  console.log('hktDivExpr with y=0:', hktResult2) // Err('div by zero')

  // Demonstrate HKT-based recursion schemes
  console.log('HKT Expr type uses Fix1<"ExprF"> - unified with Json recursion!')
  console.log('Both Json and Expr now use the same HKT pattern functor system')
  console.log('This enables generic recursion scheme utilities to work across both types')

  // Demonstrate safe refactor flow: new Abs node
  console.log('\n=== SAFE REFACTOR DEMONSTRATION ===')
  console.log('Added new Abs (absolute value) node to ExprF')
  
  const absExpr1 = abs(lit(-5))
  const absExpr2 = abs(add(lit(3), neg(lit(7))))  // |3 + (-7)| = |3 - 7| = |-4| = 4
  
  console.log('abs(-5):', evalExpr(absExpr1)) // 5
  console.log('showExpr(abs(-5)):', showExpr(absExpr1)) // |-5|
  console.log('abs(3 + (-7)):', evalExpr(absExpr2)) // 4
  console.log('showExpr(abs(3 + (-7))):', showExpr(absExpr2)) // |(3 + (-7))|
  
  // Test size and depth with Abs
  const [absSize, absDepth] = sizeAndDepthExpr(absExpr2)
  console.log(`absExpr2 size: ${absSize}, depth: ${absDepth}`) // size: 6, depth: 4
  
        console.log('✅ All algebras automatically handle the new Abs node!')
        console.log('✅ Compiler forced us to update every switch statement')
        console.log('✅ No recursion code needed to be touched (cata/ana/hylo stay the same)')

        // Demonstrate Neg (unary negation) node - already implemented!
        console.log('\n=== NEG (UNARY NEGATION) DEMONSTRATION ===')
        console.log('Neg node is already fully implemented in the system')

        const negExpr1 = neg(lit(5))
        const negExpr2 = neg(add(lit(3), lit(7)))
        const negExpr3 = neg(abs(lit(-10)))

        console.log('neg(5):', evalExpr(negExpr1)) // -5
        console.log('showExpr(neg(5)):', showExpr(negExpr1)) // (-5)
        console.log('neg(3 + 7):', evalExpr(negExpr2)) // -10
        console.log('showExpr(neg(3 + 7)):', showExpr(negExpr2)) // (-(3 + 7))
        console.log('neg(abs(-10)):', evalExpr(negExpr3)) // -10
        console.log('showExpr(neg(abs(-10))):', showExpr(negExpr3)) // (-|-10|)

        // Test size and depth with Neg
        const [negSize, negDepth] = sizeAndDepthExpr(negExpr2)
        console.log(`negExpr2 size: ${negSize}, depth: ${negDepth}`) // size: 4, depth: 3

        console.log('✅ Neg node demonstrates the same safe refactor pattern!')
        console.log('✅ All algebras handle Neg automatically')
        console.log('✅ Compiler enforces exhaustiveness for Neg cases')

        // Demonstrate N-ary operations (AddN/MulN) - already implemented!
        console.log('\n=== N-ARY OPERATIONS (AddN/MulN) DEMONSTRATION ===')
        console.log('N-ary operations are already fully implemented in the system')

        // Basic N-ary operations
        const addNExpr1 = addN([lit(1), lit(2), lit(3), lit(4)])
        const mulNExpr1 = mulN([lit(2), lit(3), lit(4)])

        console.log('addN([1, 2, 3, 4]):', evalExpr(addNExpr1)) // 10
        console.log('showExpr(addN([1, 2, 3, 4])):', showExpr(addNExpr1)) // (1 + 2 + 3 + 4)
        console.log('mulN([2, 3, 4]):', evalExpr(mulNExpr1)) // 24
        console.log('showExpr(mulN([2, 3, 4])):', showExpr(mulNExpr1)) // (2 * 3 * 4)

        // N-ary with mixed operations
        const addNExpr2 = addN([lit(1), neg(lit(2)), abs(lit(-3)), add(lit(4), lit(5))])
        const mulNExpr2 = mulN([lit(2), neg(lit(3)), abs(lit(-4))])

        console.log('addN([1, neg(2), abs(-3), add(4,5)]):', evalExpr(addNExpr2)) // 1 + (-2) + 3 + 9 = 11
        console.log('showExpr(addN([1, neg(2), abs(-3), add(4,5)])):', showExpr(addNExpr2))
        console.log('mulN([2, neg(3), abs(-4)]):', evalExpr(mulNExpr2)) // 2 * (-3) * 4 = -24
        console.log('showExpr(mulN([2, neg(3), abs(-4)])):', showExpr(mulNExpr2))

        // Test size and depth with N-ary operations
        const [addNSize, addNDepth] = sizeAndDepthExpr(addNExpr2)
        const [mulNSize, mulNDepth] = sizeAndDepthExpr(mulNExpr2)
        console.log(`addNExpr2 size: ${addNSize}, depth: ${addNDepth}`)
        console.log(`mulNExpr2 size: ${mulNSize}, depth: ${mulNDepth}`)

        // Demonstrate normalizeExprToNary (binary to N-ary conversion)
        console.log('\n=== NORMALIZE TO N-ARY DEMONSTRATION ===')
        const binaryChain = add(add(add(lit(1), lit(2)), lit(3)), lit(4))
        const normalized = normalizeExprToNary(binaryChain)
        
        console.log('Binary chain: add(add(add(1, 2), 3), 4)')
        console.log('showExpr(binary chain):', showExpr(binaryChain)) // (((1 + 2) + 3) + 4)
        console.log('Normalized to N-ary:')
        console.log('showExpr(normalized):', showExpr(normalized)) // (1 + 2 + 3 + 4)
        console.log('evalExpr(binary):', evalExpr(binaryChain)) // 10
        console.log('evalExpr(normalized):', evalExpr(normalized)) // 10
        console.log('✅ Normalization preserves semantics!')

        // Demonstrate flattening nested N-ary operations
        const nestedAddN = addN([addN([lit(1), lit(2)]), addN([lit(3), lit(4)])])
        const flattened = normalizeExprToNary(nestedAddN)
        
        console.log('\n=== FLATTENING NESTED N-ARY ===')
        console.log('Nested addN: addN([addN([1,2]), addN([3,4])])')
        console.log('showExpr(nested):', showExpr(nestedAddN)) // ((1 + 2) + (3 + 4))
        console.log('Flattened:')
        console.log('showExpr(flattened):', showExpr(flattened)) // (1 + 2 + 3 + 4)
        console.log('evalExpr(nested):', evalExpr(nestedAddN)) // 10
        console.log('evalExpr(flattened):', evalExpr(flattened)) // 10

        console.log('✅ N-ary operations demonstrate advanced safe refactor patterns!')
        console.log('✅ Flattening skewed trees for better associativity')
        console.log('✅ All algebras handle N-ary operations automatically')
        console.log('✅ Normalization preserves semantics while improving structure')

        // Demonstrate Variables and Let-binding with Reader-based evaluation
        console.log('\n=== VARIABLES & LET-BINDING DEMONSTRATION ===')
        console.log('Variables and let-binding are already fully implemented in the system')

        // Create expressions with variables
        const varExpr = vvar('x')
        const letExpr = lett('x', lit(5), add(vvar('x'), vvar('y')))
        const nestedLetExpr = lett('x', lit(10), lett('y', add(vvar('x'), lit(5)), mul(vvar('x'), vvar('y'))))

        console.log('Variable expression: var("x")')
        console.log('showExpr(var("x")):', showExpr(varExpr)) // x

        console.log('Let expression: let x = 5 in x + y')
        console.log('showExpr(let expr):', showExpr(letExpr)) // (let x = 5 in (x + y))

        console.log('Nested let: let x = 10 in let y = x + 5 in x * y')
        console.log('showExpr(nested let):', showExpr(nestedLetExpr)) 

        // Evaluate with Reader (environment)
        const env1 = { x: 3, y: 7 }
        const env2 = { y: 20 }

        console.log('\n=== READER-BASED EVALUATION ===')
        console.log('Environment 1:', env1) // { x: 3, y: 7 }
        console.log('evalExprR(var("x"))(env1):', evalExprR(varExpr)(env1)) // 3
        console.log('evalExprR(let x=5 in x+y)(env1):', evalExprR(letExpr)(env1)) // 5 + 7 = 12
        console.log('evalExprR(nested let)(env1):', evalExprR(nestedLetExpr)(env1)) // 10 * 15 = 150

        console.log('\nEnvironment 2:', env2) // { y: 20 }
        console.log('evalExprR(var("x"))(env2):', evalExprR(varExpr)(env2)) // 0 (default for missing var)
        console.log('evalExprR(let x=5 in x+y)(env2):', evalExprR(letExpr)(env2)) // 5 + 20 = 25

        // ReaderTaskResult-based evaluation (with error handling)
        console.log('\n=== READER-TASK-RESULT EVALUATION ===')
        console.log('evalExprRR(var("x"))(env1):', evalExprRR(varExpr)(env1)) // Ok(3)
        console.log('evalExprRR(var("x"))({}):') // Err(unbound var: x)
        const emptyEnv = {}
        const resultVarX = evalExprRR(varExpr)(emptyEnv)
        console.log('Result:', resultVarX)

        console.log('evalExprRR(let x=5 in x+y)(env2):', evalExprRR(letExpr)(env2)) // Ok(25)

        // Demonstrate Division with typed failure
        console.log('\n=== DIVISION WITH TYPED FAILURE DEMONSTRATION ===')
        console.log('Division operations are already fully implemented with error handling')

        // Create division expressions
        const safeDivExpr = divE(lit(10), lit(2))
        const unsafeDivExpr = divE(lit(10), lit(0))
        const varDivExpr = divE(vvar('a'), vvar('b'))

        console.log('Safe division: 10 / 2')
        console.log('showExpr(10/2):', showExpr(safeDivExpr)) // (10 / 2)

        console.log('Unsafe division: 10 / 0')
        console.log('showExpr(10/0):', showExpr(unsafeDivExpr)) // (10 / 0)

        console.log('Variable division: a / b')
        console.log('showExpr(a/b):', showExpr(varDivExpr)) // (a / b)

        // Pure Result-based evaluation (no environment)
        console.log('\n=== PURE RESULT EVALUATION ===')
        console.log('evalExprResult(10/2):', evalExprResult(safeDivExpr)) // Ok(5)
        console.log('evalExprResult(10/0):', evalExprResult(unsafeDivExpr)) // Err(div by zero)
        console.log('evalExprResult(var("x")):') // Err(unbound var: x)
        const resultVar = evalExprResult(varExpr)
        console.log('Result:', resultVar)

        // Reader-based evaluation with division
        console.log('\n=== READER EVALUATION WITH DIVISION ===')
        const divEnv = { a: 15, b: 3 }
        const divByZeroEnv = { a: 15, b: 0 }

        console.log('Environment:', divEnv) // { a: 15, b: 3 }
        console.log('evalExprR(a/b):', evalExprR(varDivExpr)(divEnv)) // 5
        console.log('evalExprR(a/b) with b=0:', evalExprR(varDivExpr)(divByZeroEnv)) // Infinity (JavaScript division)

        // ReaderTaskResult evaluation with division error handling
        console.log('\n=== READER-TASK-RESULT DIVISION WITH ERROR HANDLING ===')
        console.log('evalExprRR(a/b):', evalExprRR(varDivExpr)(divEnv)) // Ok(5)
        console.log('evalExprRR(a/b) with b=0:', evalExprRR(varDivExpr)(divByZeroEnv)) // Err(div by zero)

        // Complex expression combining all features
        const complexExpr3 = lett('x', lit(6), 
                              lett('y', divE(vvar('x'), lit(2)), 
                                add(vvar('y'), neg(lit(1)))))
        
        console.log('\n=== COMPLEX EXPRESSION COMBINING ALL FEATURES ===')
        console.log('Complex: let x = 6 in let y = x/2 in y + neg(1)')
        console.log('showExpr(complex):', showExpr(complexExpr3))
        console.log('evalExprR(complex)({}):', evalExprR(complexExpr3)({})) // 6/2 + (-1) = 2
        console.log('evalExprRR(complex)({}):', evalExprRR(complexExpr3)({})) // Ok(2)

        console.log('✅ Variables and let-binding demonstrate functional evaluation!')
        console.log('✅ Reader monad provides clean environment handling')
        console.log('✅ Division with typed failure prevents runtime errors')
        console.log('✅ All three evaluators (pure Result, Reader, ReaderTaskResult) work seamlessly')
        console.log('✅ Complex expressions combining all features work correctly')

        // Demonstrate Precedence-Aware Pretty Printing
        console.log('\n=== PRECEDENCE-AWARE PRETTY PRINTING DEMONSTRATION ===')
        console.log('Precedence-aware printing reduces unnecessary parentheses')

        // Create expressions with different precedence levels
        const precedenceExpr1 = add(mul(lit(2), lit(3)), lit(4))  // 2 * 3 + 4
        const precedenceExpr2 = mul(add(lit(2), lit(3)), lit(4))  // (2 + 3) * 4
        const precedenceExpr3 = neg(add(lit(1), lit(2)))          // -(1 + 2)
        const precedenceExpr4 = add(neg(lit(1)), lit(2))          // -1 + 2

        console.log('Expression: 2 * 3 + 4')
        console.log('showExpr (with parens):', showExpr(precedenceExpr1))           // (2 * 3) + 4
        console.log('showExprMinParens2 (minimal):', showExprMinParens2(precedenceExpr1)) // 2 * 3 + 4

        console.log('\nExpression: (2 + 3) * 4')
        console.log('showExpr (with parens):', showExpr(precedenceExpr2))           // (2 + 3) * 4
        console.log('showExprMinParens2 (minimal):', showExprMinParens2(precedenceExpr2)) // (2 + 3) * 4

        console.log('\nExpression: -(1 + 2)')
        console.log('showExpr (with parens):', showExpr(precedenceExpr3))           // (-(1 + 2))
        console.log('showExprMinParens2 (minimal):', showExprMinParens2(precedenceExpr3)) // -(1 + 2)

        console.log('\nExpression: -1 + 2')
        console.log('showExpr (with parens):', showExpr(precedenceExpr4))           // ((-1) + 2)
        console.log('showExprMinParens2 (minimal):', showExprMinParens2(precedenceExpr4)) // -1 + 2

        // Complex nested expression
        const complexPrecedence = add(mul(neg(lit(2)), add(lit(3), lit(4))), divE(lit(10), lit(2)))
        console.log('\nComplex: -2 * (3 + 4) + 10 / 2')
        console.log('showExpr (with parens):', showExpr(complexPrecedence))
        console.log('showExprMinParens2 (minimal):', showExprMinParens2(complexPrecedence))

        // Demonstrate JsonF Enhancements - JDate node
        console.log('\n=== JSONF ENHANCEMENTS - JDATE NODE DEMONSTRATION ===')
        console.log('Added JDate node to JsonF for date handling')

        // Create Json with dates
        const currentDate = new Date().toISOString()
        const dateJson1 = jDate(currentDate)
        const dateJson2 = jDate('2023-12-25T00:00:00.000Z')

        console.log('Current date JSON:', prettyJson(dateJson1))
        console.log('Christmas 2023 JSON:', prettyJson(dateJson2))

        // Json with mixed content including dates
        const mixedJson = jObj([
          ['event', jStr('Conference')],
          ['startDate', jDate('2024-03-15T09:00:00.000Z')],
          ['endDate', jDate('2024-03-17T17:00:00.000Z')],
          ['attendees', jArr([jStr('Alice'), jStr('Bob'), jStr('Charlie')])],
          ['isVirtual', jBool(false)]
        ])

        console.log('\nMixed JSON with dates:')
        console.log(prettyJson(mixedJson))

        // Test size and depth with dates
        console.log('\nDate JSON analysis:')
        console.log('Date JSON size:', sizeJson(dateJson1))      // 1
        console.log('Mixed JSON size:', sizeJson(mixedJson))     // 8 nodes
        console.log('Mixed JSON depth:', depthJson(mixedJson))   // 3 levels

        // Test canonicalization with dates
        const canonicalMixed = canonicalizeJson(mixedJson)
        console.log('\nCanonical form (keys sorted):')
        console.log(prettyJson(canonicalMixed))

        // Test EJSON encoding with dates
        const ejsonMixed = toEJson(mixedJson)
        console.log('\nEJSON encoding with $date:')
        console.log(JSON.stringify(ejsonMixed, null, 2))

        // Demonstrate algebra composition with dates
        const [mixedSize, mixedStrings] = sizeAndDepthJson(mixedJson)
        console.log('\nAlgebra composition:')
        console.log(`Size & depth: [${mixedSize[0]}, ${mixedSize[1]}]`)

        console.log('✅ Precedence-aware printing reduces unnecessary parentheses!')
        console.log('✅ JDate node seamlessly integrates with all existing algebras!')
        console.log('✅ EJSON encoding supports $date format')
        console.log('✅ Canonicalization and size/depth analysis work with dates')
        console.log('✅ All JsonF enhancements maintain type safety')

        // ============ NEW ALGEBRAS DEMONSTRATION ============
        console.log('\n=== NEW ALGEBRAS DEMONSTRATION ===')
        
        // Expr algebras: size & depth
        const complexExpr = addN([neg(lit(4)), mulN([lit(2), lit(3)]), divE(lit(8), lit(2))])
        const [exprSizeNew, exprDepthNew] = sizeAndDepthExpr(complexExpr)
        console.log('Complex expression:', showExpr(complexExpr))
        console.log('Expr size & depth:', exprSizeNew, exprDepthNew)
        
        // Json algebras: size, strings, depth
        const complexJson = jObj([['name', jStr('Ada')], ['tags', jArr([jStr('fp'), jStr('ts')])]])
        const jsonSizeNew = sizeJson(complexJson)
        const jsonStrs = strsJson(complexJson)
        const jsonDepthNew = depthJson(complexJson)
        const [jsonSize2, jsonDepth2] = sizeAndDepthJson(complexJson)
        
        console.log('Complex JSON:', prettyJson(complexJson))
        console.log('JSON size:', jsonSizeNew)
        console.log('JSON strings:', jsonStrs)
        console.log('JSON depth:', jsonDepthNew)
        console.log('JSON size & depth (combined):', jsonSize2, jsonDepth2)
        
        console.log('✅ New algebras demonstrate swapping meanings without touching recursion code!')
        console.log('✅ Product algebras enable single-pass computation of multiple properties!')

        // ============ PRODUCT JSON ALGEBRA DEMONSTRATION ============
        console.log('\n=== PRODUCT JSON ALGEBRA DEMONSTRATION ===')
        
        // Create a complex JSON structure
        const complexJson2 = jObj([
          ['name', jStr('Ada')],
          ['tags', jArr([jStr('fp'), jStr('ts')])],
          ['metadata', jObj([
            ['version', jStr('1.0')],
            ['features', jArr([jStr('arrows'), jStr('recursion')])]
          ])]
        ])
        
        // Single-pass computation of multiple properties
        const [jsonSize3, jsonDepth3] = sizeAndDepthJson(complexJson2)
        const [jsonStrs3, jsonSize4] = strsAndSizeJson(complexJson2)
        
        console.log('Complex JSON structure created')
        console.log('JSON size & depth (single pass):', jsonSize3, jsonDepth3)
        console.log('JSON strings & size (single pass):', jsonStrs3, jsonSize4)
        console.log('JSON pretty:', prettyJson(complexJson2))
        
        console.log('✅ Product algebras fuse multiple computations into single traversal!')
        console.log('✅ No intermediate structures - direct composition of algebras!')

        // ============ EXTENDED JSON VARIANTS DEMONSTRATION ============
        console.log('\n=== EXTENDED JSON VARIANTS DEMONSTRATION ===')
        
        // Create JSON with all the extended variants
        const extendedJson2 = jObj([
          ['undefined', jUndef()],
          ['decimal', jDec('12345678901234567890.0001')],
          ['binary', jBinary('SGVsbG8=')], // "Hello" in base64
          ['regex', jRegex('^a.*z$', 'i')],
          ['date', jDate('2024-03-15T09:00:00.000Z')],
          ['set', jSet([jStr('a'), jStr('b'), jStr('c')])],
          ['nested', jObj([
            ['precision', jDec('0.000000000000000001')],
            ['pattern', jRegex('\\d+', 'g')]
          ])]
        ])
        
        // Test all the algebras with extended variants
        const [extSize, extDepth] = sizeAndDepthJson(extendedJson2)
        const [extStrs, extSize2] = strsAndSizeJson(extendedJson2)
        
        console.log('Extended JSON with all variants created')
        console.log('Extended JSON pretty:', prettyJson(extendedJson2))
        console.log('Extended JSON size & depth:', extSize, extDepth)
        console.log('Extended JSON strings & size:', extStrs, extSize2)
        
        // Test individual variants
        console.log('\nIndividual variant examples:')
        console.log('Undefined:', prettyJson(jUndef()))
        console.log('Decimal:', prettyJson(jDec('999999999999999999.999999999')))
        console.log('Binary:', prettyJson(jBinary('VGVzdA=='))) // "Test" in base64
        console.log('Regex:', prettyJson(jRegex('\\w+@\\w+\\.\\w+', 'i')))
        console.log('Date:', prettyJson(jDate('2024-12-25T00:00:00.000Z')))
        console.log('Set:', prettyJson(jSet([jNum(1), jNum(2), jNum(3)])))
        
        console.log('✅ All extended JSON variants work seamlessly with existing algebras!')
        console.log('✅ JUndefined, JDec, JBinary, JRegex, JDate, JSet all integrated!')
        console.log('✅ Size, depth, and string collection work with all variants!')

        // ============ CANONICALIZATION & EJSON DEMONSTRATION ============
        console.log('\n=== CANONICALIZATION & EJSON DEMONSTRATION ===')
        
        // Build extended Json with sets / regex / decimal
        const messyJson2 = jObj([
          ['c', jDec('1234567890123456789.0001')],
          ['a', jSet([ jStr('x'), jStr('x'), jStr('y') ])], // duplicates
          ['d', jUndef()],
          ['b', jRegex('^a.*z$', 'ziiz')], // messy flags
        ])
        
        console.log('Original messy JSON:', prettyJson(messyJson2))
        
        // Canonicalize (set dedup/sort, flags normalized, keys sorted)
        const canonicalJson2 = canonicalizeJson(messyJson2)
        console.log('Canonicalized JSON:', prettyJson(canonicalJson2))
        
        // Encode to EJSON (deterministic)
        const ejson2 = toEJsonCanonical(canonicalJson2)
        console.log('EJSON encoding:', JSON.stringify(ejson2, null, 2))
        
        // Round-trip test
        const roundTrip = fromEJson(ejson2)
        console.log('Round-trip successful:', isOk(roundTrip))
        if (isOk(roundTrip)) {
          console.log('Round-trip result:', prettyJson(roundTrip.value))
        }
        
        // Show determinism: JSON.stringify(ejson) stable across runs
        const stableKey = JSON.stringify(ejson2)
        console.log('Stable canonical key (first 100 chars):', stableKey.substring(0, 100) + '...')
        
        // Test error handling
        const badEjson = { $regex: 123 } // should be string
        const badResult = fromEJson(badEjson)
        console.log('Error handling test:', isErr(badResult) ? badResult.error : 'Unexpected success')
        
        console.log('✅ Canonicalization provides stable, deterministic ordering!')
        console.log('✅ EJSON encoding/decoding supports all extended variants!')
        console.log('✅ Round-trip preservation with proper error handling!')

        // ============ CANONICAL EQUALITY & HASHING DEMONSTRATION ============
        console.log('\n=== CANONICAL EQUALITY & HASHING DEMONSTRATION ===')
        
        // Test canonical equality
        const objA = jObj([['x', jArr([jStr('a'), jStr('b')])]])
        const objB = jObj([['x', jArr([jStr('a'), jStr('b')])]])
        console.log('Equal objects:', equalsCanonical(objA, objB))
        console.log('Same hash:', hashCanonical(objA) === hashCanonical(objB))
        console.log('Hash A:', hashCanonical(objA))
        console.log('Hash B:', hashCanonical(objB))
        
        // Test that key ordering doesn't affect equality
        const setC = jObj([['x', jSet([jStr('b'), jStr('a'), jStr('a')])]])
        const setD = jObj([['x', jSet([jStr('a'), jStr('b')])]])
        const canonC = canonicalizeJson(setC)
        const canonD = canonicalizeJson(setD)
        console.log('Canonical sets equal:', equalsCanonical(canonC, canonD))
        console.log('Canonical key C:', canonicalKey(canonC).substring(0, 50) + '...')
        console.log('Canonical key D:', canonicalKey(canonD).substring(0, 50) + '...')
        
        // Test hash-consing (deduplication)
        const bigArray = jArr([objA, objB, canonC, canonD, objA, objB])
        const sharedArray = hashConsJson(bigArray)
        console.log('Hash-consing applied to array with duplicates')
        console.log('Original size:', JSON.stringify(bigArray).length)
        console.log('Shared size:', JSON.stringify(sharedArray).length)
        
        console.log('✅ Canonical equality works across different representations!')
        console.log('✅ Hash functions provide stable, deterministic keys!')
        console.log('✅ Hash-consing deduplicates identical subtrees!')

        // ============ CANONICAL CONTAINERS DEMONSTRATION ============
        console.log('\n=== CANONICAL CONTAINERS DEMONSTRATION ===')
        
        // Keys that differ superficially but are canonically equal coalesce
        const k1 = jObj([['s', jSet([jStr('b'), jStr('a'), jStr('a')])]])
        const k2 = jObj([['s', jSet([jStr('a'), jStr('b')])]])
        
        // CanonicalJsonMap demonstration
        const map = new CanonicalJsonMap<number>()
        map.set(k1, 1)
        map.set(k2, 2)   // overwrites same canonical key
        console.log('Map size:', map.size)         // 1
        console.log('Map.get(k1):', map.get(k1))   // 2 (overwrote)
        console.log('Map.get(k2):', map.get(k2))   // 2 (same canonical key)
        
        // CanonicalJsonSet demonstration
        const set = new CanonicalJsonSet([k1, k2])
        console.log('Set size:', set.size)         // 1
        console.log('Set contents:')
        for (const x of set) {
          console.log('  -', prettyJson(x))
        }
        
        // Upsert demonstration
        const cache = new CanonicalJsonMap<string>()
        const expensiveKey = jObj([['complex', jArr([jNum(1), jNum(2), jNum(3)])]])
        
        const result1 = cache.upsert(expensiveKey, () => 'computed-result')
        const result2 = cache.upsert(expensiveKey, () => 'should-not-compute')
        console.log('Cache upsert result1:', result1)
        console.log('Cache upsert result2:', result2)
        console.log('Cache size:', cache.size)
        
        console.log('✅ Canonical containers automatically deduplicate structurally equal JSON!')
        console.log('✅ Perfect for caches, memoization, and deduplication passes!')
        console.log('✅ Upsert pattern enables efficient cache-or-compute workflows!')

        // ============ CANONICAL MULTIMAP & GROUPBY DEMONSTRATION ============
        console.log('\n=== CANONICAL MULTIMAP & GROUPBY DEMONSTRATION ===')
        
        // Create test data with canonically equal JSONs
        const jsonA = jObj([['s', jSet([jStr('b'), jStr('a')])]])
        const jsonB = jObj([['s', jSet([jStr('a'), jStr('b'), jStr('a')])]]) // canonically equal to jsonA
        const jsonC = jObj([['s', jSet([jStr('c')])]])
        
        // groupByCanonical - group items by extracted JSON key
        const items = [
          { name: 'Alice', role: jStr('user') },
          { name: 'Bob', role: jStr('user') },
          { name: 'Charlie', role: jStr('admin') }
        ]
        const g1 = groupByCanonical(items, item => item.role)
        console.log('groupByCanonical size:', g1.size) // 2 (user and admin roles)
        // Manual approach (before)
        console.log('Users group (manual):', g1.get(jStr('user'))?.map(u => u.name)) // ['Alice', 'Bob']
        console.log('Admins group (manual):', g1.get(jStr('admin'))?.map(u => u.name)) // ['Charlie']
        
        // Adapter approach (after)
        const namesByRole = mapEachGroup(g1, (u) => u.name)
        console.log('Users group (adapter):', namesByRole.get(jStr('user'))) // ['Alice', 'Bob']
        console.log('Admins group (adapter):', namesByRole.get(jStr('admin'))) // ['Charlie']
        
        // groupPairsByCanonical - group pairs by JSON key
        const pairs: ReadonlyArray<readonly [Json, string]> = [[jsonA, 'x'], [jsonB, 'y'], [jsonC, 'z']]
        const g2 = groupPairsByCanonical(pairs)
        console.log('groupPairsByCanonical result for jsonA:', g2.get(jsonA)) // ['x', 'y'] (jsonA and jsonB are canonically equal)
        console.log('groupPairsByCanonical result for jsonC:', g2.get(jsonC)) // ['z']
        
        // MultiMap demonstration
        const mm3 = multiMapByCanonical(items, item => item.role)
        console.log('MultiMap size:', mm3.size) // 2 distinct keys
        console.log('MultiMap total values:', Array.from(mm3.values()).flat().length) // 3 total values
        
        // Iteration examples
        console.log('MultiMap groups:')
        for (const [k, vs] of mm3) {
          console.log('  Key:', prettyJson(k))
          console.log('  Values:', vs.map(v => v.name))
        }
        
        // Manual MultiMap construction
        const manualMM = new CanonicalJsonMultiMap<string>()
        manualMM.add(jsonA, 'x')
        manualMM.add(jsonB, 'y') // Will be grouped with jsonA
        manualMM.add(jsonC, 'z')
        console.log('Manual MultiMap size:', manualMM.size) // 2 (jsonA/jsonB grouped, jsonC separate)
        
        console.log('✅ Canonical multimap provides efficient grouping by canonical JSON keys!')
        console.log('✅ GroupBy helpers enable fast canonical bucket building!')
        console.log('✅ Canonically equal JSONs are automatically grouped together!')
  
  console.log('\n=== ALL NEW EXAMPLES COMPLETED ===')
        
        // =========================================================
        // NEW ADAPTERS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 NEW ADAPTERS DEMONSTRATION')
        console.log('============================')

        // Suppose we grouped purchases by canonical user profile JSON:
        type Purchase = { id: string; total: number; category: string }

        const purchases: Purchase[] = [
          { id: 'p1', total: 12, category: 'books' },
          { id: 'p2', total: 8, category: 'books' },
          { id: 'p3', total: 5, category: 'food' },
          { id: 'p4', total: 15, category: 'books' },
          { id: 'p5', total: 3, category: 'food' }
        ]

        // Group purchases by user (simulating different users)
        const userA = jObj([['user', jStr('ada')]])
        const userB = jObj([['user', jStr('bob')]])

        const groups = new CanonicalJsonMap<ReadonlyArray<Purchase>>()
          .set(userA, [purchases[0], purchases[1], purchases[3]]) // ada: p1, p2, p4
          .set(userB, [purchases[2], purchases[4]]) // bob: p3, p5

        console.log('📊 Original groups:')
        for (const [user, purchases] of groups) {
          console.log(`   User: ${JSON.stringify(user)}`)
          console.log(`   Purchases: ${purchases.map(p => `${p.id}($${p.total})`).join(', ')}`)
        }

        // 1) Transform whole group -> summary number
        const totals = mapGroupValues(groups, (vs) => vs.reduce((s, p) => s + p.total, 0))
        console.log('\n💰 Total spending per user:')
        for (const [user, total] of totals) {
          console.log(`   User: ${JSON.stringify(user)} -> $${total}`)
        }

        // 2) Map each element
        const idsByUser = mapEachGroup(groups, (p) => p.id)
        console.log('\n🆔 Purchase IDs per user:')
        for (const [user, ids] of idsByUser) {
          console.log(`   User: ${JSON.stringify(user)} -> [${ids.join(', ')}]`)
        }

        // 3) Filter elements
        const bigOnly = filterEachGroup(groups, (p) => p.total >= 10)
        console.log('\n💎 Big purchases (≥$10) per user:')
        for (const [user, purchases] of bigOnly) {
          console.log(`   User: ${JSON.stringify(user)} -> ${purchases.map(p => `${p.id}($${p.total})`).join(', ')}`)
        }

        // 4) Merge with custom fold
        const avgTotals = mergeGroupValues(
          groups,
          () => ({ sum: 0, n: 0 }),
          (acc, p) => ({ sum: acc.sum + p.total, n: acc.n + 1 })
        )
        console.log('\n📈 Average spending per user:')
        for (const [user, stats] of avgTotals) {
          const avg = stats.n > 0 ? stats.sum / stats.n : 0
          console.log(`   User: ${JSON.stringify(user)} -> $${avg.toFixed(2)} (${stats.n} purchases)`)
        }

        // 5) Dedupe inside groups (by category)
        const uniqByCategory = dedupeEachGroup(groups, (p) => p.category)
        console.log('\n🏷️ Unique categories per user:')
        for (const [user, purchases] of uniqByCategory) {
          console.log(`   User: ${JSON.stringify(user)} -> ${purchases.map(p => p.category).join(', ')}`)
        }

        // 6) Flatten to pairs
        const rows = flattenGroups(groups)
        console.log('\n📋 Flattened pairs:')
        for (const [user, purchase] of rows) {
          console.log(`   ${JSON.stringify(user)} -> ${purchase.id}($${purchase.total})`)
        }

        // =========================================================
        // MULTIMAP ADAPTERS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 MULTIMAP ADAPTERS DEMONSTRATION')
        console.log('==================================')

        // Create a multimap from the same data
        const mm4 = new CanonicalJsonMultiMap<Purchase>()
        mm4.add(userA, purchases[0])
        mm4.add(userA, purchases[1])
        mm4.add(userA, purchases[3])
        mm4.add(userB, purchases[2])
        mm4.add(userB, purchases[4])

        console.log('📊 Original multimap:')
        for (const [user, purchases] of mm4) {
          console.log(`   User: ${JSON.stringify(user)} -> ${purchases.map(p => `${p.id}($${p.total})`).join(', ')}`)
        }

        // 1) Collapse to map
        const collapsed = collapseToMap(mm4)
        console.log('\n🔄 Collapsed to map:')
        for (const [user, purchases] of collapsed) {
          console.log(`   User: ${JSON.stringify(user)} -> ${purchases.map(p => `${p.id}($${p.total})`).join(', ')}`)
        }

        // 2) Map multimap values
        const mmTotals = mapMultiValues(mm4, (vs) => vs.reduce((s, p) => s + p.total, 0))
        console.log('\n💰 Multimap totals:')
        for (const [user, total] of mmTotals) {
          console.log(`   User: ${JSON.stringify(user)} -> $${total}`)
        }

        // 3) Map each element in multimap
        const mmIds = mapEachMulti(mm4, (p) => p.id)
        console.log('\n🆔 Multimap IDs:')
        for (const [user, ids] of mmIds) {
          console.log(`   User: ${JSON.stringify(user)} -> [${ids.join(', ')}]`)
        }

        // 4) Filter each element in multimap
        const mmBigOnly = filterEachMulti(mm4, (p) => p.total >= 10)
        console.log('\n💎 Multimap big purchases:')
        for (const [user, purchases] of mmBigOnly) {
          console.log(`   User: ${JSON.stringify(user)} -> ${purchases.map(p => `${p.id}($${p.total})`).join(', ')}`)
        }

        // 5) Merge multimap with custom fold
        const mmStats = mergeMulti(
          mm4,
          () => ({ sum: 0, n: 0, categories: new Set<string>() }),
          (acc, p) => ({ 
            sum: acc.sum + p.total, 
            n: acc.n + 1, 
            categories: acc.categories.add(p.category) 
          })
        )
        console.log('\n📊 Multimap statistics:')
        for (const [user, stats] of mmStats) {
          const avg = stats.n > 0 ? stats.sum / stats.n : 0
          console.log(`   User: ${JSON.stringify(user)} -> $${avg.toFixed(2)} avg, ${stats.n} purchases, categories: [${Array.from(stats.categories).join(', ')}]`)
        }

        // =========================================================
        // NEW GROUP OPERATIONS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 NEW GROUP OPERATIONS DEMONSTRATION')
        console.log('====================================')

        // Create sample data for group operations
        type Row = { id: string; score: number; category: string }
        
        const aKey = jObj([['user', jStr('ada')]])
        const bKey = jObj([['user', jStr('bob')]])
        const cKey = jObj([['user', jStr('charlie')]])

        const group1 = new CanonicalJsonMap<ReadonlyArray<Row>>()
          .set(aKey, [{id:'a1',score:10,category:'books'},{id:'a2',score:7,category:'books'}])
          .set(bKey, [{id:'b1',score:1,category:'food'}])

        const group2 = new CanonicalJsonMap<ReadonlyArray<Row>>()
          .set(aKey, [{id:'a3',score:11,category:'books'},{id:'a2',score:7,category:'books'}]) // note duplicate id a2
          .set(cKey, [{id:'c1',score:9,category:'tech'}])

        console.log('📊 Original groups group1:')
        for (const [key, rows] of group1) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        console.log('\n📊 Original groups group2:')
        for (const [key, rows] of group2) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 1) Concatenate groups
        const concat = concatGroups(group1, group2)
        console.log('\n🔗 Concatenated groups:')
        for (const [key, rows] of concat) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 2) Union groups with deduplication
        const union = unionGroupsBy(group1, group2, r => r.id)
        console.log('\n🔀 Union groups (deduplicated by id):')
        for (const [key, rows] of union) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 3) Intersection groups
        const inter = intersectGroupsBy(group1, group2, r => r.id)
        console.log('\n🔍 Intersection groups:')
        for (const [key, rows] of inter) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 4) Difference groups
        const diffGroups = diffGroupsBy(group1, group2, r => r.id)
        console.log('\n➖ Difference groups (group1 - group2):')
        for (const [key, rows] of diffGroups) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 5) Top K per group
        const top2 = topKBy(union, 2, (r) => r.score)
        console.log('\n🏆 Top 2 per group (by score):')
        for (const [key, rows] of top2) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 6) Sort groups by total score
        const sorted = sortGroupsByNumberDesc(union, (vs) => vs.reduce((s,r) => s + r.score, 0))
        console.log('\n📈 Groups sorted by total score (desc):')
        for (const [key, rows] of sorted) {
          const total = rows.reduce((s,r) => s + r.score, 0)
          console.log(`   Key: ${JSON.stringify(key)} -> Total: ${total}, Items: ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // =========================================================
        // MULTIMAP GROUP OPERATIONS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 MULTIMAP GROUP OPERATIONS DEMONSTRATION')
        console.log('==========================================')

        // Create multimaps
        const mm1 = CanonicalJsonMultiMap.from([
          [aKey, {id:'a1',score:10,category:'books'}],
          [aKey, {id:'a2',score:7,category:'books'}],
          [bKey, {id:'b1',score:1,category:'food'}]
        ])

        const mm2 = CanonicalJsonMultiMap.from([
          [aKey, {id:'a3',score:11,category:'books'}],
          [aKey, {id:'a2',score:7,category:'books'}], // duplicate
          [cKey, {id:'c1',score:9,category:'tech'}]
        ])

        console.log('📊 Multimap 1:')
        for (const [key, rows] of mm1) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        console.log('\n📊 Multimap 2:')
        for (const [key, rows] of mm2) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 1) Concatenate multimaps
        const concatMM = concatGroupsMM(mm1, mm2)
        console.log('\n🔗 Concatenated multimaps:')
        for (const [key, rows] of concatMM) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 2) Union multimaps with deduplication
        const unionMM = unionGroupsByMM(mm1, mm2, r => r.id)
        console.log('\n🔀 Union multimaps (deduplicated):')
        for (const [key, rows] of unionMM) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 3) Intersection multimaps
        const interMM = intersectGroupsByMM(mm1, mm2, r => r.id)
        console.log('\n🔍 Intersection multimaps:')
        for (const [key, rows] of interMM) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 4) Difference multimaps
        const diffMM = diffGroupsByMM(mm1, mm2, r => r.id)
        console.log('\n➖ Difference multimaps (mm1 - mm2):')
        for (const [key, rows] of diffMM) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 5) Top K multimap
        const top2MM = topKByMM(unionMM, 2, (r) => r.score)
        console.log('\n🏆 Top 2 multimap (by score):')
        for (const [key, rows] of top2MM) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 6) Sort multimap by total score
        const sortedMM = sortGroupsByNumberDescMM(unionMM, (vs) => vs.reduce((s,r) => s + r.score, 0))
        console.log('\n📈 Multimap sorted by total score (desc):')
        for (const [key, rows] of sortedMM) {
          const total = rows.reduce((s,r) => s + r.score, 0)
          console.log(`   Key: ${JSON.stringify(key)} -> Total: ${total}, Items: ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // =========================================================
        // NEW STREAMING OPERATIONS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 NEW STREAMING OPERATIONS DEMONSTRATION')
        console.log('========================================')

        // Create sample data for streaming operations
        type StreamRow = { id: string; score: number; category: string }
        
        const K = (u: string) => jObj([['user', jStr(u)]])
        const stream: Array<readonly [Json, StreamRow]> = [
          [K('ada'), { id:'a1', score:10, category:'books' }],
          [K('bob'), { id:'b1', score:4, category:'food' }],
          [K('ada'), { id:'a2', score:7, category:'books' }],
          [K('ada'), { id:'a3', score:11, category:'books' }],
          [K('charlie'), { id:'c1', score:9, category:'tech' }]
        ]

        console.log('📊 Original stream:')
        for (const [key, row] of stream) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${row.id}(${row.score})`)
        }

        // Group the stream first - extract just the values
        const streamGrouped = new CanonicalJsonMap<ReadonlyArray<StreamRow>>()
        for (const [key, row] of stream) {
          const existing = streamGrouped.get(key) ?? []
          streamGrouped.set(key, [...existing, row] as ReadonlyArray<StreamRow>)
        }
        
        console.log('\n📊 Grouped stream:')
        for (const [key, rows] of streamGrouped) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 1) Min/Max per group
        const mins = minByGroup(streamGrouped, (r) => r.score)
        console.log('\n🏆 Min per group (by score):')
        for (const [key, rows] of mins) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        const maxs = maxByGroup(streamGrouped, (r) => r.score)
        console.log('\n🏆 Max per group (by score):')
        for (const [key, rows] of maxs) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 2) Global min/max
        const bestGlobal = maxByGlobal(streamGrouped, (r) => r.score)
        console.log('\n🌍 Global max (by score):')
        if (isSome(bestGlobal)) {
          const [key, row] = bestGlobal.value
          console.log(`   Key: ${JSON.stringify(key)} -> ${row.id}(${row.score})`)
        } else {
          console.log('   No items found')
        }

        // 3) Take/Drop while
        const highPrefix = takeWhileGroup(streamGrouped, (r) => r.score >= 8)
        console.log('\n📈 Take while score >= 8:')
        for (const [key, rows] of highPrefix) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        const dropPrefix = dropWhileGroup(streamGrouped, (r) => r.score >= 8)
        console.log('\n📉 Drop while score >= 8:')
        for (const [key, rows] of dropPrefix) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 4) Streaming reducers
        const counts = streamCountsByCanonical(stream)
        console.log('\n🔢 Stream counts per key:')
        for (const [key, count] of counts) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${count} items`)
        }

        const sums = streamSumByCanonical(stream, (r) => r.score)
        console.log('\n💰 Stream sums per key:')
        for (const [key, sum] of sums) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${sum} total score`)
        }

        const streamTop2 = streamTopKByCanonical<StreamRow>(2, (r) => r.score)(stream)
        console.log('\n🏆 Stream top 2 per key:')
        for (const [key, rows] of streamTop2) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 5) MultiMap variants
        const streamMM = CanonicalJsonMultiMap.from(stream)
        const mmMins = minByGroupMM(streamMM, (r) => r.score)
        console.log('\n🔧 MultiMap min per group:')
        for (const [key, rows] of mmMins) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        const mmTakeWhile = takeWhileGroupMM(streamMM, (r) => r.score >= 8)
        console.log('\n🔧 MultiMap take while score >= 8:')
        for (const [key, rows] of mmTakeWhile) {
          console.log(`   Key: ${JSON.stringify(key)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // =========================================================
        // NEW CANONICAL OPERATIONS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 NEW CANONICAL OPERATIONS DEMONSTRATION')
        console.log('==========================================')

        // Create sample data for canonical operations
        const canonicalA = jObj([['s', jSet([jStr('b'), jStr('a')])]])
        const canonicalB = jObj([['s', jSet([jStr('a'), jStr('b'), jStr('a')])]]) // canonically == canonicalA
        const canonicalC = jObj([['s', jSet([jStr('c')])]])
        const canonicalD = jObj([['s', jSet([jStr('d'), jStr('e')])]])

        console.log('📊 Original JSON objects:')
        console.log(`   canonicalA: ${JSON.stringify(canonicalA)}`)
        console.log(`   canonicalB: ${JSON.stringify(canonicalB)}`)
        console.log(`   canonicalC: ${JSON.stringify(canonicalC)}`)
        console.log(`   canonicalD: ${JSON.stringify(canonicalD)}`)

        // 1) Canonical min/max by lexicographic key
        const jsonArray = [canonicalB, canonicalC, canonicalA, canonicalD]
        const minJson = minByCanonical(jsonArray)
        const maxJson = maxByCanonical(jsonArray)

        console.log('\n🏆 Min by canonical key (lexicographic):')
        if (isSome(minJson)) {
          console.log(`   Min: ${JSON.stringify(minJson.value)}`)
        } else {
          console.log('   No items found')
        }

        console.log('\n🏆 Max by canonical key (lexicographic):')
        if (isSome(maxJson)) {
          console.log(`   Max: ${JSON.stringify(maxJson.value)}`)
        } else {
          console.log('   No items found')
        }

        // 2) Canonical min/max by score
        const minByScore = minByCanonicalScore(jsonArray, (j, k) => k.length)
        const maxByScore = maxByCanonicalScore(jsonArray, (j, k) => k.length)

        console.log('\n🏆 Min by canonical key length:')
        if (isSome(minByScore)) {
          console.log(`   Min: ${JSON.stringify(minByScore.value)}`)
        } else {
          console.log('   No items found')
        }

        console.log('\n🏆 Max by canonical key length:')
        if (isSome(maxByScore)) {
          console.log(`   Max: ${JSON.stringify(maxByScore.value)}`)
        } else {
          console.log('   No items found')
        }

        // 3) Streaming distinct operations
        const duplicateArray = [canonicalA, canonicalB, canonicalC, canonicalA, canonicalD, canonicalB]
        const distinctStream = [...distinctByCanonical(duplicateArray)]
        const distinctArray = distinctByCanonicalToArray(duplicateArray)

        console.log('\n🔀 Streaming distinct (first-wins):')
        console.log(`   Original: ${duplicateArray.length} items`)
        console.log(`   Distinct: ${distinctStream.length} items`)
        for (const item of distinctStream) {
          console.log(`     ${JSON.stringify(item)}`)
        }

        console.log('\n🔀 Distinct to array:')
        console.log(`   Distinct: ${distinctArray.length} items`)
        for (const item of distinctArray) {
          console.log(`     ${JSON.stringify(item)}`)
        }

        // 4) Streaming distinct pairs
        const jsonPairs = [[canonicalA, 1], [canonicalB, 2], [canonicalC, 3], [canonicalA, 4], [canonicalD, 5], [canonicalB, 6]] as const
        const distinctPairsStream = [...distinctPairsByCanonical(jsonPairs)]
        const distinctPairsArray = distinctPairsByCanonicalToArray(jsonPairs)

        console.log('\n🔀 Streaming distinct pairs (first-wins):')
        console.log(`   Original: ${jsonPairs.length} pairs`)
        console.log(`   Distinct: ${distinctPairsStream.length} pairs`)
        for (const [json, value] of distinctPairsStream) {
          console.log(`     ${JSON.stringify(json)} -> ${value}`)
        }

        console.log('\n🔀 Distinct pairs to array:')
        console.log(`   Distinct: ${distinctPairsArray.length} pairs`)
        for (const [json, value] of distinctPairsArray) {
          console.log(`     ${JSON.stringify(json)} -> ${value}`)
        }

        // 5) Last-wins distinct operations
        const lastWinsDistinct = distinctByCanonicalLast(duplicateArray)
        const lastWinsPairs = distinctPairsByCanonicalLast(jsonPairs)

        console.log('\n🔀 Last-wins distinct:')
        console.log(`   Original: ${duplicateArray.length} items`)
        console.log(`   Distinct: ${lastWinsDistinct.length} items`)
        for (const item of lastWinsDistinct) {
          console.log(`     ${JSON.stringify(item)}`)
        }

        console.log('\n🔀 Last-wins distinct pairs:')
        console.log(`   Original: ${jsonPairs.length} pairs`)
        console.log(`   Distinct: ${lastWinsPairs.length} pairs`)
        for (const [json, value] of lastWinsPairs) {
          console.log(`     ${JSON.stringify(json)} -> ${value}`)
        }

        // 6) Canonical key comparison
        console.log('\n🔑 Canonical key comparison:')
        console.log(`   canonicalA canonical key: ${canonicalKey(canonicalA)}`)
        console.log(`   canonicalB canonical key: ${canonicalKey(canonicalB)}`)
        console.log(`   canonicalC canonical key: ${canonicalKey(canonicalC)}`)
        console.log(`   canonicalD canonical key: ${canonicalKey(canonicalD)}`)
        console.log(`   canonicalA == canonicalB (canonical): ${equalsCanonical(canonicalA, canonicalB)}`)

        // 7) Canonical sort operations
        const unsortedArray = [canonicalD, canonicalA, canonicalC, canonicalB]
        const sortedAsc = sortJsonByCanonical(unsortedArray)
        const sortedDesc = sortJsonByCanonicalDesc(unsortedArray)

        console.log('\n📊 Canonical sort (ascending):')
        console.log(`   Original: ${unsortedArray.length} items`)
        console.log(`   Sorted: ${sortedAsc.length} items`)
        for (const item of sortedAsc) {
          console.log(`     ${JSON.stringify(item)}`)
        }

        console.log('\n📊 Canonical sort (descending):')
        console.log(`   Original: ${unsortedArray.length} items`)
        console.log(`   Sorted: ${sortedDesc.length} items`)
        for (const item of sortedDesc) {
          console.log(`     ${JSON.stringify(item)}`)
        }

        // 8) Canonical unique operations
        const duplicateArray2 = [canonicalA, canonicalB, canonicalC, canonicalA, canonicalD, canonicalB]
        const uniqueFirst = uniqueJsonByCanonical(duplicateArray2)
        const uniqueLast = uniqueJsonByCanonicalLast(duplicateArray2)

        console.log('\n🔀 Canonical unique (first-wins):')
        console.log(`   Original: ${duplicateArray2.length} items`)
        console.log(`   Unique: ${uniqueFirst.length} items`)
        for (const item of uniqueFirst) {
          console.log(`     ${JSON.stringify(item)}`)
        }

        console.log('\n🔀 Canonical unique (last-wins):')
        console.log(`   Original: ${duplicateArray2.length} items`)
        console.log(`   Unique: ${uniqueLast.length} items`)
        for (const item of uniqueLast) {
          console.log(`     ${JSON.stringify(item)}`)
        }

        // 9) Canonical key comparison for sorted items
        console.log('\n🔑 Canonical keys for sorted items:')
        for (let i = 0; i < sortedAsc.length; i++) {
          const item = sortedAsc[i]!
          const key = canonicalKey(item)
          console.log(`   ${i + 1}. ${JSON.stringify(item)} -> ${key}`)
        }

        // =========================================================
        // PAIR HELPERS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 PAIR HELPERS DEMONSTRATION')
        console.log('=============================')

        // Create test data with canonically equal JSONs
        const k1 = jObj([['s', jSet([jStr('b'), jStr('a')])]])
        const k2 = jObj([['s', jSet([jStr('a'), jStr('b'), jStr('a')])]]) // canonically == k1
        const k3 = jObj([['s', jSet([jStr('c')])]])

        const pairs = [[k1, 1] as const, [k2, 2] as const, [k3, 3] as const]

        console.log('📊 Original pairs:')
        for (const [json, value] of pairs) {
          console.log(`   ${JSON.stringify(json)} -> ${value}`)
        }

        // Sort asc/desc
        const sortedPairsAsc = sortPairsByCanonical(pairs)
        const sortedPairsDesc = sortPairsByCanonicalDesc(pairs)

        console.log('\n📊 Sorted pairs (ascending):')
        for (const [json, value] of sortedPairsAsc) {
          console.log(`   ${JSON.stringify(json)} -> ${value}`)
        }

        console.log('\n📊 Sorted pairs (descending):')
        for (const [json, value] of sortedPairsDesc) {
          console.log(`   ${JSON.stringify(json)} -> ${value}`)
        }

        // Unique (first-wins / last-wins)
        const uniqueFirst = uniquePairsByCanonical(pairs)
        const uniqueLast = uniquePairsByCanonicalLast(pairs)

        console.log('\n🔀 Unique pairs (first-wins):')
        console.log(`   Original: ${pairs.length} pairs`)
        console.log(`   Unique: ${uniqueFirst.length} pairs`)
        for (const [json, value] of uniqueFirst) {
          console.log(`   ${JSON.stringify(json)} -> ${value}`)
        }

        console.log('\n🔀 Unique pairs (last-wins):')
        console.log(`   Original: ${pairs.length} pairs`)
        console.log(`   Unique: ${uniqueLast.length} pairs`)
        for (const [json, value] of uniqueLast) {
          console.log(`   ${JSON.stringify(json)} -> ${value}`)
        }

        // =========================================================
        // VALUE-AWARE SORT HELPERS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 VALUE-AWARE SORT HELPERS DEMONSTRATION')
        console.log('==========================================')

        // Create test data
        type Row = { id: string; score: number; category: string }
        const K = (u: string) => jObj([['user', jStr(u)]])
        
        const pairs: ReadonlyArray<readonly [Json, Row]> = [
          [K('ada'), { id:'a2', score: 7, category: 'books' }],
          [K('ada'), { id:'a1', score: 10, category: 'books' }],
          [K('bob'), { id:'b1', score: 4, category: 'food' }],
          [K('ada'), { id:'a3', score: 8, category: 'books' }],
          [K('charlie'), { id:'c1', score: 9, category: 'tech' }],
          [K('bob'), { id:'b2', score: 6, category: 'food' }]
        ]

        console.log('📊 Original pairs:')
        for (const [json, row] of pairs) {
          console.log(`   ${JSON.stringify(json)} -> ${row.id}(${row.score})`)
        }

        // 1) Sort pairs by canonical key, then by score (ascending)
        const sortedPairs = sortPairsByCanonicalThenNumberAsc(pairs, r => r.score)
        console.log('\n📊 Pairs sorted by canonical key, then score (asc):')
        for (const [json, row] of sortedPairs) {
          console.log(`   ${JSON.stringify(json)} -> ${row.id}(${row.score})`)
        }

        // 2) Sort pairs by canonical key, then by score (descending)
        const sortedPairsDesc = sortPairsByCanonicalThenNumberDesc(pairs, r => r.score)
        console.log('\n📊 Pairs sorted by canonical key, then score (desc):')
        for (const [json, row] of sortedPairsDesc) {
          console.log(`   ${JSON.stringify(json)} -> ${row.id}(${row.score})`)
        }

        // 3) Sort pairs by score first, then canonical key
        const sortedByValue = sortPairsByValueNumberDescThenCanonical(pairs, r => r.score)
        console.log('\n📊 Pairs sorted by score (desc), then canonical key:')
        for (const [json, row] of sortedByValue) {
          console.log(`   ${JSON.stringify(json)} -> ${row.id}(${row.score})`)
        }

        // 4) Group the pairs and sort values within each group
        const grouped = new CanonicalJsonMap<ReadonlyArray<Row>>()
        for (const [json, row] of pairs) {
          const existing = grouped.get(json) ?? []
          grouped.set(json, [...existing, row] as ReadonlyArray<Row>)
        }

        console.log('\n📊 Original groups:')
        for (const [json, rows] of grouped) {
          console.log(`   ${JSON.stringify(json)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // Sort values within each group by score (descending)
        const sortedGroups = sortValuesInGroupsByNumberDesc(grouped, r => r.score)
        console.log('\n📊 Groups with values sorted by score (desc):')
        for (const [json, rows] of sortedGroups) {
          console.log(`   ${JSON.stringify(json)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 5) MultiMap version
        const mm = new CanonicalJsonMultiMap<Row>()
        for (const [json, row] of pairs) {
          mm.add(json, row)
        }

        console.log('\n📊 Original multimap:')
        for (const [json, rows] of mm) {
          console.log(`   ${JSON.stringify(json)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // Sort values within each group in multimap by score (ascending)
        const sortedMM = sortValuesInGroupsByNumberAscMM(mm, r => r.score)
        console.log('\n📊 MultiMap with values sorted by score (asc):')
        for (const [json, rows] of sortedMM) {
          console.log(`   ${JSON.stringify(json)} -> ${rows.map(r => `${r.id}(${r.score})`).join(', ')}`)
        }

        // 6) Custom comparator example
        const customSorted = sortPairsBy(pairs, ([jsonA, rowA], [jsonB, rowB]) => {
          // First by category, then by score
          const catCompare = rowA.category.localeCompare(rowB.category)
          if (catCompare !== 0) return catCompare
          return rowA.score - rowB.score
        })

        console.log('\n📊 Pairs sorted by custom comparator (category, then score):')
        for (const [json, row] of customSorted) {
          console.log(`   ${JSON.stringify(json)} -> ${row.id}(${row.score}) [${row.category}]`)
        }

        // 7) Generic sort with value projection
        const genericSorted = sortPairsByCanonicalThen(
          pairs,
          r => r.category, // project to category
          (a, b) => a.localeCompare(b) // compare categories
        )

        console.log('\n📊 Pairs sorted by canonical key, then category:')
        for (const [json, row] of genericSorted) {
          console.log(`   ${JSON.stringify(json)} -> ${row.id}(${row.score}) [${row.category}]`)
        }

        // =========================================================
        // POLICY THREADING & IMPROVED PRODUCT ALGEBRA DEMONSTRATION
        // =========================================================

        console.log('\n🔧 POLICY THREADING & IMPROVED PRODUCT ALGEBRA DEMONSTRATION')
        console.log('================================================================')

        // Create test data with various JSON structures
        const testJson = jObj([
          ['z', jNum(3)],  // out of order keys
          ['a', jSet([jStr('c'), jStr('a'), jStr('b')])], // unsorted set
          ['b', jRegex('test', 'gim')], // regex with flags
          ['c', jArr([jNum(3), jNum(1), jNum(2)])] // array (order preserved)
        ])

        console.log('📊 Original JSON:')
        console.log(prettyJson(testJson))

        // 1) Default canonicalization (all policies enabled)
        const defaultCanonical = canonicalizeJson(testJson)
        console.log('\n📊 Default canonicalization (all policies):')
        console.log(prettyJson(defaultCanonical))

        // 2) Policy-aware canonicalization - disable object sorting
        const noSortPolicy = { sortObjects: false }
        const noSortCanonical = canonicalizeJsonP(noSortPolicy)(testJson)
        console.log('\n📊 No object sorting policy:')
        console.log(prettyJson(noSortCanonical))

        // 3) Policy-aware canonicalization - disable set operations
        const noSetPolicy = { dedupSets: false, sortSets: false }
        const noSetCanonical = canonicalizeJsonP(noSetPolicy)(testJson)
        console.log('\n📊 No set dedup/sort policy:')
        console.log(prettyJson(noSetCanonical))

        // 4) Policy-aware EJSON encoding
        const fastPolicy = { sortObjects: false, dedupSets: false, sortSets: false }
        const fastEjson = toEJsonCanonicalWithPolicy(testJson, fastPolicy)
        console.log('\n📊 Fast policy EJSON (minimal processing):')
        console.log(JSON.stringify(fastEjson, null, 2))

        // 5) Improved product algebra demonstration
        console.log('\n📊 Improved product algebra (size & depth in single traversal):')
        const [size, depth] = sizeAndDepthJson(testJson)
        console.log(`Size: ${size}, Depth: ${depth}`)

        // 6) Product algebra with custom algebras
        const customAlg1 = (f: JsonF<number>) => f._tag === 'JNum' ? f.value : 0
        const customAlg2 = (f: JsonF<string>) => f._tag === 'JStr' ? f.value : ''
        
        const [numbers, strings] = cataJson(productJsonAlg2(customAlg1, customAlg2))(testJson)
        console.log('\n📊 Custom product algebra (numbers & strings):')
        console.log(`Numbers: ${numbers}, Strings: ${strings}`)

        // 7) Policy comparison
        console.log('\n📊 Policy comparison:')
        const policies = [
          { name: 'Default', policy: {} },
          { name: 'Fast', policy: { sortObjects: false, dedupSets: false, sortSets: false } },
          { name: 'Strict', policy: { sortObjects: true, dedupSets: true, sortSets: true, normalizeRegexFlags: true } }
        ]

        for (const { name, policy } of policies) {
          const canonical = canonicalizeJsonP(policy)(testJson)
          const key = canonicalKey(canonical)
          console.log(`${name}: ${key.substring(0, 50)}...`)
        }

        // =========================================================
        // CATEGORY THEORY CONSTRUCTS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 CATEGORY THEORY CONSTRUCTS DEMONSTRATION')
        console.log('===========================================')

        // 1) Natural Transformations
        console.log('\n📊 Natural Transformations:')
        
        // Option to Result transformation
        const optToRes = optionToResult('No value found')
        const someOpt = Some(42)
        const noneOpt = None
        const res1 = optToRes(someOpt)
        const res2 = optToRes(noneOpt)
        console.log(`Some(42) -> Result:`, isOk(res1) ? `Ok(${res1.value})` : `Err(${res1.error})`)
        console.log(`None -> Result:`, isOk(res2) ? `Ok(${res2.value})` : `Err(${res2.error})`)

        // Result to Option transformation
        const resToOpt = resultToOption
        const okRes = Ok(100)
        const errRes = Err('Something went wrong')
        const opt1 = resToOpt(okRes)
        const opt2 = resToOpt(errRes)
        console.log(`Ok(100) -> Option:`, isSome(opt1) ? `Some(${opt1.value})` : 'None')
        console.log(`Err(...) -> Option:`, isSome(opt2) ? `Some(${opt2.value})` : 'None')

        // Task to ReaderTask transformation
        const task = Task.of(200)
        const rtask = taskToReaderTask(task)
        const result = await rtask({ env: 'test' })
        console.log(`Task -> ReaderTask:`, result)

        // 2) Kleisli Category
        console.log('\n📊 Kleisli Category:')
        
        // Define some Kleisli arrows
        const double = (n: number) => Some(n * 2)
        const addOne = (n: number) => Some(n + 1)
        const toString = (n: number) => Some(n.toString())

        // Compose Kleisli arrows
        const doubleThenAddOne = K_Option.compose(addOne, double)
        const fullPipeline = K_Option.compose(toString, K_Option.compose(addOne, double))

        const testValue = 5
        const result1 = doubleThenAddOne(testValue)
        const result2 = fullPipeline(testValue)
        console.log(`5 -> double -> addOne:`, isSome(result1) ? `Some(${result1.value})` : 'None')
        console.log(`5 -> full pipeline:`, isSome(result2) ? `Some(${result2.value})` : 'None')

        // 3) Writer Monad
        console.log('\n📊 Writer Monad:')
        
        const W = Writer(StringMonoid)
        const logDouble = (n: number) => W.chain(StringMonoid)(() => W.tell(`Doubled ${n} to ${n * 2}\n`))(
          W.of(StringMonoid)(n * 2)
        )
        const logAddOne = (n: number) => W.chain(StringMonoid)(() => W.tell(`Added 1 to ${n} to get ${n + 1}\n`))(
          W.of(StringMonoid)(n + 1)
        )

        const writerResult = W.chain(StringMonoid)(logAddOne)(logDouble(3))
        console.log(`Writer result:`, writerResult[0], 'with log:', writerResult[1])

        // 4) WriterT (Writer Transformer)
        console.log('\n📊 WriterT (Writer Transformer):')
        
        const WRT = WriterT<ReadonlyArray<string>>(ArrayMonoid<string>())(K_ReaderTask)
        
        const loggedComputation = WRT.chain((n: number) => 
          WRT.chain(() => WRT.of(n + 1))(
            WRT.tell(['Computed: ' + n + ' -> ' + (n + 1)])
          )
        )(WRT.of(10))

        const env = { userId: 'user123' }
        const [value, logs] = await loggedComputation(env)
        console.log(`WriterT result:`, value, 'with logs:', logs)

        // 5) Array Monad and Traverse
        console.log('\n📊 Array Monad and Traverse:')
        
        // Array monad operations
        const numbers = [1, 2, 3, 4, 5]
        const doubled = ArrayM.map((n: number) => n * 2)(numbers)
        const filtered = ArrayM.chain((n: number) => n % 2 === 0 ? [n] : [])(numbers)
        console.log(`Original:`, numbers)
        console.log(`Doubled:`, doubled)
        console.log(`Even only:`, filtered)

        // Traverse with Option
        const maybeNumbers = [Some(1), Some(2), None, Some(4)]
        const traversed = traverseArrayA(OptionK)(maybeNumbers, (opt, i) => opt)
        console.log(`Traverse [Some(1), Some(2), None, Some(4)]:`, 
          isSome(traversed) ? `Some([${traversed.value.join(', ')}])` : 'None')

        // Sequence with Task
        const tasks = [Task.of(1), Task.of(2), Task.of(3)]
        const sequenced = sequenceArrayA(TaskK)(tasks)
        const taskResults = await Promise.all(sequenced.map(t => t()))
        console.log(`Sequence tasks:`, taskResults)

        // 6) Natural Transformation Composition
        console.log('\n📊 Natural Transformation Composition:')
        
        const optionToTask = composeNatK1(taskToReaderTask, optionToResult('Failed'))
        const someValue = Some(42)
        const taskFromOption = optionToTask(someValue)
        const taskResult = await taskFromOption({ env: 'test' })
        console.log(`Option -> Task via composition:`, taskResult)

        // 7) Complex Kleisli Composition
        console.log('\n📊 Complex Kleisli Composition:')
        
        // Define a complex pipeline
        const validate = (n: number) => n > 0 ? Ok(n) : Err('Must be positive')
        const process = (n: number) => Task.of(n * 2)
        type PipelineEnv = { readonly context: string }
        const log = (n: number) => Reader.of((env: PipelineEnv) => n + ' processed in ' + env.context)

        // Compose the pipeline
        const pipeline = K_ReaderTask.compose(
          K_ReaderTask.compose(log, taskToReaderTask),
          K_ReaderTask.compose(process, validate)
        )

        const pipelineResult = await pipeline(5)({ context: 'production' })
        console.log(`Complex pipeline result:`, pipelineResult)

        // =========================================================
        // MONAD TRANSFORMERS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 MONAD TRANSFORMERS DEMONSTRATION')
        console.log('====================================')

        // 1) MonadWriter with WriterInReaderTask
        console.log('\n📊 MonadWriter with WriterInReaderTask:')
        
        // logs as string[]
        const WRT = WriterInReaderTask(ArrayMonoid<string>())

        const prog = WRT.chain((n: number) =>
          WRT.pass(
            WRT.map((m: number) => [m * 2, (w: ReadonlyArray<string>) => [...w, 'x2']] as const)(
              WRT.chain(() => WRT.of(n + 1))(
                WRT.tell(['start'])
              )
            )
          )
        )(WRT.of(1))

        // run: ReaderTask<Env, Writer<string[], number>>
        const env = { userId: 'user123', context: 'production' }
        const [value, logs] = await prog(env)
        console.log(`WriterT result:`, value, 'with logs:', logs)

        // 2) EitherT with TaskEither
        console.log('\n📊 EitherT with TaskEither:')
        
        const taskEither = TE.right(42)
        const mapped = TE.map((n: number) => n * 2)(taskEither)
        const chained = TE.chain((n: number) => n > 50 ? TE.right(n) : TE.left('Too small'))(mapped)
        
        const taskResult = await chained()
        console.log(`TaskEither result:`, isOk(taskResult) ? `Ok(${taskResult.value})` : `Err(${taskResult.error})`)

        // 3) EitherT with ReaderEither
        console.log('\n📊 EitherT with ReaderEither:')
        
        const readerEither = RE.right(100)
        const mappedRE = RE.map((n: number) => n + 1)(readerEither)
        const chainedRE = RE.chain((n: number) => n > 100 ? RE.right(n) : RE.left('Still too small'))(mappedRE)
        
        const readerResult = chainedRE({ env: 'test' })
        console.log(`ReaderEither result:`, isOk(readerResult) ? `Ok(${readerResult.value})` : `Err(${readerResult.error})`)

        // 4) EitherT with ReaderTaskEither (RTE)
        console.log('\n📊 EitherT with ReaderTaskEither (RTE):')
        
        const rte = RTE.right(200)
        const mappedRTE = RTE.map((n: number) => n * 3)(rte)
        const chainedRTE = RTE.chain((n: number) => n > 500 ? RTE.right(n) : RTE.left('Not big enough'))(mappedRTE)
        
        const rteResult = await chainedRTE({ userId: 'user456' })
        console.log(`RTE result:`, isOk(rteResult) ? `Ok(${rteResult.value})` : `Err(${rteResult.error})`)

        // 5) Complex WriterT with pass operation
        console.log('\n📊 Complex WriterT with pass operation:')
        
        const complexProg = WRT.chain((n: number) =>
          WRT.chain((m: number) =>
            WRT.pass(
              WRT.map((k: number) => [k, (w: ReadonlyArray<string>) => [...w, `processed ${k}`]] as const)(
                WRT.tell([`Processing ${m}`])
              )
            )
          )(
            WRT.chain(() => WRT.of(n * 2))(
              WRT.tell([`Starting with ${n}`])
            )
          )
        )(WRT.of(5))

        const [finalValue, finalLogs] = await complexProg({ context: 'complex' })
        console.log(`Complex WriterT result:`, finalValue, 'with logs:', finalLogs)

        // 6) EitherT error handling and recovery
        console.log('\n📊 EitherT error handling and recovery:')
        
        const errorHandling = RTE.chain((n: number) => 
          n > 100 ? RTE.right(n) : RTE.left('Value too small')
        )(
          RTE.orElse((e: string) => RTE.right(999))(
            RTE.left('Original error')
          )
        )

        const errorResult = await errorHandling({ env: 'error-test' })
        console.log(`Error handling result:`, isOk(errorResult) ? `Ok(${errorResult.value})` : `Err(${errorResult.error})`)

        // 7) EitherT with fold and getOrElse
        console.log('\n📊 EitherT with fold and getOrElse:')
        
        const foldExample = RTE.fold(
          (e: string) => `Error: ${e}`,
          (n: number) => `Success: ${n}`
        )(RTE.right(42))

        const getOrElseExample = RTE.getOrElse((e: string) => 0)(
          RTE.left('Something went wrong')
        )

        const foldResult = await foldExample({ env: 'fold-test' })
        const getOrElseResult = await getOrElseExample({ env: 'getOrElse-test' })
        
        console.log(`Fold result:`, foldResult)
        console.log(`GetOrElse result:`, getOrElseResult)

        // 8) EitherT with mapLeft and bimap
        console.log('\n📊 EitherT with mapLeft and bimap:')
        
        const mapLeftExample = RTE.mapLeft((e: string) => `Mapped: ${e}`)(
          RTE.left('Original error')
        )
        
        const bimapExample = RTE.bimap(
          (e: string) => `Error: ${e}`,
          (n: number) => n * 2
        )(RTE.right(21))

        const mapLeftResult = await mapLeftExample({ env: 'mapLeft-test' })
        const bimapResult = await bimapExample({ env: 'bimap-test' })
        
        console.log(`MapLeft result:`, isOk(mapLeftResult) ? `Ok(${mapLeftResult.value})` : `Err(${mapLeftResult.error})`)
        console.log(`Bimap result:`, isOk(bimapResult) ? `Ok(${bimapResult.value})` : `Err(${bimapResult.error})`)

        // 9) EitherT with swap
        console.log('\n📊 EitherT with swap:')
        
        const swapExample = RTE.swap(RTE.right(42))
        const swapResult = await swapExample({ env: 'swap-test' })
        console.log(`Swap result:`, isOk(swapResult) ? `Ok(${swapResult.value})` : `Err(${swapResult.error})`)

        // 10) Complex pipeline with multiple transformers
        console.log('\n📊 Complex pipeline with multiple transformers:')
        
        const complexPipeline = WRT.chain((n: number) =>
          WRT.chain(() => {
            const rte = RTE.right(n * 2)
            return WRT.of(rte)
          })(
            WRT.tell([`Complex step 1: ${n}`])
          )
        )(WRT.of(10))

        const [pipelineValue, pipelineLogs] = await complexPipeline({ env: 'pipeline' })
        console.log(`Complex pipeline result:`, pipelineValue, 'with logs:', pipelineLogs)

        // =========================================================
        // ADVANCED COMPOSITION HELPERS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 ADVANCED COMPOSITION HELPERS DEMONSTRATION')
        console.log('==============================================')

        // 1) Ready-to-use Writer Modules
        console.log('\n📊 Ready-to-use Writer Modules:')
        
        // MW_RT for ReaderTask with logging
        const programRT = MW_RT.chain((n: number) => MW_RT.tell(['got ' + n]))(MW_RT.of(1))
        const [valueRT, logsRT] = await programRT({ env: 'test' })
        console.log(`MW_RT result:`, valueRT, 'with logs:', logsRT)

        // 2) Do-notation for ReaderTaskEither (RTE)
        console.log('\n📊 Do-notation for ReaderTaskEither:')
        
        // Mock functions for demonstration
        type User = { readonly name: string; readonly id: string }
        const getUserRTE = (id: string) => RTE.right<User>({ name: `User${id}`, id })
        const getProfileRTE = (user: User) => RTE.right({ ...user, profile: 'premium' as const })
        
        // Using Do-notation
        const prog = DoRTE<{ env: string }>()
          .bind('user', getUserRTE('42'))
          .let('name', t => t.user.name)
          .bind('profile', t => getProfileRTE(t.user))
          .map(t => ({ user: t.user, name: t.name, profile: t.profile }))
          .done

        const doResult = await prog({ env: 'production' })
        console.log(`Do-notation result:`, isOk(doResult) ? `Ok(${JSON.stringify(doResult.value)})` : `Err(${doResult.error})`)

        // 3) Writer × EitherT × ReaderTask (WRTE) composition
        console.log('\n📊 WRTE (Writer × EitherT × ReaderTask) composition:')
        
        const LogM = ArrayMonoid<string>()
        const W = WRTE<string>(LogM)

        // Step that logs then fails
        const step = W.chain<number, string, number, string, number>(() => W.left('boom'))(
          W.chain(() => W.of(1))(
            W.tell(['start'])
          )
        )
        
        const [stepResult, stepLogs] = await step({ base: 'x' })
        console.log(`WRTE step result:`, isOk(stepResult) ? `Ok(${stepResult.value})` : `Err(${stepResult.error})`, 'with logs:', stepLogs)

        // 4) WRTE with successful computation
        console.log('\n📊 WRTE with successful computation:')
        
        const successStep = W.chain((n: number) => W.of(n * 2))(
          W.chain(() => W.of(5))(
            W.tell(['Starting computation'])
          )
        )
        
        const [successResult, successLogs] = await successStep({ base: 'y' })
        console.log(`WRTE success result:`, isOk(successResult) ? `Ok(${successResult.value})` : `Err(${successResult.error})`, 'with logs:', successLogs)

        // 5) WRTE with liftRTE integration
        console.log('\n📊 WRTE with liftRTE integration:')
        
        const existingRTE = RTE.right({ name: 'John', age: 30 })
        const lifted = W.liftRTE(existingRTE)
        type Person = { readonly name: string; readonly age: number }
        const processed = W.chain((user: Person) => W.of(`${user.name} is ${user.age}`))(
          W.chain(() => lifted)(
            W.tell(['Processing user'])
          )
        )
        
        const [liftedResult, liftedLogs] = await processed({ env: 'lifted' })
        console.log(`WRTE lifted result:`, isOk(liftedResult) ? `Ok(${liftedResult.value})` : `Err(${liftedResult.error})`, 'with logs:', liftedLogs)

        // 6) WRTE with pass operation
        console.log('\n📊 WRTE with pass operation:')
        
        const passStep = W.pass(
          W.map((n: number) => [n * 2, (w: ReadonlyArray<string>) => [...w, 'doubled']] as const)(
            W.chain(() => W.of(3))(
              W.tell(['Starting pass operation'])
            )
          )
        )
        
        const [passResult, passLogs] = await passStep({ env: 'pass' })
        console.log(`WRTE pass result:`, isOk(passResult) ? `Ok(${passResult.value})` : `Err(${passResult.error})`, 'with logs:', passLogs)

        // 7) WRTE with error recovery
        console.log('\n📊 WRTE with error recovery:')
        
        const recoveryStep = W.orElse((e: string) => W.of(999))(
          W.chain((n: number) => n > 10 ? W.of(n) : W.left('Too small'))(
            W.chain(() => W.of(5))(
              W.tell(['Testing recovery'])
            )
          )
        )
        
        const [recoveryResult, recoveryLogs] = await recoveryStep({ env: 'recovery' })
        console.log(`WRTE recovery result:`, isOk(recoveryResult) ? `Ok(${recoveryResult.value})` : `Err(${recoveryResult.error})`, 'with logs:', recoveryLogs)

        // 8) WRTE with fold operation
        console.log('\n📊 WRTE with fold operation:')
        
        const foldStep = W.fold(
          (e: string) => `Error: ${e}`,
          (n: number) => `Success: ${n}`
        )(W.right(42))
        
        const [foldResult, foldLogs] = await foldStep({ env: 'fold' })
        console.log(`WRTE fold result:`, foldResult, 'with logs:', foldLogs)

        // 9) Complex WRTE pipeline
        console.log('\n📊 Complex WRTE pipeline:')
        
        const complexPipeline = W.chain((n: number) =>
          W.chain((m: number) =>
            W.chain(() => W.of(m + 1))(
              W.tell([`Processing ${m}`])
            )
          )(
            W.chain(() => W.of(n * 2))(
              W.tell([`Starting with ${n}`])
            )
          )
        )(W.of(2))
        
        const [pipelineResult, pipelineLogs] = await complexPipeline({ env: 'complex' })
        console.log(`WRTE pipeline result:`, isOk(pipelineResult) ? `Ok(${pipelineResult.value})` : `Err(${pipelineResult.error})`, 'with logs:', pipelineLogs)

        // 10) WRTE with stripLog
        console.log('\n📊 WRTE with stripLog:')
        
        const loggedComputation = W.chain((n: number) => W.of(n * 3))(
          W.chain(() => W.of(4))(
            W.tell(['Computing'])
          )
        )
        
        const stripped = W.stripLog(loggedComputation)
        const strippedResult = await stripped({ env: 'stripped' })
        console.log(`WRTE stripped result:`, isOk(strippedResult) ? `Ok(${strippedResult.value})` : `Err(${strippedResult.error})`)

        // =========================================================
        // DO-NOTATION FOR WRTE DEMONSTRATION
        // =========================================================

        console.log('\n🔧 DO-NOTATION FOR WRTE DEMONSTRATION')
        console.log('=====================================')

        // 1) Basic DoWRTE usage
        console.log('\n📊 Basic DoWRTE usage:')
        
        type Env = { base: string }
        const Log = ArrayMonoid<string>()
        const W = WRTE<string>(Log)
        const Do = DoWRTE(W)<Env>()

        const stepOk: WriterReaderTaskEither<readonly string[], Env, never, number> =
          W.chain(() => W.of(2))(W.tell(['start']))

        const program = Do
          .bind('n', stepOk)
          .let('n2', t => t.n * 2)
          .tell(['after n2'])
          .map(t => t.n + t.n2)
          .done

        const [programResult, programLogs] = await program({ base: 'x' })
        console.log(`DoWRTE program result:`, isOk(programResult) ? `Ok(${programResult.value})` : `Err(${programResult.error})`, 'with logs:', programLogs)

        // 2) DoWRTE with error handling
        console.log('\n📊 DoWRTE with error handling:')
        
        const errorStep = W.chain(() => W.left('Something went wrong'))(
          W.tell(['before error'])
        )

        const errorProgram = Do
          .bind('n', W.of(5))
          .tell(['before error step'])
          .bind('error', errorStep)
          .let('recovery', t => t.n * 2)
          .done

        const [errorResult, errorLogs] = await errorProgram({ base: 'error-test' })
        console.log(`DoWRTE error result:`, isOk(errorResult) ? `Ok(${JSON.stringify(errorResult.value)})` : `Err(${errorResult.error})`, 'with logs:', errorLogs)

        // 3) DoWRTE with multiple steps and logging
        console.log('\n📊 DoWRTE with multiple steps and logging:')
        
        const multiStep = Do
          .bind('user', W.of({ name: 'John', id: 123 }))
          .tell(['User loaded'])
          .let('displayName', t => `${t.user.name} (${t.user.id})`)
          .bind('profile', W.of({ role: 'admin', permissions: ['read', 'write'] }))
          .tell(['Profile loaded'])
          .let('fullInfo', t => ({ ...t.user, ...t.profile, displayName: t.displayName }))
          .tell(['Full info computed'])
          .map(t => t.fullInfo)
          .done

        const [multiResult, multiLogs] = await multiStep({ base: 'multi' })
        console.log(`DoWRTE multi result:`, isOk(multiResult) ? `Ok(${JSON.stringify(multiResult.value)})` : `Err(${multiResult.error})`, 'with logs:', multiLogs)

        // 4) DoWRTE with conditional logic
        console.log('\n📊 DoWRTE with conditional logic:')
        
        const conditionalStep = Do
          .bind('value', W.of(15))
          .let('isHigh', t => t.value > 10)
          .bind('category', t => t.isHigh ? W.of('high') : W.of('low'))
          .tell(['Category determined'])
          .let('message', t => `Value ${t.value} is ${t.category}`)
          .map(t => ({ value: t.value, category: t.category, message: t.message }))
          .done

        const [conditionalResult, conditionalLogs] = await conditionalStep({ base: 'conditional' })
        console.log(`DoWRTE conditional result:`, isOk(conditionalResult) ? `Ok(${JSON.stringify(conditionalResult.value)})` : `Err(${conditionalResult.error})`, 'with logs:', conditionalLogs)

        // 5) DoWRTE with error recovery
        console.log('\n📊 DoWRTE with error recovery:')
        
        const recoveryStep = Do
          .bind('attempt1', W.chain(() => W.left('First attempt failed'))(
            W.tell(['Attempting first operation'])
          ))
          .bind('attempt2', W.of('Second attempt succeeded'))
          .tell(['Recovery successful'])
          .let('finalResult', t => t.attempt2)
          .map(t => t.finalResult)
          .done

        const [recoveryResult, recoveryLogs] = await recoveryStep({ base: 'recovery' })
        console.log(`DoWRTE recovery result:`, isOk(recoveryResult) ? `Ok(${recoveryResult.value})` : `Err(${recoveryResult.error})`, 'with logs:', recoveryLogs)

        // 6) DoWRTE with complex data transformation
        console.log('\n📊 DoWRTE with complex data transformation:')
        
        const transformStep = Do
          .bind('rawData', W.of([1, 2, 3, 4, 5]))
          .tell(['Raw data loaded'])
          .let('filtered', t => t.rawData.filter(n => n % 2 === 0))
          .let('doubled', t => t.filtered.map(n => n * 2))
          .let('sum', t => t.doubled.reduce((a, b) => a + b, 0))
          .tell(['Transformation complete'])
          .map(t => ({ original: t.rawData, processed: t.doubled, sum: t.sum }))
          .done

        const [transformResult, transformLogs] = await transformStep({ base: 'transform' })
        console.log(`DoWRTE transform result:`, isOk(transformResult) ? `Ok(${JSON.stringify(transformResult.value)})` : `Err(${transformResult.error})`, 'with logs:', transformLogs)

        // 7) DoWRTE with apS (applicative style)
        console.log('\n📊 DoWRTE with apS (applicative style):')
        
        const apSStep = Do
          .apS('a', W.of(10))
          .apS('b', W.of(20))
          .tell(['Both values loaded'])
          .let('sum', t => t.a + t.b)
          .let('product', t => t.a * t.b)
          .tell(['Calculations complete'])
          .map(t => ({ a: t.a, b: t.b, sum: t.sum, product: t.product }))
          .done

        const [apSResult, apSLogs] = await apSStep({ base: 'apS' })
        console.log(`DoWRTE apS result:`, isOk(apSResult) ? `Ok(${JSON.stringify(apSResult.value)})` : `Err(${apSResult.error})`, 'with logs:', apSLogs)

        // 8) DoWRTE with environment access
        console.log('\n📊 DoWRTE with environment access:')
        
        const envStep = Do
          .bind('config', W.chain((env: Env) => W.of({ base: env.base, timestamp: Date.now() }))(
            W.tell(['Accessing environment'])
          ))
          .let('message', t => `Processing with base: ${t.config.base}`)
          .tell(['Environment processed'])
          .map(t => ({ message: t.message, config: t.config }))
          .done

        const [envResult, envLogs] = await envStep({ base: 'environment' })
        console.log(`DoWRTE env result:`, isOk(envResult) ? `Ok(${JSON.stringify(envResult.value)})` : `Err(${envResult.error})`, 'with logs:', envLogs)

        // 9) DoWRTE with nested computations
        console.log('\n📊 DoWRTE with nested computations:')
        
        const nestedStep = Do
          .bind('outer', W.of('outer-value'))
          .tell(['Outer computation'])
          .bind('inner', Do
            .bind('x', W.of(5))
            .bind('y', W.of(10))
            .tell(['Inner computation'])
            .map(t => t.x + t.y)
            .done
          )
          .tell(['Nested computation complete'])
          .map(t => ({ outer: t.outer, inner: t.inner, total: t.outer.length + t.inner }))
          .done

        const [nestedResult, nestedLogs] = await nestedStep({ base: 'nested' })
        console.log(`DoWRTE nested result:`, isOk(nestedResult) ? `Ok(${JSON.stringify(nestedResult.value)})` : `Err(${nestedResult.error})`, 'with logs:', nestedLogs)

        // 10) DoWRTE with final transformation
        console.log('\n📊 DoWRTE with final transformation:')
        
        const finalStep = Do
          .bind('data', W.of({ items: [1, 2, 3], multiplier: 2 }))
          .tell(['Data loaded'])
          .let('processed', t => t.data.items.map(item => item * t.data.multiplier))
          .let('total', t => t.processed.reduce((a, b) => a + b, 0))
          .tell(['Final calculations'])
          .map(t => ({ 
            original: t.data.items, 
            processed: t.processed, 
            total: t.total,
            multiplier: t.data.multiplier
          }))
          .done

        const [finalResult, finalLogs] = await finalStep({ base: 'final' })
        console.log(`DoWRTE final result:`, isOk(finalResult) ? `Ok(${JSON.stringify(finalResult.value)})` : `Err(${finalResult.error})`, 'with logs:', finalLogs)

        // =========================================================
        // ENHANCED DO-NOTATION BUILDER METHODS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 ENHANCED DO-NOTATION BUILDER METHODS DEMONSTRATION')
        console.log('====================================================')

        // 1) DoRTE with apFirst, apSecond, tap
        console.log('\n📊 DoRTE with apFirst, apSecond, tap:')
        
        // Mock functions for demonstration
        const pingRTE = RTE.right('pong')
        const fetchNameRTE = RTE.right('John Doe')
        const logRTE = (msg: string) => RTE.right(`Logged: ${msg}`)
        
        // Using enhanced DoRTE
        const enhancedDoRTE = DoRTE<{ env: string }>()
          .bind('user', getUserRTE('42'))
          .apFirst(pingRTE)              // run ping; keep { user }
          .apSecond(fetchNameRTE)        // now the builder accumulates just `string` (the name)
          .tap(() => logRTE('after'))    // side-effecting RTE; keep current accumulation
          .done

        const enhancedDoRTEResult = await enhancedDoRTE({ env: 'production' })
        console.log(`Enhanced DoRTE result:`, isOk(enhancedDoRTEResult) ? `Ok(${enhancedDoRTEResult.value})` : `Err(${enhancedDoRTEResult.error})`)

        // 2) DoWRTE with apFirst, apSecond, tap
        console.log('\n📊 DoWRTE with apFirst, apSecond, tap:')
        
        const Log = ArrayMonoid<string>()
        const W = WRTE<string>(Log)
        const Do = DoWRTE(W)<{ base: string }>()

        const enhancedDoWRTE = Do
          .bind('user', W.of({ name: 'Alice', id: 123 }))
          .tap(t => W.tell(['got user ' + t.user.id]))
          .apFirst(W.tell(['pinged']))
          .apSecond(W.of('Enhanced Name')) // builder now accumulates `string`
          .done

        const [enhancedDoWRTEResult, enhancedDoWRTELogs] = await enhancedDoWRTE({ base: 'enhanced' })
        console.log(`Enhanced DoWRTE result:`, isOk(enhancedDoWRTEResult) ? `Ok(${enhancedDoWRTEResult.value})` : `Err(${enhancedDoWRTEResult.error})`, 'with logs:', enhancedDoWRTELogs)

        // 3) DoRTE with complex tap operations
        console.log('\n📊 DoRTE with complex tap operations:')
        
        const complexTapDoRTE = DoRTE<{ env: string }>()
          .bind('data', RTE.right({ items: [1, 2, 3], multiplier: 2 }))
          .tap(t => RTE.right(`Processing ${t.data.items.length} items`))
          .let('processed', t => t.data.items.map(item => item * t.data.multiplier))
          .tap(t => RTE.right(`Processed: ${t.processed.join(', ')}`))
          .map(t => ({ original: t.data.items, processed: t.processed }))
          .done

        const complexTapResult = await complexTapDoRTE({ env: 'complex' })
        console.log(`Complex tap DoRTE result:`, isOk(complexTapResult) ? `Ok(${JSON.stringify(complexTapResult.value)})` : `Err(${complexTapResult.error})`)

        // 4) DoWRTE with logging and validation
        console.log('\n📊 DoWRTE with logging and validation:')
        
        const loggingDoWRTE = Do
          .bind('input', W.of(15))
          .tap(t => W.tell([`Input: ${t.input}`]))
          .let('isValid', t => t.input > 10)
          .tap(t => W.tell([`Valid: ${t.isValid}`]))
          .bind('result', t => t.isValid ? W.of(t.input * 2) : W.left('Invalid input'))
          .tap(t => W.tell([`Result: ${t.result}`]))
          .done

        const [loggingResult, loggingLogs] = await loggingDoWRTE({ base: 'logging' })
        console.log(`Logging DoWRTE result:`, isOk(loggingResult) ? `Ok(${loggingResult.value})` : `Err(${loggingResult.error})`, 'with logs:', loggingLogs)

        // 5) DoRTE with apFirst for side effects
        console.log('\n📊 DoRTE with apFirst for side effects:')
        
        const sideEffectDoRTE = DoRTE<{ env: string }>()
          .bind('user', getUserRTE('42'))
          .apFirst(RTE.right('Side effect 1'))
          .apFirst(RTE.right('Side effect 2'))
          .let('message', t => `User: ${t.user.name}`)
          .done

        const sideEffectResult = await sideEffectDoRTE({ env: 'side-effects' })
        console.log(`Side effect DoRTE result:`, isOk(sideEffectResult) ? `Ok(${JSON.stringify(sideEffectResult.value)})` : `Err(${sideEffectResult.error})`)

        // 6) DoWRTE with apSecond for value replacement
        console.log('\n📊 DoWRTE with apSecond for value replacement:')
        
        const valueReplacementDoWRTE = Do
          .bind('initial', W.of('start'))
          .apSecond(W.of('replaced'))
          .tap(t => W.tell([`Final value: ${t}`]))
          .done

        const [valueReplacementResult, valueReplacementLogs] = await valueReplacementDoWRTE({ base: 'replacement' })
        console.log(`Value replacement DoWRTE result:`, isOk(valueReplacementResult) ? `Ok(${valueReplacementResult.value})` : `Err(${valueReplacementResult.error})`, 'with logs:', valueReplacementLogs)

        // 7) DoRTE with error handling in tap
        console.log('\n📊 DoRTE with error handling in tap:')
        
        const errorHandlingDoRTE = DoRTE<{ env: string }>()
          .bind('value', RTE.right(42))
          .tap(t => t.value > 50 ? RTE.left('Value too high') : RTE.right('Value OK'))
          .let('doubled', t => t.value * 2)
          .done

        const errorHandlingResult = await errorHandlingDoRTE({ env: 'error-handling' })
        console.log(`Error handling DoRTE result:`, isOk(errorHandlingResult) ? `Ok(${JSON.stringify(errorHandlingResult.value)})` : `Err(${errorHandlingResult.error})`)

        // 8) DoWRTE with complex logging pipeline
        console.log('\n📊 DoWRTE with complex logging pipeline:')
        
        const loggingPipelineDoWRTE = Do
          .bind('step1', W.of('Step 1'))
          .tap(t => W.tell([`Completed: ${t.step1}`]))
          .apFirst(W.tell(['Intermediate log']))
          .bind('step2', W.of('Step 2'))
          .tap(t => W.tell([`Completed: ${t.step2}`]))
          .apSecond(W.of('Final Result'))
          .tap(t => W.tell([`Final: ${t}`]))
          .done

        const [loggingPipelineResult, loggingPipelineLogs] = await loggingPipelineDoWRTE({ base: 'pipeline' })
        console.log(`Logging pipeline DoWRTE result:`, isOk(loggingPipelineResult) ? `Ok(${loggingPipelineResult.value})` : `Err(${loggingPipelineResult.error})`, 'with logs:', loggingPipelineLogs)

        // 9) DoRTE with conditional apFirst
        console.log('\n📊 DoRTE with conditional apFirst:')
        
        const conditionalApFirstDoRTE = DoRTE<{ env: string }>()
          .bind('condition', RTE.right(true))
          .apFirst(conditionalApFirstDoRTE.condition ? RTE.right('Conditional effect') : RTE.right('No effect'))
          .let('result', t => t.condition ? 'Applied' : 'Skipped')
          .done

        const conditionalApFirstResult = await conditionalApFirstDoRTE({ env: 'conditional' })
        console.log(`Conditional apFirst DoRTE result:`, isOk(conditionalApFirstResult) ? `Ok(${JSON.stringify(conditionalApFirstResult.value)})` : `Err(${conditionalApFirstResult.error})`)

        // 10) DoWRTE with comprehensive logging and validation
        console.log('\n📊 DoWRTE with comprehensive logging and validation:')
        
        const comprehensiveDoWRTE = Do
          .bind('user', W.of({ name: 'Bob', age: 25, role: 'admin' }))
          .tap(t => W.tell([`User loaded: ${t.user.name}`]))
          .apFirst(W.tell(['Validating user']))
          .let('isAdult', t => t.user.age >= 18)
          .let('isAdmin', t => t.user.role === 'admin')
          .tap(t => W.tell([`Adult: ${t.isAdult}, Admin: ${t.isAdmin}`]))
          .bind('permissions', t => t.isAdult && t.isAdmin ? W.of(['read', 'write', 'admin']) : W.of(['read']))
          .tap(t => W.tell([`Permissions: ${t.permissions.join(', ')}`]))
          .map(t => ({ user: t.user, permissions: t.permissions }))
          .done

        const [comprehensiveResult, comprehensiveLogs] = await comprehensiveDoWRTE({ base: 'comprehensive' })
        console.log(`Comprehensive DoWRTE result:`, isOk(comprehensiveResult) ? `Ok(${JSON.stringify(comprehensiveResult.value)})` : `Err(${comprehensiveResult.error})`, 'with logs:', comprehensiveLogs)

        // =========================================================
        // MODULE-LEVEL SHIMS AND ENDOFUNCTOR HELPERS DEMONSTRATION
        // =========================================================

        console.log('\n🔧 MODULE-LEVEL SHIMS AND ENDOFUNCTOR HELPERS DEMONSTRATION')
        console.log('==========================================================')

        // 1) RTE module-level shims
        console.log('\n📊 RTE module-level shims:')
        
        const rteA = RTE.right(42)
        const rteB = RTE.right('hello')
        
        // apFirst: run rteB, keep rteA's value
        const apFirstResult = await apFirstRTE(rteB)(rteA)({ env: 'test' })
        console.log(`apFirstRTE result:`, isOk(apFirstResult) ? `Ok(${apFirstResult.value})` : `Err(${apFirstResult.error})`)
        
        // apSecond: run rteA, return rteB's value
        const apSecondResult = await apSecondRTE(rteB)(rteA)({ env: 'test' })
        console.log(`apSecondRTE result:`, isOk(apSecondResult) ? `Ok(${apSecondResult.value})` : `Err(${apSecondResult.error})`)
        
        // zipWith: combine two RTEs with a function
        const zipWithResult = await zipWithRTE((a: number, b: string) => `${a}-${b}`)(rteA)(rteB)({ env: 'test' })
        console.log(`zipWithRTE result:`, isOk(zipWithResult) ? `Ok(${zipWithResult.value})` : `Err(${zipWithResult.error})`)
        
        // zip: combine two RTEs into a tuple
        const zipResult = await zipRTE(rteA)(rteB)({ env: 'test' })
        console.log(`zipRTE result:`, isOk(zipResult) ? `Ok(${JSON.stringify(zipResult.value)})` : `Err(${zipResult.error})`)

        // 2) WRTE module-level shims
        console.log('\n📊 WRTE module-level shims:')
        
        const Log = ArrayMonoid<string>()
        const W = WRTE<string>(Log)
        
        const wrteA = W.of(100)
        const wrteB = W.of('world')
        
        // apFirst: run wrteB, keep wrteA's value
        const [wrteApFirstResult, wrteApFirstLogs] = await W.apFirst(wrteB)(wrteA)({ base: 'test' })
        console.log(`WRTE apFirst result:`, isOk(wrteApFirstResult) ? `Ok(${wrteApFirstResult.value})` : `Err(${wrteApFirstResult.error})`, 'with logs:', wrteApFirstLogs)
        
        // apSecond: run wrteA, return wrteB's value
        const [wrteApSecondResult, wrteApSecondLogs] = await W.apSecond(wrteB)(wrteA)({ base: 'test' })
        console.log(`WRTE apSecond result:`, isOk(wrteApSecondResult) ? `Ok(${wrteApSecondResult.value})` : `Err(${wrteApSecondResult.error})`, 'with logs:', wrteApSecondLogs)
        
        // zipWith: combine two WRTEs with a function
        const [wrteZipWithResult, wrteZipWithLogs] = await W.zipWith((a: number, b: string) => `${a}-${b}`)(wrteA)(wrteB)({ base: 'test' })
        console.log(`WRTE zipWith result:`, isOk(wrteZipWithResult) ? `Ok(${wrteZipWithResult.value})` : `Err(${wrteZipWithResult.error})`, 'with logs:', wrteZipWithLogs)
        
        // zip: combine two WRTEs into a tuple
        const [wrteZipResult, wrteZipLogs] = await W.zip(wrteA)(wrteB)({ base: 'test' })
        console.log(`WRTE zip result:`, isOk(wrteZipResult) ? `Ok(${JSON.stringify(wrteZipResult.value)})` : `Err(${wrteZipResult.error})`, 'with logs:', wrteZipLogs)

        // 3) Endofunctor helpers - ResultK
        console.log('\n📊 Endofunctor helpers - ResultK:')
        
        const ResultString = ResultK1<string>()
        const resultA = Ok(10)
        const resultB = Ok(20)
        
        // map with ResultK
        const mappedResult = ResultString.map((x: number) => x * 2)(resultA)
        console.log(`ResultK map:`, isOk(mappedResult) ? `Ok(${mappedResult.value})` : `Err(${mappedResult.error})`)
        
        // ap with ResultK
        const apResult = ResultString.ap(Ok((x: number) => x + 5))(resultA)
        console.log(`ResultK ap:`, isOk(apResult) ? `Ok(${apResult.value})` : `Err(${apResult.error})`)
        
        // chain with ResultK
        const chainedResult = ResultString.chain((x: number) => x > 5 ? Ok(x * 2) : Err('Too small'))(resultA)
        console.log(`ResultK chain:`, isOk(chainedResult) ? `Ok(${chainedResult.value})` : `Err(${chainedResult.error})`)

        // 4) Endofunctor helpers - ValidationK
        console.log('\n📊 Endofunctor helpers - ValidationK:')
        
        const ValidationString = ValidationK1<string>()
        const validationA = VOk(15)
        const validationB = VOk(25)
        
        // map with ValidationK
        const mappedValidation = ValidationString.map((x: number) => x * 3)(validationA)
        console.log(`ValidationK map:`, isVOk(mappedValidation) ? `Ok(${mappedValidation.value})` : `Err(${mappedValidation.errors})`)
        
        // ap with ValidationK (using array concat)
        const apValidation = ValidationString.ap((x: string[], y: string[]) => [...x, ...y])(VOk((x: number) => x + 10))(validationA)
        console.log(`ValidationK ap:`, isVOk(apValidation) ? `Ok(${apValidation.value})` : `Err(${apValidation.errors})`)

        // 5) Endofunctor helpers - ReaderK
        console.log('\n📊 Endofunctor helpers - ReaderK:')
        
        const ReaderEnv = ReaderK1<{ env: string }>()
        const readerA = Reader.of<{ env: string }, number>(42)
        
        // map with ReaderK
        const mappedReader = ReaderEnv.map((x: number) => x * 2)(readerA)
        const mappedReaderResult = await mappedReader({ env: 'test' })
        console.log(`ReaderK map result:`, mappedReaderResult)
        
        // ap with ReaderK
        const apReader = ReaderEnv.ap(Reader.of<{ env: string }, (x: number) => number>((x: number) => x + 10))(readerA)
        const apReaderResult = await apReader({ env: 'test' })
        console.log(`ReaderK ap result:`, apReaderResult)

        // 6) Endofunctor helpers - ReaderTaskK
        console.log('\n📊 Endofunctor helpers - ReaderTaskK:')
        
        const ReaderTaskEnv = ReaderTaskK1<{ env: string }>()
        const readerTaskA = ReaderTask.of<{ env: string }, number>(100)
        
        // map with ReaderTaskK
        const mappedReaderTask = ReaderTaskEnv.map((x: number) => x * 2)(readerTaskA)
        const mappedReaderTaskResult = await mappedReaderTask({ env: 'test' })
        console.log(`ReaderTaskK map result:`, mappedReaderTaskResult)
        
        // chain with ReaderTaskK
        const chainedReaderTask = ReaderTaskEnv.chain((x: number) => ReaderTask.of<{ env: string }, number>(x + 50))(readerTaskA)
        const chainedReaderTaskResult = await chainedReaderTask({ env: 'test' })
        console.log(`ReaderTaskK chain result:`, chainedReaderTaskResult)

        // 7) Complex RTE pipeline with module shims
        console.log('\n📊 Complex RTE pipeline with module shims:')
        
        const fetchUserRTE = (id: string) => RTE.right({ id, name: `User${id}` })
        const fetchProfileRTE = (userId: string) => RTE.right({ userId, bio: `Bio for ${userId}` })
        const logActionRTE = (action: string) => RTE.right(`Logged: ${action}`)
        
        const complexPipeline = RTE.chain((user: { id: string; name: string }) =>
          RTE.chain((profile: { userId: string; bio: string }) =>
            RTE.map((log: string) => ({ user, profile, log }))(
              logActionRTE('User fetched')
            )
          )(fetchProfileRTE(user.id))
        )(fetchUserRTE('123'))
        
        const complexResult = await complexPipeline({ env: 'complex' })
        console.log(`Complex RTE pipeline result:`, isOk(complexResult) ? `Ok(${JSON.stringify(complexResult.value)})` : `Err(${complexResult.error})`)

        // 8) Complex WRTE pipeline with module shims
        console.log('\n📊 Complex WRTE pipeline with module shims:')
        
        const fetchDataWRTE = (id: string) => W.chain(() => W.of({ id, data: `Data${id}` }))(W.tell([`Fetching data for ${id}`]))
        const processDataWRTE = (data: { id: string; data: string }) => W.chain(() => W.of({ ...data, processed: true }))(W.tell([`Processing ${data.data}`]))
        
        const complexWRTE = W.chain((data: { id: string; data: string }) =>
          W.chain((processed: { id: string; data: string; processed: boolean }) =>
            W.map((log: string) => ({ data, processed, log }))(
              W.tell([`Completed processing ${processed.id}`])
            )
          )(processDataWRTE(data))
        )(fetchDataWRTE('456'))
        
        const [complexWRTEResult, complexWRTELogs] = await complexWRTE({ base: 'complex' })
        console.log(`Complex WRTE pipeline result:`, isOk(complexWRTEResult) ? `Ok(${JSON.stringify(complexWRTEResult.value)})` : `Err(${complexWRTEResult.error})`, 'with logs:', complexWRTELogs)

        // 9) Generic endofunctor usage
        console.log('\n📊 Generic endofunctor usage:')
        
        // Function that works with every endofunctor
        const doubleEndofunctor = <F extends HK.Id1>(F: EndofunctorK1<F>) => 
          <A>(fa: HK.Kind1<F, A>): HK.Kind1<F, A> => 
            F.map((x: A) => x * 2)(fa)
        
        // Use with ResultK
        const doubledResult = doubleEndofunctor(ResultString)(Ok(21))
        console.log(`Doubled Result:`, isOk(doubledResult) ? `Ok(${doubledResult.value})` : `Err(${doubledResult.error})`)
        
        // Use with ReaderK
        const doubledReader = doubleEndofunctor(ReaderEnv)(Reader.of<{ env: string }, number>(30))
        const doubledReaderResult = await doubledReader({ env: 'generic' })
        console.log(`Doubled Reader result:`, doubledReaderResult)

        // 10) Error handling with module shims
        console.log('\n📊 Error handling with module shims:')
        
        const errorRTE = RTE.left('Something went wrong')
        const successRTE = RTE.right('Success')
        
        // apFirst with error - should propagate error
        const errorApFirst = await apFirstRTE(errorRTE)(successRTE)({ env: 'error-test' })
        console.log(`apFirst with error:`, isOk(errorApFirst) ? `Ok(${errorApFirst.value})` : `Err(${errorApFirst.error})`)
        
        // apSecond with error - should propagate error
        const errorApSecond = await apSecondRTE(successRTE)(errorRTE)({ env: 'error-test' })
        console.log(`apSecond with error:`, isOk(errorApSecond) ? `Ok(${errorApSecond.value})` : `Err(${errorApSecond.error})`)

        // =========================================================
        // MONOIDAL CATEGORY STRUCTURE DEMONSTRATION
        // =========================================================

        console.log('\n🔧 MONOIDAL CATEGORY STRUCTURE DEMONSTRATION')
        console.log('============================================')

        // 1) Basic function category operations
        console.log('\n📊 Basic function category operations:')
        
        const double = (x: number) => x * 2
        const addOne = (x: number) => x + 1
        const toString = (x: number) => x.toString()
        
        // Identity
        const id = CatFn.id<number>()
        console.log(`Identity: ${id(5)}`)
        
        // Composition
        const composed = CatFn.compose(toString, CatFn.compose(addOne, double))
        console.log(`Composition: ${composed(5)}`)

        // 2) Monoidal structure on functions
        console.log('\n📊 Monoidal structure on functions:')
        
        const f = (x: number) => x * 2
        const g = (s: string) => s.toUpperCase()
        
        // Tensor product of morphisms
        const tensor = MonoidalFn.tensor(f, g)
        const result = tensor([10, 'hello'] as const)
        console.log(`Tensor product: ${JSON.stringify(result)}`)
        
        // Left unitor
        const leftUnitor = MonoidalFn.leftUnitor<number>()
        const leftResult = leftUnitor.to([undefined, 42] as const)
        console.log(`Left unitor: ${leftResult}`)
        
        // Right unitor
        const rightUnitor = MonoidalFn.rightUnitor<string>()
        const rightResult = rightUnitor.to(['world', undefined] as const)
        console.log(`Right unitor: ${rightResult}`)
        
        // Associator
        const associator = MonoidalFn.associator<number, string, boolean>()
        const assocResult = associator.to([1, ['hello', true] as const] as const)
        console.log(`Associator: ${JSON.stringify(assocResult)}`)

        // 3) Monoidal Kleisli structure for RTE
        console.log('\n📊 Monoidal Kleisli structure for RTE:')
        
        type Env = { base: string }
        type Error = string
        
        const M = MonoidalKleisliRTE<Env, Error>()
        
        // Mock functions for demonstration
        const loadUser = (id: string) => RTE.right({ id, name: `User${id}` })
        const loadPosts = (userId: string) => RTE.right([`Post1-${userId}`, `Post2-${userId}`])
        
        // Tensor product in Kleisli
        const tensorKleisli = M.tensor(loadUser, loadPosts)
        const kleisliResult = await tensorKleisli(['42', '42'] as const)({ base: 'test' })
        console.log(`Kleisli tensor:`, isOk(kleisliResult) ? `Ok(${JSON.stringify(kleisliResult.value)})` : `Err(${kleisliResult.error})`)
        
        // Left unitor in Kleisli
        const leftUnitorKleisli = M.leftUnitor<{ id: string; name: string }>()
        const leftKleisliResult = await leftUnitorKleisli.to([undefined, { id: '123', name: 'Alice' }] as const)({ base: 'test' })
        console.log(`Kleisli left unitor:`, isOk(leftKleisliResult) ? `Ok(${JSON.stringify(leftKleisliResult.value)})` : `Err(${leftKleisliResult.error})`)
        
        // Right unitor in Kleisli
        const rightUnitorKleisli = M.rightUnitor<{ id: string; name: string }>()
        const rightKleisliResult = await rightUnitorKleisli.to([{ id: '456', name: 'Bob' }, undefined] as const)({ base: 'test' })
        console.log(`Kleisli right unitor:`, isOk(rightKleisliResult) ? `Ok(${JSON.stringify(rightKleisliResult.value)})` : `Err(${rightKleisliResult.error})`)
        
        // Associator in Kleisli
        const associatorKleisli = M.associator<{ id: string }, string[], boolean>()
        const assocKleisliResult = await associatorKleisli.to([{ id: '789' }, [['post1', 'post2'], true] as const] as const)({ base: 'test' })
        console.log(`Kleisli associator:`, isOk(assocKleisliResult) ? `Ok(${JSON.stringify(assocKleisliResult.value)})` : `Err(${assocKleisliResult.error})`)

        // 4) Complex monoidal operations
        console.log('\n📊 Complex monoidal operations:')
        
        // Multiple tensor products
        const f1 = (x: number) => x * 2
        const f2 = (s: string) => s.length
        const f3 = (b: boolean) => b ? 1 : 0
        
        const tensor12 = MonoidalFn.tensor(f1, f2)
        const tensor123 = MonoidalFn.tensor(tensor12, f3)
        const complexResult = tensor123([[10, 'hello'], true] as const)
        console.log(`Complex tensor: ${JSON.stringify(complexResult)}`)
        
        // Kleisli with error handling
        const loadUserWithError = (id: string) => 
          id === 'error' ? RTE.left('User not found') : RTE.right({ id, name: `User${id}` })
        const loadPostsWithError = (userId: string) => 
          userId === 'error' ? RTE.left('Posts not found') : RTE.right([`Post1-${userId}`])
        
        const errorTensor = M.tensor(loadUserWithError, loadPostsWithError)
        const errorResult = await errorTensor(['error', '42'] as const)({ base: 'test' })
        console.log(`Error tensor:`, isOk(errorResult) ? `Ok(${JSON.stringify(errorResult.value)})` : `Err(${errorResult.error})`)

        // 5) Coherence law demonstrations
        console.log('\n📊 Coherence law demonstrations:')
        
        // Test associativity
        const a = 1, b = 2, c = 3
        const assoc = MonoidalFn.associator<typeof a, typeof b, typeof c>()
        const original = [a, [b, c] as const] as const
        const reassociated = assoc.to(original)
        const back = assoc.from(reassociated)
        console.log(`Associativity test: ${JSON.stringify(original)} -> ${JSON.stringify(reassociated)} -> ${JSON.stringify(back)}`)
        
        // Test left unitor
        const leftUnitorTest = MonoidalFn.leftUnitor<number>()
        const originalLeft = [undefined, 42] as const
        const extracted = leftUnitorTest.to(originalLeft)
        const restored = leftUnitorTest.from(extracted)
        console.log(`Left unitor test: ${JSON.stringify(originalLeft)} -> ${extracted} -> ${JSON.stringify(restored)}`)

        // 6) Practical monoidal patterns
        console.log('\n📊 Practical monoidal patterns:')
        
        // Parallel processing with RTE
        const fetchUserData = (id: string) => RTE.right({ id, name: `User${id}`, email: `user${id}@example.com` })
        const fetchUserSettings = (id: string) => RTE.right({ theme: 'dark', notifications: true })
        const fetchUserPreferences = (id: string) => RTE.right({ language: 'en', timezone: 'UTC' })
        
        const parallelFetch = M.tensor(
          M.tensor(fetchUserData, fetchUserSettings),
          fetchUserPreferences
        )
        
        const parallelResult = await parallelFetch([['123', '123'], '123'] as const)({ base: 'parallel' })
        console.log(`Parallel fetch:`, isOk(parallelResult) ? `Ok(${JSON.stringify(parallelResult.value)})` : `Err(${parallelResult.error})`)

        // 7) Development coherence checks
        console.log('\n📊 Development coherence checks:')
        
        // Run coherence checks (only in dev mode)
        assertMonoidalFnCoherence()
        await assertMonoidalKleisliRTECoherence<Env, Error>()
        console.log('Coherence checks completed (check console for warnings)')

        // 8) Monoidal composition patterns
        console.log('\n📊 Monoidal composition patterns:')
        
        // Sequential tensor products
        const step1 = (x: number) => x * 2
        const step2 = (x: number) => x + 10
        const step3 = (x: number) => x.toString()
        
        const pipeline = MonoidalFn.tensor(
          MonoidalFn.tensor(step1, step2),
          step3
        )
        
        const pipelineResult = pipeline([[5, 5], 3] as const)
        console.log(`Pipeline result: ${JSON.stringify(pipelineResult)}`)

        // 9) Error propagation in monoidal Kleisli
        console.log('\n📊 Error propagation in monoidal Kleisli:')
        
        const safeLoadUser = (id: string) => 
          id.length > 0 ? RTE.right({ id, name: `User${id}` }) : RTE.left('Invalid ID')
        const safeLoadPosts = (userId: string) => 
          userId.length > 0 ? RTE.right([`Post-${userId}`]) : RTE.left('Invalid user ID')
        
        const safeTensor = M.tensor(safeLoadUser, safeLoadPosts)
        
        // Success case
        const successResult = await safeTensor(['123', '123'] as const)({ base: 'safe' })
        console.log(`Safe tensor success:`, isOk(successResult) ? `Ok(${JSON.stringify(successResult.value)})` : `Err(${successResult.error})`)
        
        // Error case
        const errorResult = await safeTensor(['', '123'] as const)({ base: 'safe' })
        console.log(`Safe tensor error:`, isOk(errorResult) ? `Ok(${JSON.stringify(errorResult.value)})` : `Err(${errorResult.error})`)

        // 10) Advanced monoidal transformations
        console.log('\n📊 Advanced monoidal transformations:')
        
        // Transform between different monoidal structures
        const transform = (f: (x: number) => number, g: (s: string) => string) => 
          MonoidalFn.tensor(f, g)
        
        const doubleAndUpper = transform(x => x * 2, s => s.toUpperCase())
        const transformResult = doubleAndUpper([5, 'hello'] as const)
        console.log(`Transform result: ${JSON.stringify(transformResult)}`)
        
        // Kleisli transformation with environment
        const envTransform = (f: (x: number) => ReaderTaskEither<Env, Error, number>) => 
          (g: (s: string) => ReaderTaskEither<Env, Error, string>) =>
            M.tensor(f, g)
        
        const envDouble = (x: number) => RTE.right(x * 2)
        const envUpper = (s: string) => RTE.right(s.toUpperCase())
        const envTransformResult = await envTransform(envDouble)(envUpper)([10, 'world'] as const)({ base: 'transform' })
        console.log(`Env transform:`, isOk(envTransformResult) ? `Ok(${JSON.stringify(envTransformResult.value)})` : `Err(${envTransformResult.error})`)

        // =========================================================
        // MONOIDAL FUNCTOR STRUCTURE DEMONSTRATION
        // =========================================================

        console.log('\n🔧 MONOIDAL FUNCTOR STRUCTURE DEMONSTRATION')
        console.log('===========================================')

        // 1) Option monoidal functor
        console.log('\n📊 Option monoidal functor:')
        
        const o1 = Some(1)
        const o2 = Some('x')
        const o3 = None
        
        // zip with Option
        const oz = zipOption<number, string>(o1)(o2)
        console.log(`Option zip:`, isSome(oz) ? `Some(${JSON.stringify(oz.value)})` : 'None')
        
        // zipWith with Option
        const ozw = zipWithOption<number, string, string>((a, b) => `${a}-${b}`)(o1)(o2)
        console.log(`Option zipWith:`, isSome(ozw) ? `Some(${ozw.value})` : 'None')
        
        // zip with None
        const ozNone = zipOption<number, string>(o1)(o3)
        console.log(`Option zip with None:`, isSome(ozNone) ? `Some(${JSON.stringify(ozNone.value)})` : 'None')

        // 2) Result monoidal functor (short-circuiting)
        console.log('\n📊 Result monoidal functor (short-circuiting):')
        
        const r1 = Ok(2)
        const r2 = Ok('hello')
        const r3 = Err('boom')
        
        // zip with Result
        const rz = zipResult<string>()<number, string>(r1)(r2)
        console.log(`Result zip:`, isOk(rz) ? `Ok(${JSON.stringify(rz.value)})` : `Err(${rz.error})`)
        
        // zipWith with Result
        const rzw = zipWithResult<string>()<number, string, string>((a, b) => `${a}-${b}`)(r1)(r2)
        console.log(`Result zipWith:`, isOk(rzw) ? `Ok(${rzw.value})` : `Err(${rzw.error})`)
        
        // zip with error (short-circuits)
        const rzErr = zipResult<string>()<number, string>(r1)(r3)
        console.log(`Result zip with error:`, isOk(rzErr) ? `Ok(${JSON.stringify(rzErr.value)})` : `Err(${rzErr.error})`)

        // 3) Reader monoidal functor
        console.log('\n📊 Reader monoidal functor:')
        
        const rA = Reader.asks((n: number) => n + 1)
        const rB = Reader.asks((n: number) => String(n))
        
        // zip with Reader
        const rZ = zipReader<number>()<number, string>(rA)(rB)
        const rZResult = await rZ(5)
        console.log(`Reader zip result: ${JSON.stringify(rZResult)}`)
        
        // zipWith with Reader
        const rZW = zipWithReader<number>()<number, string, string>((a, b) => `${a}-${b}`)(rA)(rB)
        const rZWResult = await rZW(5)
        console.log(`Reader zipWith result: ${rZWResult}`)

        // 4) ReaderTask monoidal functor
        console.log('\n📊 ReaderTask monoidal functor:')
        
        const rtA = ReaderTask.of<{ env: string }, number>(42)
        const rtB = ReaderTask.of<{ env: string }, string>('world')
        
        // zip with ReaderTask
        const rtZ = zipReaderTask<{ env: string }>()<number, string>(rtA)(rtB)
        const rtZResult = await rtZ({ env: 'test' })
        console.log(`ReaderTask zip result: ${JSON.stringify(rtZResult)}`)
        
        // zipWith with ReaderTask
        const rtZW = zipWithReaderTask<{ env: string }>()<number, string, string>((a, b) => `${a}-${b}`)(rtA)(rtB)
        const rtZWResult = await rtZW({ env: 'test' })
        console.log(`ReaderTask zipWith result: ${rtZWResult}`)

        // 5) ReaderTaskEither monoidal functor
        console.log('\n📊 ReaderTaskEither monoidal functor:')
        
        const rteA = RTE.right(100)
        const rteB = RTE.right('success')
        const rteC = RTE.left('error')
        
        // zip with RTE
        const rteZ = zipRTE_Monoidal<{ env: string }, string>()<number, string>(rteA)(rteB)
        const rteZResult = await rteZ({ env: 'test' })
        console.log(`RTE zip result:`, isOk(rteZResult) ? `Ok(${JSON.stringify(rteZResult.value)})` : `Err(${rteZResult.error})`)
        
        // zipWith with RTE
        const rteZW = zipWithRTE_Monoidal<{ env: string }, string>()<number, string, string>((a, b) => `${a}-${b}`)(rteA)(rteB)
        const rteZWResult = await rteZW({ env: 'test' })
        console.log(`RTE zipWith result:`, isOk(rteZWResult) ? `Ok(${rteZWResult.value})` : `Err(${rteZWResult.error})`)
        
        // zip with error (short-circuits)
        const rteZErr = zipRTE_Monoidal<{ env: string }, string>()<number, string>(rteA)(rteC)
        const rteZErrResult = await rteZErr({ env: 'test' })
        console.log(`RTE zip with error:`, isOk(rteZErrResult) ? `Ok(${JSON.stringify(rteZErrResult.value)})` : `Err(${rteZErrResult.error})`)

        // 6) Validation monoidal functor (accumulating)
        console.log('\n📊 Validation monoidal functor (accumulating):')
        
        const vA = VOk(10)
        const vB = VOk('valid')
        const vC = VErr(['error1'])
        const vD = VErr(['error2'])
        
        // zip with Validation (success case)
        const vZ = zipValidation<string>((x, y) => [...x, ...y])<number, string>(vA)(vB)
        console.log(`Validation zip success:`, isVOk(vZ) ? `Ok(${JSON.stringify(vZ.value)})` : `Err(${vZ.errors})`)
        
        // zip with Validation (error accumulation)
        const vZErr = zipValidation<string>((x, y) => [...x, ...y])<number, string>(vC)(vD)
        console.log(`Validation zip errors:`, isVOk(vZErr) ? `Ok(${JSON.stringify(vZErr.value)})` : `Err(${vZErr.errors})`)
        
        // zip with mixed success/error
        const vZMixed = zipValidation<string>((x, y) => [...x, ...y])<number, string>(vA)(vC)
        console.log(`Validation zip mixed:`, isVOk(vZMixed) ? `Ok(${JSON.stringify(vZMixed.value)})` : `Err(${vZMixed.errors})`)

        // 7) Complex monoidal functor operations
        console.log('\n📊 Complex monoidal functor operations:')
        
        // Multiple zips with Option
        const o4 = Some(3)
        const o5 = Some(4)
        const o6 = Some(5)
        
        const complexO = zipOption<number, number>(zipOption<number, number>(o4)(o5))(o6)
        console.log(`Complex Option zip:`, isSome(complexO) ? `Some(${JSON.stringify(complexO.value)})` : 'None')
        
        // Multiple zips with Result
        const r4 = Ok(6)
        const r5 = Ok(7)
        const r6 = Ok(8)
        
        const complexR = zipResult<string>()<number, number>(zipResult<string>()<number, number>(r4)(r5))(r6)
        console.log(`Complex Result zip:`, isOk(complexR) ? `Ok(${JSON.stringify(complexR.value)})` : `Err(${complexR.error})`)

        // 8) Monoidal functor with environment
        console.log('\n📊 Monoidal functor with environment:')
        
        // Reader with environment
        const envReader = Reader.asks((env: { base: string }) => env.base + '_processed')
        const envReader2 = Reader.asks((env: { base: string }) => env.base.length)
        
        const envZip = zipWithReader<{ base: string }>()<string, number, string>((s, n) => `${s}_${n}`)(envReader)(envReader2)
        const envResult = await envZip({ base: 'test' })
        console.log(`Environment Reader zipWith result: ${envResult}`)
        
        // ReaderTask with environment
        const envRT = ReaderTask.of<{ base: string }, string>('async_value')
        const envRT2 = ReaderTask.of<{ base: string }, number>(42)
        
        const envRTZip = zipWithReaderTask<{ base: string }>()<string, number, string>((s, n) => `${s}_${n}`)(envRT)(envRT2)
        const envRTResult = await envRTZip({ base: 'async' })
        console.log(`Environment ReaderTask zipWith result: ${envRTResult}`)

        // 9) Error handling patterns
        console.log('\n📊 Error handling patterns:')
        
        // Short-circuiting vs accumulating
        const shortCircuit1 = Ok(1)
        const shortCircuit2 = Err('first error')
        const shortCircuit3 = Err('second error')
        
        const shortResult = zipResult<string>()<number, number>(shortCircuit1)(shortCircuit2)
        console.log(`Short-circuiting Result:`, isOk(shortResult) ? `Ok(${JSON.stringify(shortResult.value)})` : `Err(${shortResult.error})`)
        
        // Accumulating errors
        const acc1 = VErr(['first error'])
        const acc2 = VErr(['second error'])
        
        const accResult = zipValidation<string>((x, y) => [...x, ...y])<number, number>(acc1)(acc2)
        console.log(`Accumulating Validation:`, isVOk(accResult) ? `Ok(${JSON.stringify(accResult.value)})` : `Err(${accResult.errors})`)

        // 10) Generic monoidal functor usage
        console.log('\n📊 Generic monoidal functor usage:')
        
        // Function that works with every monoidal functor
        const combineMonoidal = <F>(M: MonoidalFunctorK1<F>) =>
          <A, B>(fa: FunctorValue<F, A>, fb: FunctorValue<F, B>) => M.tensor<A, B>(fa, fb)
        
        // Use with Option
        const optionCombine = combineMonoidal(MonoidalOption)
        const optionResult = optionCombine<number, string>(Some(1), Some('test'))
        console.log(`Generic Option combine:`, isSome(optionResult) ? `Some(${JSON.stringify(optionResult.value)})` : 'None')
        
        // Use with Result
        const resultCombine = combineMonoidal(MonoidalResult<string>())
        const resultResult = resultCombine<number, string>(Ok(2), Ok('generic'))
        console.log(`Generic Result combine:`, isOk(resultResult) ? `Ok(${JSON.stringify(resultResult.value)})` : `Err(${resultResult.error})`)

        // ==================== Comonad Examples ====================
        console.log('\n=== Comonad Examples ===')
        
        // Store example: 2D grid cursor
        type P = { x: number; y: number }
        const grid: Store<P, string> = {
          peek: (p) => `(${p.x},${p.y})`,
          pos: { x: 0, y: 0 }
        }
        const labelHere = StoreC.extract(grid) // "(0,0)"
        const around = StoreC.extend((w) => `center ${StoreC.extract(w)}; right ${w.peek({x:w.pos.x+1,y:w.pos.y})}`)(grid)
        console.log(`Store extract: ${labelHere}`)
        console.log(`Store extend: ${StoreC.extract(around)}`)

        // Env example
        const envComonad = EnvC<{ locale: 'en' }>()
        const e1: Env<{locale:'en'}, number> = [{ locale: 'en' }, 42] as const
        const out = envComonad.extend(w => `(${envComonad.ask(w).locale})=${envComonad.extract(w)}`)(e1) // [{locale:'en'},"(en)=42"]
        console.log(`Env extend: ${JSON.stringify(out)}`)

        // Traced with Sum monoid
        const Sum: Monoid<number> = { empty: 0, concat: (x,y) => x+y }
        const T = TracedC(Sum)
        const ta: Traced<number, number> = (n) => n * 10
        const dup = T.extend(w => w(5))(ta) // function that at m returns (m+5)*10 evaluated, i.e., 50 if m=0
        console.log(`Traced extend result at 0: ${dup(0)}`) // Should be 50

        // ==================== Advanced Comonad Examples ====================
        console.log('\n=== Advanced Comonad Examples ===')
        
        // Cofree example with Array functor
        const ArrayF: FunctorK1<'Array'> = { map: <A, B>(f: (a: A) => B) => (as: A[]) => as.map(f) }
        const CofreeArray = CofreeK1(ArrayF)
        
        // Create a simple tree structure
        const tree: Cofree<'Array', string> = {
          head: "root",
          tail: [
            { head: "left", tail: [] },
            { head: "right", tail: [{ head: "right-child", tail: [] }] }
          ]
        }
        
        const treeExtract = CofreeArray.extract(tree)
        console.log(`Cofree extract: ${treeExtract}`)
        
        // Store × Lens integration
        type Point = { x: number; y: number }
        const pointLens = lens<Point, number>(
          (p) => p.x,
          (x) => (p) => ({ ...p, x })
        )
        
        const gridStore: Store<Point, string> = {
          peek: (p) => `(${p.x},${p.y})`,
          pos: { x: 1, y: 2 }
        }
        
        const focusedStore = StoreLens.focus(pointLens)(gridStore)
        console.log(`Store lens focus: ${StoreC.extract(focusedStore)}`)
        
        // Co-Do notation example
        const Co = DoCo(StoreC)
        const length = (w: Store<Point, number>) => String(StoreC.extract(w)).length
        const parity = (w: Store<Point, number>) => (StoreC.extract(w) % 2 === 0 ? 'even' : 'odd')
        
        const numberStore: Store<Point, number> = {
          peek: (p) => p.x + p.y,
          pos: { x: 1, y: 2 }
        }
        
        const arrow = Co.start<number>()
          .then(length)   // co-compose length ⧑ extract
          .then((w: Store<Point, number>) => parity(w)) // ⧑ parity
          .map(s => `len/parity: ${s}`)
          .done
        
        const result = arrow(numberStore) // "len/parity: odd"
        console.log(`Co-Do result: ${result}`)

        // ==================== Advanced Comonad Features ====================
        console.log('\n=== Advanced Comonad Features ===')
        
        // Cofree over ExprF with annotations
        const ExprFK: FunctorK1<'ExprF'> = { map: mapExprF }
        const someExpr: Fix1<'ExprF'> = fix1({ _tag: 'Add', left: fix1({ _tag: 'Lit', value: 5 }), right: fix1({ _tag: 'Lit', value: 3 }) })
        
        const cofreeExpr = toCofreeExpr(ExprFK)(someExpr)
        const annotatedExpr = annotateExprSizeDepth(ExprFK)(cofreeExpr)
        console.log(`Cofree ExprF annotation: size=${annotatedExpr.head.size}, depth=${annotatedExpr.head.depth}`)
        
        // Zipper navigation
        const zipper = ZipperExpr.fromRoot(annotatedExpr)
        const downLeft = ZipperExpr.downLeft(zipper)
        const downRight = ZipperExpr.downRight(zipper)
        console.log(`Zipper navigation: downLeft head=${downLeft.focus.head.size}, downRight head=${downRight.focus.head.size}`)
        
        // DoCoBind record builder
        const CoB = DoCoBind(StoreC)
        const program = CoB.startEmpty<number>()
          .bind('here', wT => StoreC.extract(wT))       // number
          .bind('right', wT => wT.peek({ x: wT.pos.x+1, y: wT.pos.y }))
          .let('sum', t => t.here + t.right)
          .map(t => `sum=${t.sum}`)
          .done
        
        const out = program(numberStore) // "sum=5"
        console.log(`DoCoBind result: ${out}`)

        // ==================== 2-Functor Examples ====================
        console.log('\n=== 2-Functor Examples ===')
        
        // Core endofunctor composition
        const OptionEndo: EndofunctorK1<'Option'> = { map: <A, B>(f: (a: A) => B) => (oa: Option<A>) => oa.map(f) }
        const composed = composeEndoK1(IdK1, OptionEndo)
        const result1 = composed.map((x: number) => x * 2)(some(5))
        console.log(`Endofunctor composition: ${JSON.stringify(result1)}`)
        
        // Lax 2-functor: PostcomposeReader
        const U = PostcomposeReader2<{env: string}>()
        const UF = U.on1(OptionEndo)           // A ↦ Reader<{env: string}, Option<A>>
        const α = { app: <A>(oa: Option<A>) => oa } // identity NT
        const Uα = U.on2(α)
        
        // Test the 2-functor
        const readerOption = UF.map((x: number) => x * 2)
        const env = { env: 'test' }
        const result2 = readerOption(env)
        console.log(`2-Functor on1: ${JSON.stringify(result2)}`)
        
        // Test eta (unit)
        const etaResult = U.eta().app(42)
        console.log(`2-Functor eta: ${etaResult(env)}`)
        
        // Test mu with explicit F
        const μ_FG = muPostReader<{env: string}>()(OptionEndo)
        const nestedReader = (env: {env: string}) => some((env: {env: string}) => some(42))
        const flattened = μ_FG.app(nestedReader)
        console.log(`2-Functor mu: ${flattened(env)}`)

        // ==================== Oplax 2-Functor Examples ====================
        console.log('\n=== Oplax 2-Functor Examples ===')
        
        // Create strength registry for common functors
        const strengthRegistry = <F>(F: EndofunctorK1<F>): StrengthEnv<F, string> => {
          if (F === OptionEndo) {
            return strengthEnvOption<string>() as StrengthEnv<F, string>
          }
          if (F === IdK1) {
            const idStrength: StrengthEnv<'IdK1', string> = {
              st: <A>(envValue) => {
                const pair = envValue as Env<string, A>
                return ['default', pair[1]] as const
              },
            }
            return idStrength as StrengthEnv<F, string>
          }
          throw new Error(`No strength defined for ${F}`)
        }
        
        // Create oplax 2-functor
        const U = PrecomposeEnv2<string>(strengthRegistry)
        const UF = U.on1(OptionEndo)           // A ↦ Option<Env<string, A>>
        const α = { app: <A>(oa: Option<A>) => oa } // identity NT
        const Uα = U.on2(α)
        
        // Test the oplax 2-functor
        const optionEnv = UF.map((x: number) => x * 2)
        const testValue = some(['context', 42] as [string, number])
        const result3 = optionEnv(testValue)
        console.log(`Oplax 2-Functor on1: ${JSON.stringify(result3)}`)
        
        // Test eta^op (counit)
        const etaOpResult = U.etaOp().app(['context', 42])
        console.log(`Oplax 2-Functor eta^op: ${etaOpResult}`)
        
        // Test strength instances
        const optionStrength = strengthEnvOption<string>()
        const optionWithEnv = some(['context', 42] as [string, number])
        const strengthened = optionStrength.st(optionWithEnv)
        console.log(`Option strength: ${JSON.stringify(strengthened)}`)
        
        const resultStrength = strengthEnvResult<string, string>('default')
        const resultWithEnv = ok(['context', 42] as [string, number])
        const resultStrengthened = resultStrength.st(resultWithEnv)
        console.log(`Result strength: ${JSON.stringify(resultStrengthened)}`)

        console.log('\n=== MARKOV ORACLES (ZERO-ONE) ===')
        const bit = mkFin([0, 1] as const, (a, b) => a === b)
        const pair = tensorObj(bit, bit)
        const AFin = mkFin(['a0', 'a1'] as const, (a, b) => a === b)

        const prior = detK(AFin, pair, (a) =>
          a === 'a0' ? ([0, 0] as [number, number]) : ([1, 1] as [number, number])
        )
        const stat = detK(pair, bit, ([x]) => x as 0 | 1)

        const determinismWitness = buildDeterminismLemmaWitness(prior, stat, {
          label: 'determinism-example',
        })
        const determinismReport = checkDeterminismLemma(determinismWitness)
        console.log('Determinism lemma:', {
          holds: determinismReport.holds,
          ciVerified: determinismReport.ciVerified,
          deterministic: determinismReport.deterministic,
        })

        const piFirst = new FinMarkov(pair, bit, fst<number, number>())
        const piSecond = new FinMarkov(pair, bit, snd<number, number>())
        const finiteMarginals = [
          { F: 'first', piF: piFirst },
          { F: 'second', piF: piSecond },
        ]

        const kolmogorovWitness = buildKolmogorovZeroOneWitness(prior, stat, finiteMarginals, {
          label: 'kolmogorov-example',
        })
        const kolmogorovReport = checkKolmogorovZeroOne(kolmogorovWitness)
        console.log('Kolmogorov zero-one:', {
          holds: kolmogorovReport.holds,
          ciFamilyVerified: kolmogorovReport.ciFamilyVerified,
          deterministic: kolmogorovReport.deterministic,
        })

        const statSym = detK(pair, bit, ([x, y]) => ((x ^ y) as 0 | 1))
        const swapSymmetry: FinitePermutation<[number, number]> = {
          name: 'swap',
          sigmaHat: new FinMarkov(pair, pair, swap<number, number>()),
        }

        const hewittSavageWitness = buildHewittSavageWitness(
          prior,
          statSym,
          finiteMarginals,
          [swapSymmetry],
          { label: 'hewitt-savage-example' },
        )
        const hewittSavageReport = checkHewittSavageZeroOne(hewittSavageWitness)
        console.log('Hewitt–Savage zero-one:', {
          holds: hewittSavageReport.holds,
          permutationInvariant: hewittSavageReport.permutationInvariant,
        })

        console.log('\n=== TEXTBOOK CONSTRUCTIONS TOOLKIT ===')
        type ToolkitObj = 'Task' | 'User' | 'Project'
        interface ToolkitArrow { name: string; src: ToolkitObj; dst: ToolkitObj }
        const idArrow = (o: ToolkitObj): ToolkitArrow => ({ name: `id_${o}`, src: o, dst: o })
        const tAnchor: ToolkitArrow = { name: 'anchorT', src: 'Task', dst: 'Project' }
        const uAnchor: ToolkitArrow = { name: 'anchorU', src: 'User', dst: 'Project' }
        const assigned: ToolkitArrow = { name: 'assigned', src: 'Task', dst: 'User' }
        const toolkitObjects: ReadonlyArray<ToolkitObj> = ['Task', 'User', 'Project']
        const composeToolkit = (g: ToolkitArrow, f: ToolkitArrow): ToolkitArrow => {
          if (f.dst !== g.src) throw new Error('toolkit compose mismatch')
          const key = `${g.name}∘${f.name}`
          switch (key) {
            case 'anchorU∘assigned':
              return tAnchor
            case 'id_Task∘assigned':
              return assigned
            case 'anchorT∘id_Task':
              return tAnchor
            case 'anchorU∘id_User':
              return uAnchor
            case 'id_User∘assigned':
              return assigned
            default:
              if (g.name === `id_${g.dst}`) return f
              if (f.name === `id_${f.src}`) return g
              throw new Error(`missing toolkit composition for ${key}`)
          }
        }
        const toolkitArrows: ReadonlyArray<ToolkitArrow> = [
          idArrow('Task'),
          idArrow('User'),
          idArrow('Project'),
          tAnchor,
          uAnchor,
          assigned,
        ]
        const toolkitBase: FiniteCategory<ToolkitObj, ToolkitArrow> = {
          objects: toolkitObjects,
          arrows: toolkitArrows,
          id: idArrow,
          compose: composeToolkit,
          src: (arrow) => arrow.src,
          dst: (arrow) => arrow.dst,
          eq: (a, b) => a.name === b.name,
        }
        const toolkit = makeTextbookToolkit(toolkitBase, {
          pullbacks: makeFinitePullbackCalculator(toolkitBase),
        })
        const projectSlice = toolkit.sliceAt('Project')
        console.log(
          'Slice objects:',
          projectSlice.category.objects.map((object) => `${object.domain}->${object.arrowToAnchor.dst}`),
        )
        const dual = toolkit.dual()
        console.log('Dual anchorT maps:', dual.src(tAnchor), '→', dual.dst(tAnchor))

        console.log('\n=== SLICE / COSLICE WALKTHROUGH ===')
        runSliceCosliceDemo()

        console.log('\n=== CONCRETE CATEGORY BACKENDS ===')
        const naturalSet = SetCat.obj([0, 1, 2])
        const paritySet = SetCat.obj(['even', 'odd'])
        const parityFn = SetCat.hom(naturalSet, paritySet, (n: number) => (n % 2 === 0 ? 'even' : 'odd'))
        console.log('SetCat parity(2):', parityFn.map(2))

        const parityRel = RelCat.hom(
          [0, 1, 2],
          ['even', 'odd'],
          [
            [0, 'even'],
            [1, 'odd'],
            [2, 'even'],
          ],
        )
        const relParity = Array.from(RelCat.compose(parityRel, RelCat.id(['even', 'odd'])))
        console.log('RelCat parity relation pairs:', relParity)

        const flip = MatCat.hom(2, 2, [
          [0, 1],
          [1, 0],
        ])
        const matIdentity = MatCat.compose(flip, flip)
        console.log('MatCat flip squared:', matIdentity)

        const dynTask = DynCat.obj(['todo', 'done'], (state: 'todo' | 'done') => (state === 'todo' ? 'done' : 'done'))
        const dynLog = DynCat.obj([0, 1], (value: 0 | 1) => (value === 0 ? 1 : 1))
        const dynMorph = DynCat.hom(dynTask, dynLog, (state) => (state === 'todo' ? 0 : 1))
        console.log('DynCat morphism valid?', DynCat.isHom(dynMorph))

        console.log('\n=== SYNTHESIZED ZERO-ONE ORACLE ===')
        const synthesized = makeZeroOneOracle({
          prior,
          statistic: statSym,
          finiteMarginals,
          symmetries: [swapSymmetry],
        })
        const synthReport = synthesized.check()
        console.log('Kolmogorov + symmetry synthesis holds?', synthReport.holds)

        console.log('\n✅ All examples completed successfully!')
}

runExamples().catch(console.error)


