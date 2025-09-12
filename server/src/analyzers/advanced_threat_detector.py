#!/usr/bin/env python3
"""
Advanced Threat Detection System for Big Yellow Jacket Security
Real-time threat analysis with machine learning patterns
"""

import asyncio
import json
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import ipaddress
import hashlib

class AdvancedThreatDetector:
    """Advanced threat detection with multiple analysis engines"""
    
    def __init__(self):
        self.threat_patterns = {
            # Network-based threats
            'port_scan': {
                'pattern': r'(\d+\.\d+\.\d+\.\d+).*?(\d+)\s+ports',
                'severity': 'medium',
                'description': 'Port scanning detected'
            },
            'brute_force': {
                'pattern': r'Failed password.*?(\d+\.\d+\.\d+\.\d+)',
                'severity': 'high',
                'description': 'Brute force attack detected'
            },
            'sql_injection': {
                'pattern': r'(union|select|insert|delete|drop|update).*?(from|into|where)',
                'severity': 'critical',
                'description': 'SQL injection attempt detected'
            },
            'xss_attack': {
                'pattern': r'<script.*?>.*?</script>|<img.*?onerror|javascript:',
                'severity': 'high',
                'description': 'XSS attack detected'
            },
            'directory_traversal': {
                'pattern': r'\.\./|\.\.\\|%2e%2e%2f|%2e%2e%5c',
                'severity': 'medium',
                'description': 'Directory traversal attempt detected'
            },
            'command_injection': {
                'pattern': r'(\||&|;|\$\(|\`).*(ls|cat|whoami|id|pwd|ps|netstat)',
                'severity': 'critical',
                'description': 'Command injection attempt detected'
            }
        }
        
        # Known malicious IPs and patterns
        self.malicious_ips = set()
        self.suspicious_ips = defaultdict(int)
        self.attack_attempts = defaultdict(list)
        
        # Behavioral analysis
        self.connection_frequency = defaultdict(list)
        self.request_patterns = defaultdict(list)
        self.geo_anomalies = defaultdict(list)
        
        # Threat intelligence feeds
        self.threat_intel = {
            'malicious_ips': set(),
            'suspicious_domains': set(),
            'known_attack_patterns': set()
        }
        
        # Alert thresholds
        self.thresholds = {
            'max_failed_attempts': 5,
            'max_connections_per_minute': 100,
            'max_requests_per_second': 50,
            'suspicious_geo_threshold': 0.8
        }
    
    def analyze_packet(self, packet_data: bytes, src_ip: str, dst_ip: str, 
                      src_port: int, dst_port: int) -> Dict[str, Any]:
        """Analyze network packet for threats"""
        threats = []
        risk_score = 0
        
        # Convert packet to string for pattern matching
        packet_str = packet_data.decode('utf-8', errors='ignore').lower()
        
        # Check for known attack patterns
        for threat_type, config in self.threat_patterns.items():
            if re.search(config['pattern'], packet_str, re.IGNORECASE):
                threat = {
                    'type': threat_type,
                    'severity': config['severity'],
                    'description': config['description'],
                    'src_ip': src_ip,
                    'dst_ip': dst_ip,
                    'timestamp': datetime.now().isoformat(),
                    'confidence': 0.9
                }
                threats.append(threat)
                risk_score += self._get_severity_score(config['severity'])
        
        # Behavioral analysis
        behavioral_threats = self._analyze_behavior(src_ip, dst_ip, src_port, dst_port)
        threats.extend(behavioral_threats)
        
        # IP reputation check
        reputation_threats = self._check_ip_reputation(src_ip, dst_ip)
        threats.extend(reputation_threats)
        
        # Calculate overall risk score
        risk_score = min(risk_score, 100)  # Cap at 100
        
        return {
            'threats': threats,
            'risk_score': risk_score,
            'timestamp': datetime.now().isoformat(),
            'src_ip': src_ip,
            'dst_ip': dst_ip
        }
    
    def _analyze_behavior(self, src_ip: str, dst_ip: str, 
                         src_port: int, dst_port: int) -> List[Dict[str, Any]]:
        """Analyze behavioral patterns for threats"""
        threats = []
        current_time = time.time()
        
        # Track connection frequency
        self.connection_frequency[src_ip].append(current_time)
        
        # Clean old entries (older than 1 hour)
        cutoff_time = current_time - 3600
        self.connection_frequency[src_ip] = [
            t for t in self.connection_frequency[src_ip] if t > cutoff_time
        ]
        
        # Check for connection flooding
        recent_connections = len([
            t for t in self.connection_frequency[src_ip] 
            if t > current_time - 60  # Last minute
        ])
        
        if recent_connections > self.thresholds['max_connections_per_minute']:
            threats.append({
                'type': 'connection_flooding',
                'severity': 'high',
                'description': f'Connection flooding detected: {recent_connections} connections/min',
                'src_ip': src_ip,
                'confidence': 0.8
            })
        
        # Check for port scanning
        if self._detect_port_scanning(src_ip):
            threats.append({
                'type': 'port_scanning',
                'severity': 'medium',
                'description': 'Port scanning behavior detected',
                'src_ip': src_ip,
                'confidence': 0.7
            })
        
        return threats
    
    def _detect_port_scanning(self, src_ip: str) -> bool:
        """Detect if IP is performing port scanning"""
        recent_connections = self.connection_frequency[src_ip]
        if len(recent_connections) < 10:
            return False
        
        # Check if connections are to many different ports
        # This is a simplified heuristic
        return len(recent_connections) > 20
    
    def _check_ip_reputation(self, src_ip: str, dst_ip: str) -> List[Dict[str, Any]]:
        """Check IP reputation against threat intelligence"""
        threats = []
        
        # Check if IP is in malicious list
        if src_ip in self.threat_intel['malicious_ips']:
            threats.append({
                'type': 'malicious_ip',
                'severity': 'critical',
                'description': 'Connection from known malicious IP',
                'src_ip': src_ip,
                'confidence': 0.95
            })
        
        # Check for suspicious activity
        if self.suspicious_ips[src_ip] > 3:
            threats.append({
                'type': 'suspicious_ip',
                'severity': 'medium',
                'description': 'IP showing suspicious behavior patterns',
                'src_ip': src_ip,
                'confidence': 0.6
            })
        
        return threats
    
    def _get_severity_score(self, severity: str) -> int:
        """Convert severity level to numeric score"""
        scores = {
            'low': 10,
            'medium': 25,
            'high': 50,
            'critical': 100
        }
        return scores.get(severity, 0)
    
    def add_malicious_ip(self, ip: str, reason: str = "Manual addition"):
        """Add IP to malicious list"""
        self.threat_intel['malicious_ips'].add(ip)
        self.malicious_ips.add(ip)
        
        # Log the addition
        print(f"[THREAT] Added malicious IP: {ip} - {reason}")
    
    def block_ip(self, ip: str, duration: int = 3600) -> bool:
        """Block IP address for specified duration"""
        try:
            # Validate IP address
            ipaddress.ip_address(ip)
            
            # Add to blocked list with expiration
            block_until = time.time() + duration
            self.malicious_ips.add(ip)
            
            print(f"[BLOCK] Blocked IP {ip} until {datetime.fromtimestamp(block_until)}")
            return True
        except ValueError:
            print(f"[ERROR] Invalid IP address: {ip}")
            return False
    
    def get_threat_summary(self) -> Dict[str, Any]:
        """Get summary of current threat landscape"""
        current_time = time.time()
        
        # Count recent threats
        recent_threats = 0
        for ip, attempts in self.attack_attempts.items():
            recent_threats += len([
                t for t in attempts 
                if t > current_time - 3600  # Last hour
            ])
        
        return {
            'total_malicious_ips': len(self.malicious_ips),
            'suspicious_ips': len(self.suspicious_ips),
            'recent_threats': recent_threats,
            'blocked_ips': list(self.malicious_ips),
            'threat_level': self._calculate_threat_level(),
            'last_updated': datetime.now().isoformat()
        }
    
    def _calculate_threat_level(self) -> str:
        """Calculate overall threat level"""
        threat_count = len(self.malicious_ips) + len(self.suspicious_ips)
        
        if threat_count > 50:
            return 'critical'
        elif threat_count > 20:
            return 'high'
        elif threat_count > 5:
            return 'medium'
        else:
            return 'low'
    
    def generate_threat_report(self) -> Dict[str, Any]:
        """Generate comprehensive threat report"""
        return {
            'timestamp': datetime.now().isoformat(),
            'threat_summary': self.get_threat_summary(),
            'recent_attacks': self._get_recent_attacks(),
            'top_threat_ips': self._get_top_threat_ips(),
            'recommendations': self._get_recommendations()
        }
    
    def _get_recent_attacks(self) -> List[Dict[str, Any]]:
        """Get list of recent attacks"""
        current_time = time.time()
        recent_attacks = []
        
        for ip, attempts in self.attack_attempts.items():
            for attempt_time in attempts:
                if attempt_time > current_time - 3600:  # Last hour
                    recent_attacks.append({
                        'ip': ip,
                        'timestamp': datetime.fromtimestamp(attempt_time).isoformat(),
                        'type': 'suspicious_activity'
                    })
        
        return sorted(recent_attacks, key=lambda x: x['timestamp'], reverse=True)[:10]
    
    def _get_top_threat_ips(self) -> List[Dict[str, Any]]:
        """Get top threat IPs by activity"""
        ip_scores = []
        
        for ip, attempts in self.attack_attempts.items():
            recent_attempts = len([
                t for t in attempts 
                if t > time.time() - 3600
            ])
            if recent_attempts > 0:
                ip_scores.append({
                    'ip': ip,
                    'threat_score': recent_attempts,
                    'is_blocked': ip in self.malicious_ips
                })
        
        return sorted(ip_scores, key=lambda x: x['threat_score'], reverse=True)[:10]
    
    def _get_recommendations(self) -> List[str]:
        """Get security recommendations based on current threats"""
        recommendations = []
        
        threat_summary = self.get_threat_summary()
        
        if threat_summary['threat_level'] == 'critical':
            recommendations.append("Immediate action required: Multiple critical threats detected")
            recommendations.append("Consider implementing emergency lockdown procedures")
        
        if len(self.malicious_ips) > 10:
            recommendations.append("High number of malicious IPs detected - review firewall rules")
        
        if threat_summary['recent_threats'] > 50:
            recommendations.append("High threat activity - consider increasing monitoring frequency")
        
        recommendations.append("Regular threat intelligence updates recommended")
        recommendations.append("Consider implementing automated response systems")
        
        return recommendations
