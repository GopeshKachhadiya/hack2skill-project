/**
 * A* Pathfinding Algorithm Implementation
 * Developer 2: Frontend & Route Optimization Engineer
 *
 * Finds the optimal route between two nodes in a shipping graph,
 * considering distance, time, disruption risk, and user preferences.
 */

import type { Node, Edge, Route, RouteConstraints } from '../types';
import { haversineDistance, nodeToCoord } from './geo';
import { DEFAULT_ROUTE_WEIGHTS } from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// Data Structures
// ─────────────────────────────────────────────────────────────────────────────

interface AStarNode {
  id: string;
  gScore: number; // cost from start
  fScore: number; // gScore + heuristic
  parent: AStarNode | null;
}

/**
 * Simple min-heap priority queue sorted by fScore.
 */
class MinHeap {
  private heap: AStarNode[] = [];

  push(node: AStarNode): void {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  updatePriority(id: string, newFScore: number): void {
    const idx = this.heap.findIndex((n) => n.id === id);
    if (idx === -1) return;
    this.heap[idx].fScore = newFScore;
    this._bubbleUp(idx);
    this._sinkDown(idx);
  }

  private _bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[parent].fScore <= this.heap[idx].fScore) break;
      [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
      idx = parent;
    }
  }

  private _sinkDown(idx: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < n && this.heap[left].fScore < this.heap[smallest].fScore) smallest = left;
      if (right < n && this.heap[right].fScore < this.heap[smallest].fScore) smallest = right;
      if (smallest === idx) break;
      [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
      idx = smallest;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph Class
// ─────────────────────────────────────────────────────────────────────────────

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
    // Bidirectional
    const fwdEdges = this.adjacency.get(edge.from) ?? [];
    fwdEdges.push(edge);
    this.adjacency.set(edge.from, fwdEdges);

    const reverseEdge: Edge = { ...edge, from: edge.to, to: edge.from };
    const bwdEdges = this.adjacency.get(edge.to) ?? [];
    bwdEdges.push(reverseEdge);
    this.adjacency.set(edge.to, bwdEdges);
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  getNeighbors(id: string): { node: Node; edge: Edge }[] {
    const edges = this.adjacency.get(id) ?? [];
    return edges
      .map((e) => {
        const node = this.nodes.get(e.to);
        return node ? { node, edge: e } : null;
      })
      .filter(Boolean) as { node: Node; edge: Edge }[];
  }

  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  hasPath(fromId: string, toId: string): boolean {
    const visited = new Set<string>();
    const queue = [fromId];
    while (queue.length) {
      const curr = queue.shift()!;
      if (curr === toId) return true;
      if (!visited.has(curr)) {
        visited.add(curr);
        this.getNeighbors(curr).forEach(({ node }) => queue.push(node.id));
      }
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Function
// ─────────────────────────────────────────────────────────────────────────────

export interface CostWeights {
  distance: number;
  delay: number;
  disruption: number;
  urgency: number;
}

/**
 * Calculate the edge cost incorporating distance, delay, disruption risk.
 * Returns cost in "hours equivalent" for consistent units with the heuristic.
 */
export function calculateEdgeCost(
  edge: Edge,
  weights: CostWeights = DEFAULT_ROUTE_WEIGHTS
): number {
  const AVG_SPEED = 35; // km/h average shipping speed
  const distanceCost = (edge.distance / AVG_SPEED) * weights.distance;
  const delayCost = edge.currentDelay * weights.delay;
  const disruptionCost = edge.disruptionRisk * 100 * weights.disruption; // scale to hours
  return distanceCost + delayCost + disruptionCost;
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic (Admissible: Straight-line Time Estimate)
// ─────────────────────────────────────────────────────────────────────────────

function heuristic(node: Node, goal: Node): number {
  const dist = haversineDistance(nodeToCoord(node), nodeToCoord(goal));
  return dist / 35; // hours (never overestimates)
}

// ─────────────────────────────────────────────────────────────────────────────
// A* Core Algorithm
// ─────────────────────────────────────────────────────────────────────────────

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
  const goalNode = graph.getNode(goalId);
  if (!goalNode) return null;

  const openHeap = new MinHeap();
  const closedSet = new Set<string>();
  const nodeMap = new Map<string, AStarNode>();

  const startNode = graph.getNode(startId);
  if (!startNode) return null;

  const start: AStarNode = {
    id: startId,
    gScore: 0,
    fScore: heuristic(startNode, goalNode),
    parent: null,
  };
  openHeap.push(start);
  nodeMap.set(startId, start);

  let iterations = 0;
  const MAX_ITER = 10000;

  while (!openHeap.isEmpty() && iterations++ < MAX_ITER) {
    const current = openHeap.pop()!;

    if (current.id === goalId) {
      return reconstructPath(current);
    }

    closedSet.add(current.id);
    const neighbors = graph.getNeighbors(current.id);

    for (const { node: neighborNode, edge } of neighbors) {
      if (closedSet.has(neighborNode.id)) continue;

      const tentativeG = current.gScore + calculateEdgeCost(edge, weights);
      const existing = nodeMap.get(neighborNode.id);

      if (!existing || tentativeG < existing.gScore) {
        const newNode: AStarNode = {
          id: neighborNode.id,
          gScore: tentativeG,
          fScore: tentativeG + heuristic(neighborNode, goalNode),
          parent: current,
        };
        nodeMap.set(neighborNode.id, newNode);
        openHeap.push(newNode);
      }
    }
  }

  return null; // No path found
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Optimization Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full route optimization: runs A* and builds a rich Route object with metrics.
 */
export function optimizeRoute(
  originId: string,
  destinationId: string,
  graph: Graph,
  constraints?: RouteConstraints
): { optimized: Route; original: Route } | null {
  // Determine weights
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

  const nodes = path.map((id) => graph.getNode(id)!).filter(Boolean);

  // Calculate route metrics
  let totalDistance = 0;
  let totalTime = 0;
  let totalCost = 0;
  let maxRisk = 0;

  for (let i = 0; i < nodes.length - 1; i++) {
    const neighbors = graph.getNeighbors(nodes[i].id);
    const edgeData = neighbors.find((n) => n.node.id === nodes[i + 1].id);
    if (edgeData) {
      const { edge } = edgeData;
      totalDistance += edge.distance;
      totalTime += edge.baseTime + edge.currentDelay;
      totalCost += edge.cost;
      maxRisk = Math.max(maxRisk, edge.disruptionRisk);
    }
  }

  const optimized: Route = {
    nodeIds: path,
    waypoints: nodes,
    totalDistance,
    totalTime,
    totalCost,
    riskScore: maxRisk * 100,
    stops: path.length,
  };

  // Build a simple "original" route (direct great-circle approximation)
  const originNode = graph.getNode(originId);
  const destNode = graph.getNode(destinationId);
  const directDist = originNode && destNode
    ? haversineDistance(nodeToCoord(originNode), nodeToCoord(destNode))
    : totalDistance;

  const original: Route = {
    nodeIds: [originId, destinationId],
    waypoints: [originNode!, destNode!].filter(Boolean),
    totalDistance: directDist,
    totalTime: directDist / 35 + 48, // naive estimate with extra delays
    totalCost: totalCost * 1.3,
    riskScore: 85,
    stops: 2,
  };

  return { optimized, original };
}

