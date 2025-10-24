import {
  buildConcreteFinSetWitness,
  buildConcreteMonoidWitness,
  buildConcreteGroupWitness,
  buildConcreteRingWitness,
  buildConcretePreorderWitness,
  buildConcretePointedSetWitness,
  buildExoticSubsetConcreteWitness,
  concreteCategoryCatalogue,
  detectConcreteObstruction,
} from "../concrete-category";
import { textbookFunctorGallery } from "../textbook-functor-gallery";
import { freeForgetfulAdjunctionWithWitness } from "../functor-actions";

const catalogueWitnesses = [
  buildConcreteFinSetWitness,
  buildConcreteMonoidWitness,
  buildConcreteGroupWitness,
  buildConcreteRingWitness,
  buildConcretePreorderWitness,
  buildConcretePointedSetWitness,
  buildExoticSubsetConcreteWitness,
];

describe("concrete-category witnesses", () => {
  test("each standard builder reports faithful forgetful functors", () => {
    for (const builder of catalogueWitnesses) {
      const witness = builder();
      expect(witness.faithfulness.holds).toBe(true);
      expect(witness.faithfulness.failures).toHaveLength(0);
    }
  });

  test("catalogue aggregates all concrete witnesses", () => {
    const catalogue = concreteCategoryCatalogue();
    expect(catalogue).toHaveLength(catalogueWitnesses.length);
    for (const entry of catalogue) {
      expect(entry.faithfulness.holds).toBe(true);
    }
  });

  test("obstruction detector flags the collapse functor as non-faithful", () => {
    const collapse = textbookFunctorGallery.find((entry) => entry.name === "Total collapse");
    expect(collapse).toBeDefined();
    const analysis = detectConcreteObstruction(collapse!.functor);
    expect(analysis.isFaithful).toBe(false);
    expect(analysis.faithfulness.failures.length).toBeGreaterThan(0);
  });

  test("free ⊣ forgetful adjunction exposes a concrete witness", () => {
    const toolkit = freeForgetfulAdjunctionWithWitness();
    expect(toolkit.concrete).toBeDefined();
    expect(toolkit.concrete!.descriptor.name).toBe("Mon");
    expect(toolkit.concrete!.faithfulness.holds).toBe(true);
  });
});
