import type { Top } from "./Topology";

/** Sierpinski space: carrier {0,1} with opens ∅, {1}, {0,1}. */
export function sierpinski(): Top<number> {
  const carrier = [0, 1];
  return { carrier, opens: [[], [1], [...carrier]] };
}
