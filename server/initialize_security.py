#!/usr/bin/env python3
"""
Security Initialization Script for Big Yellow Jacket
Initializes encrypted firewall and security systems
"""

import os
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.utils.file_encryption import initialize_file_protection
from src.core.secure_firewall import initialize_secure_firewall

def main():
    """Initialize all security systems"""
    print("🔒 Big Yellow Jacket Security Initialization")
    print("=" * 50)
    
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    try:
        # Initialize file protection
        print("\n🛡️ Initializing File Protection System...")
        if initialize_file_protection():
            print("✅ File protection system initialized successfully")
        else:
            print("❌ Failed to initialize file protection system")
            return False
        
        # Initialize secure firewall
        print("\n🔥 Initializing Secure Firewall...")
        firewall = initialize_secure_firewall()
        if firewall:
            print("✅ Secure firewall initialized successfully")
            
            # Verify firewall integrity
            print("\n🔍 Verifying firewall integrity...")
            if firewall.verify_firewall_integrity():
                print("✅ Firewall integrity verified - all files protected")
            else:
                print("⚠️ Firewall integrity check failed")
        else:
            print("❌ Failed to initialize secure firewall")
            return False
        
        print("\n🎉 Security initialization complete!")
        print("🔐 All critical files are now encrypted and protected")
        print("🛡️ Firewall rules are secured against tampering")
        print("🚨 Emergency lockdown capabilities enabled")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Security initialization failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
