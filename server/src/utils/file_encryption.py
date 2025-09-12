"""
File Encryption Utility for Big Yellow Jacket Security
Protects critical security files from unauthorized modification
"""

import os
import json
import hashlib
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

class FileEncryption:
    def __init__(self, master_password: str = None):
        """Initialize file encryption with master password"""
        self.master_password = master_password or "BigYellowJacket2024!Secure"
        self.key = self._derive_key()
        self.cipher = Fernet(self.key)
        self.logger = logging.getLogger(__name__)
        
        # Files that should be encrypted
        self.protected_files = [
            "blocked_ips.txt",
            "threat_patterns.json",
            "malicious_ips.txt",
            "database.json",
            "firewall_rules.json",
            "security_config.json"
        ]
    
    def _derive_key(self) -> bytes:
        """Derive encryption key from master password"""
        password = self.master_password.encode()
        salt = b'bigyellowjacket_salt_2024'  # In production, use random salt
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt_file(self, file_path: str) -> bool:
        """Encrypt a file and store with .encrypted extension"""
        try:
            if not os.path.exists(file_path):
                self.logger.warning(f"File not found: {file_path}")
                return False
            
            # Read original file
            with open(file_path, 'rb') as f:
                file_data = f.read()
            
            # Encrypt data
            encrypted_data = self.cipher.encrypt(file_data)
            
            # Write encrypted file
            encrypted_path = f"{file_path}.encrypted"
            with open(encrypted_path, 'wb') as f:
                f.write(encrypted_data)
            
            # Create backup of original
            backup_path = f"{file_path}.backup"
            with open(backup_path, 'wb') as f:
                f.write(file_data)
            
            # Remove original file
            os.remove(file_path)
            
            self.logger.info(f"File encrypted: {file_path} -> {encrypted_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to encrypt {file_path}: {e}")
            return False
    
    def decrypt_file(self, encrypted_path: str, output_path: str = None) -> bool:
        """Decrypt a file"""
        try:
            if not os.path.exists(encrypted_path):
                self.logger.warning(f"Encrypted file not found: {encrypted_path}")
                return False
            
            # Read encrypted file
            with open(encrypted_path, 'rb') as f:
                encrypted_data = f.read()
            
            # Decrypt data
            decrypted_data = self.cipher.decrypt(encrypted_data)
            
            # Write decrypted file
            if output_path is None:
                output_path = encrypted_path.replace('.encrypted', '')
            
            with open(output_path, 'wb') as f:
                f.write(decrypted_data)
            
            self.logger.info(f"File decrypted: {encrypted_path} -> {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to decrypt {encrypted_path}: {e}")
            return False
    
    def verify_file_integrity(self, file_path: str) -> bool:
        """Verify file hasn't been tampered with"""
        try:
            if not os.path.exists(file_path):
                return False
            
            # Calculate file hash
            with open(file_path, 'rb') as f:
                file_data = f.read()
            
            file_hash = hashlib.sha256(file_data).hexdigest()
            
            # Check against stored hash (in production, store hashes securely)
            hash_file = f"{file_path}.hash"
            if os.path.exists(hash_file):
                with open(hash_file, 'r') as f:
                    stored_hash = f.read().strip()
                
                return file_hash == stored_hash
            else:
                # Store hash for future verification
                with open(hash_file, 'w') as f:
                    f.write(file_hash)
                return True
                
        except Exception as e:
            self.logger.error(f"Failed to verify integrity of {file_path}: {e}")
            return False
    
    def protect_security_files(self, data_dir: str = "data") -> bool:
        """Encrypt all security-critical files"""
        success_count = 0
        total_files = 0
        
        for filename in self.protected_files:
            file_path = os.path.join(data_dir, filename)
            if os.path.exists(file_path):
                total_files += 1
                if self.encrypt_file(file_path):
                    success_count += 1
        
        self.logger.info(f"Protected {success_count}/{total_files} security files")
        return success_count == total_files
    
    def create_secure_config(self, config_data: dict) -> str:
        """Create encrypted configuration file"""
        try:
            # Convert to JSON
            json_data = json.dumps(config_data, indent=2)
            
            # Encrypt
            encrypted_data = self.cipher.encrypt(json_data.encode())
            
            # Save encrypted config
            config_path = "secure_config.encrypted"
            with open(config_path, 'wb') as f:
                f.write(encrypted_data)
            
            self.logger.info(f"Secure config created: {config_path}")
            return config_path
            
        except Exception as e:
            self.logger.error(f"Failed to create secure config: {e}")
            return None
    
    def load_secure_config(self, config_path: str) -> dict:
        """Load and decrypt configuration file"""
        try:
            if not os.path.exists(config_path):
                return {}
            
            # Read encrypted file
            with open(config_path, 'rb') as f:
                encrypted_data = f.read()
            
            # Decrypt
            decrypted_data = self.cipher.decrypt(encrypted_data)
            
            # Parse JSON
            config = json.loads(decrypted_data.decode())
            return config
            
        except Exception as e:
            self.logger.error(f"Failed to load secure config: {e}")
            return {}

# Firewall Protection System
class FirewallProtection:
    def __init__(self):
        self.encryption = FileEncryption()
        self.logger = logging.getLogger(__name__)
    
    def protect_firewall_rules(self) -> bool:
        """Protect firewall rules from modification"""
        try:
            # Create secure firewall rules
            firewall_rules = {
                "version": "1.0",
                "rules": [
                    {
                        "id": "block_malicious_ips",
                        "action": "block",
                        "source": "threat_intel",
                        "priority": "high"
                    },
                    {
                        "id": "allow_trusted_networks",
                        "action": "allow",
                        "source": "whitelist",
                        "priority": "medium"
                    },
                    {
                        "id": "rate_limit_connections",
                        "action": "limit",
                        "source": "all",
                        "priority": "medium"
                    }
                ],
                "integrity_check": True,
                "encrypted": True
            }
            
            # Save encrypted rules
            rules_path = "data/firewall_rules.json"
            os.makedirs(os.path.dirname(rules_path), exist_ok=True)
            
            with open(rules_path, 'w') as f:
                json.dump(firewall_rules, f, indent=2)
            
            # Encrypt the rules file
            return self.encryption.encrypt_file(rules_path)
            
        except Exception as e:
            self.logger.error(f"Failed to protect firewall rules: {e}")
            return False
    
    def verify_firewall_integrity(self) -> bool:
        """Verify firewall rules haven't been tampered with"""
        try:
            encrypted_path = "data/firewall_rules.json.encrypted"
            if not os.path.exists(encrypted_path):
                return False
            
            # Decrypt and verify
            temp_path = "temp_firewall_rules.json"
            if self.encryption.decrypt_file(encrypted_path, temp_path):
                # Verify integrity
                is_valid = self.encryption.verify_file_integrity(temp_path)
                
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                return is_valid
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to verify firewall integrity: {e}")
            return False

# Initialize protection
def initialize_file_protection():
    """Initialize file protection system"""
    try:
        protection = FirewallProtection()
        
        # Protect firewall rules
        if protection.protect_firewall_rules():
            print("✅ Firewall rules protected with encryption")
        else:
            print("❌ Failed to protect firewall rules")
        
        # Protect all security files
        if protection.encryption.protect_security_files("data"):
            print("✅ All security files encrypted and protected")
        else:
            print("⚠️ Some security files may not be protected")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to initialize file protection: {e}")
        return False

if __name__ == "__main__":
    initialize_file_protection()
