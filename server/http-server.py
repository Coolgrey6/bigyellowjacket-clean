#!/usr/bin/env python3
"""
Simple HTTP server for Big Yellow Jacket Security
"""

import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import urllib.parse

# Configuration
HOST = "localhost"
PORT = 8082
FRONTEND_DIST_PATH = Path(__file__).parent.parent / "frontend" / "bigyellowjacket-ui" / "dist"

class BYJHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/threats':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            response = {
                "threats": [],
                "total": 0,
                "status": "ok"
            }
            self.wfile.write(json.dumps(response).encode())
        elif self.path == '/':
            self.serve_frontend()
        elif self.path.startswith('/app'):
            self.serve_frontend()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def do_POST(self):
        if self.path == '/api/threats/block-ip':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            ip = data.get('ip', '')
            print(f"Blocking IP: {ip}")
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            response = {
                "success": True,
                "ip": ip,
                "message": "IP blocked successfully"
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def serve_frontend(self):
        """Serve the frontend files"""
        index_path = FRONTEND_DIST_PATH / "index.html"
        if index_path.exists():
            with open(index_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Frontend not found. Please run npm run build first.')

def main():
    """Main function to run the server"""
    print(f"[BYJ] Starting HTTP server on http://{HOST}:{PORT}")
    print(f"[BYJ] Frontend files from: {FRONTEND_DIST_PATH}")
    
    server = HTTPServer((HOST, PORT), BYJHandler)
    print(f"[BYJ] Server started successfully!")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[BYJ] Server stopped.")
        server.shutdown()

if __name__ == "__main__":
    main()
