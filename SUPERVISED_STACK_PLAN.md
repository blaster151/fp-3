# Supervised Kernel/User Monad Stack — Implementation Plan

This note captures the staged work for Cursor Next Steps item 10.  It focuses on
establishing a reusable scaffold that ties kernel/user monads, residual
diagnostics, and the existing runner infrastructure together.

## 1. Data model

1. **Kernel signatures**
   - `KernelSignature` collects the state carrier, exception family, signal
     family, and any residual monad metadata (hooked into the residual handler
     utilities added in item 9).
   - `KernelMonadSpec` packages `KernelSignature` together with the underlying
     monad construction recipe and residual notes.

2. **User signatures**
   - `UserMonadSpec` records which operations are delegated to the user and how
     they project into the kernel monad via a comparison morphism
     `ι_user : U ⇒ K`.

3. **Stack descriptor**
   - `SupervisedStack` aggregates the kernel spec, user spec, comparison
     morphisms, and the resulting monads.

## 2. Builders and diagnostics

1. `makeKernelMonad(signature)` returns the kernel monad together with
   diagnostics (state catalogue, exception/signal tables, residual notes).
2. `makeUserMonad(kernel, spec)` builds the user monad plus the comparison
   morphisms into the kernel monad.
3. `makeSupervisedStack(interaction, kernelSpec, userSpec)` orchestrates the
   previous steps and records:
   - residual coverage information (reuse `attachResidualHandlers`),
   - comparison summaries (`userToKernel`, unsupported/unused operations),
     plus stack-level diagnostics.

## 3. Runner integration

1. `stackToRunner(interaction, stack)` produces a `StatefulRunner` annotated
   with residual coverage, stack metadata, and kernel state carriers.
2. `runnerToStack` reads the embedded metadata to recover kernel/user names,
   operation catalogues, and residual summary counts; a full inverse will attach
   concrete specs once the supervised stack semantics are finalised.

## 4. Testing roadmap

1. `test/stateful-runner.spec.ts` now executes an Example-style supervised
   scenario once the constructors are active.
2. Regression assertions cover comparison diagnostics, residual coverage, kernel
   operation semantics (state read/exception), and runner translation scaffolding.

## 5. Documentation updates

1. `LAWS.md` receives a stub “Supervised kernel/user stack” subsection that
   references this plan and lists the forthcoming oracles/diagnostics.
2. `Cursor Next Steps.md` has been updated with the plan and follow-up actions.

## 6. Next steps

1. Extend `runnerToStack` into a full inverse and surface comparison morphisms
   for λ₍coop₎ (reconstruct per-operation handlers, diagnostics, and specs).
2. Integrate the λ₍coop₎ interpreter and add supervised stack oracles/reporting.
