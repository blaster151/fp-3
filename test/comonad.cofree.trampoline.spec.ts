import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import { CofreeK1 } from '../comonad-k1'
import type { Cofree } from '../comonad-k1'
import type { FunctorK1 } from '../allTS'
import { None, Some, isSome } from '../option'
import type { Option } from '../option'

const OptionFunctor: FunctorK1<'Option'> = {
  map: <A, B>(f: (a: A) => B) => (oa: Option<A>): Option<B> => (isSome(oa) ? Some(f(oa.value)) : None),
}

const CF = CofreeK1(OptionFunctor)

const buildChain = (length: number): Cofree<'Option', number> => {
  let node: Cofree<'Option', number> = { head: length, tail: None }
  for (let i = length - 1; i >= 0; i--) {
    node = { head: i, tail: Some(node) }
  }
  return node
}

const nthNode = <A>(tree: Cofree<'Option', A>, depth: number): Cofree<'Option', A> => {
  let current = tree
  for (let i = 0; i < depth; i++) {
    const tail = current.tail
    if (!isSome(tail)) {
      throw new Error(`Expected depth ${depth}, but hit leaf at ${i}`)
    }
    current = tail.value
  }
  return current
}

const sumUpTo = (n: number): number => (n * (n + 1)) / 2

const LARGE_DEPTH = 20000

describe('Cofree trampolined combinators are stack safe', () => {
  it('map traverses very deep chains without overflowing', () => {
    const original = buildChain(LARGE_DEPTH)
    const mapped = CF.map((n: number) => n + 1)(original)
    const leaf = nthNode(mapped, LARGE_DEPTH)
    expect(leaf.head).toBe(LARGE_DEPTH + 1)
  })

  it('extend traverses very deep chains without overflowing', () => {
    const original = buildChain(LARGE_DEPTH)
    const extended = CF.extend((w: Cofree<'Option', number>) => w.head)(original)
    const leaf = nthNode(extended, LARGE_DEPTH)
    expect(leaf.head).toBe(LARGE_DEPTH)
  })

  it('cata folds very deep chains without overflowing', () => {
    const original = buildChain(LARGE_DEPTH)
    const result = CF.cata<number, number>(
      (ob) => (isSome(ob) ? ob.value : 0),
      (head, tailSum) => head + tailSum,
    )(original)
    expect(result).toBe(sumUpTo(LARGE_DEPTH))
  })

  it('take stops recursion after the requested depth', () => {
    const original = buildChain(LARGE_DEPTH)
    const limit = 5
    const taken = CF.take(limit)(original)
    const leaf = nthNode(taken, limit)
    const originalLeaf = nthNode(original, limit)
    expect(leaf).toBe(originalLeaf)
    expect(leaf.head).toBe(limit)
  })

  it('hoist remains stack-safe via the shared trampoline', () => {
    const original = buildChain(LARGE_DEPTH)
    const hoisted = CF.hoist(OptionFunctor)((fx) => fx)(original)
    const leaf = nthNode(hoisted, LARGE_DEPTH)
    expect(leaf.head).toBe(LARGE_DEPTH)
  })

  it('unfold materialises deep chains without overflowing', () => {
    const tree = CF.unfold<number, number>((n) =>
      n >= LARGE_DEPTH
        ? ([n, None as Option<number>] as const)
        : ([n, Some(n + 1)] as const)
    )(0)
    const leaf = nthNode(tree, LARGE_DEPTH)
    expect(leaf.head).toBe(LARGE_DEPTH)
    expect(isSome(leaf.tail)).toBe(false)
  })

  it('cata agrees with manual sums for randomly sized chains', () => {
    fc.assert(
      fc.property(fc.nat(), (raw) => {
        const n = raw % 201
        const chain = buildChain(n)
        const folded = CF.cata<number, number>((ob) => (isSome(ob) ? ob.value : 0), (head, tailSum) => head + tailSum)(chain)
        return folded === sumUpTo(n)
      }),
    )
  })
})
