#!/usr/bin/env ts-node

// Advanced Functor Examples: Natural Transformations, Traversable, Free Algebra
import {
  Some, None, Ok, Err, isOk, isSome, mapO,
  ResultK1, idNatK1,
  SumEndo, inL, inR, sumNat, sumNatL, sumNatR, matchSum,
  ProdEndo, prod, prodNat, prodNatL, prodNatR,
  PromiseApp, TaskApp,
  distributePromiseK1, distributeTaskK1, sequencePromiseK1,
  TraversableArrayK1, TaskEndo, makePostcomposePromise2,
  IdT, BaseT, SumT, ProdT, CompT, PairT, ConstT,
  evalEndo, deriveStrengthEnv, hoistEndo,
  PairEndo, ConstEndo, strengthEnvFromPair, strengthEnvFromConst,
  IdK1, composeEndoK1, hcompNatK1_component,
  strengthEnvOption, strengthEnvResult
} from './allTS'
import type {
  Option, Result,
  EndofunctorK1, SumVal, ProdVal,
  SimpleApplicativeK1, TraversableK1, Task,
  EndoTerm, EndoDict, StrengthDict, NatDict
} from './allTS'

console.log('🚀 Advanced Functor Examples: Nat Transforms, Traversable, Free Algebra\n')

// =============================================================================
// Natural Transformations on Sum/Product
// =============================================================================

console.log('=== Natural Transformations on Sum/Product ===')

// Set up basic functors
const OptionF: EndofunctorK1<'Option'> = { map: mapO }
const ResultF = ResultK1<string>()

// Identity natural transformations
const optionId = idNatK1<'Option'>()
const resultId = idNatK1<['Result', 'string']>()

// Sum natural transformation: (Option ⊕ Result) ⇒ (Option ⊕ Result) 
const sumIdentity = sumNat(optionId, resultId)

const leftVal = inL<'Option', ['Result', 'string'], number>(Some(42))
const rightVal = inR<'Option', ['Result', 'string'], number>(Ok(24))

const transformedLeft = sumIdentity.app<number>(leftVal)
const transformedRight = sumIdentity.app<number>(rightVal)

console.log('Sum nat (identity):', { transformedLeft, transformedRight })

// Inject transformation into left branch only
const leftOnlyTransform = sumNatL<'Option', 'Option', ['Result', 'string']>(optionId)
const leftTransformed = leftOnlyTransform.app<number>(leftVal)
console.log('Left-only transform:', leftTransformed)

// Product natural transformation
const prodIdentity = prodNat(optionId, resultId)
const productVal = prod<'Option', ['Result', 'string'], number>(Some(10), Ok(20))
const transformedProd = prodIdentity.app<number>(productVal)
console.log('Product nat (identity):', transformedProd)

// =============================================================================
// Traversable and Promise Distribution
// =============================================================================

console.log('\n=== Traversable and Promise Distribution ===')

// Create array of promises
const promiseArray: ReadonlyArray<Promise<number>> = [
  Promise.resolve(1),
  Promise.resolve(2), 
  Promise.resolve(3)
]

// Distribute: Array<Promise<number>> -> Promise<Array<number>>
const distributor = distributePromiseK1(TraversableArrayK1)
const distributedPromise = distributor.app<number>(promiseArray)

distributedPromise.then(result => {
  console.log('Distributed promise result:', result) // [1, 2, 3]
})

// Task distribution
const taskArray: ReadonlyArray<Task<string>> = [
  () => Promise.resolve('hello'),
  () => Promise.resolve('world'),
  () => Promise.resolve('!')
]

const taskDistributor = distributeTaskK1(TraversableArrayK1)
const distributedTask = taskDistributor.app<string>(taskArray)

distributedTask().then(result => {
  console.log('Distributed task result:', result) // ['hello', 'world', '!']
})

// =============================================================================
// Free Algebra of Endofunctors
// =============================================================================

console.log('\n=== Free Algebra of Endofunctors ===')

