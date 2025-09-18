# tiny-fp

A compact, practical functional programming toolkit for TypeScript.

## Features

- **Zero dependencies** - Pure TypeScript implementation
- **Tree-shakeable** - Import only what you need
- **Type-safe** - Full TypeScript support
- **Functional** - Immutable data structures and pure functions
- **Comprehensive** - Covers monads, functors, optics, and more

## Quick Start

```typescript
import { Option, Some, None, mapO, flatMapO } from './allTS'

const result = Some(42)
  .pipe(mapO(x => x * 2))
  .pipe(flatMapO(x => x > 50 ? Some(x) : None))

console.log(result) // Some(84)
```

## Development

This project uses the **Pattern Discovery & Integration (PDI)** system for systematic development.

### For Human Developers
- See `pdi/HUMAN_DEV_GUIDELINES.md` for quick reference
- Use `npm run maintenance:check` for status updates
- Review `pdi/REMINDERS.md` for regular tasks

### For AI-Assisted Development
- Follow `pdi/AI_DEV_GUIDELINES.md` for systematic processes
- Use `pdi/KNOWLEDGE_BASE.md` for pattern discovery
- Track opportunities in `pdi/UPGRADE_BACKLOG.md`

### PDI Commands
```bash
npm run upgrade:backlog      # View upgrade opportunities
npm run upgrade:stats        # See backlog statistics
npm run maintenance:check    # Check maintenance status
npm run maintenance:remind   # Show development reminders
```

## Bootstrapping PDI in New Projects

To set up PDI in your own project:

```bash
# Copy the PDI system
cp -r pdi/ your-project/pdi/

# Initialize in your project
cd your-project
node pdi/bootstrap-pdi.js init
```

## Project Structure

- **`allTS.ts`** - Main library implementation
- **`run-examples-simple.ts`** - Comprehensive examples
- **`pdi/`** - Pattern Discovery & Integration system
- **`test/laws/`** - Law-based testing with witnesses
- **`LAWS.md`** - Mathematical laws and properties

## Testing

```bash
npm run test:laws           # Run law-based tests
npm run test:ci            # Run tests in CI mode
npm run coverage           # Check law coverage
```

## Contributing

1. Follow the PDI system guidelines
2. Ensure all laws are properly tested
3. Update documentation as needed
4. Use the upgrade analysis process

## License

MIT