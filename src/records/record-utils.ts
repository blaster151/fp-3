/**
 * Strongly typed record helpers extracted from allTS.ts.
 */

/** Type-safe own-property check (narrows K to keyof T) */
export const hasOwn = <
  T extends object,
  K extends PropertyKey
>(obj: T, key: K): key is Extract<K, keyof T> =>
  Object.prototype.hasOwnProperty.call(obj, key)

/** Typed Object.keys with readonly result */
export const keys = <T extends Record<PropertyKey, unknown>>(
  obj: T
): ReadonlyArray<keyof T> =>
  Object.keys(obj) as ReadonlyArray<keyof T>

/** Typed Object.values with readonly result */
export const values = <T extends Record<PropertyKey, unknown>>(
  obj: T
): ReadonlyArray<T[keyof T]> =>
  Object.values(obj) as ReadonlyArray<T[keyof T]>

/** Typed Object.entries with readonly result */
export const entries = <T extends Record<PropertyKey, unknown>>(
  obj: T
): ReadonlyArray<readonly [keyof T, T[keyof T]]> =>
  Object.entries(obj) as ReadonlyArray<readonly [keyof T, T[keyof T]]>

/** fromEntries with precise key/value typing and readonly result */
export const fromEntries = <
  K extends PropertyKey,
  V
>(pairs: ReadonlyArray<readonly [K, V]>): Readonly<Record<K, V>> => {
  const out = {} as Record<K, V>
  for (const [k, v] of pairs) out[k] = v
  return out
}

/**
 * mapValues — transform each value while preserving the key set.
 */
export const mapValues = <
  T extends Record<PropertyKey, unknown>,
  B
>(
  obj: T,
  f: <K extends keyof T>(value: T[K], key: K) => B
): Readonly<{ [K in keyof T]: B }> => {
  const out = {} as { [K in keyof T]: B }
  for (const k in obj) {
    if (hasOwn(obj, k)) {
      const key = k as keyof T
      out[key] = f(obj[key], key)
    }
  }
  return out
}

/**
 * mapEntries — transform ([key, value]) -> [newKey, newValue].
 */
export const mapEntries = <
  T extends Record<PropertyKey, unknown>,
  NK extends PropertyKey,
  B
>(
  obj: T,
  f: <K extends keyof T>(entry: readonly [K, T[K]]) => readonly [NK, B]
): Readonly<Record<NK, B>> => {
  const out = {} as Record<NK, B>
  for (const k in obj) {
    if (hasOwn(obj, k)) {
      const key = k as keyof T
      const [nk, nv] = f([key, obj[key]])
      out[nk] = nv
    }
  }
  return out
}

/**
 * filterValues — keep entries whose value satisfies `pred`.
 * Returns a readonly Partial because the surviving key set is not known at compile time.
 */
export function filterValues<T extends Record<PropertyKey, unknown>>(
  obj: T,
  pred: <K extends keyof T>(value: T[K], key: K) => boolean
): Readonly<Partial<T>>

export function filterValues<T extends Record<PropertyKey, unknown>, V>(
  obj: T,
  pred: <K extends keyof T>(value: T[K], key: K) => value is Extract<T[K], V>
): Readonly<Partial<{ [K in keyof T]: Extract<T[K], V> }>>

export function filterValues<T extends Record<PropertyKey, unknown>>(
  obj: T,
  pred: (value: T[keyof T], key: keyof T) => boolean
): Readonly<Partial<T>> {
  const out: Partial<T> = {}
  for (const k in obj) {
    if (hasOwn(obj, k)) {
      const key = k as keyof T
      const v = obj[key]
      if (pred(v, key)) out[key] = v
    }
  }
  return out
}

/** filterKeys — keep entries whose key satisfies `pred` */
export const filterKeys = <T extends Record<PropertyKey, unknown>>(
  obj: T,
  pred: (key: keyof T) => boolean
): Readonly<Partial<T>> => {
  const out: Partial<T> = {}
  for (const key of keys(obj)) {
    if (pred(key)) {
      out[key] = obj[key]
    }
  }
  return out
}

/** pick — keep only `K` keys (typed) */
export const pick = <T extends Record<PropertyKey, unknown>, K extends keyof T>(
  obj: T,
  ks: ReadonlyArray<K>
): Readonly<Pick<T, K>> => {
  const out: Partial<T> = {}
  for (const key of ks) {
    if (hasOwn(obj, key)) {
      out[key] = obj[key]
    }
  }
  return out as Readonly<Pick<T, K>>
}

/** omit — drop `K` keys (typed) */
export const omit = <T extends Record<PropertyKey, unknown>, K extends keyof T>(
  obj: T,
  ks: ReadonlyArray<K>
): Readonly<Omit<T, K>> => {
  const out: Partial<T> = {}
  const drop = new Set<PropertyKey>(ks as ReadonlyArray<PropertyKey>)
  for (const key of keys(obj)) {
    if (!drop.has(key)) {
      out[key] = obj[key]
    }
  }
  return out as Readonly<Omit<T, K>>
}
