#!/usr/bin/env ts-node

// Record Gluing Examples: Descent and Sheaf-like Operations
import {
  glueRecordCover, checkDescentByEq, resRecord,
  RecordCover, Sections, GlueError,
  isVOk, isVErr, VOk, VErr
} from './allTS'

console.log('🔗 Record Gluing: Descent and Sheaf-like Operations\n')

// =============================================================================
// Example 1: Basic Gluing
// =============================================================================

console.log('=== Basic Gluing Example ===')

// Keys of the "space"
type K = 'x' | 'y' | 'z'
type I = 'U' | 'V'
type A = number

const cover: RecordCover<I, K> = {
  U: new Set(['x', 'y']),
  V: new Set(['y', 'z']),
}

const sectionsGood: Sections<I, K, A> = {
  U: { x: 1, y: 2 },
  V: { y: 2, z: 3 },
}

const sectionsBad: Sections<I, K, A> = {
  U: { x: 1, y: 2 },
  V: { y: 99, z: 3 }, // conflict on y
}

const gluedOk = glueRecordCover(cover, sectionsGood)
const gluedFail = glueRecordCover(cover, sectionsBad)

console.log('Good sections glued:', isVOk(gluedOk) ? gluedOk.value : 'Failed')
console.log('Bad sections result:', isVErr(gluedFail) ? gluedFail.errors : 'Unexpected success')

// Explicit restrictions
const res = resRecord(cover)
const rUV = res('U', 'V')(sectionsGood.U) // { y: 2 }
console.log('Restriction U→(U∩V):', rUV)

// =============================================================================
// Example 2: Configuration Management
// =============================================================================

console.log('\n=== Configuration Management Example ===')

type ConfigKey = 'database' | 'auth' | 'logging' | 'cache' | 'metrics'
type ConfigSource = 'environment' | 'configFile' | 'defaults' | 'commandLine'

// Define which sources provide which configuration keys
const configCover: RecordCover<ConfigSource, ConfigKey> = {
  environment: new Set(['database', 'auth']),
  configFile: new Set(['auth', 'logging', 'cache']),
  defaults: new Set(['logging', 'cache', 'metrics']),
  commandLine: new Set(['database', 'metrics'])
}

// Configuration sections from different sources
const configSections: Sections<ConfigSource, ConfigKey, string> = {
  environment: { 
    database: 'postgresql://prod-db:5432',
    auth: 'oauth2'
  },
  configFile: { 
    auth: 'oauth2',        // matches environment
    logging: 'info',
    cache: 'redis'
  },
  defaults: { 
    logging: 'info',       // matches configFile
    cache: 'redis',        // matches configFile
    metrics: 'prometheus'
  },
  commandLine: {
    database: 'postgresql://prod-db:5432',  // matches environment
    metrics: 'datadog'     // conflicts with defaults!
  }
}

const configResult = glueRecordCover(configCover, configSections)

if (isVOk(configResult)) {
  console.log('✅ Configuration successfully merged:')
  console.log(JSON.stringify(configResult.value, null, 2))
} else {
  console.log('❌ Configuration conflicts detected:')
  configResult.errors.forEach(error => {
    if (error._tag === 'Conflict') {
      console.log(`  Conflict on '${String(error.key)}': ${error.i}='${error.left}' vs ${error.j}='${error.right}'`)
    } else if (error._tag === 'Incomplete') {
      console.log(`  Missing keys in ${error.i}: ${error.missing.join(', ')}`)
    }
  })
}

// =============================================================================
// Example 3: Microservice Data Aggregation
// =============================================================================

console.log('\n=== Microservice Data Aggregation ===')

type DataField = 'userId' | 'profile' | 'permissions' | 'preferences' | 'activity'
type Service = 'userService' | 'authService' | 'prefsService'

const serviceCover: RecordCover<Service, DataField> = {
  userService: new Set(['userId', 'profile']),
  authService: new Set(['userId', 'permissions']),
  prefsService: new Set(['userId', 'preferences', 'activity'])
}