// Define base functors
type BaseFunctors = 'Option' | 'ResultString'
const baseDict: EndoDict<BaseFunctors> = {
  'Option': OptionF,
  'ResultString': ResultF
}

// Build complex functor term: Option ⊕ (ResultString ⊗ Option)
const complexTerm = SumT(
  BaseT<BaseFunctors>('Option'),
  ProdT(
    BaseT<BaseFunctors>('ResultString'),
    BaseT<BaseFunctors>('Option')
  )
)

// Evaluate to concrete endofunctor
const complexFunctor = evalEndo(baseDict)(complexTerm)

// Test the complex functor
const leftBranch = inL<'Option', ['Prod', ['Result', 'string'], 'Option'], number>(Some(100))
const rightBranch = inR<'Option', ['Prod', ['Result', 'string'], 'Option'], number>(
  prod<['Result', 'string'], 'Option', number>(Ok(50), Some(25))
)

const mappedLeft = complexFunctor.map((n: number) => n * 2)(leftBranch)
const mappedRight = complexFunctor.map((n: number) => n + 10)(rightBranch)

console.log('Complex functor - mapped left:', mappedLeft)
console.log('Complex functor - mapped right:', mappedRight)

// =============================================================================
// Hoisting with Natural Transformations
// =============================================================================

console.log('\n=== Hoisting with Natural Transformations ===')

// Define a mapping that transforms Option -> ResultString
const optionToResult = {
  app: <A>(oa: Option<A>): Result<string, A> =>
    isSome(oa) ? Ok<A>(oa.value) : Err<string>('None converted to error')
}

const natMapping: NatDict<'Option', 'ResultString'> = (name) => {
  if (name === 'Option') {
    return { to: 'ResultString', nat: optionToResult }
  }
  throw new Error(`Unknown base: ${name}`)
}

// Simple term: just Option
const simpleTerm = BaseT<'Option'>('Option')

// Hoist Option -> ResultString
const targetDict: EndoDict<'ResultString'> = { 'ResultString': ResultF }
const hoisted = hoistEndo({ 'Option': OptionF }, targetDict)(natMapping)(simpleTerm)

console.log('Hoisted term:', hoisted.term) // BaseT('ResultString')

// Test the hoisted functor
const originalOption = Some(42)
const hoistedResult = hoisted.nat.app<number>(originalOption)
console.log('Hoisted transformation:', hoistedResult) // Ok(42)

// =============================================================================
// Complex Free Algebra Example
// =============================================================================

console.log('\n=== Complex Free Algebra Example ===')

// Build: (Option ⊕ Const<'default'>) ⊗ (Id ⊗ Pair<'tag'>)
const megaTerm = ProdT(
  SumT(
    BaseT<BaseFunctors>('Option'),
    ConstT<BaseFunctors>('default')
  ),
  ProdT(
    IdT,
    PairT<BaseFunctors>('tag')
  )
)

// This would be a very complex nested structure, but the algebra handles it!
console.log('Mega term structure:', JSON.stringify(megaTerm, null, 2))

// =============================================================================
// Lax 2-Functor with Promise
// =============================================================================

console.log('\n=== Lax 2-Functor with Promise ===')

// Create a registry that knows about Array traversability
const travRegistry = <F>(F: EndofunctorK1<F>): TraversableK1<F> | null => {
  // In real code, you'd match on F's identity/structure
  if (F === TraversableArrayK1) {
    return TraversableArrayK1 as TraversableK1<F>
  }
  return null
}

const PromiseLax2 = makePostcomposePromise2(travRegistry)

// The 2-functor can compose Promise with other functors
const PromiseArrayEndo = PromiseLax2.on1(TraversableArrayK1)

console.log('Promise ∘ Array endofunctor created successfully!')

// Test eta (unit): A -> Promise<A>
const eta = PromiseLax2.eta()
const promisedValue = eta.app<number>(42)
promisedValue.then(result => {
  console.log('Promise eta result:', result) // 42
})

console.log('\n✅ All advanced functor examples completed!')

// Wait for async operations to complete
setTimeout(() => {
  console.log('\n🎉 All async operations should be complete!')
}, 100)