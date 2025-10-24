import { describe, expect, test } from "vitest";

import { textbookFunctorGallery } from "../textbook-functor-gallery";

const lookup = (name: string) => {
  const entry = textbookFunctorGallery.find((candidate) => candidate.name === name);
  if (!entry) {
    throw new Error(`Expected textbook functor gallery entry ${name}`);
  }
  return entry;
};

describe("textbook functor gallery", () => {
  test("catalogues forgetful functors", () => {
    const monoidEntry = lookup("Mon → Set (forgetful)");
    expect(monoidEntry.reports.faithfulness.holds).toBe(true);
    expect(monoidEntry.reports.fullness.holds).toBe(false);
    expect(monoidEntry.reports.essentialInjectivity.holds).toBe(false);
    expect(monoidEntry.reports.derivedEssentialInjectivity.holds).toBe(false);
    expect(monoidEntry.reports.essentialSurjectivity.holds).toBe(false);

    const groupEntry = lookup("Grp → Set (forgetful)");
    expect(groupEntry.reports.faithfulness.holds).toBe(true);
    expect(groupEntry.reports.fullness.holds).toBe(false);
    expect(groupEntry.reports.essentialInjectivity.holds).toBe(false);
    expect(groupEntry.reports.derivedEssentialInjectivity.holds).toBe(false);
    expect(groupEntry.reports.essentialSurjectivity.holds).toBe(false);
  });

  test("records abelian inclusion data", () => {
    const entry = lookup("Ab ↪ Grp (inclusion)");
    expect(entry.reports.faithfulness.holds).toBe(true);
    expect(entry.reports.fullness.holds).toBe(true);
    expect(entry.reports.essentialInjectivity.holds).toBe(true);
    expect(entry.reports.derivedEssentialInjectivity.holds).toBe(true);
    expect(entry.reports.essentialSurjectivity.holds).toBe(false);
  });

  test("highlights thinning and collapse behaviour", () => {
    const thinning = lookup("Pointed thinning");
    expect(thinning.reports.faithfulness.holds).toBe(false);
    expect(thinning.reports.fullness.holds).toBe(false);
    expect(thinning.reports.essentialInjectivity.holds).toBe(false);
    expect(thinning.reports.derivedEssentialInjectivity.holds).toBe(false);
    expect(thinning.reports.essentialSurjectivity.holds).toBe(true);

    const inclusion = lookup("Thin inclusion");
    expect(inclusion.reports.faithfulness.holds).toBe(true);
    expect(inclusion.reports.fullness.holds).toBe(true);
    expect(inclusion.reports.essentialInjectivity.holds).toBe(true);
    expect(inclusion.reports.derivedEssentialInjectivity.holds).toBe(true);
    expect(inclusion.reports.essentialSurjectivity.holds).toBe(false);

    const collapse = lookup("Total collapse");
    expect(collapse.reports.faithfulness.holds).toBe(false);
    expect(collapse.reports.fullness.holds).toBe(false);
    expect(collapse.reports.essentialInjectivity.holds).toBe(false);
    expect(collapse.reports.derivedEssentialInjectivity.holds).toBe(false);
    expect(collapse.reports.essentialSurjectivity.holds).toBe(false);
  });
});

