import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from collections import defaultdict

class CostProfile:
    """Time-dependent cost multipliers."""
    def __init__(self):
        self.hourly_multipliers = [1.0] * 24
        self.daily_multipliers = [1.0] * 7
        self.seasonal_multipliers = [1.0] * 12
    
    def get_multiplier(self, hour: int, day: int, month: int) -> float:
        return (
            self.hourly_multipliers[hour] *
            self.daily_multipliers[day] *
            self.seasonal_multipliers[month - 1]
        )

class Node:
    """Network location (warehouse, port, terminal, etc.)."""
    def __init__(self, id: str, latitude: float, longitude: float, node_type: str, capacity: float):
        self.id = id
        self.latitude = latitude
        self.longitude = longitude
        self.type = node_type
        self.capacity = capacity
        self.current_load = 0
        self.weather_index = 0
        self.operational_status = 'OPEN'
        self.avg_delay_hours = 0
        self.time_since_last_incident = float('inf')

class TemporalEdge:
    """Edge with time-dependent costs and real-time disruption tracking."""
    def __init__(self, id: str, source: str, target: str, transport_mode: str, base_weight: float, base_time: float):
        self.id = id
        self.source = source
        self.target = target
        self.transport_mode = transport_mode
        self.base_weight = base_weight
        self.base_time = base_time
        self.cost_profile = CostProfile()
        self.real_time_multiplier = 1.0
        self.disruption_risk = [0.0] * 48
        self.current_traffic = 0
        self.capacity = 100
        self.reliability_score = 1.0
        self.alternative_count = 1
        self.is_critical = False
        self.distance_km = 0
        self.toll_cost = 0
        self.fuel_cost = 0

    def get_cost_at_time(self, departure_time: datetime) -> float:
        # Base cost
        base = self.base_weight
        
        # Temporal factors
        hour = departure_time.hour
        day = departure_time.weekday()
        month = departure_time.month
        temporal = self.cost_profile.get_multiplier(hour, day, month)
        
        # Real-time factors
        disruption = self.real_time_multiplier
        
        return base * temporal * disruption

class Route:
    """Represents a complete route from origin to destination."""
    def __init__(self, edges: List[TemporalEdge], departure_time: datetime):
        self.edges = edges
        self.departure_time = departure_time
        self.waypoints = self._extract_waypoints()
        self.total_distance = sum(e.distance_km for e in edges)
        self.total_time = self._calculate_total_time()
        self.total_cost = sum(e.base_weight for e in edges)
        self.eta = departure_time + timedelta(hours=self.total_time)
        self.risk_score = self._calculate_risk()
        self.critical_segments = [e for e in edges if e.alternative_count == 0]

    def _extract_waypoints(self) -> List[Dict[str, float]]:
        # For simplicity, we just return source/target of edges
        # In a real app, this would be GPS coordinates
        return []

    def _calculate_total_time(self) -> float:
        total = 0
        current_time = self.departure_time
        for edge in self.edges:
            edge_time = edge.base_time * edge.real_time_multiplier # Simplified
            total += edge_time
            current_time += timedelta(hours=edge_time)
        return total

    def _calculate_risk(self) -> float:
        if not self.edges: return 0.0
        return sum(e.disruption_risk[0] for e in self.edges) / len(self.edges)

class TemporalTransportGraph:
    """Time-dependent multi-modal transportation network."""
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, TemporalEdge] = {}
        self.adjacency: Dict[str, List[TemporalEdge]] = defaultdict(list)
    
    def add_node(self, node_id, lat, lon, node_type, capacity):
        self.nodes[node_id] = Node(node_id, lat, lon, node_type, capacity)
    
    def add_edge(self, edge_id, source, target, mode, base_cost, base_time):
        edge = TemporalEdge(edge_id, source, target, mode, base_cost, base_time)
        self.edges[edge_id] = edge
        self.adjacency[source].append(edge)
