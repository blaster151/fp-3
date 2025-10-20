import { describe, expect, it } from "vitest";

import { makeGraph } from "../../graph";
import {
  GraphCategory,
  GraphFalseArrow,
  GraphNegation,
  GraphSubobjectClassifier,
  GraphTruthArrow,
  GraphInitialArrow,
} from "../../graph-subobject-classifier";
import { makeGraphHom, graphHomEquals } from "../../graph-category";

const graphsEqual = (left: ReturnType<typeof makeGraph>, right: ReturnType<typeof makeGraph>): boolean => {
  const leftNodes = new Set(left.nodes);
  const rightNodes = new Set(right.nodes);
  if (leftNodes.size !== rightNodes.size) return false;
  for (const node of leftNodes) {
    if (!rightNodes.has(node)) return false;
  }
  if (left.edges.length !== right.edges.length) return false;
  const rightEdges = new Map(right.edges.map((edge) => [edge.id, edge] as const));
  for (const edge of left.edges) {
    const candidate = rightEdges.get(edge.id);
    if (!candidate) return false;
    if (candidate.src !== edge.src || candidate.dst !== edge.dst) return false;
  }
  return true;
};

describe("Graph subobject classifier", () => {
  it("recovers the false arrow via characteristic classification", () => {
    const inclusion = GraphInitialArrow(GraphSubobjectClassifier.terminalObj);
    const characteristic = GraphSubobjectClassifier.characteristic(inclusion);
    expect(graphHomEquals(characteristic, GraphFalseArrow)).toBe(true);
  });

  it("negation swaps truth and false arrows", () => {
    const truthToFalse = GraphCategory.compose(GraphNegation, GraphTruthArrow);
    const falseToTruth = GraphCategory.compose(GraphNegation, GraphFalseArrow);
    expect(graphHomEquals(truthToFalse, GraphFalseArrow)).toBe(true);
    expect(graphHomEquals(falseToTruth, GraphTruthArrow)).toBe(true);
  });

  it("reconstructs subgraphs from their characteristic arrow", () => {
    const ambient = makeGraph(["A", "B"], [
      { id: "ab", src: "A", dst: "B" },
      { id: "ba", src: "B", dst: "A" },
    ]);
    const subgraph = makeGraph(["A"], []);
    const inclusion = makeGraphHom({
      dom: subgraph,
      cod: ambient,
      nodeImage: (node) => node,
      edgeImage: () => {
        throw new Error("subgraph edge lookup should not be used");
      },
    });

    const characteristic = GraphSubobjectClassifier.characteristic(inclusion);
    const reconstructed = GraphSubobjectClassifier.subobjectFromCharacteristic(characteristic);

    expect(graphsEqual(reconstructed.subobject, subgraph)).toBe(true);
    expect(graphHomEquals(reconstructed.inclusion, inclusion)).toBe(true);
    expect(
      graphHomEquals(GraphSubobjectClassifier.characteristic(reconstructed.inclusion), characteristic),
    ).toBe(true);
  });
});
