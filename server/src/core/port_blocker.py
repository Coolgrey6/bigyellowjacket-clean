#!/usr/bin/env python3
"""
Port Blocking System for Big Yellow Jacket Security
Blocks non-encrypted and dangerous ports for enhanced security
"""

import os
import json
import logging
import subprocess
import platform
from datetime import datetime, timedelta
from typing import List, Dict, Any, Set
from ..utils.file_encryption import FileEncryption

class PortBlocker:
    """Advanced port blocking system with encryption support"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.encryption = FileEncryption()
        self.rules_file = "data/port_rules.json.encrypted"
        self.blocked_ports_file = "data/blocked_ports.txt.encrypted"
        
        # Define dangerous and non-encrypted ports
        self.dangerous_ports = {
            80: "HTTP (unencrypted)",
            21: "FTP (unencrypted)", 
            23: "Telnet (unencrypted)",
            25: "SMTP (unencrypted)",
            53: "DNS (unencrypted)",
            110: "POP3 (unencrypted)",
            143: "IMAP (unencrypted)",
            161: "SNMP (unencrypted)",
            389: "LDAP (unencrypted)",
            445: "SMB (unencrypted)",
            993: "IMAPS (encrypted - allow)",
            995: "POP3S (encrypted - allow)",
            443: "HTTPS (encrypted - allow)",
            22: "SSH (encrypted - allow)",
            3389: "RDP (encrypted - allow)",
            5900: "VNC (encrypted - allow)",
            8080: "HTTP Alternative (unencrypted)",
            8000: "HTTP Alternative (unencrypted)",
            3000: "Development Server (unencrypted)",
            5000: "Development Server (unencrypted)"
        }
        
        # Ports that should always be blocked (non-encrypted production ports only)
        self.always_block = {
            80, 21, 23, 25, 53, 110, 143, 161, 389, 445
        }
        
        # Ports that should always be allowed (encrypted + development)
        self.always_allow = {
            443, 22, 993, 995, 3389, 5900, 587, 465, 636, 989, 990,
            # Development ports for local development
            5173,  # Vite dev server
            8766,  # Our WebSocket server
            3000,  # Common React dev server (if needed)
            5000,  # Common dev server (if needed)
            8080,  # Common dev server (if needed)
            8000,  # Common dev server (if needed)
        }
        
        self.initialize_port_blocker()
    
    def initialize_port_blocker(self):
        """Initialize the port blocking system"""
        try:
            os.makedirs("data", exist_ok=True)
            
            # Create initial port rules
            self._create_initial_rules()
            
            # Apply initial blocking rules
            self._apply_initial_blocks()
            
            self.logger.info("Port blocker initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize port blocker: {e}")
    
    def _create_initial_rules(self):
        """Create initial port blocking rules"""
        try:
            initial_rules = {
                "blocked_ports": list(self.always_block),
                "allowed_ports": list(self.always_allow),
                "custom_rules": [],
                "enabled": True,
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            }
            
            # Save rules to temporary file
            temp_path = "temp_port_rules.json"
            with open(temp_path, 'w') as f:
                json.dump(initial_rules, f, indent=2)
            
            # Encrypt the file
            self.encryption.encrypt_file(temp_path)
            
            # Move to final location
            if os.path.exists(f"{temp_path}.encrypted"):
                os.rename(f"{temp_path}.encrypted", self.rules_file)
            
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            self.logger.info("Initial port rules created and encrypted")
            
        except Exception as e:
            self.logger.error(f"Failed to create initial rules: {e}")
    
    def _apply_initial_blocks(self):
        """Apply initial port blocking rules"""
        try:
            system = platform.system().lower()
            
            if system == "darwin":  # macOS
                self._apply_macos_rules()
            elif system == "linux":
                self._apply_linux_rules()
            else:
                self.logger.warning(f"Port blocking not supported on {system}")
                
        except Exception as e:
            self.logger.error(f"Failed to apply initial blocks: {e}")
    
    def _apply_macos_rules(self):
        """Apply port blocking rules on macOS using pfctl"""
        try:
            # Create pfctl rules file
            rules_content = self._generate_pfctl_rules()
            
            with open("/tmp/byj_port_rules.conf", "w") as f:
                f.write(rules_content)
            
            # Load rules into pfctl
            subprocess.run([
                "sudo", "pfctl", "-f", "/tmp/byj_port_rules.conf"
            ], check=True)
            
            # Enable pfctl if not already enabled
            subprocess.run([
                "sudo", "pfctl", "-e"
            ], check=True)
            
            self.logger.info("macOS port blocking rules applied successfully")
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to apply macOS rules: {e}")
        except Exception as e:
            self.logger.error(f"Error applying macOS rules: {e}")
    
    def _apply_linux_rules(self):
        """Apply port blocking rules on Linux using iptables"""
        try:
            # First, allow localhost traffic
            subprocess.run([
                "sudo", "iptables", "-A", "INPUT", 
                "-s", "127.0.0.1", "-j", "ACCEPT"
            ], check=True)
            
            subprocess.run([
                "sudo", "iptables", "-A", "INPUT", 
                "-s", "::1", "-j", "ACCEPT"
            ], check=True)
            
            # Then block dangerous ports from external sources
            for port in self.always_block:
                # Block incoming connections to dangerous ports (external only)
                subprocess.run([
                    "sudo", "iptables", "-A", "INPUT", 
                    "-p", "tcp", "--dport", str(port), 
                    "!", "-s", "127.0.0.1", "!", "-s", "::1", "-j", "DROP"
                ], check=True)
                
                subprocess.run([
                    "sudo", "iptables", "-A", "INPUT", 
                    "-p", "udp", "--dport", str(port), 
                    "!", "-s", "127.0.0.1", "!", "-s", "::1", "-j", "DROP"
                ], check=True)
            
            self.logger.info("Linux port blocking rules applied successfully")
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to apply Linux rules: {e}")
        except Exception as e:
            self.logger.error(f"Error applying Linux rules: {e}")
    
    def _generate_pfctl_rules(self) -> str:
        """Generate pfctl rules for macOS"""
        rules = [
            "# Big Yellow Jacket Security - Port Blocking Rules",
            "# Generated automatically",
            "",
            "# Always allow localhost traffic (development)",
            "pass in proto tcp from 127.0.0.1 to any",
            "pass in proto udp from 127.0.0.1 to any",
            "pass in proto tcp from ::1 to any",
            "pass in proto udp from ::1 to any",
            "",
            "# Block dangerous unencrypted ports (external only)",
        ]
        
        for port in self.always_block:
            rules.extend([
                f"block in proto tcp from any to any port {port}",
                f"block in proto udp from any to any port {port}",
                ""
            ])
        
        rules.extend([
            "# Allow encrypted ports",
        ])
        
        for port in self.always_allow:
            rules.extend([
                f"pass in proto tcp from any to any port {port}",
                f"pass in proto udp from any to any port {port}",
                ""
            ])
        
        return "\n".join(rules)
    
    def block_port(self, port: int, reason: str = "Security policy") -> bool:
        """Block a specific port"""
        try:
            # Check if port is in always allow list
            if port in self.always_allow:
                self.logger.warning(f"Cannot block port {port} - it's in always allow list")
                return False
            
            # Add to blocked ports
            blocked_ports = self.get_blocked_ports()
            if port not in blocked_ports:
                blocked_ports.append(port)
                self._save_blocked_ports(blocked_ports)
            
            # Apply the block
            self._apply_port_block(port)
            
            self.logger.info(f"Blocked port {port} - {reason}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to block port {port}: {e}")
            return False
    
    def unblock_port(self, port: int) -> bool:
        """Unblock a specific port"""
        try:
            # Check if port is in always block list
            if port in self.always_block:
                self.logger.warning(f"Cannot unblock port {port} - it's in always block list")
                return False
            
            # Remove from blocked ports
            blocked_ports = self.get_blocked_ports()
            if port in blocked_ports:
                blocked_ports.remove(port)
                self._save_blocked_ports(blocked_ports)
            
            # Apply the unblock
            self._apply_port_unblock(port)
            
            self.logger.info(f"Unblocked port {port}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to unblock port {port}: {e}")
            return False
    
    def _apply_port_block(self, port: int):
        """Apply port blocking using system firewall"""
        try:
            system = platform.system().lower()
            
            if system == "darwin":  # macOS
                subprocess.run([
                    "sudo", "pfctl", "-t", "byj_blocked_ports", 
                    "-T", "add", f"0.0.0.0/0:{port}"
                ], check=True)
            elif system == "linux":
                subprocess.run([
                    "sudo", "iptables", "-A", "INPUT", 
                    "-p", "tcp", "--dport", str(port), "-j", "DROP"
                ], check=True)
                
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to apply port block for {port}: {e}")
    
    def _apply_port_unblock(self, port: int):
        """Apply port unblocking using system firewall"""
        try:
            system = platform.system().lower()
            
            if system == "darwin":  # macOS
                subprocess.run([
                    "sudo", "pfctl", "-t", "byj_blocked_ports", 
                    "-T", "delete", f"0.0.0.0/0:{port}"
                ], check=True)
            elif system == "linux":
                subprocess.run([
                    "sudo", "iptables", "-D", "INPUT", 
                    "-p", "tcp", "--dport", str(port), "-j", "DROP"
                ], check=True)
                
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to apply port unblock for {port}: {e}")
    
    def get_blocked_ports(self) -> List[int]:
        """Get list of currently blocked ports"""
        try:
            temp_path = "temp_blocked_ports.txt"
            if self.encryption.decrypt_file(self.blocked_ports_file, temp_path):
                with open(temp_path, 'r') as f:
                    ports = [int(line.strip()) for line in f if line.strip().isdigit()]
                
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                return ports
            
            return list(self.always_block)
            
        except Exception as e:
            self.logger.error(f"Failed to get blocked ports: {e}")
            return list(self.always_block)
    
    def _save_blocked_ports(self, ports: List[int]):
        """Save blocked ports list (encrypted)"""
        try:
            temp_path = "temp_blocked_ports.txt"
            with open(temp_path, 'w') as f:
                for port in ports:
                    f.write(f"{port}\n")
            
            # Encrypt the file
            self.encryption.encrypt_file(temp_path)
            
            # Move to final location
            if os.path.exists(f"{temp_path}.encrypted"):
                os.rename(f"{temp_path}.encrypted", self.blocked_ports_file)
            
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
        except Exception as e:
            self.logger.error(f"Failed to save blocked ports: {e}")
    
    def is_port_blocked(self, port: int) -> bool:
        """Check if a port is blocked"""
        blocked_ports = self.get_blocked_ports()
        return port in blocked_ports
    
    def is_port_allowed(self, port: int) -> bool:
        """Check if a port is explicitly allowed"""
        return port in self.always_allow
    
    def get_port_info(self, port: int) -> Dict[str, Any]:
        """Get information about a specific port"""
        return {
            "port": port,
            "description": self.dangerous_ports.get(port, "Unknown service"),
            "blocked": self.is_port_blocked(port),
            "allowed": self.is_port_allowed(port),
            "dangerous": port in self.always_block,
            "encrypted": port in self.always_allow
        }
    
    def get_port_status(self) -> Dict[str, Any]:
        """Get comprehensive port blocking status"""
        try:
            blocked_ports = self.get_blocked_ports()
            
            return {
                "timestamp": datetime.now().isoformat(),
                "enabled": True,
                "total_blocked": len(blocked_ports),
                "blocked_ports": blocked_ports,
                "always_blocked": list(self.always_block),
                "always_allowed": list(self.always_allow),
                "system": platform.system(),
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get port status: {e}")
            return {"error": str(e)}
    
    def emergency_block_all_unencrypted(self) -> bool:
        """Emergency function to block all unencrypted ports"""
        try:
            self.logger.critical("🚨 EMERGENCY: Blocking all unencrypted ports")
            
            # Block all common unencrypted ports
            unencrypted_ports = [
                80, 21, 23, 25, 53, 110, 143, 161, 389, 445,
                8080, 8000, 3000, 5000, 9000, 9090, 8888
            ]
            
            for port in unencrypted_ports:
                if not self.is_port_allowed(port):
                    self.block_port(port, "Emergency security lockdown")
            
            self.logger.critical("✅ Emergency port blocking completed")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed emergency port blocking: {e}")
            return False

# Initialize port blocker
def initialize_port_blocker():
    """Initialize the port blocking system"""
    try:
        blocker = PortBlocker()
        print("🔒 Port Blocker initialized")
        print("✅ Non-encrypted ports blocked")
        print("🛡️ Security enhanced")
        return blocker
    except Exception as e:
        print(f"❌ Failed to initialize port blocker: {e}")
        return None

if __name__ == "__main__":
    initialize_port_blocker()
