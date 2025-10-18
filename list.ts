import { None, Some, isSome } from "./option"
import type { Option } from "./option"
import type { Result } from "./result"
import { isOk } from "./result"
import type { Eq, Ord } from "./core"
import type { NonEmptyArray } from "./stdlib/nonempty-array"
import type { Monoid, Semigroup } from "./stdlib/monoid"

export type Nil = { readonly _tag: "Nil" }
export type Cons<A> = { readonly _tag: "Cons"; readonly head: A; readonly tail: List<A> }
export type List<A> = Nil | Cons<A>

const NIL: Nil = { _tag: "Nil" } as const

export const Nil = NIL

export const nil = <A = never>(): List<A> => NIL as List<A>

export const isNil = <A>(list: List<A>): list is Nil => list._tag === "Nil"

export const isCons = <A>(list: List<A>): list is Cons<A> => list._tag === "Cons"

export const cons = <A>(head: A) => (tail: List<A>): List<A> => ({
  _tag: "Cons",
  head,
  tail,
})

export const of = <A>(a: A): List<A> => cons(a)(nil())

export const fromArray = <A>(as: ReadonlyArray<A>): List<A> => {
  let out: List<A> = nil()
  for (let i = as.length - 1; i >= 0; i -= 1) {
    out = cons(as[i]!)(out)
  }
  return out
}

export const fromIterable = <A>(it: Iterable<A>): List<A> => fromArray(Array.from(it))

export const toArray = <A>(list: List<A>): ReadonlyArray<A> => {
  const out: A[] = []
  let cursor: List<A> = list
  while (isCons(cursor)) {
    out.push(cursor.head)
    cursor = cursor.tail
  }
  return out
}

export const toNonEmptyOption = <A>(list: List<A>): Option<NonEmptyArray<A>> => {
  if (isNil(list)) return None
  const arr = toArray(list)
  return Some(arr as NonEmptyArray<A>)
}

export const map =
  <A, B>(f: (a: A) => B) =>
  (list: List<A>): List<B> => {
    const out: B[] = []
    let cursor: List<A> = list
    while (isCons(cursor)) {
      out.push(f(cursor.head))
      cursor = cursor.tail
    }
    return fromArray(out)
  }

export const chain =
  <A, B>(f: (a: A) => List<B>) =>
  (list: List<A>): List<B> => {
    const out: B[] = []
    let cursor: List<A> = list
    while (isCons(cursor)) {
      let inner: List<B> = f(cursor.head)
      while (isCons(inner)) {
        out.push(inner.head)
        inner = inner.tail
      }
      cursor = cursor.tail
    }
    return fromArray(out)
  }

export const ap =
  <A, B>(fs: List<(a: A) => B>) =>
  (list: List<A>): List<B> =>
    chain<(a: A) => B, B>((f) => map(f)(list))(fs)

export const flatten = <A>(lists: List<List<A>>): List<A> => chain((xs) => xs)(lists)

export const foldl =
  <A, B>(f: (acc: B, a: A) => B) =>
  (initial: B) =>
  (list: List<A>): B => {
    let acc = initial
    let cursor: List<A> = list
    while (isCons(cursor)) {
      acc = f(acc, cursor.head)
      cursor = cursor.tail
    }
    return acc
  }

export const foldr =
  <A, B>(f: (a: A, acc: B) => B) =>
  (initial: B) =>
  (list: List<A>): B => {
    const arr = toArray(list)
    let acc = initial
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      acc = f(arr[i]!, acc)
    }
    return acc
  }

export const reduce =
  <A, B>(initial: B) =>
  (f: (acc: B, a: A) => B) =>
  (list: List<A>): B => foldl(f)(initial)(list)

export const filter =
  <A>(predicate: (a: A) => boolean) =>
  (list: List<A>): List<A> => {
    const out: A[] = []
    let cursor: List<A> = list
    while (isCons(cursor)) {
      if (predicate(cursor.head)) out.push(cursor.head)
      cursor = cursor.tail
    }
    return fromArray(out)
  }

export const filterMap =
  <A, B>(f: (a: A) => Option<B>) =>
  (list: List<A>): List<B> => {
    const out: B[] = []
    let cursor: List<A> = list
    while (isCons(cursor)) {
      const ob = f(cursor.head)
      if (isSome(ob)) out.push(ob.value)
      cursor = cursor.tail
    }
    return fromArray(out)
  }

export const partition =
  <A>(predicate: (a: A) => boolean) =>
  (list: List<A>): readonly [List<A>, List<A>] => {
    const yes: A[] = []
    const no: A[] = []
    let cursor: List<A> = list
    while (isCons(cursor)) {
      if (predicate(cursor.head)) yes.push(cursor.head)
      else no.push(cursor.head)
      cursor = cursor.tail
    }
    return [fromArray(yes), fromArray(no)] as const
  }

export const partitionMap =
  <A, L, R>(f: (a: A) => Result<L, R>) =>
  (list: List<A>): readonly [List<L>, List<R>] => {
    const left: L[] = []
    const right: R[] = []
    let cursor: List<A> = list
    while (isCons(cursor)) {
      const res = f(cursor.head)
      if (isOk(res)) right.push(res.value)
      else left.push(res.error)
      cursor = cursor.tail
    }
    return [fromArray(left), fromArray(right)]
  }

export const compact = <A>(list: List<Option<A>>): List<A> =>
  filterMap<Option<A>, A>((oa) => oa)(list)

export const separate = <L, R>(list: List<Result<L, R>>): readonly [List<L>, List<R>] =>
  partitionMap<Result<L, R>, L, R>((res) => res)(list)

export const zip =
  <A>(bs: List<A>) =>
  <B>(as: List<B>): List<readonly [B, A]> => {
    const out: Array<readonly [B, A]> = []
    let left: List<B> = as
    let right: List<A> = bs
    while (isCons(left) && isCons(right)) {
      out.push([left.head, right.head] as const)
      left = left.tail
      right = right.tail
    }
    return fromArray(out)
  }

export const unzip = <A, B>(pairs: List<readonly [A, B]>): readonly [List<A>, List<B>] => {
  const left: A[] = []
  const right: B[] = []
  let cursor: List<readonly [A, B]> = pairs
  while (isCons(cursor)) {
    left.push(cursor.head[0])
    right.push(cursor.head[1])
    cursor = cursor.tail
  }
  return [fromArray(left), fromArray(right)]
}

export const take =
  (n: number) =>
  <A>(list: List<A>): List<A> => {
    if (n <= 0) return nil()
    const out: A[] = []
    let count = 0
    let cursor: List<A> = list
    while (isCons(cursor) && count < n) {
      out.push(cursor.head)
      cursor = cursor.tail
      count += 1
    }
    return fromArray(out)
  }

export const drop =
  (n: number) =>
  <A>(list: List<A>): List<A> => {
    let cursor: List<A> = list
    let count = 0
    while (isCons(cursor) && count < n) {
      cursor = cursor.tail
      count += 1
    }
    return cursor
  }

export const concat =
  <A>(that: List<A>) =>
  (list: List<A>): List<A> => {
    if (isNil(list)) return that
    if (isNil(that)) return list
    const out = [...toArray(list), ...toArray(that)]
    return fromArray(out)
  }

export const append =
  <A>(value: A) =>
  (list: List<A>): List<A> => concat(of(value))(list)

export const prepend =
  <A>(value: A) =>
  (list: List<A>): List<A> => cons(value)(list)

export const reverse = <A>(list: List<A>): List<A> => {
  let out: List<A> = nil()
  let cursor: List<A> = list
  while (isCons(cursor)) {
    out = cons(cursor.head)(out)
    cursor = cursor.tail
  }
  return out
}

export const length = (list: List<unknown>): number => {
  let count = 0
  let cursor: List<unknown> = list
  while (isCons(cursor)) {
    count += 1
    cursor = cursor.tail
  }
  return count
}

export const groupBy =
  <A, K>(keyOf: (a: A) => K) =>
  (list: List<A>): ReadonlyMap<K, List<A>> => {
    const buckets = new Map<K, A[]>()
    let cursor: List<A> = list
    while (isCons(cursor)) {
      const key = keyOf(cursor.head)
      const arr = buckets.get(key)
      if (arr) arr.push(cursor.head)
      else buckets.set(key, [cursor.head])
      cursor = cursor.tail
    }
    const out = new Map<K, List<A>>()
    for (const [k, arr] of buckets) {
      out.set(k, fromArray(arr))
    }
    return out
  }

export interface ApplicativeLike<F> {
  readonly map: <A, B>(f: (a: A) => B) => (fa: HKT<F, A>) => HKT<F, B>
  readonly ap: <A, B>(ff: HKT<F, (a: A) => B>) => (fa: HKT<F, A>) => HKT<F, B>
  readonly of: <A>(a: A) => HKT<F, A>
}

export type HKT<_F, A> = unknown

export const traverse =
  <F>(App: ApplicativeLike<F>) =>
  <A, B>(f: (a: A) => HKT<F, B>) =>
  (list: List<A>): HKT<F, List<B>> => {
    const arr = toArray(list)
    let acc = App.of<List<B>>(nil()) as HKT<F, List<B>>
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      const lifted = App.map((b: B) => (bs: List<B>) => cons(b)(bs))(f(arr[i]!))
      acc = App.ap(lifted)(acc)
    }
    return acc
  }

