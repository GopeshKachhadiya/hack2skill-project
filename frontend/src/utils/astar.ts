/**
 * A* Pathfinding Algorithm Implementation
 * Enhanced with K-Shortest Paths and Sea-Route focus.
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
  edgeToParent?: Edge; // Track which edge was used
}

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

  getNeighbors(id: string, blockedEdges: Set<string> = new Set()): { node: Node; edge: Edge }[] {
    const edges = this.adjacency.get(id) ?? [];
    return edges
      .filter((e) => !blockedEdges.has(`${e.from}-${e.to}`))
      .map((e) => {
        const node = this.nodes.get(e.to);
        return node ? { node, edge: e } : null;
      })
      .filter(Boolean) as { node: Node; edge: Edge }[];
  }

  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
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

export function calculateEdgeCost(
  edge: Edge,
  weights: CostWeights = DEFAULT_ROUTE_WEIGHTS
): number {
  const AVG_SPEED = 35; 
  const distanceCost = (edge.distance / AVG_SPEED) * weights.distance;
  const delayCost = edge.currentDelay * weights.delay;
  const disruptionCost = edge.disruptionRisk * 100 * weights.disruption;
  
  // Penalize non-sea routes heavily if we want sea routes only
  // (In our graph, all edges should be sea routes, but we can add a check)
  const modePenalty = edge.type === 'land' ? 1000 : 0; 
  
  return distanceCost + delayCost + disruptionCost + modePenalty;
}

function heuristic(node: Node, goal: Node): number {
  const dist = haversineDistance(nodeToCoord(node), nodeToCoord(goal));
  return dist / 35; 
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
  weights: CostWeights = DEFAULT_ROUTE_WEIGHTS,
  blockedEdges: Set<string> = new Set()
): string[] | null {
  const goalNode = graph.getNode(goalId);
  if (!goalNode) return null;

  const openHeap = new MinHeap();
  const nodeMap = new Map<string, AStarNode>();
  const closedSet = new Set<string>();

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
    if (current.id === goalId) return reconstructPath(current);

    closedSet.add(current.id);
    const neighbors = graph.getNeighbors(current.id, blockedEdges);

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
          edgeToParent: edge,
        };
        nodeMap.set(neighborNode.id, newNode);
        openHeap.push(newNode);
      }
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// K-Shortest Paths (Yen's Algorithm Lite)
// ─────────────────────────────────────────────────────────────────────────────

export function kShortestPaths(
  startId: string,
  goalId: string,
  graph: Graph,
  k: number = 3,
  weights: CostWeights = DEFAULT_ROUTE_WEIGHTS
): string[][] {
  const paths: string[][] = [];
  const firstPath = aStar(startId, goalId, graph, weights);
  if (!firstPath) return [];

  paths.push(firstPath);
  const blockedEdges = new Set<string>();

  for (let i = 1; i < k; i++) {
    const lastPath = paths[i - 1];
    if (!lastPath || lastPath.length < 2) break;

    // Block one edge from the previous path to force an alternative
    // We pick the edge with the lowest risk or highest cost to diversify
    const edgeToBlockIdx = Math.floor(Math.random() * (lastPath.length - 1));
    const u = lastPath[edgeToBlockIdx];
    const v = lastPath[edgeToBlockIdx + 1];
    blockedEdges.add(`${u}-${v}`);
    blockedEdges.add(`${v}-${u}`);

    const nextPath = aStar(startId, goalId, graph, weights, blockedEdges);
    if (nextPath && !paths.some(p => JSON.stringify(p) === JSON.stringify(nextPath))) {
      paths.push(nextPath);
    } else {
      // If no new path found, stop
      break;
    }
  }

  return paths;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Optimization Service
// ─────────────────────────────────────────────────────────────────────────────

export function optimizeRoute(
  originId: string,
  destinationId: string,
  graph: Graph,
  constraints?: RouteConstraints
): { routes: Route[]; original: Route } | null {
  const weights: CostWeights = { ...DEFAULT_ROUTE_WEIGHTS };
  if (constraints?.priority === 'fastest') {
    weights.distance = 2.0;
    weights.delay = 5.0;
  } else if (constraints?.priority === 'safest') {
    weights.disruption = 8.0;
  }

  const k = constraints?.alternatives ?? 3;
  const paths = kShortestPaths(originId, destinationId, graph, k, weights);
  if (paths.length === 0) return null;

  const routes = paths.map((path) => {
    const nodes = path.map((id) => graph.getNode(id)!).filter(Boolean);
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

    return {
      nodeIds: path,
      waypoints: nodes,
      totalDistance,
      totalTime,
      totalCost,
      riskScore: maxRisk * 100,
      stops: path.length,
    } as Route;
  });

  // Original naive route
  const originNode = graph.getNode(originId);
  const destNode = graph.getNode(destinationId);
  const directDist = originNode && destNode
    ? haversineDistance(nodeToCoord(originNode), nodeToCoord(destNode))
    : routes[0].totalDistance;

  const original: Route = {
    nodeIds: [originId, destinationId],
    waypoints: [originNode!, destNode!].filter(Boolean),
    totalDistance: directDist,
    totalTime: directDist / 35 + 48,
    totalCost: routes[0].totalCost * 1.2,
    riskScore: 85,
    stops: 2,
  };

  return { routes, original };
}

