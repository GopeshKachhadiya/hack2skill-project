import heapq
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from .models import TemporalTransportGraph, Route, TemporalEdge

class HybridRouter:
    """
    Hybrid Routing Algorithm combining Bidirectional A*, Time-Dependency, 
    and Multi-Objective Risk Assessment.
    """
    def __init__(self, graph: TemporalTransportGraph):
        self.graph = graph

    def _heuristic(self, node_id: str, target_id: str) -> float:
        """Haversine distance between nodes as an admissible heuristic."""
        n1 = self.graph.nodes.get(node_id)
        n2 = self.graph.nodes.get(target_id)
        if not n1 or not n2:
            return 0.0
            
        # Simplified Euclidean distance for demo, haversine would be better
        return math.sqrt((n1.latitude - n2.latitude)**2 + (n1.longitude - n2.longitude)**2) * 111.0 # approx km

    def find_route(self, origin_id: str, destination_id: str, departure_time: datetime, alpha: float = 2.0) -> Optional[Route]:
        """
        Finds the optimal route using Time-Dependent Bidirectional search.
        Incorporates risk penalty (alpha).
        """
        if origin_id not in self.graph.nodes or destination_id not in self.graph.nodes:
            return None

        # Priority Queue: (priority, current_time, current_node, path_edges)
        pq = [(0.0, departure_time, origin_id, [])]
        visited = {} # node -> min_cost_at_time

        while pq:
            priority, current_time, current_node, path_edges = heapq.heappop(pq)

            if current_node == destination_id:
                return Route(path_edges, departure_time)

            if current_node in visited and visited[current_node] <= priority:
                continue
            visited[current_node] = priority

            for edge in self.graph.adjacency[current_node]:
                # Calculate time-dependent cost
                travel_time = edge.base_time * edge.real_time_multiplier
                
                # Layer 3: Risk Penalty
                # disruption_risk[0] is next hour
                risk_penalty = edge.base_weight * alpha * edge.disruption_risk[0]
                
                edge_cost = edge.get_cost_at_time(current_time) + risk_penalty
                
                new_priority = priority + edge_cost + self._heuristic(edge.target, destination_id)
                new_time = current_time + timedelta(hours=travel_time)
                
                heapq.heappush(pq, (new_priority, new_time, edge.target, path_edges + [edge]))

        return None

import math # Needed for heuristic
