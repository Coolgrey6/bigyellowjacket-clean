#!/usr/bin/env python3
"""
HTTPS Production server for Big Yellow Jacket Security
Serves both the frontend static files and WebSocket backend with SSL
"""

import asyncio
import json
import os
import signal
import ssl
import time
from typing import Any, Dict, List
from pathlib import Path

try:
    import psutil  # type: ignore
except Exception:  # pragma: no cover
    psutil = None  # Fallback if psutil is unavailable

import websockets
from aiohttp import web, WSMsgType
import aiohttp_cors

# Import our new modules
from src.analyzers.advanced_threat_detector import AdvancedThreatDetector
from src.core.alert_system import AlertSystem, AlertType, AlertSeverity
from src.core.secure_firewall import SecureFirewallManager
from src.api.rest_api import SecurityAPI

# Configuration
HOST = os.environ.get("BYJ_HOST", "0.0.0.0")
PORT = int(os.environ.get("BYJ_PORT", "8443"))
FRONTEND_PORT = int(os.environ.get("BYJ_FRONTEND_PORT", "8443"))

# SSL Configuration
SSL_CERT_PATH = os.environ.get("BYJ_SSL_CERT", "../ssl/cert.pem")
SSL_KEY_PATH = os.environ.get("BYJ_SSL_KEY", "../ssl/key.pem")

# Paths
FRONTEND_DIST_PATH = Path(__file__).parent.parent / "frontend" / "bigyellowjacket-ui" / "dist"

def get_system_metrics() -> Dict[str, Any]:
    """Get system metrics for the dashboard"""
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
    """Provide sample connections data"""
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

async def websocket_handler(request):
    """Handle WebSocket connections"""
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    # Send welcome message
    await ws.send_str(json.dumps({"message_type": "welcome", "data": {"message": "welcome"}}))
    
    # Send initial state
    initial_payload = {
        "message_type": "initial_state",
        "data": {
            "metrics": get_system_metrics(),
            "active_connections": get_connections_sample(),
            "blocked_ips": [],
            "alerts": [],
        },
    }
    await ws.send_str(json.dumps(initial_payload))
    
    # Periodic updates
    async def periodic_updates():
        while True:
            try:
                await asyncio.sleep(2)
                await ws.send_str(json.dumps({
                    "message_type": "metrics_update",
                    "data": get_system_metrics(),
                }))
                
                # Send connections every 5 seconds
                if int(time.time()) % 5 == 0:
                    await ws.send_str(json.dumps({
                        "message_type": "connections_update",
                        "data": {"active_connections": get_connections_sample(), "blocked_ips": [], "alerts": []},
                    }))
            except Exception:
                break
    
    updater_task = asyncio.create_task(periodic_updates())
    
    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                except Exception:
                    continue
                
                cmd = data if isinstance(data, dict) else {}
                command = cmd.get("command")
                
                if command == "get_metrics":
                    await ws.send_str(json.dumps({"message_type": "metrics_update", "data": get_system_metrics()}))
                elif command == "get_connections":
                    await ws.send_str(json.dumps({"message_type": "connections_update", "data": {"active_connections": get_connections_sample()}}))
                elif command == "get_alerts":
                    await ws.send_str(json.dumps({"message_type": "alerts_update", "data": {"alerts": []}}))
    finally:
        updater_task.cancel()
        try:
            await updater_task
        except asyncio.CancelledError:
            pass
    
    return ws

async def index_handler(request):
    """Serve the main index.html file"""
    index_path = FRONTEND_DIST_PATH / "index.html"
    if index_path.exists():
        return web.FileResponse(index_path)
    else:
        return web.Response(text="Frontend not found. Please run 'npm run build' first.", status=404)

async def spa_handler(request):
    """Handle client-side routing for React app"""
    index_path = FRONTEND_DIST_PATH / "index.html"
    if index_path.exists():
        return web.FileResponse(index_path)
    else:
        return web.Response(text="Frontend not found. Please run 'npm run build' first.", status=404)

async def create_app():
    """Create the aiohttp application"""
    app = web.Application()
    
    # Initialize security components
    threat_detector = AdvancedThreatDetector()
    alert_system = AlertSystem()
    secure_firewall = SecureFirewallManager()
    security_api = SecurityAPI()
    
    # Store components in app context
    app['threat_detector'] = threat_detector
    app['alert_system'] = alert_system
    app['secure_firewall'] = secure_firewall
    
    # Configure CORS
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods="*"
        )
    })
    
    # Add WebSocket handler
    app.router.add_get('/ws', websocket_handler)
    
    # Add API routes
    app.router.add_routes(security_api.app.router)
    
    # Add frontend routes
    app.router.add_get('/', index_handler)
    app.router.add_get('/app', spa_handler)
    app.router.add_get('/app/{path:.*}', spa_handler)
    app.router.add_static('/', FRONTEND_DIST_PATH)
    
    # Add CORS to all routes
    for route in list(app.router.routes()):
        cors.add(route)
    
    return app

async def main():
    """Main function to run the HTTPS server"""
    print(f"[BYJ] Starting HTTPS server on https://{HOST}:{FRONTEND_PORT}")
    print(f"[BYJ] WebSocket server on wss://{HOST}:{PORT}")
    print(f"[BYJ] Frontend files from: {FRONTEND_DIST_PATH}")
    print(f"[BYJ] SSL Certificate: {SSL_CERT_PATH}")
    print(f"[BYJ] SSL Key: {SSL_KEY_PATH}")
    
    # Check if SSL files exist
    if not os.path.exists(SSL_CERT_PATH):
        print(f"[ERROR] SSL certificate not found at {SSL_CERT_PATH}")
        return
    
    if not os.path.exists(SSL_KEY_PATH):
        print(f"[ERROR] SSL key not found at {SSL_KEY_PATH}")
        return
    
    app = await create_app()
    
    # Create SSL context
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ssl_context.load_cert_chain(SSL_CERT_PATH, SSL_KEY_PATH)
    
    # Start the server
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, HOST, FRONTEND_PORT, ssl_context=ssl_context)
    await site.start()
    
    # Keep the server running
    try:
        await asyncio.Future()  # Run forever
    except KeyboardInterrupt:
        print("\n[BYJ] Shutting down HTTPS server...")
    finally:
        await runner.cleanup()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
