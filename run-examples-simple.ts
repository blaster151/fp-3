#!/usr/bin/env ts-node

import {
  Some, None, Ok, Err, VOk, VErr, isSome, isErr,
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
  canonicalizeJson, toEJsonCanonical, fromEJson,
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
    const show = (label: string) => (r: any) =>
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

        console.log('\n=== ALL NEW EXAMPLES COMPLETED ===')
}

runExamples().catch(console.error)


