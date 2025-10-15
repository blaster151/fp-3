import { describe, expect, it, vi } from "vitest"
import { None, Some } from "../option"
import { Err, Ok } from "../result"
import { DoRTO, RTO_, ReaderTaskOption, TaskOption, genRTO } from "../reader-task-option"
import type { ReaderTaskOption as ReaderTaskOptionT } from "../reader-task-option"
import type { TaskResult } from "../task"

describe("TaskOption", () => {
  it("maps and chains asynchronously", async () => {
    const doubled = TaskOption.map((n: number) => n * 2)(TaskOption.of(4))
    await expect(doubled()).resolves.toEqual(Some(8))

    const chained = TaskOption.chain((n: number) => TaskOption.of(n + 3))(TaskOption.of(1))
    await expect(chained()).resolves.toEqual(Some(4))
  })

  it("lifts plain options and nullable values", async () => {
    const some = await TaskOption.fromOption(Some("hi"))()
    expect(some).toEqual(Some("hi"))

    const fromNullable = await TaskOption.fromNullable("there")()
    expect(fromNullable).toEqual(Some("there"))

    const noneNullable = await TaskOption.fromNullable<string | null>(null)()
    expect(noneNullable).toBe(None)
  })

  it("short-circuits chain on None", async () => {
    const spy = vi.fn(() => TaskOption.of("should not run"))
    const start = TaskOption.none<number>()

    const result = await TaskOption.chain(spy)(start)()
    expect(result).toBe(None)
    expect(spy).not.toHaveBeenCalled()
  })

  it("ap combines present values", async () => {
    const lifted = TaskOption.ap(TaskOption.of((n: number) => n + 1))(TaskOption.of(9))
    await expect(lifted()).resolves.toEqual(Some(10))
  })

  it("orElse only evaluates the fallback when needed", async () => {
    const fallback = vi.fn(() => TaskOption.of(42))

    const keepOriginal = await TaskOption.orElse(fallback)(TaskOption.of(5))()
    expect(keepOriginal).toEqual(Some(5))
    expect(fallback).not.toHaveBeenCalled()

    const useFallback = await TaskOption.orElse(fallback)(TaskOption.none<number>())()
    expect(useFallback).toEqual(Some(42))
    expect(fallback).toHaveBeenCalledTimes(1)
  })

  it("converts to and from TaskResult", async () => {
    const okTask: TaskResult<string, number> = async () => Ok(7)
    const errTask: TaskResult<string, number> = async () => Err("boom")

    await expect(TaskOption.fromResultOk(okTask)()).resolves.toEqual(Some(7))
    const none = await TaskOption.fromResultOk(errTask)()
    expect(none).toBe(None)

    await expect(TaskOption.toResult(() => "missing")(TaskOption.of("value"))()).resolves.toEqual(
      Ok("value"),
    )
    await expect(TaskOption.toResult(() => "missing")(TaskOption.none<string>())()).resolves.toEqual(
      Err("missing"),
    )
  })
})

describe("ReaderTaskOption", () => {
  type Env = { readonly base: number; readonly increment: number }

  it("reuses the environment across map and chain", async () => {
    const base = ReaderTaskOption.map((env: Env) => env.base)(ReaderTaskOption.ask<Env>())
    const sum = ReaderTaskOption.chain<number, number, Env>((b) =>
      ReaderTaskOption.map((env: Env) => b + env.increment)(ReaderTaskOption.ask<Env>()),
    )(base)

    await expect(sum({ base: 2, increment: 5 })).resolves.toEqual(Some(7))
  })

  it("short-circuits chain when a bound computation is None", async () => {
    const spy = vi.fn((_n: number) => ReaderTaskOption.of<Env, string>("impossible"))
    const start: ReaderTaskOptionT<Env, number> = async () => None

    const result = await ReaderTaskOption.chain(spy)(start)({ base: 1, increment: 2 })
    expect(result).toBe(None)
    expect(spy).not.toHaveBeenCalled()
  })

  it("getOrElse recovers with a default when the option is empty", async () => {
    const choose = ReaderTaskOption.getOrElse(() => -1)

    const some = await choose(ReaderTaskOption.of<Env, number>(3))({ base: 0, increment: 0 })
    expect(some).toBe(3)

    const fallback = await choose(ReaderTaskOption.none<Env>())({ base: 0, increment: 0 })
    expect(fallback).toBe(-1)
  })

  it("lifts Reader and TaskOption sources", async () => {
    const fromReader = ReaderTaskOption.fromReader<Env, number>((env) => env.base * 2)
    const fromTask = ReaderTaskOption.fromTaskOption<Env, string>(TaskOption.of("ready"))

    await expect(fromReader({ base: 3, increment: 1 })).resolves.toEqual(Some(6))
    await expect(fromTask({ base: 0, increment: 0 })).resolves.toEqual(Some("ready"))
  })

  it("local re-targets the environment", async () => {
    type Outer = { readonly inner: Env }
    const innerAsk = ReaderTaskOption.local<Env, Outer>((outer) => outer.inner)(ReaderTaskOption.ask<Env>())

    await expect(
      innerAsk({ inner: { base: 10, increment: 1 } }),
    ).resolves.toEqual(Some({ base: 10, increment: 1 }))
  })
})

describe("DoRTO", () => {
  type Env = { readonly payload: number }

  it("accumulates bound values and lets", async () => {
    const program = DoRTO<Env>()
      .bind("value", ReaderTaskOption.map((env: Env) => env.payload)(ReaderTaskOption.ask<Env>()))
      .let("offset", 3)
      .map(({ value, offset }) => value + offset)

    await expect(program({ payload: 4 })).resolves.toEqual(Some(7))
  })

  it("stops evaluating once a bind yields None", async () => {
    const program = DoRTO<Env>()
      .bind("value", async () => None)
      .map(() => "ignored")

    const result = await program({ payload: 1 })
    expect(result).toBe(None)
  })

  it("exposes the intermediate record via done", async () => {
    const builder = DoRTO<Env>()
      .bind("payload", ReaderTaskOption.ask<Env>())
      .let("message", "seen")

    const done = builder.done()
    await expect(done({ payload: 4 })).resolves.toEqual(
      Some({ payload: { payload: 4 }, message: "seen" }),
    )
  })
})

describe("genRTO", () => {
  type Env = { readonly message: string; readonly enabled: boolean }

  it("supports generator-based sequencing", async () => {
    const program = genRTO<Env>()(function* () {
      const env = yield* RTO_(ReaderTaskOption.ask<Env>())
      const final = yield* RTO_(ReaderTaskOption.of<Env, string>(env.message.toUpperCase()))
      return final
    })

    await expect(program({ message: "hello", enabled: true })).resolves.toEqual(Some("HELLO"))
  })

  it("propagates None from within the generator", async () => {
    const program = genRTO<Env>()(function* () {
      const env = yield* RTO_(ReaderTaskOption.ask<Env>())
      if (!env.enabled) {
        return (yield* RTO_(ReaderTaskOption.none<Env>())) as never
      }
      return env.message
    })

    const disabled = await program({ message: "hi", enabled: false })
    expect(disabled).toBe(None)

    await expect(program({ message: "hi", enabled: true })).resolves.toEqual(Some("hi"))
  })
})
