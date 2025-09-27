import type { DiGraph, NodeId } from './graph';

export interface Path {
  readonly src: NodeId;
  readonly dst: NodeId;
  readonly edgeIds: ReadonlyArray<string>;
}

export interface FreeCat {
  readonly objects: ReadonlySet<NodeId>;
  id(node: NodeId): Path;
  compose(g: Path, f: Path): Path;
  pathsFrom?(node: NodeId, maxLen: number): Path[];
}

function requireNode(objs: ReadonlySet<NodeId>, node: NodeId): void {
  if (!objs.has(node)) {
    throw new Error(`FreeCategory: unknown node ${String(node)}`);
  }
}

export function FreeCategory(graph: DiGraph): FreeCat {
  const objects = new Set(graph.nodes);

  function id(node: NodeId): Path {
    requireNode(objects, node);
    return { src: node, dst: node, edgeIds: [] };
  }

  function compose(g: Path, f: Path): Path {
    if (f.dst !== g.src) {
      throw new Error('FreeCategory: compose domain/codomain mismatch');
    }
    requireNode(objects, f.src);
    requireNode(objects, g.dst);
    return { src: f.src, dst: g.dst, edgeIds: [...f.edgeIds, ...g.edgeIds] };
  }

  function pathsFrom(node: NodeId, maxLen: number): Path[] {
    requireNode(objects, node);
    if (!Number.isInteger(maxLen) || maxLen < 0) {
      throw new Error('FreeCategory: maxLen must be a non-negative integer');
    }
    const acc: Path[] = [id(node)];
    let frontier: Path[] = [id(node)];
    for (let len = 1; len <= maxLen; len += 1) {
      const next: Path[] = [];
      for (const path of frontier) {
        const tail = path.dst;
        for (const edge of graph.edges) {
          if (edge.src === tail) {
            next.push({
              src: node,
              dst: edge.dst,
              edgeIds: [...path.edgeIds, edge.id],
            });
          }
        }
      }
      acc.push(...next);
      frontier = next;
      if (frontier.length === 0) {
        break;
      }
    }
    return acc;
  }

  return { objects, id, compose, pathsFrom };
}

export function arrows(graph: DiGraph): Path[] {
  return graph.edges.map((edge) => ({ src: edge.src, dst: edge.dst, edgeIds: [edge.id] }));
}
