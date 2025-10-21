import { describe, expect, it } from "vitest";

import { makeGraph } from "../../graph";
import type { Edge, NodeId } from "../../graph";
import {
  GraphCategory,
  GraphFalseArrow,
  GraphPowerObject,
  GraphPullbacks,
  GraphTruthArrow,
  graphBinaryProductWithPair,
  graphHomEquals,
  graphPowerObjectDecodeNode,
} from "../../graph-subobject-classifier";
import { makeGraphHom } from "../../graph-category";

const collectEdgesById = (edges: ReadonlyArray<Edge>): Map<string, Edge> =>
  new Map(edges.map((edge) => [edge.id, edge] as const));

describe("Graph power objects", () => {
  it("builds the membership pullback along the truth arrow", () => {
    const anchor = makeGraph(["Y0", "Y1"], [{ id: "y01", src: "Y0", dst: "Y1" }]);
    const powerWitness = GraphPowerObject(anchor);

    expect(powerWitness.anchor).toBe(anchor);
    expect(powerWitness.membership.evaluation.cod).toBe(GraphTruthArrow.cod);
    expect(powerWitness.membership.certification.valid).toBe(true);

    const evaluationComposite = GraphCategory.compose(
      powerWitness.membership.evaluation,
      powerWitness.membership.pullback.toDomain,
    );
    const truthComposite = GraphCategory.compose(
      GraphTruthArrow,
      powerWitness.membership.pullback.toAnchor,
    );

    expect(graphHomEquals(evaluationComposite, truthComposite)).toBe(true);

    const manual = GraphPullbacks.pullback(
      powerWitness.membership.evaluation,
      GraphTruthArrow,
    );

    expect(graphHomEquals(manual.toDomain, powerWitness.membership.pullback.toDomain)).toBe(true);
    expect(graphHomEquals(manual.toAnchor, powerWitness.membership.pullback.toAnchor)).toBe(true);
  });

  it("classifies subgraphs of X × Y via Ω^Y transposes", () => {
    const anchor = makeGraph(["Y0", "Y1"], [{ id: "y01", src: "Y0", dst: "Y1" }]);
    const ambient = makeGraph(
      ["X0", "X1", "X2"],
      [
        { id: "x01", src: "X0", dst: "X1" },
        { id: "x12", src: "X1", dst: "X2" },
      ],
    );

    const powerWitness = GraphPowerObject(anchor);
    const product = graphBinaryProductWithPair(ambient, anchor);
    const productGraph = product.obj;
    const projectionToAmbient = product.projections[0]!;
    const projectionToAnchor = product.projections[1]!;

    const includeNode = (node: NodeId): boolean => {
      const ambientNode = projectionToAmbient.mapNode(node);
      const anchorNode = projectionToAnchor.mapNode(node);
      return ambientNode === "X0" || anchorNode === "Y1";
    };

    const includedNodes = new Set<NodeId>();
    for (const node of productGraph.nodes) {
      if (includeNode(node)) {
        includedNodes.add(node);
      }
    }

    const productEdgesById = collectEdgesById(productGraph.edges);
    const includedEdges: Edge[] = [];
    for (const edge of productGraph.edges) {
      if (includedNodes.has(edge.src) && includedNodes.has(edge.dst)) {
        includedEdges.push(edge);
      }
    }

    const relationDomain = makeGraph(
      includedNodes,
      includedEdges.map((edge) => ({ id: edge.id, src: edge.src, dst: edge.dst })),
    );

    const relation = makeGraphHom({
      dom: relationDomain,
      cod: productGraph,
      nodeImage: (node) => node,
      edgeImage: (edge) => {
        const witness = productEdgesById.get(edge.id);
        if (!witness) {
          throw new Error(`GraphPowerObject test: missing edge ${edge.id} in product.`);
        }
        return witness;
      },
    });

    const classification = powerWitness.classify({
      ambient,
      relation,
      product,
      pullbacks: GraphPullbacks,
    });

    expect(classification.certification.valid).toBe(true);

    const decodeAssignment = (node: string): Map<string, string> => {
      const image = classification.mediator.mapNode(node);
      const assignment = graphPowerObjectDecodeNode(powerWitness.powerObj, image);
      return new Map(assignment) as Map<string, string>;
    };

    const assignmentX0 = decodeAssignment("X0");
    const assignmentX1 = decodeAssignment("X1");
    const assignmentX2 = decodeAssignment("X2");

    expect(assignmentX0.get("Y0")).toBe("in");
    expect(assignmentX0.get("Y1")).toBe("in");
    expect(assignmentX1.get("Y0")).toBe("out");
    expect(assignmentX1.get("Y1")).toBe("in");
    expect(assignmentX2.get("Y0")).toBe("out");
    expect(assignmentX2.get("Y1")).toBe("in");

    const recoveredRelation = GraphCategory.compose(
      classification.pullback.toDomain,
      classification.relationIso.forward,
    );
    expect(graphHomEquals(recoveredRelation, relation)).toBe(true);

    const relationCone = {
      apex: relation.dom,
      toDomain: relation,
      toAnchor: classification.relationAnchor,
    };

    const factor = classification.factorCone(relationCone);
    expect(factor.factored).toBe(true);
    expect(graphHomEquals(factor.mediator!, classification.relationIso.forward)).toBe(true);

    const membershipComposite = GraphCategory.compose(
      powerWitness.membership.inclusion,
      classification.relationAnchor,
    );
    const pairingComposite = GraphCategory.compose(classification.pairing, relation);
    expect(graphHomEquals(membershipComposite, pairingComposite)).toBe(true);
  });

  it("rejects non-monomorphic relations", () => {
    const anchor = makeGraph(["Y"], []);
    const ambient = makeGraph(["X0", "X1"], []);
    const powerWitness = GraphPowerObject(anchor);
    const product = graphBinaryProductWithPair(ambient, anchor);

    const relationDomain = makeGraph(["r0", "r1"], []);
    const relation = makeGraphHom({
      dom: relationDomain,
      cod: product.obj,
      nodeImage: () => {
        const [first] = product.obj.nodes;
        if (!first) throw new Error("GraphPowerObject test: product lacks nodes");
        return first;
      },
      edgeImage: () => {
        throw new Error("GraphPowerObject test: unexpected edge lookup");
      },
    });

    expect(() =>
      powerWitness.classify({
        ambient,
        relation,
        product,
        pullbacks: GraphPullbacks,
      }),
    ).toThrow(/monic/i);
  });

  it("rejects malformed product witnesses", () => {
    const anchor = makeGraph(["Y"], []);
    const ambient = makeGraph(["X"], []);
    const powerWitness = GraphPowerObject(anchor);
    const product = graphBinaryProductWithPair(ambient, anchor);
    const swapped = {
      obj: product.obj,
      projections: [product.projections[1]!, product.projections[0]!] as const,
      pair: product.pair,
    };

    const relationDomain = makeGraph(["r"], []);
    const relation = makeGraphHom({
      dom: relationDomain,
      cod: product.obj,
      nodeImage: (node) => {
        const [first] = product.obj.nodes;
        if (!first) throw new Error("GraphPowerObject test: product lacks nodes");
        return first;
      },
      edgeImage: () => {
        throw new Error("GraphPowerObject test: unexpected edge lookup");
      },
    });

    expect(() =>
      powerWitness.classify({
        ambient,
        relation,
        product: swapped,
        pullbacks: GraphPullbacks,
      }),
    ).toThrow(/product|ambient|anchor/i);
  });

  it("detects attempts to classify the false point", () => {
    const anchor = makeGraph(["Y"], []);
    const powerWitness = GraphPowerObject(anchor);
    const membershipComposite = GraphCategory.compose(
      powerWitness.membership.evaluation,
      powerWitness.membership.pullback.toDomain,
    );
    const truthComposite = GraphCategory.compose(GraphTruthArrow, powerWitness.membership.pullback.toAnchor);
    const falseComposite = GraphCategory.compose(GraphFalseArrow, powerWitness.membership.pullback.toAnchor);

    expect(graphHomEquals(membershipComposite, truthComposite)).toBe(true);
    expect(graphHomEquals(membershipComposite, falseComposite)).toBe(false);
  });
});
