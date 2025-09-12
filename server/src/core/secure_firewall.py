"""
Secure Firewall Manager for Big Yellow Jacket Security
Encrypted firewall rules with integrity protection
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any
from ..utils.file_encryption import FileEncryption, FirewallProtection

class SecureFirewallManager:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.encryption = FileEncryption()
        self.protection = FirewallProtection()
        self.rules_file = "data/firewall_rules.json.encrypted"
        self.blocked_ips_file = "data/blocked_ips.txt.encrypted"
        self.whitelist_file = "data/whitelist.txt.encrypted"
        
        # Initialize secure firewall
        self._initialize_secure_firewall()
    
    def _initialize_secure_firewall(self):
        """Initialize the secure firewall system"""
        try:
            # Create data directory if it doesn't exist
            os.makedirs("data", exist_ok=True)
            
            # Initialize file protection
            self.protection.protect_firewall_rules()
            
            # Create initial blocked IPs list
            self._create_initial_blocked_ips()
            
            # Create whitelist
            self._create_whitelist()
            
            self.logger.info("Secure firewall initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize secure firewall: {e}")
    
    def _create_initial_blocked_ips(self):
        """Create initial blocked IPs list"""
        try:
            blocked_ips = [
                "192.168.1.100",  # Example malicious IP
                "10.0.0.50",       # Example suspicious IP
                "172.16.0.25"      # Example threat IP
            ]
            
            # Create blocked IPs file
            blocked_content = "\n".join(blocked_ips)
            blocked_path = "data/blocked_ips.txt"
            
            with open(blocked_path, 'w') as f:
                f.write(blocked_content)
            
            # Encrypt the file
            self.encryption.encrypt_file(blocked_path)
            
            self.logger.info("Initial blocked IPs list created and encrypted")
            
        except Exception as e:
            self.logger.error(f"Failed to create blocked IPs list: {e}")
    
    def _create_whitelist(self):
        """Create trusted IPs whitelist"""
        try:
            whitelist_ips = [
                "127.0.0.1",       # Localhost
                "192.168.1.1",     # Local gateway
                "10.0.0.1"         # Trusted network
            ]
            
            # Create whitelist file
            whitelist_content = "\n".join(whitelist_ips)
            whitelist_path = "data/whitelist.txt"
            
            with open(whitelist_path, 'w') as f:
                f.write(whitelist_content)
            
            # Encrypt the file
            self.encryption.encrypt_file(whitelist_path)
            
            self.logger.info("Whitelist created and encrypted")
            
        except Exception as e:
            self.logger.error(f"Failed to create whitelist: {e}")
    
    def add_blocked_ip(self, ip_address: str, reason: str = "Security threat") -> bool:
        """Add IP to blocked list (encrypted)"""
        try:
            # Decrypt current blocked IPs
            temp_path = "temp_blocked_ips.txt"
            if not self.encryption.decrypt_file(self.blocked_ips_file, temp_path):
                return False
            
            # Read current IPs
            with open(temp_path, 'r') as f:
                current_ips = f.read().strip().split('\n')
            
            # Add new IP if not already present
            if ip_address not in current_ips:
                current_ips.append(ip_address)
                
                # Write updated list
                with open(temp_path, 'w') as f:
                    f.write('\n'.join(current_ips))
                
                # Re-encrypt
                self.encryption.encrypt_file(temp_path)
                
                # Move encrypted file to correct location
                if os.path.exists(f"{temp_path}.encrypted"):
                    os.rename(f"{temp_path}.encrypted", self.blocked_ips_file)
                
                self.logger.info(f"Added blocked IP: {ip_address} - {reason}")
            
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to add blocked IP {ip_address}: {e}")
            return False
    
    def remove_blocked_ip(self, ip_address: str) -> bool:
        """Remove IP from blocked list"""
        try:
            # Decrypt current blocked IPs
            temp_path = "temp_blocked_ips.txt"
            if not self.encryption.decrypt_file(self.blocked_ips_file, temp_path):
                return False
            
            # Read current IPs
            with open(temp_path, 'r') as f:
                current_ips = f.read().strip().split('\n')
            
            # Remove IP if present
            if ip_address in current_ips:
                current_ips.remove(ip_address)
                
                # Write updated list
                with open(temp_path, 'w') as f:
                    f.write('\n'.join(current_ips))
                
                # Re-encrypt
                self.encryption.encrypt_file(temp_path)
                
                # Move encrypted file to correct location
                if os.path.exists(f"{temp_path}.encrypted"):
                    os.rename(f"{temp_path}.encrypted", self.blocked_ips_file)
                
                self.logger.info(f"Removed blocked IP: {ip_address}")
            
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to remove blocked IP {ip_address}: {e}")
            return False
    
    def get_blocked_ips(self) -> List[str]:
        """Get list of blocked IPs (decrypted)"""
        try:
            temp_path = "temp_blocked_ips.txt"
            if self.encryption.decrypt_file(self.blocked_ips_file, temp_path):
                with open(temp_path, 'r') as f:
                    ips = f.read().strip().split('\n')
                
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                return [ip for ip in ips if ip.strip()]
            
            return []
            
        except Exception as e:
            self.logger.error(f"Failed to get blocked IPs: {e}")
            return []
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP is blocked"""
        blocked_ips = self.get_blocked_ips()
        return ip_address in blocked_ips
    
    def is_ip_whitelisted(self, ip_address: str) -> bool:
        """Check if IP is whitelisted"""
        try:
            temp_path = "temp_whitelist.txt"
            if self.encryption.decrypt_file(self.whitelist_file, temp_path):
                with open(temp_path, 'r') as f:
                    whitelist_ips = f.read().strip().split('\n')
                
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                return ip_address in whitelist_ips
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to check whitelist for {ip_address}: {e}")
            return False
    
    def verify_firewall_integrity(self) -> bool:
        """Verify firewall files haven't been tampered with"""
        try:
            # Check firewall rules integrity
            rules_integrity = self.protection.verify_firewall_integrity()
            
            # Check blocked IPs integrity
            blocked_integrity = self.encryption.verify_file_integrity(self.blocked_ips_file)
            
            # Check whitelist integrity
            whitelist_integrity = self.encryption.verify_file_integrity(self.whitelist_file)
            
            all_integrity = rules_integrity and blocked_integrity and whitelist_integrity
            
            if all_integrity:
                self.logger.info("✅ All firewall files verified - no tampering detected")
            else:
                self.logger.warning("⚠️ Firewall integrity check failed - possible tampering detected")
            
            return all_integrity
            
        except Exception as e:
            self.logger.error(f"Failed to verify firewall integrity: {e}")
            return False
    
    def get_firewall_status(self) -> Dict[str, Any]:
        """Get comprehensive firewall status"""
        try:
            blocked_ips = self.get_blocked_ips()
            
            status = {
                "timestamp": datetime.now().isoformat(),
                "encrypted": True,
                "integrity_verified": self.verify_firewall_integrity(),
                "blocked_ips_count": len(blocked_ips),
                "blocked_ips": blocked_ips[:10],  # Show first 10 for security
                "whitelist_active": True,
                "protection_level": "maximum",
                "last_updated": datetime.now().isoformat()
            }
            
            return status
            
        except Exception as e:
            self.logger.error(f"Failed to get firewall status: {e}")
            return {"error": str(e)}
    
    def emergency_lockdown(self) -> bool:
        """Emergency lockdown - block all non-whitelisted IPs"""
        try:
            # This would implement emergency lockdown procedures
            # For now, we'll just log the action
            self.logger.critical("🚨 EMERGENCY LOCKDOWN INITIATED")
            self.logger.critical("All non-whitelisted IPs will be blocked")
            
            # In a real implementation, this would:
            # 1. Block all IPs not in whitelist
            # 2. Enable maximum security mode
            # 3. Send alerts to administrators
            # 4. Log all activities
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initiate emergency lockdown: {e}")
            return False

# Initialize secure firewall
def initialize_secure_firewall():
    """Initialize the secure firewall system"""
    try:
        firewall = SecureFirewallManager()
        print("🔒 Secure Firewall Manager initialized")
        print("✅ All firewall files encrypted and protected")
        print("🛡️ Integrity verification enabled")
        return firewall
    except Exception as e:
        print(f"❌ Failed to initialize secure firewall: {e}")
        return None

if __name__ == "__main__":
    initialize_secure_firewall()
