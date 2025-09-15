# tiny-fp

A compact, practical functional programming toolkit for TypeScript.

## Features

- **Zero dependencies** - Pure TypeScript implementation
- **Tree-shakeable** - Import only what you need
- **Pragmatic types** - Focus on practical usage over theoretical purity
- **Good dev ergonomics** - Clean APIs with excellent TypeScript support

## Core Concepts

- **Option/Maybe** - Handle nullable values safely
- **Result/Either** - Handle errors without exceptions
- **Validation** - Accumulate multiple errors
- **Reader** - Dependency injection pattern
- **State** - Pure stateful computations
- **TaskResult** - Async operations with error handling
- **Recursion Schemes** - Generic tree traversal and generation

## Quick Start

```typescript
import { Some, None, Ok, Err, pipe } from './allTS'

// Option usage
const parseNumber = (s: string) => {
  const n = Number(s)
  return isNaN(n) ? None : Some(n)
}

// Result usage
const safeDivide = (a: number, b: number) => 
  b === 0 ? Err('Division by zero') : Ok(a / b)

// Usage
const result = pipe(
  parseNumber("10"),
  flatMapO(n => safeDivide(n, 2))
)
```

## Examples

The `examples.ts` file contains comprehensive, runnable examples organized by complexity:

1. **Basic Concepts** - Option, Result, Validation
2. **Do Notation** - Clean monadic composition
3. **State Management** - Pure stateful computations
4. **Reader Pattern** - Dependency injection
5. **Async Patterns** - TaskResult and parallel execution
6. **Combined Patterns** - StateReaderTask (SRT)
7. **Advanced Patterns** - RTO and RWST
8. **Utility Patterns** - Partitioning and sequencing
9. **JSON Streaming** - Event-driven processing

### Running Examples

```bash
# Type-check examples
npx tsc --noEmit --project examples-tsconfig.json

# Run examples (uncomment the ones you want to test)
npx ts-node examples.ts
```

## Installation

```bash
npm install tiny-fp
```

## Building

```bash
npm run build      # Build the library
npm run typecheck  # Type-check without building
```

## License

ISC
