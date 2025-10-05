#!/usr/bin/env ts-node

// Mixed Distributive Laws: Monad × Comonad Interactions
import type {
  MixedDistK1,
  MonadK1, ComonadK1,
  Result, Store, Task, Pair, HK
} from './allTS'
import {
  liftMonadToGCoalgK1, liftComonadToTAlgK1,
  MixedDist_Result_Store, MixedDist_Task_Store,
  StoreComonad, ResultK1, PairComonad,
  Ok, Err, isOk, isErr
} from './allTS'

console.log('🔄 Mixed Distributive Laws: Monad × Comonad Interactions\n')

// =============================================================================
// Example 1: Result × Store - Error-aware contextual computation
// =============================================================================

console.log('=== Result × Store: Error-aware contextual computation ===')

type UserProfile = { name: string; age: number; email: string }
type ValidationError = 'INVALID_EMAIL' | 'UNDERAGE' | 'MISSING_NAME'

declare module './allTS' {
  namespace HK {
    interface Registry1<A> {
      Result: Result<ValidationError, A>
    }
  }
}

const validateEmail = (email: string): Result<ValidationError, string> =>
  email.includes('@') ? Ok(email) : Err('INVALID_EMAIL')

const validateAge = (age: number): Result<ValidationError, number> =>
  age >= 18 ? Ok(age) : Err('UNDERAGE')

const validateName = (name: string): Result<ValidationError, string> =>
  name.trim().length > 0 ? Ok(name.trim()) : Err('MISSING_NAME')

// Create a Store that validates different aspects of a user profile
type FieldValidation = Result<ValidationError, UserProfile[keyof UserProfile]>

const validationStore: Store<keyof UserProfile, (profile: UserProfile) => FieldValidation> = {
  pos: 'email',
  peek: (field: keyof UserProfile) => {
    switch (field) {
      case 'email': return (p: UserProfile) => validateEmail(p.email)
      case 'age': return (p: UserProfile) => validateAge(p.age)
      case 'name': return (p: UserProfile) => validateName(p.name)
      default: return (p: UserProfile) => Err('MISSING_NAME' as ValidationError)
    }
  }
}

// Use mixed distributive law to handle potential validation failures
const defaultProfile: UserProfile = { name: '', age: 0, email: '' }
const dist = MixedDist_Result_Store<UserProfile, ValidationError>(defaultProfile)

// Simulate a computation that might fail to produce the validation store
const getValidationStore = (hasPermission: boolean): Result<ValidationError, typeof validationStore> =>
  hasPermission ? Ok(validationStore) : Err('INVALID_EMAIL') // reusing error type

const distributedValidation = dist.dist(getValidationStore(true))

// Test validation on different profiles
const goodProfile: UserProfile = { name: 'Alice', age: 25, email: 'alice@example.com' }
const badProfile: UserProfile = { name: '', age: 16, email: 'invalid-email' }

console.log('Good profile validation:')
console.log('  Email validation:', distributedValidation.peek(goodProfile)('email', goodProfile))
console.log('  Age validation:', distributedValidation.peek(goodProfile)('age', goodProfile))
console.log('  Name validation:', distributedValidation.peek(goodProfile)('name', goodProfile))

console.log('\nBad profile validation:')
console.log('  Email validation:', distributedValidation.peek(badProfile)('email', badProfile))
console.log('  Age validation:', distributedValidation.peek(badProfile)('age', badProfile))
console.log('  Name validation:', distributedValidation.peek(badProfile)('name', badProfile))

// =============================================================================
// Example 2: Task × Store - Async contextual computation
// =============================================================================

console.log('\n=== Task × Store: Async contextual computation ===')

type APIConfig = { baseUrl: string; apiKey: string; timeout: number }
type APIEndpoint = 'users' | 'posts' | 'comments'

type ApiResponse = {
  readonly data: string
  readonly timestamp: number
  readonly apiKey: string
}

const mockApiCall = (config: APIConfig, endpoint: APIEndpoint): Promise<ApiResponse> =>
  new Promise(resolve => 
    setTimeout(() => resolve({
      data: `Mock data from ${config.baseUrl}/${endpoint}`,
      timestamp: Date.now(),
      apiKey: config.apiKey.slice(0, 4) + '***'
    }), config.timeout)
  )

