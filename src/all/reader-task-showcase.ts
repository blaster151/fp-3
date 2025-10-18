import { None, Some, Err, Ok } from "./option-result"
import {
  collectArray,
  collectMapEntries,
  collectMapValues,
  collectSet,
  filterMapArraySimple,
  pf,
} from "./collections-partial"
import type { PartialFn } from "./collections-partial"
import { eqStrict } from "../../stdlib/eq"
import { Reader, runReader } from "../../endo-2category"
import { ReaderTask, ReaderTaskResult } from "../../task"
import * as Expr from "../../stdlib/expr"
import type { Json } from "../../array-recursion"
import {
  jArr,
  jObj,
  jStr,
} from "../../array-recursion"
import { depthJson, sizeAndDepthJson, sizeJson, strsJson } from "../../json-recursion"
import type { Result } from "./option-result"

type AppEnv = { apiBase: string; token: string }

type Http = (input: RequestInfo, init?: RequestInit) => Promise<Response>
type EnvRT = { apiBase: string; http: Http }

type E = Error
type User = { id: string; name: string }
type EnvErr = { apiBase: string; http: Http }

type ExprEnvDemo = Readonly<Record<string, number>>

type ReaderTaskApplicativeShowcase = {
  readonly fetchUserName: ReaderTask<EnvErr, Result<E, string>>
  readonly partialFn: {
    readonly ints1: ReadonlyArray<number>
    readonly ints2: ReadonlyArray<number>
    readonly ages: ReadonlyMap<string, number>
    readonly byDomain: ReadonlyMap<string, string>
    readonly setInts: ReadonlySet<number>
  }
  readonly readerEval: {
    readonly program: Expr.Expr
    readonly emptyEnv: ExprEnvDemo
    readonly shadowEnv: ExprEnvDemo
    readonly emptyResult: number
    readonly shadowResult: number
  }
  readonly readerResult: {
    readonly expr: Expr.Expr
    readonly outcome: Result<string, number>
  }
  readonly stackMachine: {
    readonly expr: Expr.Expr
    readonly program: Expr.Program
    readonly result: Result<string, number>
  }
  readonly structuralMetrics: {
    readonly complexExpr: Expr.Expr
    readonly exprSize: number
    readonly exprDepth: number
    readonly complexJson: Json
    readonly jsonSize: number
    readonly jsonStrs: ReadonlyArray<string>
    readonly jsonDepth: number
    readonly jsonSize2: number
    readonly jsonDepth2: number
  }
}

const getJsonTR =
  <A>(path: string): ReaderTask<EnvErr, Result<E, A>> =>
  async (env: EnvErr) => {
    try {
      const res = await env.http(`${env.apiBase}${path}`)
      if (!res.ok) return Err(new Error(`HTTP ${res.status}`))
      return Ok((await res.json()) as A)
    } catch (u) {
      return Err(u instanceof Error ? u : new Error(String(u)))
    }
  }

