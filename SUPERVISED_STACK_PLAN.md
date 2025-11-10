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
   - verification that the comparison morphisms respect the intended boundary
     (placeholder until semantics are implemented).

## 3. Runner integration

1. `stackToRunner(interaction, stack)` produces a `StatefulRunner` annotated
   with residual coverage and stack metadata.
2. `runnerToStack` is a documented TODO, to be implemented once the supervised
   stack semantics are finalised.

## 4. Testing roadmap

1. Add a planning placeholder (`describe.skip`) in `test/stateful-runner.spec.ts`
   outlining an Example-style supervised scenario (file-handle runner).
2. When the constructors are ready, unskip and extend the tests to:
   - assert comparison morphism diagnostics,
   - confirm the residual coverage report,
   - check the runner translation.

## 5. Documentation updates

1. `LAWS.md` receives a stub “Supervised kernel/user stack” subsection that
   references this plan and lists the forthcoming oracles/diagnostics.
2. `Cursor Next Steps.md` has been updated with the plan and follow-up actions.

## 6. Next steps

1. Implement the builders in `supervised-stack.ts`.
2. Populate the comparison morphism checker.
3. Connect the λ₍coop₎ interpreter once the stack can execute example programs.