// Create an async Store that makes API calls based on configuration
type ApiStore = Store<APIEndpoint, (config: APIConfig) => Promise<ApiResponse>>

const createApiStore = async (defaultConfig: APIConfig): Promise<ApiStore> => {
  console.log('  🔧 Setting up API store...')
  await new Promise(resolve => setTimeout(resolve, 50)) // simulate setup time
  
  return {
    pos: 'users',
    peek: (endpoint: APIEndpoint) => (config: APIConfig) => mockApiCall(config, endpoint)
  }
}

const taskDist = MixedDist_Task_Store<APIConfig>()

// The Task that produces our Store
const apiStoreTask: Task<ApiStore> =
  () => createApiStore({ baseUrl: 'https://api.example.com', apiKey: 'key123', timeout: 100 })

// Distribute: Task<Store<Endpoint, Config -> Promise<Data>>> -> Store<Endpoint, Config -> Task<Data>>
const distributedApiStore = taskDist.dist(apiStoreTask)

// Now we can peek at different endpoints with different configurations
const prodConfig: APIConfig = { baseUrl: 'https://prod-api.com', apiKey: 'prod-key', timeout: 200 }
const devConfig: APIConfig = { baseUrl: 'https://dev-api.com', apiKey: 'dev-key', timeout: 50 }

console.log('  📡 Making distributed API calls...')

Promise.all([
  distributedApiStore.peek('users')(prodConfig),
  distributedApiStore.peek('posts')(devConfig),
  distributedApiStore.peek('comments')(prodConfig)
]).then(results => {
  console.log('  ✅ API Results:')
  results.forEach((result, i) => {
    const endpoints = ['users', 'posts', 'comments']
    console.log(`    ${endpoints[i]}: ${JSON.stringify(result, null, 2)}`)
  })
})

// =============================================================================
// Example 3: Lifting operations - Monad to Coalgebra
// =============================================================================

console.log('\n=== Lifting: Monad to G-Coalgebra ===')

const ResultM: MonadK1<'Result'> = ResultK1<ValidationError>()
const StoreC = StoreComonad<string>()
const liftDist = MixedDist_Result_Store<string, string>('default')

// γ : A -> Store<string, A> (create a constant store)
const makeConstantStore = <A>(a: A): Store<string, A> => ({
  pos: 'center',
  peek: (_key: string) => a
})

// Lift the Result monad to work with Store coalgebras
const liftedGamma = liftMonadToGCoalgK1(ResultM, StoreC, liftDist)(makeConstantStore)

// Test with successful and failed Results
const successResult: Result<string, number> = Ok(42)
const failResult: Result<string, number> = Err('computation failed')

const liftedSuccess = liftedGamma(successResult)
const liftedFail = liftedGamma(failResult)

console.log('Lifted successful Result:')
console.log('  Position:', liftedSuccess.pos)
console.log('  Peek at "left":', liftedSuccess.peek('left'))
console.log('  Peek at "right":', liftedSuccess.peek('right'))

console.log('\nLifted failed Result:')
console.log('  Position:', liftedFail.pos)
console.log('  Peek at "left":', liftedFail.peek('left'))
console.log('  Peek at "right":', liftedFail.peek('right'))

// =============================================================================
// Example 4: Lifting operations - Comonad to Algebra
// =============================================================================

console.log('\n=== Lifting: Comonad to T-Algebra ===')

// α : Result<string, A> -> A (extract value or provide default)
const extractOrDefault = <A>(defaultValue: A) => (ra: Result<string, A>): A =>
  isOk(ra) ? ra.value : defaultValue

// Lift the Store comonad to work with Result algebras
const liftedAlpha = liftComonadToTAlgK1(ResultM, StoreC, liftDist)(extractOrDefault('fallback'))

// Create a Store containing Results
const resultStore: Store<string, Result<string, string>> = {
  pos: 'main',
  peek: (key: string) => key.startsWith('good') ? Ok(`value-${key}`) : Err(`error-${key}`)
}

// Wrap in a Result
const wrappedStore: Result<string, Store<string, Result<string, string>>> = Ok(resultStore)