export const readerTaskApplicativeShowcase: ReaderTaskApplicativeShowcase = (() => {
  const authHeader: Reader<AppEnv, Record<string, string>> = Reader.asks((env: AppEnv) => ({
    Authorization: `Bearer ${env.token}`,
  }))

  const url: Reader<AppEnv, string> = Reader.asks((env: AppEnv) => `${env.apiBase}/users/me`)

  const headersThenUrl = Reader.chain<Record<string, string>, string, AppEnv>((h: Record<string, string>) =>
    Reader.map<string, string>((u: string) => `${u}?auth=${!!h['Authorization']}`)(url)
  )(authHeader)

  runReader(headersThenUrl, { apiBase: "https://api.example.com", token: "T" })

  const getMe: ReaderTask<EnvRT, unknown> = ReaderTask.chain<string, unknown, EnvRT>(
    (u: string) =>
      async (env: EnvRT) => {
        const res = await env.http(u)
        return res.json()
      }
  )(
    ReaderTask.asks((env: EnvRT) => `${env.apiBase}/users/me`)
  )

  void ReaderTask.local<EnvRT, EnvRT>(
    (env: EnvRT) => ({ ...env, apiBase: "https://staging.example.com" })
  )(getMe)

  const getUser = (id: string): ReaderTask<EnvErr, Result<E, User>> =>
    getJsonTR<User>(`/users/${id}`)

  const fetchUserName: ReaderTask<EnvErr, Result<Error, string>> =
    ReaderTaskResult.map<EnvErr, Error, User, string>((u: User) => u.name)(
      getUser("42")
    )

  const intLike = (s: string) => /^-?\d+$/.test(s)
  const parseIntPF: PartialFn<string, number> = pf(intLike, (s: string) => Number(s))
  const parseUnknownPF: PartialFn<unknown, number> = {
    isDefinedAt: (value) => typeof value === "string" && intLike(value),
    apply: (value) => Number(value as string),
  }

  const raw = ["10", "x", "-3", "7.5", "0"]
  const ints1 = filterMapArraySimple(raw, (s: string) => (intLike(s) ? Some(Number(s)) : None))
  const ints2 = collectArray(raw, parseUnknownPF)

  const agesRaw = new Map<string, string>([["a","19"], ["b","oops"], ["c","42"]])
  const ages = collectMapValues(agesRaw, parseIntPF)

  const emails = new Map<string, string>([
    ["u1", "ada@example.com"],
    ["u2", "not-an-email"],
    ["u3", "bob@example.com"]
  ])
  const emailDomainPF: PartialFn<readonly [string, string], readonly [string, string]> =
    pf(
      ([, e]: readonly [string, string]) => /@/.test(e),
      ([id, e]: readonly [string, string]) => [e.split("@")[1]!, id] as const
    )
  const byDomain = collectMapEntries(emails, emailDomainPF)

  const setRaw = new Set(["1", "2", "two", "3"])
  const setInts = collectSet(eqStrict<number>())(setRaw, parseUnknownPF)

  const prog = Expr.lett("x", Expr.lit(10),
    Expr.addN([ Expr.vvar("x"), Expr.powE(Expr.lit(2), Expr.lit(3)), Expr.neg(Expr.lit(4)) ])
  )
  const emptyEnv: ExprEnvDemo = {}
  const shadowEnv: ExprEnvDemo = { x: 1 }
  const emptyResult = runReader(Expr.evalExprR_app(prog), emptyEnv)
  const shadowResult = runReader(Expr.evalExprR_app(prog), shadowEnv)

  const bad = Expr.divE(Expr.lit(1), Expr.add(Expr.vvar("d"), Expr.neg(Expr.vvar("d"))))
  const outcome = runReader(Expr.evalExprRR_app(bad), { d: 3 })

  const machineExpr = Expr.lett("y", Expr.lit(5), Expr.mul(Expr.add(Expr.vvar("y"), Expr.lit(1)), Expr.lit(3)))
  const program = Expr.compileExpr(machineExpr)
  const result = Expr.runProgram(program)

  const complexExpr = Expr.addN([
    Expr.neg(Expr.lit(4)),
    Expr.mulN([Expr.lit(2), Expr.lit(3)]),
    Expr.divE(Expr.lit(8), Expr.lit(2)),
  ])
  const [exprSize, exprDepth] = Expr.sizeAndDepthExpr(complexExpr)

  const complexJson = jObj([
    ['name', jStr('Ada')],
    ['tags', jArr([jStr('fp'), jStr('ts')])]
  ])
  const jsonSize = sizeJson(complexJson)
  const jsonStrs = strsJson(complexJson)
  const jsonDepth = depthJson(complexJson)
  const [jsonSize2, jsonDepth2] = sizeAndDepthJson(complexJson)

  return {
    fetchUserName,
    partialFn: { ints1, ints2, ages, byDomain, setInts },
    readerEval: { program: prog, emptyEnv, shadowEnv, emptyResult, shadowResult },
    readerResult: { expr: bad, outcome },
    stackMachine: { expr: machineExpr, program, result },
    structuralMetrics: {
      complexExpr,
      exprSize,
      exprDepth,
      complexJson,
      jsonSize,
      jsonStrs,
      jsonDepth,
      jsonSize2,
      jsonDepth2,
    },
  } as const
})()
