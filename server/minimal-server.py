#!/usr/bin/env python3
"""
Minimal server for Big Yellow Jacket Security
"""

import asyncio
import json
import time
from aiohttp import web, WSMsgType
from pathlib import Path

# Configuration
HOST = "0.0.0.0"
PORT = 8082
FRONTEND_DIST_PATH = Path(__file__).parent.parent / "frontend" / "bigyellowjacket-ui" / "dist"

def get_system_metrics():
    """Get system metrics for the dashboard"""
    return {
        "system": {
            "cpu": {"percent": 25.5, "cores": 8, "frequency": 2400},
            "memory": {"total": 16777216, "used": 8388608, "percent": 50.0},
            "disk": {"total": 1000000000, "used": 500000000, "percent": 50.0},
            "network": {"bytes_sent": 1024000, "bytes_recv": 2048000},
        }
    }

def get_connections_sample():
    """Get sample connections data"""
    return [
        {
            "host": "127.0.0.1",
            "port": 80,
            "protocol": "TCP",
            "process": "byj",
            "status": "ESTABLISHED",
            "bytes_sent": 1024,
            "bytes_received": 2048,
            "latency": 10,
            "last_seen": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    ]

async def websocket_handler(request):
    """WebSocket handler for real-time updates"""
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

async def api_threats_handler(request):
    """API endpoint for threats"""
    return web.json_response({
        "threats": [],
        "total": 0,
        "status": "ok"
    })

async def api_block_ip_handler(request):
    """API endpoint for blocking IPs"""
    try:
        data = await request.json()
        ip = data.get('ip', '')
        print(f"Blocking IP: {ip}")
        return web.json_response({
            "success": True,
            "ip": ip,
            "message": "IP blocked successfully"
        })
    except Exception as e:
        return web.json_response({
            "success": False,
            "error": str(e)
        }, status=400)

async def create_app():
    """Create the web application"""
    app = web.Application()
    
    # Add routes
    app.router.add_get('/ws', websocket_handler)
    app.router.add_get('/api/threats', api_threats_handler)
    app.router.add_post('/api/threats/block-ip', api_block_ip_handler)
    app.router.add_get('/', index_handler)
    app.router.add_get('/app', spa_handler)
    app.router.add_get('/app/{path:.*}', spa_handler)
    app.router.add_static('/', FRONTEND_DIST_PATH)
    
    return app

async def main():
    """Main function to run the server"""
    print(f"[BYJ] Starting minimal server on http://{HOST}:{PORT}")
    print(f"[BYJ] Frontend files from: {FRONTEND_DIST_PATH}")
    
    app = await create_app()
    
    # Start the server
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, HOST, PORT)
    await site.start()
    
    print(f"[BYJ] Server started successfully!")
    
    # Keep the server running
    try:
        await asyncio.Future()  # Run forever
    except KeyboardInterrupt:
        pass
    finally:
        await runner.cleanup()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
