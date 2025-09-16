#!/usr/bin/env ts-node

import {
  Some, None, Ok, Err, VOk, VErr,
  Reader, DoR, DoTR, SRT, runSRT,
  sequenceArrayValidation, sequenceArrayResult, sequenceStructValidation, sequenceStructResult,
  partitionSet, partitionSetWith, productTR, zipWithTR, sequenceState, traverseSRT,
  filterMapArray, collectArray, filterMapMapValues, collectMapValues, filterMapMapEntries, collectMapEntries, filterMapSet, collectSet,
  PartialFn, pf,
  sumRange_FUSED, prettyRange_FUSED, statsFullBinary_FUSED, prettyAndSize_FUSED,
  lit, add, mul, neg, addN, mulN, vvar, lett, divE, evalExpr, showExpr, normalizeExprToNary,
  evalExprNum2, evalExprR, evalExprRR, showExprMinParens2,
  evalExprR_app, evalExprRR_app,
  compileExpr, runProgram,
  // New algebras
  Alg_Expr_size, Alg_Expr_depth, sizeAndDepthExpr,
  sizeJsonNew, strsJson, depthJson, sizeAndDepthJson, strsAndSizeJson,
  // Canonicalization and EJSON
  canonicalizeJson, toEJson, toEJsonCanonical, fromEJson,
  // Canonical utilities
  canonicalKey, equalsCanonical, compareCanonical, hashCanonical, hashConsJson,
  // Json constructors
  jObj, jStr, jNum, jArr, jUndef, jDec, jBinary, jRegex, jSet,
  // Catamorphism
  cataExpr,
  // Missing functions
  powE, runReader,
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
  const complexExpr = addN([lit(1), neg(add(lit(2), lit(3))), mul(lit(4), lit(5))])
  const exprSize = cataExpr(Alg_Expr_size)(complexExpr)
  const exprDepth = cataExpr(Alg_Expr_depth)(complexExpr)
  const [size, depth] = sizeAndDepthExpr(complexExpr)
  
  console.log('Complex expression:', showExpr(complexExpr))
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
  
  console.log('\n=== ALL NEW EXAMPLES COMPLETED ===')
}

runExamples().catch(console.error)