// Simulate successful data fetch from services
const serviceData: Sections<Service, DataField, any> = {
  userService: {
    userId: 'user-123',
    profile: { name: 'Alice', email: 'alice@example.com' }
  },
  authService: {
    userId: 'user-123',  // matches userService
    permissions: ['read', 'write']
  },
  prefsService: {
    userId: 'user-123',  // matches others
    preferences: { theme: 'dark', lang: 'en' },
    activity: { lastLogin: '2024-01-15', loginCount: 42 }
  }
}

const aggregatedData = glueRecordCover(serviceCover, serviceData)

if (isVOk(aggregatedData)) {
  console.log('✅ Microservice data successfully aggregated:')
  console.log(JSON.stringify(aggregatedData.value, null, 2))
} else {
  console.log('❌ Data aggregation failed:')
  aggregatedData.errors.forEach(error => {
    console.log(`  ${error._tag}:`, error)
  })
}

// =============================================================================
// Example 4: Parallel Computation Results
// =============================================================================

console.log('\n=== Parallel Computation Results ===')

type ComputationKey = 'sum' | 'product' | 'max' | 'min' | 'average'
type Worker = 'worker1' | 'worker2' | 'worker3'

// Different workers compute different statistics
const computationCover: RecordCover<Worker, ComputationKey> = {
  worker1: new Set(['sum', 'product']),
  worker2: new Set(['product', 'max', 'min']),  // product overlaps with worker1
  worker3: new Set(['max', 'average'])          // max overlaps with worker2
}

const data = [1, 2, 3, 4, 5]

// Simulate parallel computation results
const computationResults: Sections<Worker, ComputationKey, number> = {
  worker1: {
    sum: data.reduce((a, b) => a + b, 0),      // 15
    product: data.reduce((a, b) => a * b, 1)   // 120
  },
  worker2: {
    product: data.reduce((a, b) => a * b, 1),  // 120 (matches worker1)
    max: Math.max(...data),                    // 5
    min: Math.min(...data)                     // 1
  },
  worker3: {
    max: Math.max(...data),                    // 5 (matches worker2)
    average: data.reduce((a, b) => a + b, 0) / data.length  // 3
  }
}

const mergedResults = glueRecordCover(computationCover, computationResults)

if (isVOk(mergedResults)) {
  console.log('✅ Parallel computation results successfully merged:')
  console.log(JSON.stringify(mergedResults.value, null, 2))
} else {
  console.log('❌ Computation results have conflicts:')
  mergedResults.errors.forEach(error => {
    console.log(`  ${error._tag}:`, error)
  })
}

// =============================================================================
// Example 5: Demonstrating Restriction Maps
// =============================================================================

console.log('\n=== Restriction Maps Example ===')

const largeCover = {
  A: new Set(['x', 'y', 'z']),
  B: new Set(['y', 'z', 'w']),
  C: new Set(['z', 'w', 'v'])
} as const

const fullSection = { x: 10, y: 20, z: 30, w: 40, v: 50 }

const restrictions = resRecord(largeCover)

console.log('Original section:', fullSection)
console.log('A ∩ B restriction:', restrictions('A', 'B')(fullSection))  // {y: 20, z: 30}
console.log('B ∩ C restriction:', restrictions('B', 'C')(fullSection))  // {z: 30, w: 40}
console.log('A ∩ C restriction:', restrictions('A', 'C')(fullSection))  // {z: 30}

console.log('\n✅ Record gluing demonstrates:')
console.log('  - 🔗 Descent theory from algebraic geometry')
console.log('  - 🛡️ Type-safe validation of compatibility conditions')
console.log('  - 🔧 Practical applications: config merging, data aggregation')
console.log('  - 🧮 Mathematical rigor: sheaf-like gluing conditions')
console.log('\n🎉 Gluing theory meets practical programming!')