#!/usr/bin/env ts-node

// Mixed Distributive Laws: Monad × Comonad Interactions
import type {
  MixedDistK1,
  MonadK1, ComonadK1,
  Result, Store, Task, HK
} from './allTS'
import {
  liftMonadToGCoalgK1, liftComonadToTAlgK1,
  MixedDist_Result_Store, MixedDist_Task_Store,
  StoreComonad, ResultK1,
  Ok, Err, isOk
} from './allTS'

console.log('🔄 Mixed Distributive Laws: Monad × Comonad Interactions\n')

// =============================================================================
// Example 1: Result × Store - Error-aware contextual computation
// =============================================================================

console.log('=== Result × Store: Error-aware contextual computation ===')

type UserProfile = { name: string; age: number; email: string }
type ValidationError =
  | 'INVALID_EMAIL'
  | 'UNDERAGE'
  | 'MISSING_NAME'
  | 'COMPUTATION_FAILED'

declare module './allTS' {
  namespace HK {
    interface Registry1<A> {
      Result: Result<ValidationError, A>
      Store: Store<number, A>
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
const defaultField: keyof UserProfile = 'email'
const dist = MixedDist_Result_Store<keyof UserProfile, ValidationError>(defaultField)

// Simulate a computation that might fail to produce the validation store
const getValidationStore = (hasPermission: boolean): Result<ValidationError, typeof validationStore> =>
  hasPermission ? Ok(validationStore) : Err('INVALID_EMAIL') // reusing error type

const distributedValidation = dist.dist(getValidationStore(true))

const runValidation = (
  store: Store<keyof UserProfile, Result<ValidationError, (profile: UserProfile) => FieldValidation>>,
  profile: UserProfile,
  field: keyof UserProfile
): FieldValidation => {
  const validator = store.peek(field)
  if (isOk(validator)) {
    return validator.value(profile)
  }
  return Err(validator.error)
}

// Test validation on different profiles
const goodProfile: UserProfile = { name: 'Alice', age: 25, email: 'alice@example.com' }
const badProfile: UserProfile = { name: '', age: 16, email: 'invalid-email' }

const validationFields: ReadonlyArray<keyof UserProfile> = ['email', 'age', 'name']

const logValidationSummary = (label: string, profile: UserProfile) => {
  console.log(`\n${label} profile validation:`)
  for (const field of validationFields) {
    const result = runValidation(distributedValidation, profile, field)
    console.log(`  ${field} validation:`, result)
  }
}

logValidationSummary('Good', goodProfile)
logValidationSummary('Bad', badProfile)

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

const taskDist = MixedDist_Task_Store<APIEndpoint>()

// The Task that produces our Store
const apiStoreTask: Task<ApiStore> =
  () => createApiStore({ baseUrl: 'https://api.example.com', apiKey: 'key123', timeout: 100 })

// Distribute: Task<Store<Endpoint, Config -> Promise<Data>>> -> Store<Endpoint, Config -> Task<Data>>
const distributedApiStore = taskDist.dist(apiStoreTask)

// Now we can peek at different endpoints with different configurations
const prodConfig: APIConfig = { baseUrl: 'https://prod-api.com', apiKey: 'prod-key', timeout: 200 }
const devConfig: APIConfig = { baseUrl: 'https://dev-api.com', apiKey: 'dev-key', timeout: 50 }

const callDistributedEndpoint = async (endpoint: APIEndpoint, config: APIConfig) => {
  const service = await distributedApiStore.peek(endpoint)()
  return service(config)
}

console.log('  📡 Making distributed API calls...')

Promise.all([
  callDistributedEndpoint('users', prodConfig),
  callDistributedEndpoint('posts', devConfig),
  callDistributedEndpoint('comments', prodConfig)
]).then(results => {
  console.log('  ✅ API Results:')
  results.forEach((result, i) => {
    const endpoints: ReadonlyArray<APIEndpoint> = ['users', 'posts', 'comments']
    console.log(`    ${endpoints[i]}: ${JSON.stringify(result, null, 2)}`)
  })
})

// =============================================================================
// Example 3: Lifting operations - Monad to Coalgebra
// =============================================================================

console.log('\n=== Lifting: Monad to G-Coalgebra ===')

const ResultMonad = ResultK1<ValidationError>()
const ResultM = ResultMonad as unknown as MonadK1<'Result'>
const StoreComonadBase = StoreComonad<number>()
const StoreC = StoreComonadBase as unknown as ComonadK1<'Store'>
const rawLiftDist = MixedDist_Result_Store<number, ValidationError>(0)
const liftDist = rawLiftDist as unknown as MixedDistK1<'Result', 'Store'>

// γ : A -> Store<number, A> (create a constant store)
const makeConstantStore = <A>(a: A): Store<number, A> => ({
  pos: 0,
  peek: (_key: number) => a
})

// Lift the Result monad to work with Store coalgebras
const liftedGamma = liftMonadToGCoalgK1(ResultM, StoreC, liftDist)(makeConstantStore)

// Test with successful and failed Results
const successResult: Result<ValidationError, number> = Ok(42)
const failResult: Result<ValidationError, number> = Err('COMPUTATION_FAILED')

const liftedSuccess = liftedGamma(successResult)
const liftedFail = liftedGamma(failResult)

console.log('Lifted successful Result:')
console.log('  Position:', liftedSuccess.pos)
console.log('  Peek at 0:', liftedSuccess.peek(0))
console.log('  Peek at 1:', liftedSuccess.peek(1))

console.log('\nLifted failed Result:')
console.log('  Position:', liftedFail.pos)
console.log('  Peek at 0:', liftedFail.peek(0))
console.log('  Peek at 1:', liftedFail.peek(1))

// =============================================================================
// Example 4: Lifting operations - Comonad to Algebra
// =============================================================================

console.log('\n=== Lifting: Comonad to T-Algebra ===')

// α : Result<ValidationError, A> -> A (extract value or provide default)
const extractOrDefault = <A>(defaultValue: A) => (ra: Result<ValidationError, A>): A =>
  isOk(ra) ? ra.value : defaultValue

// Lift the Store comonad to work with Result algebras
const liftedAlpha = liftComonadToTAlgK1(ResultM, StoreC, liftDist)(
  extractOrDefault('fallback-value')
)

// Create Stores that may or may not be available
const primaryStore: Store<number, string> = {
  pos: 0,
  peek: (index: number) => `value-${index}`
}

const availableStore: Result<ValidationError, Store<number, string>> = Ok(primaryStore)
const missingStore: Result<ValidationError, Store<number, string>> = Err('COMPUTATION_FAILED')

// Apply the lifted algebra to both scenarios
const result = liftedAlpha(availableStore)
const fallback = liftedAlpha(missingStore)

console.log('Lifted comonad algebra result:')
console.log('  Position:', result.pos)
console.log('  Peek at 0:', result.peek(0))
console.log('  Peek at 1:', result.peek(1))

console.log('\nLifted fallback result:')
console.log('  Position:', fallback.pos)
console.log('  Peek at 0:', fallback.peek(0))
console.log('  Peek at 1:', fallback.peek(1))

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

// Use mixed distributive law to handle the Task<Result<Store>> -> Store<Task<Result>>
const taskResultDist = MixedDist_Task_Store<ConfigSource>()

// Simulate a task that produces our config loader (might fail)
const getConfigLoader: Task<Store<ConfigSource, Result<ConfigError, Config>>> = async () => {
  const envResult = await loadConfigFrom('env')()
  const fileResult = await loadConfigFrom('file')()
  const defaultResult = await loadConfigFrom('default')()

  const bySource: Record<ConfigSource, Result<ConfigError, Config>> = {
    env: envResult,
    file: fileResult,
    default: defaultResult,
  }

  return {
    pos: 'env',
    peek: (source: ConfigSource) => bySource[source]
  }
}

// Distribute the computation
const distributedConfigLoader = taskResultDist.dist(getConfigLoader)

console.log('  🔧 Loading configurations from different sources...')

// Load configurations with fallback strategy
Promise.all([
  distributedConfigLoader.peek('env')(),
  distributedConfigLoader.peek('file')(),
  distributedConfigLoader.peek('default')()
]).then((results: ReadonlyArray<Result<ConfigError, Config>>) => {
  console.log('  📋 Configuration loading results:')

  results.forEach((result, i) => {
    const sources: ReadonlyArray<ConfigSource> = ['env', 'file', 'default']
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