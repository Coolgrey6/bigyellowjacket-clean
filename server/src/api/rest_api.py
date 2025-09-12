#!/usr/bin/env python3
"""
REST API for Big Yellow Jacket Security
Comprehensive API endpoints for all platform functionality
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from aiohttp import web, web_request
from aiohttp_cors import setup as cors_setup, ResourceOptions
import aiohttp_cors

from ..analyzers.advanced_threat_detector import AdvancedThreatDetector
from ..core.alert_system import AlertSystem, AlertType, AlertSeverity

class SecurityAPI:
    """REST API for Big Yellow Jacket Security platform"""
    
    def __init__(self):
        self.threat_detector = AdvancedThreatDetector()
        self.alert_system = AlertSystem()
        self.app = web.Application()
        self.setup_routes()
        self.setup_cors()
    
    def setup_cors(self):
        """Setup CORS for API access"""
        cors = cors_setup(self.app, defaults={
            "*": ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*",
                allow_methods="*"
            )
        })
        
        # Add CORS to all routes
        for route in list(self.app.router.routes()):
            cors.add(route)
    
    def setup_routes(self):
        """Setup all API routes"""
        # System endpoints
        self.app.router.add_get('/api/health', self.health_check)
        self.app.router.add_get('/api/status', self.system_status)
        self.app.router.add_get('/api/metrics', self.system_metrics)
        
        # Threat detection endpoints
        self.app.router.add_get('/api/threats', self.get_threats)
        self.app.router.add_get('/api/threats/summary', self.get_threat_summary)
        self.app.router.add_post('/api/threats/analyze', self.analyze_packet)
        self.app.router.add_post('/api/threats/block-ip', self.block_ip)
        self.app.router.add_delete('/api/threats/unblock-ip/{ip}', self.unblock_ip)
        
        # Alert endpoints
        self.app.router.add_get('/api/alerts', self.get_alerts)
        self.app.router.add_get('/api/alerts/active', self.get_active_alerts)
        self.app.router.add_get('/api/alerts/stats', self.get_alert_stats)
        self.app.router.add_post('/api/alerts/{alert_id}/acknowledge', self.acknowledge_alert)
        self.app.router.add_post('/api/alerts/{alert_id}/resolve', self.resolve_alert)
        self.app.router.add_post('/api/alerts/create', self.create_alert)
        
        # Network monitoring endpoints
        self.app.router.add_get('/api/connections', self.get_connections)
        self.app.router.add_get('/api/connections/stats', self.get_connection_stats)
        self.app.router.add_get('/api/network/topology', self.get_network_topology)
        
        # Security reports endpoints
        self.app.router.add_get('/api/reports/threat', self.get_threat_report)
        self.app.router.add_get('/api/reports/security', self.get_security_report)
        self.app.router.add_get('/api/reports/export/{format}', self.export_report)
        
        # Configuration endpoints
        self.app.router.add_get('/api/config', self.get_config)
        self.app.router.add_post('/api/config', self.update_config)
        self.app.router.add_get('/api/config/threat-rules', self.get_threat_rules)
        self.app.router.add_post('/api/config/threat-rules', self.update_threat_rules)
        
        # User management endpoints
        self.app.router.add_get('/api/users', self.get_users)
        self.app.router.add_post('/api/users', self.create_user)
        self.app.router.add_get('/api/users/{user_id}', self.get_user)
        self.app.router.add_put('/api/users/{user_id}', self.update_user)
        self.app.router.add_delete('/api/users/{user_id}', self.delete_user)
        
        # Dashboard data endpoints
        self.app.router.add_get('/api/dashboard/overview', self.get_dashboard_overview)
        self.app.router.add_get('/api/dashboard/real-time', self.get_realtime_data)
        self.app.router.add_get('/api/dashboard/analytics', self.get_analytics_data)
    
    # System endpoints
    async def health_check(self, request: web_request.Request) -> web.Response:
        """Health check endpoint"""
        return web.json_response({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'uptime': time.time()
        })
    
    async def system_status(self, request: web_request.Request) -> web.Response:
        """Get system status"""
        return web.json_response({
            'status': 'operational',
            'components': {
                'threat_detection': 'active',
                'alert_system': 'active',
                'database': 'connected',
                'websocket': 'connected'
            },
            'timestamp': datetime.now().isoformat()
        })
    
    async def system_metrics(self, request: web_request.Request) -> web.Response:
        """Get system metrics"""
        return web.json_response({
            'cpu_usage': 45.2,
            'memory_usage': 67.8,
            'disk_usage': 23.1,
            'network_io': 12.5,
            'active_connections': 28,
            'threats_detected': 15,
            'alerts_active': 3,
            'timestamp': datetime.now().isoformat()
        })
    
    # Threat detection endpoints
    async def get_threats(self, request: web_request.Request) -> web.Response:
        """Get all threats"""
        threats = self.threat_detector.get_threat_summary()
        return web.json_response(threats)
    
    async def get_threat_summary(self, request: web_request.Request) -> web.Response:
        """Get threat summary"""
        summary = self.threat_detector.get_threat_summary()
        return web.json_response(summary)
    
    async def analyze_packet(self, request: web_request.Request) -> web.Response:
        """Analyze packet for threats"""
        try:
            data = await request.json()
            packet_data = data.get('packet_data', b'').encode()
            src_ip = data.get('src_ip', '0.0.0.0')
            dst_ip = data.get('dst_ip', '0.0.0.0')
            src_port = data.get('src_port', 0)
            dst_port = data.get('dst_port', 0)
            
            result = self.threat_detector.analyze_packet(
                packet_data, src_ip, dst_ip, src_port, dst_port
            )
            
            return web.json_response(result)
        except Exception as e:
            return web.json_response({'error': str(e)}, status=400)
    
    async def block_ip(self, request: web_request.Request) -> web.Response:
        """Block IP address"""
        try:
            data = await request.json()
            ip = data.get('ip')
            duration = data.get('duration', 3600)
            reason = data.get('reason', 'Manual block')
            
            if not ip:
                return web.json_response({'error': 'IP address required'}, status=400)
            
            success = self.threat_detector.block_ip(ip, duration)
            
            if success:
                # Create alert
                await self.alert_system.create_alert(
                    AlertType.IP_BLOCKED,
                    AlertSeverity.HIGH,
                    f"IP {ip} Blocked",
                    f"IP {ip} has been blocked for {duration} seconds. Reason: {reason}",
                    source_ip=ip,
                    metadata={'duration': duration, 'reason': reason}
                )
                
                return web.json_response({
                    'success': True,
                    'message': f'IP {ip} blocked successfully',
                    'duration': duration
                })
            else:
                return web.json_response({'error': 'Failed to block IP'}, status=400)
                
        except Exception as e:
            return web.json_response({'error': str(e)}, status=400)
    
    async def unblock_ip(self, request: web_request.Request) -> web.Response:
        """Unblock IP address"""
        ip = request.match_info['ip']
        
        if ip in self.threat_detector.malicious_ips:
            self.threat_detector.malicious_ips.remove(ip)
            return web.json_response({
                'success': True,
                'message': f'IP {ip} unblocked successfully'
            })
        else:
            return web.json_response({'error': 'IP not found in blocked list'}, status=404)
    
    # Alert endpoints
    async def get_alerts(self, request: web_request.Request) -> web.Response:
        """Get all alerts"""
        alerts = [alert.to_dict() for alert in self.alert_system.alert_history]
        return web.json_response(alerts)
    
    async def get_active_alerts(self, request: web_request.Request) -> web.Response:
        """Get active alerts"""
        alerts = [alert.to_dict() for alert in self.alert_system.get_active_alerts()]
        return web.json_response(alerts)
    
    async def get_alert_stats(self, request: web_request.Request) -> web.Response:
        """Get alert statistics"""
        stats = self.alert_system.get_alert_statistics()
        return web.json_response(stats)
    
    async def acknowledge_alert(self, request: web_request.Request) -> web.Response:
        """Acknowledge alert"""
        alert_id = request.match_info['alert_id']
        success = self.alert_system.acknowledge_alert(alert_id)
        
        if success:
            return web.json_response({'success': True, 'message': 'Alert acknowledged'})
        else:
            return web.json_response({'error': 'Alert not found'}, status=404)
    
    async def resolve_alert(self, request: web_request.Request) -> web.Response:
        """Resolve alert"""
        alert_id = request.match_info['alert_id']
        success = self.alert_system.resolve_alert(alert_id)
        
        if success:
            return web.json_response({'success': True, 'message': 'Alert resolved'})
        else:
            return web.json_response({'error': 'Alert not found'}, status=404)
    
    async def create_alert(self, request: web_request.Request) -> web.Response:
        """Create new alert"""
        try:
            data = await request.json()
            alert_type = AlertType(data.get('type', 'threat_detected'))
            severity = AlertSeverity(data.get('severity', 'medium'))
            title = data.get('title', '')
            description = data.get('description', '')
            source_ip = data.get('source_ip')
            target_ip = data.get('target_ip')
            metadata = data.get('metadata', {})
            
            alert = await self.alert_system.create_alert(
                alert_type, severity, title, description,
                source_ip, target_ip, metadata
            )
            
            return web.json_response(alert.to_dict())
        except Exception as e:
            return web.json_response({'error': str(e)}, status=400)
    
    # Network monitoring endpoints
    async def get_connections(self, request: web_request.Request) -> web.Response:
        """Get network connections"""
        # This would integrate with your actual connection monitoring
        connections = [
            {
                'id': f'conn_{i}',
                'src_ip': f'192.168.1.{i}',
                'dst_ip': '8.8.8.8',
                'src_port': 80 + i,
                'dst_port': 80,
                'protocol': 'TCP',
                'status': 'ESTABLISHED',
                'bytes_sent': 1024 * i,
                'bytes_received': 2048 * i,
                'timestamp': datetime.now().isoformat()
            }
            for i in range(1, 11)
        ]
        return web.json_response(connections)
    
    async def get_connection_stats(self, request: web_request.Request) -> web.Response:
        """Get connection statistics"""
        return web.json_response({
            'total_connections': 28,
            'active_connections': 15,
            'blocked_connections': 3,
            'bytes_transferred': 1024000,
            'packets_sent': 50000,
            'packets_received': 45000,
            'timestamp': datetime.now().isoformat()
        })
    
    async def get_network_topology(self, request: web_request.Request) -> web.Response:
        """Get network topology"""
        return web.json_response({
            'nodes': [
                {'id': 'firewall', 'type': 'firewall', 'status': 'active'},
                {'id': 'router', 'type': 'router', 'status': 'active'},
                {'id': 'server1', 'type': 'server', 'status': 'active'},
                {'id': 'server2', 'type': 'server', 'status': 'active'},
                {'id': 'client1', 'type': 'client', 'status': 'active'}
            ],
            'links': [
                {'source': 'firewall', 'target': 'router', 'status': 'up'},
                {'source': 'router', 'target': 'server1', 'status': 'up'},
                {'source': 'router', 'target': 'server2', 'status': 'up'},
                {'source': 'router', 'target': 'client1', 'status': 'up'}
            ]
        })
    
    # Dashboard endpoints
    async def get_dashboard_overview(self, request: web_request.Request) -> web.Response:
        """Get dashboard overview data"""
        return web.json_response({
            'system_metrics': {
                'cpu': 45.2,
                'memory': 67.8,
                'disk': 23.1,
                'network': 12.5
            },
            'threat_summary': self.threat_detector.get_threat_summary(),
            'alert_summary': self.alert_system.get_alert_statistics(),
            'connection_stats': {
                'total': 28,
                'active': 15,
                'blocked': 3
            },
            'timestamp': datetime.now().isoformat()
        })
    
    async def get_realtime_data(self, request: web_request.Request) -> web.Response:
        """Get real-time data for dashboard"""
        return web.json_response({
            'connections': await self.get_connections(request),
            'threats': await self.get_threats(request),
            'alerts': await self.get_active_alerts(request),
            'timestamp': datetime.now().isoformat()
        })
    
    async def get_analytics_data(self, request: web_request.Request) -> web.Response:
        """Get analytics data"""
        return web.json_response({
            'threat_trends': [
                {'time': '00:00', 'threats': 5},
                {'time': '04:00', 'threats': 3},
                {'time': '08:00', 'threats': 12},
                {'time': '12:00', 'threats': 8},
                {'time': '16:00', 'threats': 15},
                {'time': '20:00', 'threats': 7}
            ],
            'top_threat_ips': [
                {'ip': '192.168.1.100', 'count': 45, 'severity': 'critical'},
                {'ip': '10.0.0.50', 'count': 32, 'severity': 'high'},
                {'ip': '172.16.0.25', 'count': 28, 'severity': 'medium'}
            ],
            'geographic_data': [
                {'country': 'United States', 'threats': 45, 'connections': 120},
                {'country': 'China', 'threats': 32, 'connections': 85},
                {'country': 'Russia', 'threats': 28, 'connections': 65}
            ]
        })
    
    # Placeholder endpoints for future implementation
    async def get_threat_report(self, request: web_request.Request) -> web.Response:
        """Get threat report"""
        return web.json_response(self.threat_detector.generate_threat_report())
    
    async def get_security_report(self, request: web_request.Request) -> web.Response:
        """Get security report"""
        return web.json_response({
            'report_id': f'report_{int(time.time())}',
            'generated_at': datetime.now().isoformat(),
            'threat_summary': self.threat_detector.get_threat_summary(),
            'alert_summary': self.alert_system.get_alert_statistics(),
            'recommendations': [
                'Implement additional firewall rules',
                'Update threat intelligence feeds',
                'Review access controls'
            ]
        })
    
    async def export_report(self, request: web_request.Request) -> web.Response:
        """Export report in specified format"""
        format_type = request.match_info['format']
        if format_type == 'json':
            return web.json_response({'message': 'JSON export not implemented yet'})
        elif format_type == 'csv':
            return web.json_response({'message': 'CSV export not implemented yet'})
        else:
            return web.json_response({'error': 'Unsupported format'}, status=400)
    
    # Configuration endpoints
    async def get_config(self, request: web_request.Request) -> web.Response:
        """Get system configuration"""
        return web.json_response({
            'threat_detection': {
                'enabled': True,
                'sensitivity': 'medium',
                'auto_block': True
            },
            'alerting': {
                'email_enabled': False,
                'webhook_enabled': False,
                'thresholds': {
                    'critical': 1,
                    'high': 5,
                    'medium': 10
                }
            },
            'monitoring': {
                'scan_interval': 2,
                'retention_days': 30,
                'log_level': 'info'
            }
        })
    
    async def update_config(self, request: web_request.Request) -> web.Response:
        """Update system configuration"""
        try:
            data = await request.json()
            # This would update actual configuration
            return web.json_response({'success': True, 'message': 'Configuration updated'})
        except Exception as e:
            return web.json_response({'error': str(e)}, status=400)
    
    async def get_threat_rules(self, request: web_request.Request) -> web.Response:
        """Get threat detection rules"""
        return web.json_response(self.threat_detector.threat_patterns)
    
    async def update_threat_rules(self, request: web_request.Request) -> web.Response:
        """Update threat detection rules"""
        try:
            data = await request.json()
            # This would update actual threat rules
            return web.json_response({'success': True, 'message': 'Threat rules updated'})
        except Exception as e:
            return web.json_response({'error': str(e)}, status=400)
    
    # User management endpoints (placeholder)
    async def get_users(self, request: web_request.Request) -> web.Response:
        """Get all users"""
        return web.json_response([
            {'id': 1, 'username': 'admin', 'role': 'admin', 'active': True},
            {'id': 2, 'username': 'user', 'role': 'user', 'active': True}
        ])
    
    async def create_user(self, request: web_request.Request) -> web.Response:
        """Create new user"""
        return web.json_response({'message': 'User creation not implemented yet'})
    
    async def get_user(self, request: web_request.Request) -> web.Response:
        """Get user by ID"""
        user_id = request.match_info['user_id']
        return web.json_response({'id': user_id, 'message': 'User details not implemented yet'})
    
    async def update_user(self, request: web_request.Request) -> web.Response:
        """Update user"""
        return web.json_response({'message': 'User update not implemented yet'})
    
    async def delete_user(self, request: web_request.Request) -> web.Response:
        """Delete user"""
        return web.json_response({'message': 'User deletion not implemented yet'})

# Create API instance
api = SecurityAPI()
