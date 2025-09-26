import { describe, expect, it } from "vitest";
import { allCommute, commutes, composePath, id, isIdentity, paste } from "../diagram";

describe("diagram utilities", () => {
  it("detects commuting triangles", () => {
    const path1 = [(x: number) => x + 1, (x: number) => x * 2];
    const path2 = [(x: number) => x * 2, (x: number) => x + 2];
    expect(commutes(path1, path2, [0, 1, 2])).toBe(true);
  });

  it("pastes commuting paths and recognises identities", () => {
    const base = [(x: number) => x + 1];
    const loop = [id<number>()];
    const pasted = paste(base, loop);
    expect(composePath(pasted)(2)).toBe(3);
    expect(isIdentity(loop, [0, 5])).toBe(true);
    expect(allCommute([loop, loop], [7])).toBe(true);
  });
});
