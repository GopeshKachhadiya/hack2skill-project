from typing import Dict
import random

PORT_COORDS: Dict[str, Dict[str, float]] = {
    "Shanghai": {"lat": 31.2304, "lng": 121.4737},
    "Rotterdam": {"lat": 51.9225, "lng": 4.4792},
    "Singapore": {"lat": 1.2966, "lng": 103.7764},
    "Los Angeles": {"lat": 33.7283, "lng": -118.2712},
    "Dubai": {"lat": 24.9857, "lng": 55.0272},
    "Hamburg": {"lat": 53.5753, "lng": 9.9827},
    "Busan": {"lat": 35.1796, "lng": 129.0756},
    "Hong Kong": {"lat": 22.3193, "lng": 114.1694},
    "Antwerp": {"lat": 51.2213, "lng": 4.4051},
    "Mumbai": {"lat": 18.9388, "lng": 72.8354},
    "New York": {"lat": 40.6501, "lng": -74.0377},
    "Cape Town": {"lat": -33.9249, "lng": 18.4241},
    "Suez": {"lat": 29.9668, "lng": 32.5498},
    "Colombo": {"lat": 6.9271, "lng": 79.8612},
    "Felixstowe": {"lat": 51.9659, "lng": 1.3516},
    "Panama": {"lat": 8.9833, "lng": -79.5167},
    "Malacca": {"lat": 2.1896, "lng": 102.2501},
    "Gibraltar": {"lat": 36.1408, "lng": -5.3536},
    "Atlantic_Hub": {"lat": 0.0, "lng": -10.0},
    "Indian_Ocean_Hub": {"lat": -10.0, "lng": 70.0},
    "Pacific_Hub": {"lat": 20.0, "lng": -160.0},
    "Bay_of_Biscay": {"lat": 45.0, "lng": -8.0},
    "English_Channel": {"lat": 49.5, "lng": -2.0},
}

DEFAULT_LOCATIONS = [
    "Port of Shanghai",
    "Port of Singapore",
    "Port of Rotterdam",
    "Port of Los Angeles",
    "Suez Canal",
    "Strait of Malacca",
]

SHIPMENT_STATUSES = ["on_time", "delayed", "critical", "delivered", "disrupted"]
SHIPMENT_CARGO = ["Container", "Bulk", "Refrigerated", "Tanker", "Air Freight", "Breakbulk"]

def _coord_for_location(name: str) -> Dict[str, float]:
    for port, coords in PORT_COORDS.items():
        if port.lower() in name.lower():
            return coords
    return random.choice(list(PORT_COORDS.values()))