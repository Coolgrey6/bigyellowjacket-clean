#!/usr/bin/env python3
import asyncio
import json
import websockets

async def handle_client(websocket, path):
    print('WebSocket client connected')
    await websocket.send(json.dumps({'message_type': 'welcome', 'data': {'message': 'welcome'}}))
    
    # Send initial state
    initial_payload = {
        'message_type': 'initial_state',
        'data': {
            'metrics': {'system': {'cpu': {'percent': 25.5}, 'memory': {'percent': 50.0}}},
            'active_connections': [],
            'blocked_ips': [],
            'alerts': []
        }
    }
    await websocket.send(json.dumps(initial_payload))
    
    # Keep connection alive
    try:
        await websocket.wait_closed()
    except websockets.exceptions.ConnectionClosed:
        pass

async def main():
    print('Starting WebSocket server on ws://localhost:8766')
    async with websockets.serve(handle_client, 'localhost', 8766):
        await asyncio.Future()  # Run forever

if __name__ == '__main__':
    asyncio.run(main())
