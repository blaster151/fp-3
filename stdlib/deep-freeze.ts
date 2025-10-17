export type DeepReadonly<T> =
  T extends (...args: infer A) => infer R ? (...args: A) => R :
  T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepReadonly<U>> :
  T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>> :
  T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> :
  T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> :
  T extends ReadonlySet<infer U> ? ReadonlySet<DeepReadonly<U>> :
  T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>> :
  T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } :
  T

const readonlyMapProxy = <K, V>(m: Map<K, V>): ReadonlyMap<K, V> =>
  new Proxy<Map<K, V>>(m, {
    get(target, prop, receiver) {
      if (prop === "set" || prop === "clear" || prop === "delete") {
        return () => {
          throw new Error("ReadonlyMap: mutation disabled")
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  }) as unknown as ReadonlyMap<K, V>

const readonlySetProxy = <A>(s: Set<A>): ReadonlySet<A> =>
  new Proxy<Set<A>>(s, {
    get(target, prop, receiver) {
      if (prop === "add" || prop === "clear" || prop === "delete") {
        return () => {
          throw new Error("ReadonlySet: mutation disabled")
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  }) as unknown as ReadonlySet<A>

export const deepFreeze = <T>(input: T): DeepReadonly<T> => {
  if (input === null || typeof input !== "object") return input as DeepReadonly<T>

  if (Array.isArray(input)) {
    const frozenItems = input.map((item) => deepFreeze(item))
    return Object.freeze(frozenItems) as DeepReadonly<T>
  }

  if (input instanceof Map) {
    type Key = T extends Map<infer K, unknown>
      ? K
      : T extends ReadonlyMap<infer K, unknown>
        ? K
        : never
    type Value = T extends Map<unknown, infer V>
      ? V
      : T extends ReadonlyMap<unknown, infer V>
        ? V
        : never
    const frozen = new Map<DeepReadonly<Key>, DeepReadonly<Value>>()
    const entries = input as unknown as Map<Key, Value>
    for (const [k, v] of entries) frozen.set(deepFreeze(k), deepFreeze(v))
    return readonlyMapProxy(frozen) as DeepReadonly<T>
  }

  if (input instanceof Set) {
    type Value = T extends Set<infer U>
      ? U
      : T extends ReadonlySet<infer U>
        ? U
        : never
    const frozen = new Set<DeepReadonly<Value>>()
    const entries = input as unknown as Set<Value>
    for (const v of entries) frozen.add(deepFreeze(v))
    return readonlySetProxy(frozen) as DeepReadonly<T>
  }

  const obj = input as Record<PropertyKey, unknown>
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    obj[k] = deepFreeze(v)
  }
  return Object.freeze(obj) as DeepReadonly<T>
}
