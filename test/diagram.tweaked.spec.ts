import { describe, expect, it } from "vitest";
import { commutesTweaked } from "../diagram";

describe("tweaked commutativity", () => {
  const sampleE = [0, 1, 2];
  const sampleA = [3, 4];
  const e = (_: number) => 0;
  const f = (a: number) => a + 1;
  const g = (_: number) => 1;
  const h = (_: number) => 2;

  it("does not force equality of parallel arrows", () => {
    expect(commutesTweaked([f], [g], sampleA)).toBe(true);
  });

  it("forks commute without collapsing arrows", () => {
    expect(commutesTweaked([f, e], [g, e], sampleE)).toBe(true);
  });

  it("still detects distinct composites", () => {
    expect(commutesTweaked([f, h], [g, e], sampleE)).toBe(false);
  });
});
