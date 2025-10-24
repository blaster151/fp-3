# Concrete Category Witnesses

`concrete-category.ts` assembles reusable witnesses for faithful forgetful functors into
`Set`, providing the data demanded by Milestone 30.

## Overview

* `concretizeForgetfulFunctor` packages a strengthened `FunctorWithWitness` together with
  faithfulness diagnostics and human-readable structure metadata.
* The module exports builders for textbook categories:
  * `buildConcreteFinSetWitness`
  * `buildConcreteMonoidWitness`
  * `buildConcreteGroupWitness`
  * `buildConcreteRingWitness`
  * `buildConcretePreorderWitness`
  * `buildConcretePointedSetWitness`
  * `buildExoticSubsetConcreteWitness`
* `detectConcreteObstruction` reuses the faithfulness oracle to witness when a candidate
  functor into `Set` fails to be faithful, yielding diagnostics for non-concrete
  categories.
* `concreteCategoryCatalogue` collects the standard witnesses for quick iteration in tests
  or documentation tooling.

## Integration Points

* `functor-actions.ts` now wires the monoid free/forgetful adjunction through
  `concretizeForgetfulFunctor`, exposing the concrete witness alongside the adjunction and
  induced list monad.
* Tests in `test/concrete-category.spec.ts` ensure that each builder reports faithfulness,
  the obstruction detector catches the collapse functor, and the free/forgetful
  adjunction exposes the witness.

Use these helpers whenever a new forgetful functor should advertise its faithful
underlying-set representation.
