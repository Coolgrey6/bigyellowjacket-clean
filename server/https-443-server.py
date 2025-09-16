#!/usr/bin/env python3
"""
Big Yellow Jacket Security - HTTPS Server on Port 443
Production-ready HTTPS server with SSL certificates
"""

import asyncio
import ssl
import aiohttp
from aiohttp import web, WSMsgType
import aiohttp_cors
import json
import os
import sys
import signal
from datetime import datetime
import psutil
import random
import time

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Import API routes
try:
    from api.rest_api import setup_routes
except ImportError:
    # Fallback: create a simple API setup
    def setup_routes(app):
        async def api_status(request):
            return web.json_response({
                "status": "operational",
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0"
            })
        
        app.router.add_get('/api/status', api_status)

# Configuration
HOST = '0.0.0.0'
PORT = 9443
FRONTEND_PORT = 8443
SSL_CERT_PATH = '../ssl/cert.pem'
SSL_KEY_PATH = '../ssl/key.pem'

# Frontend files path
FRONTEND_PATH = '/Users/donniebugden/Documents/development/bigyellowjacket-clean/frontend/bigyellowjacket-ui/dist'

class WebSocketManager:
    def __init__(self):
        self.connections = set()
        self.running = False
        
    async def register(self, ws):
        self.connections.add(ws)
        print(f"[BYJ] WebSocket client connected. Total clients: {len(self.connections)}")
        
    async def unregister(self, ws):
        self.connections.discard(ws)
        print(f"[BYJ] WebSocket client disconnected. Total clients: {len(self.connections)}")
        
    async def broadcast(self, message):
        if self.connections:
            # Create a copy of the set to avoid modification during iteration
            connections_copy = self.connections.copy()
            for ws in connections_copy:
                try:
                    await ws.send_str(json.dumps(message))
                except ConnectionResetError:
                    await self.unregister(ws)
                except Exception as e:
                    print(f"[BYJ] Error broadcasting to client: {e}")
                    await self.unregister(ws)

# Global WebSocket manager
ws_manager = WebSocketManager()

async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    await ws_manager.register(ws)
    
    try:
        # Send welcome message
        await ws.send_str(json.dumps({
            "message_type": "welcome",
            "data": {"message": "welcome"}
        }))
        
        # Send initial state
        initial_state = await get_initial_state()
        await ws.send_str(json.dumps({
            "message_type": "initial_state",
            "data": initial_state
        }))
        
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    await handle_websocket_message(ws, data)
                except json.JSONDecodeError:
                    await ws.send_str(json.dumps({
                        "error": "Invalid JSON format"
                    }))
            elif msg.type == WSMsgType.ERROR:
                print(f"[BYJ] WebSocket error: {ws.exception()}")
                break
    finally:
        await ws_manager.unregister(ws)
    
    return ws

async def handle_websocket_message(ws, data):
    """Handle incoming WebSocket messages"""
    message_type = data.get('type', '')
    
    if message_type == 'ping':
        await ws.send_str(json.dumps({
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }))
    elif message_type == 'get_status':
        status = await get_system_status()
        await ws.send_str(json.dumps({
            "type": "status",
            "data": status
        }))
    else:
        await ws.send_str(json.dumps({
            "error": f"Unknown message type: {message_type}"
        }))

async def get_initial_state():
    """Get initial system state for WebSocket clients"""
    return {
        "metrics": await get_system_metrics(),
        "active_connections": await get_active_connections(),
        "blocked_ips": [],
        "alerts": []
    }