// Apply the lifted algebra
const result = liftedAlpha(wrappedStore)

console.log('Lifted comonad algebra result:')
console.log('  Position:', result.pos)
console.log('  Peek at "good-key":', result.peek('good-key'))
console.log('  Peek at "bad-key":', result.peek('bad-key'))

// =============================================================================
// Example 5: Real-world application - Configuration management with fallbacks
// =============================================================================

console.log('\n=== Real-world: Configuration with fallbacks ===')

type Config = {
  database: { host: string; port: number }
  redis: { host: string; port: number }
  logging: { level: string }
}

type ConfigSource = 'env' | 'file' | 'default'
type ConfigError = 'MISSING_ENV' | 'INVALID_FILE' | 'NETWORK_ERROR'

// Simulate loading configuration from different sources
const loadConfigFrom = (source: ConfigSource): Task<Result<ConfigError, Config>> => () => {
  return new Promise(resolve => {
    setTimeout(() => {
      switch (source) {
        case 'env':
          resolve(Ok({
            database: { host: 'prod-db.com', port: 5432 },
            redis: { host: 'prod-redis.com', port: 6379 },
            logging: { level: 'info' }
          }))
          break
        case 'file':
          resolve(Err('INVALID_FILE'))
          break
        case 'default':
          resolve(Ok({
            database: { host: 'localhost', port: 5432 },
            redis: { host: 'localhost', port: 6379 },
            logging: { level: 'debug' }
          }))
          break
      }
    }, 100)
  })
}

// Create a Store that knows how to load from different sources
const configLoaderStore: Store<ConfigSource, Task<Result<ConfigError, Config>>> = {
  pos: 'env',
  peek: loadConfigFrom
}

// Use mixed distributive law to handle the Task<Result<Store>> -> Store<Task<Result>>
const taskResultDist = MixedDist_Task_Store<ConfigSource>()

// Simulate a task that produces our config loader (might fail)
const getConfigLoader: Task<Store<ConfigSource, Task<Result<ConfigError, Config>>>> = 
  () => Promise.resolve(configLoaderStore)

// Distribute the computation
const distributedConfigLoader = taskResultDist.dist(getConfigLoader)

console.log('  🔧 Loading configurations from different sources...')

// Load configurations with fallback strategy
Promise.all([
  distributedConfigLoader.peek('env')(),
  distributedConfigLoader.peek('file')(),
  distributedConfigLoader.peek('default')()
]).then(results => {
  console.log('  📋 Configuration loading results:')
  
  results.forEach((result, i) => {
    const sources = ['env', 'file', 'default']
    console.log(`    ${sources[i]}:`, isOk(result) ? '✅ Success' : `❌ ${result.error}`)
    if (isOk(result)) {
      console.log(`      Database: ${result.value.database.host}:${result.value.database.port}`)
    }
  })
  
  // Implement fallback logic
  const envResult = results[0]!
  const defaultResult = results[2]!
  
  const finalConfig = isOk(envResult) ? envResult.value : 
                     isOk(defaultResult) ? defaultResult.value : null
  
  console.log('\n  🎯 Final configuration (with fallback):')
  if (finalConfig) {
    console.log(`    Using: ${isOk(envResult) ? 'environment' : 'default'} configuration`)
    console.log(`    Database: ${finalConfig.database.host}:${finalConfig.database.port}`)
    console.log(`    Redis: ${finalConfig.redis.host}:${finalConfig.redis.port}`)
    console.log(`    Logging: ${finalConfig.logging.level}`)
  } else {
    console.log('    ❌ All configuration sources failed!')
  }
})

setTimeout(() => {
  console.log('\n✅ Mixed distributive laws demonstrate:')
  console.log('  - 🔄 T∘G ⇒ G∘T: Swapping monad/comonad order')
  console.log('  - 🏗️  Lifting monads to coalgebras')
  console.log('  - 🎯 Lifting comonads to algebras')
  console.log('  - 🛡️  Error-aware contextual computation')
  console.log('  - ⚡ Async contextual computation')
  console.log('  - 🔧 Real-world config management')
  console.log('  - 📐 Foundation for entwining structures')
  console.log('\n🎉 Category theory enables powerful abstractions!')
}, 1000)