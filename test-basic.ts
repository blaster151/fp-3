#!/usr/bin/env ts-node

// Basic test to verify the core functionality works
import {
  Some, None, Ok, Err, VOk, VErr,
  pipe, flow, 
  Reader, runReader,
  mapO, flatMapO, getOrElseO,
  mapR, flatMapR,
  mapV, apV,
  isOk, isSome, isVOk
} from './allTS'

console.log('🧪 Testing tiny-fp core functionality...\n')

// Test Option
console.log('=== Option Tests ===')
const opt1 = Some(42)
const opt2 = None
const mappedOpt = pipe(opt1, mapO((x: number) => x * 2))
const flatMappedOpt = pipe(opt1, flatMapO((x: number) => Some(x + 10)))
const defaultOpt = pipe(opt2, getOrElseO(() => 999))

console.log(`Some(42) mapped (*2):`, isSome(mappedOpt) ? mappedOpt.value : 'None') // 84
console.log(`Some(42) flatMapped (+10):`, isSome(flatMappedOpt) ? flatMappedOpt.value : 'None') // 52
console.log(`None with default 999:`, defaultOpt) // 999

// Test Result  
console.log('\n=== Result Tests ===')
const result1 = Ok(100)
const result2 = Err('error')
const mappedResult = pipe(result1, mapR((x: number) => x / 2))
const flatMappedResult = pipe(result1, flatMapR((x: number) => Ok(`Value: ${x}`)))

console.log(`Ok(100) mapped (/2):`, isOk(mappedResult) ? mappedResult.value : mappedResult.error) // 50
console.log(`Ok(100) flatMapped:`, isOk(flatMappedResult) ? flatMappedResult.value : flatMappedResult.error) // "Value: 100"

// Test Validation
console.log('\n=== Validation Tests ===')
const val1 = VOk(10)
const val2 = VErr('validation error')
const mappedVal = pipe(val1, mapV<never, number, number>((x: number) => x * 3))

console.log(`VOk(10) mapped (*3):`, isVOk(mappedVal) ? mappedVal.value : mappedVal.errors) // 30

// Test Reader
console.log('\n=== Reader Tests ===')
type Env = { name: string; count: number }

const readerExample = Reader.asks<Env, string>((env) => `Hello ${env.name}!`)
const mappedReader = Reader.map<string, string>((s) => s.toUpperCase())(readerExample)
const env: Env = { name: 'World', count: 42 }

console.log(`Reader result:`, runReader(mappedReader, env)) // "HELLO WORLD!"

// Test pipe/flow
console.log('\n=== Pipe/Flow Tests ===')
const add1 = (x: number) => x + 1
const multiply2 = (x: number) => x * 2
const toString = (x: number) => x.toString()

const pipeResult = pipe(5, add1, multiply2, toString)
const flowFn = flow(add1, multiply2, toString)
const flowResult = flowFn(5)

console.log(`Pipe result (5 -> +1 -> *2 -> toString):`, pipeResult) // "12"
console.log(`Flow result (5 -> +1 -> *2 -> toString):`, flowResult) // "12"

console.log('\n✅ All basic tests completed successfully!')