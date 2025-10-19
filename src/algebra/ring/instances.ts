import { eqStrict } from "../../../stdlib/eq"
import type { Ring } from "./structures"

export const RingReal: Ring<number> = {
  zero: 0,
  one: 1,
  add: (left, right) => left + right,
  mul: (left, right) => left * right,
  eq: eqStrict<number>(),
  neg: (value) => -value,
  sub: (left, right) => left - right,
}

export const RingInteger: Ring<bigint> = {
  zero: 0n,
  one: 1n,
  add: (left, right) => left + right,
  mul: (left, right) => left * right,
  eq: (left, right) => left === right,
  neg: (value) => -value,
  sub: (left, right) => left - right,
}

export const normalizeMod = (value: bigint, modulus: bigint): bigint => {
  if (modulus === 0n) return value
  const mod = value % modulus
  return mod >= 0n ? mod : mod + modulus
}

export const createModuloRing = (modulus: bigint): Ring<bigint> => {
  if (modulus <= 1n) throw new Error("Modulus must exceed 1 to form a nontrivial quotient ring")
  return {
    zero: normalizeMod(0n, modulus),
    one: normalizeMod(1n, modulus),
    add: (left, right) => normalizeMod(left + right, modulus),
    mul: (left, right) => normalizeMod(left * right, modulus),
    neg: (value) => normalizeMod(-value, modulus),
    sub: (left, right) => normalizeMod(left - right, modulus),
    eq: (left, right) => normalizeMod(left, modulus) === normalizeMod(right, modulus),
  }
}
