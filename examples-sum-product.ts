#!/usr/bin/env ts-node

// Examples demonstrating Sum ⊕ and Product ⊗ endofunctors
import {
  Some,
  None,
  Ok,
  isOk,
  isSome,
  mapO,
  ResultK1,
  SumEndo,
  inL,
  inR,
  strengthEnvFromSum,
  matchSum,
  ProdEndo,
  prod,
  strengthEnvFromProd,
  strengthEnvOption,
  strengthEnvResult,
} from './allTS'
import type {
  EndofunctorK1,
  SumVal,
  ProdVal,
  Env,
} from './allTS'

console.log('🔀 Testing Sum ⊕ and Product ⊗ Endofunctors\n')

// Create simple endofunctors
const OptionF: EndofunctorK1<'Option'> = { map: mapO }
const ResultF: EndofunctorK1<'Result'> = ResultK1<unknown>() as EndofunctorK1<'Result'>

// =============================================================================
// Sum Functor Examples (F ⊕ G)
// =============================================================================

console.log('=== Sum Functor (F ⊕ G) ===')

// Create Sum = Option ⊕ Result<string, _>
const SumFG = SumEndo(OptionF, ResultF)

// Create some values
const leftValue: SumVal<'Option', 'Result', number> = inL<'Option', 'Result', number>(Some(42))
const rightValue: SumVal<'Option', 'Result', number> = inR<'Option', 'Result', number>(Ok(24))

console.log('Left value:', leftValue)   // { _sum: 'L', left: { _tag: 'Some', value: 42 } }
console.log('Right value:', rightValue) // { _sum: 'R', right: { _tag: 'Ok', value: 24 } }

// Map over sum values
const mappedLeft = SumFG.map((n: number) => n * 2)(leftValue)
const mappedRight = SumFG.map((n: number) => n + 10)(rightValue)

console.log('Mapped left (×2):', mappedLeft)   // L(Some(84))
console.log('Mapped right (+10):', mappedRight) // R(Ok(34))

// Case analysis with matchSum
const analyzeSum = matchSum<'Option', 'Result', number, string>(
  (optVal) => (isSome(optVal) ? `Option contains: ${optVal.value}` : 'Option is None'),
  (resVal) => {
    if (isOk(resVal)) {
      return `Result contains: ${resVal.value}`
    }
    const errorDetail = resVal.error
    return `Result error: ${String(errorDetail)}`
  }
)

console.log('Left analysis:', analyzeSum(leftValue))   // "Option contains: 42"
console.log('Right analysis:', analyzeSum(rightValue)) // "Result contains: 24"

// =============================================================================
// Product Functor Examples (F ⊗ G)
// =============================================================================

console.log('\n=== Product Functor (F ⊗ G) ===')

// Create Product = Option ⊗ Result<string, _>
const ProdFG = ProdEndo(OptionF, ResultF)

// Create product values
const productValue: ProdVal<'Option', 'Result', number> = prod<'Option', 'Result', number>(Some(10), Ok(20))
const productWithNone: ProdVal<'Option', 'Result', number> = prod<'Option', 'Result', number>(None, Ok(30))

console.log('Product value:', productValue)
console.log('Product with None:', productWithNone)

// Map over product
const mappedProduct = ProdFG.map((n: number) => n * 3)(productValue)
console.log('Mapped product (×3):', mappedProduct)
// { left: Some(30), right: Ok(60) }

// Extract values from product
const extractFromProduct = (p: ProdVal<'Option', 'Result', number>): string => {
  const leftResult: number = isSome(p.left) ? p.left.value : 0
  const rightResult: number = isOk(p.right) ? p.right.value : 0
  return `Left: ${leftResult}, Right: ${rightResult}, Sum: ${leftResult + rightResult}`
}

console.log('Extracted:', extractFromProduct(productValue)) // "Left: 10, Right: 20, Sum: 30"

// =============================================================================
// Strength Examples (pushing Env through Sum and Product)
// =============================================================================

console.log('\n=== Strength Examples ===')

// Set up strengths for Option and Result
const sOption = strengthEnvOption<string>()
const sResult = strengthEnvResult<string, string>('default-env')

// Sum strength
const sSum = strengthEnvFromSum<string>()(sOption, sResult)

// Push environment through sum
const envSumLeft: SumVal<'Option', 'Result', Env<string, number>> = inL<'Option', 'Result', Env<string, number>>(
  Some(['environment', 100] as const)
)
const [env1, sumVal1] = sSum.st<number>(envSumLeft)
console.log('Sum strength (left):', { env: env1, value: sumVal1 })

const envSumRight: SumVal<'Option', 'Result', Env<string, number>> = inR<'Option', 'Result', Env<string, number>>(
  Ok(['context', 200] as const)
)
const [env2, sumVal2] = sSum.st<number>(envSumRight)
console.log('Sum strength (right):', { env: env2, value: sumVal2 })

// Product strength
const sProd = strengthEnvFromProd<string>()(sOption, sResult)

const envProd: ProdVal<'Option', 'Result', Env<string, number>> = prod<'Option', 'Result', Env<string, number>>(
  Some(['shared-env', 50] as const),
  Ok(['shared-env', 75] as const)
)
const [env3, prodVal3] = sProd.st<number>(envProd)
console.log('Product strength:', { env: env3, value: prodVal3 })

console.log('\n✅ Sum ⊕ and Product ⊗ examples completed!')