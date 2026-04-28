import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.api.routes import get_shipments, get_disruptions
from app.database import init_db

async def test():
    await init_db()
    
    try:
        res = await get_shipments(limit=5)
        print("Shipments:", len(res.get("shipments", [])))
    except Exception as e:
        print("Shipments error:", repr(e))

    try:
        res = await get_disruptions(location=None, severity=None, disruption_type=None, limit=5)
        print("Disruptions:", len(res.get("disruptions", [])))
    except Exception as e:
        print("Disruptions error:", repr(e))

asyncio.run(test())