async def get_system_metrics():
    """Get current system metrics"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        network = psutil.net_io_counters()
        
        return {
            "system": {
                "cpu": {
                    "percent": cpu_percent,
                    "cores": psutil.cpu_count(),
                    "frequency": psutil.cpu_freq().current if psutil.cpu_freq() else 0
                },
                "memory": {
                    "total": memory.total,
                    "used": memory.used,
                    "percent": memory.percent
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "percent": (disk.used / disk.total) * 100
                },
                "network": {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv
                }
            }
        }
    except Exception as e:
        print(f"[BYJ] Error getting system metrics: {e}")
        return {"system": {"cpu": {"percent": 0}, "memory": {"total": 0, "used": 0, "percent": 0}}}

async def get_active_connections():
    """Get active network connections"""
    try:
        connections = []
        for conn in psutil.net_connections(kind='inet'):
            if conn.status == 'ESTABLISHED':
                connections.append({
                    "host": conn.laddr.ip if conn.laddr else "unknown",
                    "port": conn.laddr.port if conn.laddr else 0,
                    "protocol": "TCP",
                    "process": "byj",
                    "status": conn.status,
                    "bytes_sent": 0,
                    "bytes_received": 0,
                    "latency": random.randint(5, 50),
                    "last_seen": datetime.now().isoformat()
                })
        return connections[:10]  # Limit to 10 connections
    except Exception as e:
        print(f"[BYJ] Error getting connections: {e}")
        return []

async def get_system_status():
    """Get overall system status"""
    return {
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "uptime": time.time(),
        "version": "1.0.0"
    }

async def metrics_broadcaster():
    """Continuously broadcast system metrics to WebSocket clients"""
    while ws_manager.running:
        try:
            if ws_manager.connections:
                # Send metrics update
                metrics = await get_system_metrics()
                await ws_manager.broadcast({
                    "message_type": "metrics_update",
                    "data": metrics
                })
                
                # Send connections update
                connections = await get_active_connections()
                await ws_manager.broadcast({
                    "message_type": "connections_update",
                    "data": {
                        "active_connections": connections,
                        "blocked_ips": [],
                        "alerts": []
                    }
                })
                
        except Exception as e:
            print(f"[BYJ] Error in metrics broadcaster: {e}")
        
        await asyncio.sleep(2)  # Update every 2 seconds

async def serve_static(request):
    """Serve static frontend files"""
    path = request.match_info.get('path', 'index.html')
    
    # Security: prevent directory traversal
    if '..' in path or path.startswith('/'):
        return web.Response(status=403, text="Forbidden")
    
    file_path = os.path.join(FRONTEND_PATH, path)
    
    # If file doesn't exist, serve index.html (for SPA routing)
    if not os.path.exists(file_path):
        file_path = os.path.join(FRONTEND_PATH, 'index.html')
    
    if os.path.exists(file_path):
        return web.FileResponse(file_path)
    else:
        return web.Response(status=404, text="File not found")

async def create_app():
    """Create and configure the aiohttp application"""
    app = web.Application()
    
    # Setup CORS
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods="*"
        )
    })
    
    # Setup API routes
    setup_routes(app)
    
    # WebSocket route
    app.router.add_get('/ws', websocket_handler)
    
    # Static file routes
    app.router.add_get('/', serve_static)
    app.router.add_get('/{path:.*}', serve_static)
    
    # Add CORS to all routes
    for route in list(app.router.routes()):
        cors.add(route)
    
    return app

async def main():
    """Main application entry point"""
    print(f"[BYJ] Starting HTTPS server on https://{HOST}:{PORT}")
    print(f"[BYJ] WebSocket server on wss://{HOST}:{PORT}/ws")
    print(f"[BYJ] Frontend files from: {FRONTEND_PATH}")
    print(f"[BYJ] SSL Certificate: {SSL_CERT_PATH}")
    print(f"[BYJ] SSL Key: {SSL_KEY_PATH}")
    
    # Check if SSL certificates exist
    if not os.path.exists(SSL_CERT_PATH) or not os.path.exists(SSL_KEY_PATH):
        print(f"[BYJ] ERROR: SSL certificates not found!")
        print(f"[BYJ] Certificate: {SSL_CERT_PATH} - {'EXISTS' if os.path.exists(SSL_CERT_PATH) else 'MISSING'}")
        print(f"[BYJ] Key: {SSL_KEY_PATH} - {'EXISTS' if os.path.exists(SSL_KEY_PATH) else 'MISSING'}")
        print(f"[BYJ] Please generate SSL certificates first.")
        return
    
    # Create SSL context
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ssl_context.load_cert_chain(SSL_CERT_PATH, SSL_KEY_PATH)
    
    # Create application
    app = await create_app()
    
    # Start metrics broadcaster
    ws_manager.running = True
    asyncio.create_task(metrics_broadcaster())
    
    # Setup signal handlers for graceful shutdown
    def signal_handler():
        print("\n[BYJ] Shutting down server...")
        ws_manager.running = False
        asyncio.create_task(app.cleanup())
    
    # Register signal handlers
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, lambda s, f: signal_handler())
    if hasattr(signal, 'SIGINT'):
        signal.signal(signal.SIGINT, lambda s, f: signal_handler())
    
    # Start server
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, HOST, PORT, ssl_context=ssl_context)
    await site.start()
    
    print(f"[BYJ] Server started successfully!")
    print(f"[BYJ] Access your application at: https://localhost:{PORT}")
    
    # Keep the server running
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\n[BYJ] Server shutdown requested")
    finally:
        ws_manager.running = False
        await runner.cleanup()

if __name__ == '__main__':
    asyncio.run(main())
