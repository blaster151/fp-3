import { describe, expect, it } from "vitest";

import {
  SetCat,
  type SetHom,
  type SetObj,
  type SetTerminalObject,
} from "../set-cat";
import { SetNaturalNumbersObject } from "../set-subobject-classifier";

describe("SetNaturalNumbersObject semantics", () => {
  it("respects target semantics when inducing mediators", () => {
    type Wrapper = { readonly value: number };

    const wrappers: Wrapper[] = Array.from({ length: 6 }, (_, value) => ({ value }));
    const target: SetObj<Wrapper> = SetCat.obj(wrappers, {
      equals: (left, right) => left.value === right.value,
      tag: "SetNaturalNumbersObjectSemanticsTarget",
    });

    const { object: terminalObj } = SetCat.terminal();

    const zero: SetHom<SetTerminalObject, Wrapper> = {
      dom: terminalObj,
      cod: target,
      map: () => ({ value: 0 }),
    };

    const successor: SetHom<Wrapper, Wrapper> = {
      dom: target,
      cod: target,
      map: (input) => ({ value: input.value + 1 }),
    };

    const witness = SetNaturalNumbersObject.induce({ target, zero, successor });

    const third = witness.mediator.map(3);
    expect(third).toEqual({ value: 3 });

    const targetSemantics = SetCat.semantics(target);
    expect(targetSemantics?.has(third)).toBe(true);
    expect(wrappers.some((wrapper) => wrapper === third)).toBe(false);
    expect(target.has(third)).toBe(false);
  });
});
