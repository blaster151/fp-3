import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'test')
const DERIVED = new Set([
  // names you *don't* want to see as explicit tests
  'Functor law: map(const id) = const id',
  'Comonad law: extend(extract) = id',
  'Comonad law: extract ∘ duplicate = id',
  'Comonad law: map(extract) ∘ duplicate = id',
  'Comonad law: duplicate ∘ duplicate = map(duplicate) ∘ duplicate',
  'Applicative law: pure ∘ f = map(f) ∘ pure',
  'Monad law: chain(pure) = id',
  'Monad law: pure >=> f = f',
  'Monad law: f >=> pure = f',
  'Traversable law: traverse(pure) = pure',
  'Traversable law: traverse(Compose(f)(g)) = Compose(traverse(f))(traverse(g))',
  // add more as you discover them...
])

console.log('🔍 Checking for duplicate derivable laws...')

let bad = []
try {
  for (const file of fs.readdirSync(ROOT)) {
    if (!file.endsWith('.spec.ts')) continue
    const content = fs.readFileSync(path.join(ROOT, file), 'utf8')
    for (const name of DERIVED) {
      if (content.includes(`'${name}'`) || content.includes(`"${name}"`)) {
        bad.push({ file, name })
      }
    }
  }
} catch (err) {
  console.log('⚠️  Test directory not found or inaccessible, skipping derived law check')
  process.exit(0)
}

if (bad.length) {
  console.error('\n❌ Derived-law lint failed. Remove explicit tests for derivable laws:\n')
  for (const { file, name } of bad) {
    console.error(`  - ${file}: "${name}"`)
  }
  console.error('\nThese laws should be derived programmatically, not hand-written.')
  process.exit(1)
} else {
  console.log('✅ No duplicate derivable laws found!')
}