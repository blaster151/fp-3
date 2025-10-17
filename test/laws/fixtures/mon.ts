import type { Monoid } from '../../../monoid-cat'

export const xorMonoid2: Monoid<number> = {
  e: 0,
  op: (a, b) => a ^ b,
  elements: [0, 1],
}

export const xorMonoid4: Monoid<number> = {
  e: 0,
  op: (a, b) => a ^ b,
  elements: [0, 1, 2, 3],
}

export const cyclicMonoid = (mod: number): Monoid<number> => ({
  e: 0,
  op: (a, b) => (a + b) % mod,
  elements: Array.from({ length: mod }, (_, index) => index),
})
