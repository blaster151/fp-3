// test-markov-advanced.ts — Test all the advanced Markov category features
import { 
  mkFin, 
  DistMonadImpl,
  makeKleisli,
  ProbMonad,
  SubProbMonad,
  WeightedMonad,
  KleisliProb,
  KleisliSubProb,
  KleisliWeighted,
  checkFubini,
  monadIsAffine1,
  assertMarkov,
  fromWeights,
  mass
} from './markov-category';

console.log('=== Advanced Markov Category Test ===\n');

// Test 1: Distribution Monad API
console.log('1. Distribution Monad API:');
const coinDist = fromWeights([["H", 0.6], ["T", 0.4]]);
console.log('Original coin:', coinDist);

const mapped = DistMonadImpl.map((c: string) => c === "H" ? 1 : 0)(coinDist);
console.log('Mapped to numbers:', mapped);

const bound = DistMonadImpl.bind((c: string) => 
  fromWeights([[c + "_flipped", 0.5], [c + "_not_flipped", 0.5]])
)(coinDist);
console.log('Bound result:', bound);

const product = DistMonadImpl.product(coinDist, coinDist);
console.log('Product (joint):', product);

console.log('Is affine?', DistMonadImpl.isAffine1);

// Test 2: Generic Kleisli Builder
console.log('\n2. Generic Kleisli Builder:');
type Coin = "H" | "T";
const CoinFin = mkFin<Coin>(["H", "T"], (a, b) => a === b);

// Create a custom Kleisli category
const customKleisli = makeKleisli({
  monad: DistMonadImpl,
  eq: (a, b) => a === b,
  show: (x) => String(x)
});

const flip = customKleisli.detK(CoinFin, CoinFin, (c) => c === "H" ? "T" : "H");
const transition = customKleisli.detK(CoinFin, CoinFin, (c) => c); // identity

console.log('Flip matrix:');
console.log(flip.pretty());

console.log('Is Markov category?', customKleisli.isMarkovCategory);

// Test 3: Swappable Monads
console.log('\n3. Swappable Monads:');

// Probability monad (normalized)
console.log('ProbMonad is affine?', monadIsAffine1(ProbMonad));
assertMarkov(ProbMonad); // Should not throw

// Subprobability monad (mass ≤ 1)
console.log('SubProbMonad is affine?', monadIsAffine1(SubProbMonad));
try {
  assertMarkov(SubProbMonad); // Should throw
} catch (e) {
  console.log('SubProbMonad correctly rejected as non-Markov:', e.message);
}

// Weighted monad (scores)
console.log('WeightedMonad is affine?', monadIsAffine1(WeightedMonad));
try {
  assertMarkov(WeightedMonad); // Should throw
} catch (e) {
  console.log('WeightedMonad correctly rejected as non-Markov:', e.message);
}

// Test 4: Convenience Factories
console.log('\n4. Convenience Factories:');

// KleisliProb (Markov category)
const probKleisli = KleisliProb;
console.log('KleisliProb is Markov?', probKleisli.isMarkovCategory);

const probFlip = probKleisli.detK(CoinFin, CoinFin, (c) => c === "H" ? "T" : "H");
console.log('Prob flip matrix:');
console.log(probFlip.pretty());

// KleisliSubProb (not Markov)
const subProbKleisli = KleisliSubProb;
console.log('KleisliSubProb is Markov?', subProbKleisli.isMarkovCategory);

// KleisliWeighted (not Markov)
const weightedKleisli = KleisliWeighted;
console.log('KleisliWeighted is Markov?', weightedKleisli.isMarkovCategory);

// Test 5: Law Checks
console.log('\n5. Law Checks:');

const dist1 = fromWeights([["A", 0.5], ["B", 0.5]]);
const dist2 = fromWeights([["X", 0.3], ["Y", 0.7]]);

// Fubini check (simplified)
const fubiniCheck = checkFubini(DistMonadImpl, dist1, dist2, (a, b) => 1);
console.log('Fubini check passed:', fubiniCheck);

// Test 6: Composition and Tensor Operations
console.log('\n6. Composition and Tensor Operations:');

const f = probKleisli.detK(CoinFin, CoinFin, (c) => c === "H" ? "T" : "H");
const g = probKleisli.detK(CoinFin, CoinFin, (c) => c); // identity

const composed = f.then(g);
console.log('Composed f.then(g):');
console.log(composed.pretty());

const tensored = f.tensor(g);
console.log('Tensored f ⊗ g:');
console.log(tensored.pretty());

// Test 7: Copy and Discard Operations
console.log('\n7. Copy and Discard Operations:');

const copyOp = probKleisli.copyK(CoinFin);
console.log('Copy operation:');
console.log(copyOp.pretty());

const discardOp = probKleisli.discardK(CoinFin);
console.log('Discard operation:');
console.log(discardOp.pretty());

console.log('\n=== Advanced Test Complete ===');