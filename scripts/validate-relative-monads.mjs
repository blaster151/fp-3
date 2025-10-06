#!/usr/bin/env node
import { TwoObjectCategory } from "../two-object-cat";
import { virtualizeFiniteCategory } from "../virtual-equipment/adapters";
import {
  describeTrivialRelativeMonad,
  enumerateRelativeMonadOracles,
} from "../relative";

/**
 * Placeholder validator that will batch-run relative monad oracles once
 * canonical Street witnesses are wired in. For now we exercise the trivial
 * identity-root presentation so the CLI proves the plumbing exists.
 */
async function main() {
  console.log("validate-relative-monads: constructing trivial relative monad");
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const trivial = describeTrivialRelativeMonad(
    equipment,
    TwoObjectCategory.objects[0] ?? "•",
  );
  const results = enumerateRelativeMonadOracles(trivial);
  for (const entry of results) {
    console.log(`- ${entry.registryPath}: pending=${entry.pending} holds=${entry.holds}`);
  }
  console.log(
    "TODO(relative): replace the trivial probe with registered Street-action presentations.",
  );
}

main().catch((error) => {
  console.error("validate-relative-monads: unexpected failure", error);
  process.exitCode = 1;
});
