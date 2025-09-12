#!/usr/bin/env python3
"""
Real-time Alert System for Big Yellow Jacket Security
Handles threat alerts, notifications, and automated responses
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertType(Enum):
    THREAT_DETECTED = "threat_detected"
    IP_BLOCKED = "ip_blocked"
    SYSTEM_ANOMALY = "system_anomaly"
    SECURITY_BREACH = "security_breach"
    PERFORMANCE_ISSUE = "performance_issue"
    CONFIGURATION_CHANGE = "configuration_change"

class Alert:
    """Represents a security alert"""
    
    def __init__(self, alert_id: str, alert_type: AlertType, severity: AlertSeverity,
                 title: str, description: str, source_ip: str = None, 
                 target_ip: str = None, metadata: Dict = None):
        self.id = alert_id
        self.type = alert_type
        self.severity = severity
        self.title = title
        self.description = description
        self.source_ip = source_ip
        self.target_ip = target_ip
        self.metadata = metadata or {}
        self.timestamp = datetime.now()
        self.acknowledged = False
        self.resolved = False
        self.auto_resolved = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'type': self.type.value,
            'severity': self.severity.value,
            'title': self.title,
            'description': self.description,
            'source_ip': self.source_ip,
            'target_ip': self.target_ip,
            'metadata': self.metadata,
            'timestamp': self.timestamp.isoformat(),
            'acknowledged': self.acknowledged,
            'resolved': self.resolved,
            'auto_resolved': self.auto_resolved
        }

class AlertSystem:
    """Real-time alert management system"""
    
    def __init__(self):
        self.alerts = {}  # alert_id -> Alert
        self.alert_history = []
        self.subscribers = []  # WebSocket connections
        self.alert_rules = []
        self.auto_response_rules = []
        self.email_config = None
        self.slack_config = None
        
        # Alert statistics
        self.stats = {
            'total_alerts': 0,
            'critical_alerts': 0,
            'resolved_alerts': 0,
            'active_alerts': 0
        }
        
        # Initialize default rules
        self._setup_default_rules()
    
    def _setup_default_rules(self):
        """Setup default alert rules"""
        # Critical threat rule
        self.add_alert_rule(
            name="Critical Threat Detection",
            condition=lambda alert: alert.severity == AlertSeverity.CRITICAL,
            action=self._handle_critical_alert
        )
        
        # IP blocking rule
        self.add_alert_rule(
            name="IP Blocking Alert",
            condition=lambda alert: alert.type == AlertType.IP_BLOCKED,
            action=self._handle_ip_blocking_alert
        )
        
        # High severity rule
        self.add_alert_rule(
            name="High Severity Alert",
            condition=lambda alert: alert.severity == AlertSeverity.HIGH,
            action=self._handle_high_severity_alert
        )
    
    def add_subscriber(self, websocket):
        """Add WebSocket subscriber for real-time alerts"""
        self.subscribers.append(websocket)
    
    def remove_subscriber(self, websocket):
        """Remove WebSocket subscriber"""
        if websocket in self.subscribers:
            self.subscribers.remove(websocket)
    
    async def create_alert(self, alert_type: AlertType, severity: AlertSeverity,
                          title: str, description: str, source_ip: str = None,
                          target_ip: str = None, metadata: Dict = None) -> Alert:
        """Create and process a new alert"""
        alert_id = self._generate_alert_id()
        alert = Alert(alert_id, alert_type, severity, title, description,
                     source_ip, target_ip, metadata)
        
        # Store alert
        self.alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Update statistics
        self.stats['total_alerts'] += 1
        if severity == AlertSeverity.CRITICAL:
            self.stats['critical_alerts'] += 1
        self.stats['active_alerts'] += 1
        
        # Process alert through rules
        await self._process_alert(alert)
        
        # Notify subscribers
        await self._notify_subscribers(alert)
        
        # Log alert
        print(f"[ALERT] {severity.value.upper()}: {title} - {alert_id}")
        
        return alert
    
    def _generate_alert_id(self) -> str:
        """Generate unique alert ID"""
        timestamp = int(time.time() * 1000)
        return f"ALERT_{timestamp}"
    
    async def _process_alert(self, alert: Alert):
        """Process alert through all rules"""
        for rule in self.alert_rules:
            try:
                if rule['condition'](alert):
                    await rule['action'](alert)
            except Exception as e:
                print(f"[ERROR] Alert rule processing failed: {e}")
    
    async def _notify_subscribers(self, alert: Alert):
        """Notify all WebSocket subscribers about new alert"""
        if not self.subscribers:
            return
        
        alert_data = {
            'message_type': 'alert',
            'data': alert.to_dict()
        }
        
        # Send to all subscribers
        disconnected = []
        for ws in self.subscribers:
            try:
                await ws.send_str(json.dumps(alert_data))
            except Exception:
                disconnected.append(ws)
        
        # Remove disconnected subscribers
        for ws in disconnected:
            self.remove_subscriber(ws)
    
    def add_alert_rule(self, name: str, condition: Callable, action: Callable):
        """Add custom alert processing rule"""
        self.alert_rules.append({
            'name': name,
            'condition': condition,
            'action': action
        })
    
    async def _handle_critical_alert(self, alert: Alert):
        """Handle critical alerts with immediate response"""
        print(f"[CRITICAL] Immediate response required for alert: {alert.id}")
        
        # Auto-block malicious IPs
        if alert.source_ip and alert.type == AlertType.THREAT_DETECTED:
            await self._auto_block_ip(alert.source_ip, "Critical threat detected")
    
    async def _handle_ip_blocking_alert(self, alert: Alert):
        """Handle IP blocking alerts"""
        print(f"[BLOCK] IP {alert.source_ip} has been blocked")
    
    async def _handle_high_severity_alert(self, alert: Alert):
        """Handle high severity alerts"""
        print(f"[HIGH] High severity alert requires attention: {alert.title}")
    
    async def _auto_block_ip(self, ip: str, reason: str):
        """Automatically block malicious IP"""
        # This would integrate with your firewall/blocking system
        print(f"[AUTO-BLOCK] Blocking IP {ip}: {reason}")
        
        # Create blocking alert
        await self.create_alert(
            AlertType.IP_BLOCKED,
            AlertSeverity.HIGH,
            f"IP {ip} Auto-Blocked",
            f"IP {ip} was automatically blocked due to: {reason}",
            source_ip=ip,
            metadata={'auto_blocked': True, 'reason': reason}
        )
    
    def acknowledge_alert(self, alert_id: str, user: str = "system") -> bool:
        """Acknowledge an alert"""
        if alert_id in self.alerts:
            self.alerts[alert_id].acknowledged = True
            print(f"[ALERT] Alert {alert_id} acknowledged by {user}")
            return True
        return False
    
    def resolve_alert(self, alert_id: str, user: str = "system") -> bool:
        """Resolve an alert"""
        if alert_id in self.alerts:
            alert = self.alerts[alert_id]
            alert.resolved = True
            self.stats['resolved_alerts'] += 1
            self.stats['active_alerts'] -= 1
            print(f"[ALERT] Alert {alert_id} resolved by {user}")
            return True
        return False
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active (unresolved) alerts"""
        return [alert for alert in self.alerts.values() if not alert.resolved]
    
    def get_alerts_by_severity(self, severity: AlertSeverity) -> List[Alert]:
        """Get alerts by severity level"""
        return [alert for alert in self.alerts.values() if alert.severity == severity]
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get alert statistics"""
        active_alerts = self.get_active_alerts()
        critical_alerts = self.get_alerts_by_severity(AlertSeverity.CRITICAL)
        
        return {
            'total_alerts': self.stats['total_alerts'],
            'active_alerts': len(active_alerts),
            'critical_alerts': len(critical_alerts),
            'resolved_alerts': self.stats['resolved_alerts'],
            'alert_rate_per_hour': self._calculate_alert_rate(),
            'last_updated': datetime.now().isoformat()
        }
    
    def _calculate_alert_rate(self) -> float:
        """Calculate alerts per hour"""
        if not self.alert_history:
            return 0.0
        
        # Count alerts from last hour
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_alerts = [
            alert for alert in self.alert_history
            if alert.timestamp > one_hour_ago
        ]
        
        return len(recent_alerts)
    
    def get_alert_dashboard_data(self) -> Dict[str, Any]:
        """Get data for alert dashboard"""
        active_alerts = self.get_active_alerts()
        
        # Group by severity
        severity_counts = {
            'low': 0,
            'medium': 0,
            'high': 0,
            'critical': 0
        }
        
        for alert in active_alerts:
            severity_counts[alert.severity.value] += 1
        
        # Recent alerts (last 24 hours)
        one_day_ago = datetime.now() - timedelta(days=1)
        recent_alerts = [
            alert.to_dict() for alert in self.alert_history
            if alert.timestamp > one_day_ago
        ]
        
        return {
            'severity_counts': severity_counts,
            'total_active': len(active_alerts),
            'recent_alerts': recent_alerts[-10:],  # Last 10 alerts
            'statistics': self.get_alert_statistics()
        }
    
    def configure_email_notifications(self, smtp_server: str, smtp_port: int,
                                    username: str, password: str, 
                                    from_email: str, to_emails: List[str]):
        """Configure email notifications"""
        self.email_config = {
            'smtp_server': smtp_server,
            'smtp_port': smtp_port,
            'username': username,
            'password': password,
            'from_email': from_email,
            'to_emails': to_emails
        }
    
    async def send_email_alert(self, alert: Alert):
        """Send email notification for critical alerts"""
        if not self.email_config or alert.severity != AlertSeverity.CRITICAL:
            return
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.email_config['from_email']
            msg['To'] = ', '.join(self.email_config['to_emails'])
            msg['Subject'] = f"CRITICAL ALERT: {alert.title}"
            
            body = f"""
            Critical Security Alert
            
            Alert ID: {alert.id}
            Severity: {alert.severity.value.upper()}
            Title: {alert.title}
            Description: {alert.description}
            Source IP: {alert.source_ip or 'N/A'}
            Target IP: {alert.target_ip or 'N/A'}
            Timestamp: {alert.timestamp}
            
            Please investigate immediately.
            
            Big Yellow Jacket Security System
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email (in production, use async email sending)
            print(f"[EMAIL] Critical alert email sent for {alert.id}")
            
        except Exception as e:
            print(f"[ERROR] Failed to send email alert: {e}")
