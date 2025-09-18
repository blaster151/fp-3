#!/usr/bin/env ts-node

// Examples demonstrating Sum ⊕ and Product ⊗ endofunctors
import {
  Some, None, Ok, Err, isOk, isSome, mapO,
  EndofunctorK1, ResultK1,
  SumVal, SumEndo, inL, inR, strengthEnvFromSum, matchSum,
  ProdVal, ProdEndo, prod, strengthEnvFromProd,
  strengthEnvOption, strengthEnvResult,
  Env
} from './allTS'

console.log('🔀 Testing Sum ⊕ and Product ⊗ Endofunctors\n')

// Create simple endofunctors
const OptionF: EndofunctorK1<'Option'> = { map: mapO as any }
const ResultF = ResultK1<string>()

// =============================================================================
// Sum Functor Examples (F ⊕ G)
// =============================================================================

console.log('=== Sum Functor (F ⊕ G) ===')

// Create Sum = Option ⊕ Result<string, _>
const SumFG = SumEndo(OptionF, ResultF)

// Create some values
const leftValue = inL<typeof OptionF, typeof ResultF, number>(Some(42))
const rightValue = inR<typeof OptionF, typeof ResultF, number>(Ok(24))

console.log('Left value:', leftValue)   // { _sum: 'L', left: { _tag: 'Some', value: 42 } }
console.log('Right value:', rightValue) // { _sum: 'R', right: { _tag: 'Ok', value: 24 } }

// Map over sum values
const mappedLeft = SumFG.map((n: number) => n * 2)(leftValue)
const mappedRight = SumFG.map((n: number) => n + 10)(rightValue)

console.log('Mapped left (×2):', mappedLeft)   // L(Some(84))
console.log('Mapped right (+10):', mappedRight) // R(Ok(34))

// Case analysis with matchSum
const analyzeSum = matchSum<typeof OptionF, typeof ResultF, number, string>(
  (optVal) => isSome(optVal) ? `Option contains: ${optVal.value}` : 'Option is None',
  (resVal) => isOk(resVal) ? `Result contains: ${resVal.value}` : `Result error: ${resVal.error}`
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
const productValue = prod<typeof OptionF, typeof ResultF, number>(Some(10), Ok(20))
const productWithNone = prod<typeof OptionF, typeof ResultF, number>(None, Ok(30))

console.log('Product value:', productValue)
console.log('Product with None:', productWithNone)

// Map over product
const mappedProduct = ProdFG.map((n: number) => n * 3)(productValue)
console.log('Mapped product (×3):', mappedProduct)
// { left: Some(30), right: Ok(60) }

// Extract values from product
const extractFromProduct = (p: ProdVal<typeof OptionF, typeof ResultF, number>): string => {
  const leftResult: number = isSome(p.left as any) ? (p.left as any).value : 0
  const rightResult: number = isOk(p.right as any) ? (p.right as any).value : 0
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
const envSumLeft = inL<typeof OptionF, typeof ResultF, Env<string, number>>(
  Some(['environment', 100] as const)
)
const [env1, sumVal1] = sSum.st<number>(envSumLeft)
console.log('Sum strength (left):', { env: env1, value: sumVal1 })

const envSumRight = inR<typeof OptionF, typeof ResultF, Env<string, number>>(
  Ok(['context', 200] as const)
)
const [env2, sumVal2] = sSum.st<number>(envSumRight)
console.log('Sum strength (right):', { env: env2, value: sumVal2 })

// Product strength
const sProd = strengthEnvFromProd<string>()(sOption, sResult)

const envProd = prod<typeof OptionF, typeof ResultF, Env<string, number>>(
  Some(['shared-env', 50] as const),
  Ok(['shared-env', 75] as const)
)
const [env3, prodVal3] = sProd.st<number>(envProd)
console.log('Product strength:', { env: env3, value: prodVal3 })

console.log('\n✅ Sum ⊕ and Product ⊗ examples completed!')