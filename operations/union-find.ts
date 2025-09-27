export class UnionFind<T> {
  private readonly parent = new Map<T, T>()
  private readonly rank = new Map<T, number>()

  constructor(items: Iterable<T> = []) {
    for (const item of items) this.makeSet(item)
  }

  makeSet(item: T): void {
    if (this.parent.has(item)) return
    this.parent.set(item, item)
    this.rank.set(item, 0)
  }

  find(item: T): T {
    const parent = this.parent.get(item)
    if (parent === undefined) {
      throw new Error(`UnionFind: attempted to find unknown element ${String(item)}`)
    }
    if (!Object.is(parent, item)) {
      const representative = this.find(parent)
      this.parent.set(item, representative)
      return representative
    }
    return item
  }

  union(a: T, b: T): T {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (Object.is(rootA, rootB)) return rootA

    const rankA = this.rank.get(rootA) ?? 0
    const rankB = this.rank.get(rootB) ?? 0

    if (rankA < rankB) {
      this.parent.set(rootA, rootB)
      return rootB
    }
    if (rankA > rankB) {
      this.parent.set(rootB, rootA)
      return rootA
    }

    this.parent.set(rootB, rootA)
    this.rank.set(rootA, rankA + 1)
    return rootA
  }

  representatives(): Map<T, T> {
    const mapping = new Map<T, T>()
    for (const key of this.parent.keys()) mapping.set(key, this.find(key))
    return mapping
  }
}
