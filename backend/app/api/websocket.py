

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Set

from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger

from app.services.prediction_engine import get_active_disruptions_from_cache


class ConnectionManager:
    

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(
            f"WebSocket connected: {websocket.client}. "
            f"Total connections: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)
        logger.info(
            f"WebSocket disconnected: {websocket.client}. "
            f"Total connections: {len(self.active_connections)}"
        )

    async def send_personal_message(self, message: dict, websocket: WebSocket) -> None:
        try:
            await websocket.send_text(json.dumps(message, default=str))
        except Exception as exc:
            logger.debug(f"WS send error: {exc}")

    async def broadcast(self, message: dict) -> None:
        
        disconnected: Set[WebSocket] = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message, default=str))
            except Exception:
                disconnected.add(connection)
        for ws in disconnected:
            self.disconnect(ws)


manager = ConnectionManager()



async def websocket_disruptions(websocket: WebSocket) -> None:
    
    await manager.connect(websocket)
    try:
        disruptions = get_active_disruptions_from_cache()
        await manager.send_personal_message(
            {
                "type": "initial",
                "disruptions": disruptions,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total": len(disruptions),
            },
            websocket,
        )

        while True:
            try:
                client_msg = await asyncio.wait_for(
                    websocket.receive_text(), timeout=30.0
                )
                if client_msg == "ping":
                    await manager.send_personal_message(
                        {"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()},
                        websocket,
                    )
            except asyncio.TimeoutError:
                updated = get_active_disruptions_from_cache()
                await manager.send_personal_message(
                    {
                        "type": "update",
                        "disruptions": updated,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "total": len(updated),
                    },
                    websocket,
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        logger.error(f"WebSocket error: {exc}")
        manager.disconnect(websocket)


async def broadcast_new_disruption(disruption: dict) -> None:
    
    await manager.broadcast(
        {
            "type": "new_disruption",
            "disruption": disruption,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )