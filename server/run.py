#!/usr/bin/env python3
"""
Minimal backend to serve WebSocket data on port 8766 for the Big Yellow Jacket UI.

This provides:
- welcome
- initial_state
- periodic metrics_update
- periodic connections_update

It also handles simple commands:
- get_metrics
- get_connections
- get_alerts

This is a lightweight replacement to get the UI running locally while the full
server is being restored.
"""

import asyncio
import json
import os
import signal
import time
from typing import Any, Dict, List

try:
    import psutil  # type: ignore
except Exception:  # pragma: no cover
    psutil = None  # Fallback if psutil is unavailable

import websockets


HOST = os.environ.get("BYJ_HOST", "0.0.0.0")
PORT = int(os.environ.get("BYJ_PORT", "8766"))


def get_system_metrics() -> Dict[str, Any]:
    if psutil is None:
        return {
            "system": {
                "cpu": {"percent": 0, "cores": 0, "frequency": 0},
                "memory": {"total": 0, "used": 0, "percent": 0},
                "disk": {"total": 0, "used": 0, "percent": 0},
                "network": {"bytes_sent": 0, "bytes_recv": 0},
            }
        }

    try:
        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_freq = getattr(psutil.cpu_freq(), "current", 0) if hasattr(psutil, "cpu_freq") else 0
        virtual_mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        net = psutil.net_io_counters()
        return {
            "system": {
                "cpu": {
                    "percent": float(cpu_percent or 0),
                    "cores": int(psutil.cpu_count() or 0),
                    "frequency": float(cpu_freq or 0),
                },
                "memory": {
                    "total": int(getattr(virtual_mem, "total", 0) or 0),
                    "used": int(getattr(virtual_mem, "used", 0) or 0),
                    "percent": float(getattr(virtual_mem, "percent", 0) or 0),
                },
                "disk": {
                    "total": int(getattr(disk, "total", 0) or 0),
                    "used": int(getattr(disk, "used", 0) or 0),
                    "percent": float(getattr(disk, "percent", 0) or 0),
                },
                "network": {
                    "bytes_sent": int(getattr(net, "bytes_sent", 0) or 0),
                    "bytes_recv": int(getattr(net, "bytes_recv", 0) or 0),
                },
            }
        }
    except Exception:
        return {
            "system": {
                "cpu": {"percent": 0, "cores": 0, "frequency": 0},
                "memory": {"total": 0, "used": 0, "percent": 0},
                "disk": {"total": 0, "used": 0, "percent": 0},
                "network": {"bytes_sent": 0, "bytes_recv": 0},
            }
        }


def get_connections_sample() -> List[Dict[str, Any]]:
    # Provide a small, static sample that matches the UI's expectations
    return [
        {
            "host": "127.0.0.1",
            "port": 80,
            "protocol": "TCP",
            "process": "byj",
            "status": "ESTABLISHED",
            "bytes_sent": 0,
            "bytes_received": 0,
            "latency": 10,
            "last_seen": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    ]


async def send_json(ws: websockets.WebSocketServerProtocol, payload: Dict[str, Any]) -> None:
    await ws.send(json.dumps(payload))


async def handle_client(ws: websockets.WebSocketServerProtocol) -> None:
    await send_json(ws, {"message_type": "welcome", "data": {"message": "welcome"}})

    initial_payload = {
        "message_type": "initial_state",
        "data": {
            "metrics": get_system_metrics(),
            "active_connections": get_connections_sample(),
            "blocked_ips": [],
            "alerts": [],
        },
    }
    await send_json(ws, initial_payload)

    async def periodic_updates() -> None:
        while True:
            try:
                await asyncio.sleep(2)
                await send_json(
                    ws,
                    {
                        "message_type": "metrics_update",
                        "data": get_system_metrics(),
                    },
                )

                # Send connections every 5 seconds
                if int(time.time()) % 5 == 0:
                    await send_json(
                        ws,
                        {
                            "message_type": "connections_update",
                            "data": {"active_connections": get_connections_sample(), "blocked_ips": [], "alerts": []},
                        },
                    )
            except Exception:
                break

    updater_task = asyncio.create_task(periodic_updates())

    try:
        async for message in ws:
            try:
                data = json.loads(message)
            except Exception:
                continue

            cmd = data if isinstance(data, dict) else {}
            command = cmd.get("command")

            if command == "get_metrics":
                await send_json(ws, {"message_type": "metrics_update", "data": get_system_metrics()})
            elif command == "get_connections":
                await send_json(ws, {"message_type": "connections_update", "data": {"active_connections": get_connections_sample()}})
            elif command == "get_alerts":
                await send_json(ws, {"message_type": "alerts_update", "data": {"alerts": []}})
            else:
                # ignore unknown
                pass
    finally:
        updater_task.cancel()
        with contextlib.suppress(Exception):
            await updater_task


async def main() -> None:
    print(f"[BYJ] Starting WebSocket server on ws://{HOST}:{PORT}")
    async with websockets.serve(handle_client, HOST, PORT):
        stop = asyncio.Future()

        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda: stop.cancel())

        try:
            await stop
        except asyncio.CancelledError:
            pass


if __name__ == "__main__":
    import contextlib  # local import to keep top clean

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass


