from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from loguru import logger

from app.models.shipment import Shipment as ShipmentModel
from app.models.weather import WeatherData
from app.models.disruption import DisruptionPrediction
from .models import TemporalTransportGraph, TemporalEdge, Node
from .algorithms import HybridRouter

class RoutingEngine:
    
    
    def __init__(self):
        self.graph = TemporalTransportGraph()
        self.router = HybridRouter(self.graph)
        self._initialize_static_network()

    def _initialize_static_network(self):
        
        from app.routing.constants import PORT_COORDS
        
        for name, coords in PORT_COORDS.items():
            self.graph.add_node(name, coords['lat'], coords['lng'], 'port', 1000)
            
        self._add_bi_edge("Atlantic_Hub", "Rotterdam", 4500, 240) # Fallback
        self._add_bi_edge("Atlantic_Hub", "Cape Town", 4000, 200)
        self._add_bi_edge("Atlantic_Hub", "Gibraltar", 3500, 180)
        self._add_bi_edge("Atlantic_Hub", "New York", 5000, 260)
        self._add_bi_edge("Atlantic_Hub", "Panama", 4000, 210)
        
        self._add_bi_edge("Pacific_Hub", "Los Angeles", 4000, 210)
        self._add_bi_edge("Pacific_Hub", "Singapore", 8000, 420)
        self._add_bi_edge("Pacific_Hub", "Shanghai", 6000, 310)
        self._add_bi_edge("Pacific_Hub", "Panama", 7000, 360)
        
        self._add_bi_edge("Suez", "Rotterdam", 3500, 180) # via Gibraltar
        self._add_bi_edge("Suez", "Dubai", 3000, 150)
        self._add_bi_edge("Suez", "Mumbai", 4500, 220)
        self._add_bi_edge("Suez", "Singapore", 8000, 400)
        
        self._add_bi_edge("Singapore", "Shanghai", 4000, 200)
        self._add_bi_edge("Singapore", "Hong Kong", 2500, 120)
        self._add_bi_edge("Singapore", "Busan", 4500, 230)
        self._add_bi_edge("Singapore", "Mumbai", 4000, 200)
        self._add_bi_edge("Singapore", "Colombo", 2500, 120)
        
        self._add_bi_edge("Gibraltar", "Bay_of_Biscay", 1200, 60)
        self._add_bi_edge("Bay_of_Biscay", "English_Channel", 800, 40)
        self._add_bi_edge("English_Channel", "Rotterdam", 400, 20)
        self._add_bi_edge("English_Channel", "Antwerp", 450, 22)
        self._add_bi_edge("English_Channel", "Felixstowe", 350, 18)
        self._add_bi_edge("English_Channel", "Hamburg", 600, 30)
        
        self._add_bi_edge("Rotterdam", "Felixstowe", 200, 10)
        self._add_bi_edge("Rotterdam", "Hamburg", 400, 15)
        self._add_bi_edge("Rotterdam", "Antwerp", 100, 5)
        self._add_bi_edge("Shanghai", "Busan", 1000, 40)
        self._add_bi_edge("Shanghai", "Hong Kong", 1200, 50)

    def _add_bi_edge(self, p1: str, p2: str, cost: float, time_h: float):
        
        if p1 in self.graph.nodes and p2 in self.graph.nodes:
            self.graph.add_edge(f"{p1}-{p2}", p1, p2, 'ship', cost, time_h)
            self.graph.add_edge(f"{p2}-{p1}", p2, p1, 'ship', cost, time_h)

    async def update_dynamic_state(self):
        
        try:
            active_disruptions = await DisruptionPrediction.find({"status": "active"}).to_list()
            
            for d in active_disruptions:
                for edge in self.graph.edges.values():
                    if d.location in [edge.source, edge.target]:
                        edge.disruption_risk[0] = d.probability
                        edge.real_time_multiplier = 1.0 + (d.predicted_severity * 2.0)
                        edge.reliability_score = d.confidence_score
                        
            weather_data = await WeatherData.find_all().limit(20).to_list()
            for w in weather_data:
                if w.location in self.graph.nodes:
                    node = self.graph.nodes[w.location]
                    node.weather_index = {"low": 1, "medium": 2, "high": 4, "critical": 5}.get(w.severity, 0)
                    if node.weather_index >= 4:
                        node.operational_status = 'DEGRADED'

        except Exception as exc:
            logger.error(f"Failed to update routing dynamic state: {exc}")

    async def get_optimal_route(self, origin: str, destination: str, departure_time: datetime):
        
        await self.update_dynamic_state()
        
        route = self.router.find_route(origin, destination, departure_time)
        return route

import math