export const sequence =
  <F>(App: ApplicativeLike<F>) =>
  <A>(list: List<HKT<F, A>>): HKT<F, List<A>> => traverse(App)((x) => x)(list)

export const wither =
  <F>(App: ApplicativeLike<F>) =>
  <A, B>(f: (a: A) => HKT<F, Option<B>>) =>
  (list: List<A>): HKT<F, List<B>> => {
    const arr = toArray(list)
    let acc = App.of<List<B>>(nil()) as HKT<F, List<B>>
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      const lifted = App.map((ob: Option<B>) => (bs: List<B>) => (isSome(ob) ? cons(ob.value)(bs) : bs))(f(arr[i]!))
      acc = App.ap(lifted)(acc)
    }
    return acc
  }

export const listDo =
  <A>(f: () => Generator<List<unknown>, A, unknown>): List<A> => {
    const replay = (history: ReadonlyArray<unknown>): List<A> => {
      const iterator = f()
      let step = iterator.next()
      for (const value of history) {
        if (step.done) return of(step.value as A)
        step = iterator.next(value)
      }
      if (step.done) return of(step.value as A)
      const current = step.value as List<unknown>
      return chain((value: unknown) => replay([...history, value]))(current)
    }
    return replay([])
  }

export const listComprehension =
  <A, B, C>(
    as: List<A>,
    bs: (a: A) => List<B>,
    project: (a: A, b: B) => C,
  ): List<C> =>
    chain((a: A) => map((b: B) => project(a, b))(bs(a)))(as)

export const getEq = <A>(eqA: Eq<A>): Eq<List<A>> => (xs, ys) => {
  let left: List<A> = xs
  let right: List<A> = ys
  while (true) {
    if (isNil(left) || isNil(right)) return isNil(left) && isNil(right)
    if (!eqA(left.head, right.head)) return false
    left = left.tail
    right = right.tail
  }
}

export const getOrd = <A>(ordA: Ord<A>): Ord<List<A>> => (xs, ys) => {
  let left: List<A> = xs
  let right: List<A> = ys
  while (isCons(left) && isCons(right)) {
    const ordering = ordA(left.head, right.head)
    if (ordering !== 0) return ordering
    left = left.tail
    right = right.tail
  }
  if (isNil(left) && isNil(right)) return 0
  return isNil(left) ? -1 : 1
}

export const getSemigroup = <A>(): Semigroup<List<A>> => ({
  concat: (x, y) => concat(y)(x),
})

export const getMonoid = <A>(): Monoid<List<A>> => ({
  ...getSemigroup<A>(),
  empty: nil<A>(),
})

export interface ListFunctorInstance {
  readonly map: typeof map
}

export interface ListApplyInstance extends ListFunctorInstance {
  readonly ap: typeof ap
}

export interface ListApplicativeInstance extends ListApplyInstance {
  readonly of: typeof of
}

export interface ListMonadInstance extends ListApplicativeInstance {
  readonly chain: typeof chain
}

export interface ListFoldableInstance {
  readonly foldl: typeof foldl
  readonly foldr: typeof foldr
  readonly reduce: typeof reduce
}

export interface ListTraversableInstance extends ListFoldableInstance {
  readonly traverse: typeof traverse
  readonly sequence: typeof sequence
}

export interface ListFilterableInstance {
  readonly filter: typeof filter
  readonly filterMap: typeof filterMap
  readonly partition: typeof partition
  readonly partitionMap: typeof partitionMap
  readonly compact: typeof compact
  readonly separate: typeof separate
}

export interface ListWitherableInstance
  extends ListTraversableInstance,
    ListFilterableInstance {
  readonly wither: typeof wither
}

export const ListFunctor: ListFunctorInstance = {
  map,
}

export const ListApply: ListApplyInstance = {
  map,
  ap,
}

export const ListApplicative: ListApplicativeInstance = {
  map,
  ap,
  of,
}

export const ListMonad: ListMonadInstance = {
  map,
  ap,
  of,
  chain,
}

export const ListFoldable: ListFoldableInstance = {
  foldl,
  foldr,
  reduce,
}

export const ListTraversable: ListTraversableInstance = {
  foldl,
  foldr,
  reduce,
  traverse,
  sequence,
}

export const ListFilterable: ListFilterableInstance = {
  filter,
  filterMap,
  partition,
  partitionMap,
  compact,
  separate,
}

export const ListWitherable: ListWitherableInstance = {
  foldl,
  foldr,
  reduce,
  traverse,
  sequence,
  filter,
  filterMap,
  partition,
  partitionMap,
  compact,
  separate,
  wither,
}
