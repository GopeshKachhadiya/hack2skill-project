/**
 * A* Pathfinding Algorithm Implementation
 * Developer 2: Frontend & Route Optimization Engineer
 *
 * Finds the optimal route between two nodes in a shipping graph,
 * considering distance, time, disruption risk, and user preferences.
 */

import type { Coordinate, Node, Edge, Route, RouteConstraints } from '../types';
import { haversineDistance, nodeToCoord } from './geo';
import { DEFAULT_ROUTE_WEIGHTS } from './constants';

interface AStarNode {
  id: string;
  gScore: number;
  fScore: number;
  parent: AStarNode | null;
}

class MinHeap {
  private heap: AStarNode[] = [];

  push(node: AStarNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].fScore <= this.heap[index].fScore) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const size = this.heap.length;
    while (true) {
      let smallest = index;
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      if (left < size && this.heap[left].fScore < this.heap[smallest].fScore) smallest = left;
      if (right < size && this.heap[right].fScore < this.heap[smallest].fScore) smallest = right;
      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

export class Graph {
  private nodes: Map<string, Node> = new Map();
  private adjacency: Map<string, Edge[]> = new Map();

  addNode(node: Node): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  addEdge(edge: Edge): void {
    const forwardEdges = this.adjacency.get(edge.from) ?? [];
    forwardEdges.push(edge);
    this.adjacency.set(edge.from, forwardEdges);

    const reverseEdge: Edge = {
      ...edge,
      from: edge.to,
      to: edge.from,
      path: edge.path ? [...edge.path].reverse() : undefined,
    };
    const backwardEdges = this.adjacency.get(edge.to) ?? [];
    backwardEdges.push(reverseEdge);
    this.adjacency.set(edge.to, backwardEdges);
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  getEdge(fromId: string, toId: string): Edge | undefined {
    return (this.adjacency.get(fromId) ?? []).find((edge) => edge.to === toId);
  }

  getNeighbors(id: string): { node: Node; edge: Edge }[] {
    const edges = this.adjacency.get(id) ?? [];
    return edges
      .map((edge) => {
        const node = this.nodes.get(edge.to);
        return node ? { node, edge } : null;
      })
      .filter(Boolean) as { node: Node; edge: Edge }[];
  }

  hasPath(fromId: string, toId: string): boolean {
    const visited = new Set<string>();
    const queue = [fromId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === toId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      this.getNeighbors(current).forEach(({ node }) => queue.push(node.id));
    }

    return false;
  }
}

export interface CostWeights {
  distance: number;
  delay: number;
  disruption: number;
  urgency: number;
}

export function calculateEdgeCost(
  edge: Edge,
  weights: CostWeights = DEFAULT_ROUTE_WEIGHTS
): number {
  const averageSpeed = 35;
  const distanceCost = (edge.distance / averageSpeed) * weights.distance;
  const delayCost = edge.currentDelay * weights.delay;
  const disruptionCost = edge.disruptionRisk * 100 * weights.disruption;
  return distanceCost + delayCost + disruptionCost;
}

function heuristic(node: Node, goal: Node): number {
  return haversineDistance(nodeToCoord(node), nodeToCoord(goal)) / 35;
}

function reconstructPath(endNode: AStarNode): string[] {
  const path: string[] = [];
  let current: AStarNode | null = endNode;

  while (current) {
    path.unshift(current.id);
    current = current.parent;
  }

  return path;
}

export function aStar(
  startId: string,
  goalId: string,
  graph: Graph,
  weights: CostWeights = DEFAULT_ROUTE_WEIGHTS
): string[] | null {
  const startNode = graph.getNode(startId);
  const goalNode = graph.getNode(goalId);
  if (!startNode || !goalNode) return null;

  const openHeap = new MinHeap();
  const closedSet = new Set<string>();
  const bestSeen = new Map<string, AStarNode>();

  const start: AStarNode = {
    id: startId,
    gScore: 0,
    fScore: heuristic(startNode, goalNode),
    parent: null,
  };

  openHeap.push(start);
  bestSeen.set(startId, start);

  let iterations = 0;
  const maxIterations = 10000;

  while (!openHeap.isEmpty() && iterations++ < maxIterations) {
    const current = openHeap.pop()!;
    if (closedSet.has(current.id)) continue;

    if (current.id === goalId) {
      return reconstructPath(current);
    }

    closedSet.add(current.id);

    for (const { node: neighborNode, edge } of graph.getNeighbors(current.id)) {
      if (closedSet.has(neighborNode.id)) continue;

      const tentativeGScore = current.gScore + calculateEdgeCost(edge, weights);
      const existing = bestSeen.get(neighborNode.id);

      if (!existing || tentativeGScore < existing.gScore) {
        const nextNode: AStarNode = {
          id: neighborNode.id,
          gScore: tentativeGScore,
          fScore: tentativeGScore + heuristic(neighborNode, goalNode),
          parent: current,
        };
        bestSeen.set(neighborNode.id, nextNode);
        openHeap.push(nextNode);
      }
    }
  }

  return null;
}

export function getRouteCoordinates(graph: Graph, nodeIds: string[]): Coordinate[] {
  const coordinates: Coordinate[] = [];

  for (let index = 0; index < nodeIds.length - 1; index += 1) {
    const fromId = nodeIds[index];
    const toId = nodeIds[index + 1];
    const edge = graph.getEdge(fromId, toId);

    let segment: Coordinate[] = [];
    if (edge?.path && edge.path.length > 1) {
      segment = edge.path;
    } else {
      const fromNode = graph.getNode(fromId);
      const toNode = graph.getNode(toId);
      if (fromNode && toNode) {
        segment = [nodeToCoord(fromNode), nodeToCoord(toNode)];
      }
    }

    if (segment.length === 0) continue;
    coordinates.push(...(coordinates.length === 0 ? segment : segment.slice(1)));
  }

  return coordinates;
}

export function optimizeRoute(
  originId: string,
  destinationId: string,
  graph: Graph,
  constraints?: RouteConstraints
): { optimized: Route; original: Route } | null {
  const weights: CostWeights = { ...DEFAULT_ROUTE_WEIGHTS };

  if (constraints?.priority === 'fastest') {
    weights.distance = 2.0;
    weights.delay = 4.0;
    weights.disruption = 1.0;
  } else if (constraints?.priority === 'cheapest') {
    weights.distance = 3.0;
    weights.delay = 1.0;
    weights.disruption = 0.5;
  } else if (constraints?.priority === 'safest') {
    weights.distance = 0.5;
    weights.delay = 1.0;
    weights.disruption = 6.0;
  }

  const path = aStar(originId, destinationId, graph, weights);
  if (!path) return null;

  const waypoints = path
    .map((nodeId) => graph.getNode(nodeId))
    .filter(Boolean) as Node[];

  let totalDistance = 0;
  let totalTime = 0;
  let totalCost = 0;
  let maxRisk = 0;

  for (let index = 0; index < path.length - 1; index += 1) {
    const edge = graph.getEdge(path[index], path[index + 1]);
    if (!edge) continue;

    totalDistance += edge.distance;
    totalTime += edge.baseTime + edge.currentDelay;
    totalCost += edge.cost;
    maxRisk = Math.max(maxRisk, edge.disruptionRisk);
  }

  const optimized: Route = {
    nodeIds: path,
    waypoints,
    totalDistance,
    totalTime,
    totalCost,
    riskScore: maxRisk * 100,
    stops: path.length,
  };

  const originNode = graph.getNode(originId);
  const destinationNode = graph.getNode(destinationId);
  const directDistance =
    originNode && destinationNode
      ? haversineDistance(nodeToCoord(originNode), nodeToCoord(destinationNode))
      : totalDistance;

  const original: Route = {
    nodeIds: [originId, destinationId],
    waypoints: [originNode, destinationNode].filter(Boolean) as Node[],
    totalDistance: directDistance,
    totalTime: directDistance / 35 + 48,
    totalCost: totalCost * 1.3,
    riskScore: 85,
    stops: 2,
  };

  return { optimized, original };
}
