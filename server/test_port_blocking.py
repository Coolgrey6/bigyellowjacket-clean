#!/usr/bin/env python3
"""
Test script for port blocking functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.core.port_blocker import PortBlocker

def test_port_blocker():
    """Test the port blocking functionality"""
    print("🧪 Testing Port Blocker...")
    
    try:
        # Initialize port blocker
        blocker = PortBlocker()
        print("✅ Port blocker initialized successfully")
        
        # Test port status
        status = blocker.get_port_status()
        print(f"📊 Port Status: {status}")
        
        # Test port info
        port_80_info = blocker.get_port_info(80)
        print(f"🔍 Port 80 Info: {port_80_info}")
        
        port_443_info = blocker.get_port_info(443)
        print(f"🔍 Port 443 Info: {port_443_info}")
        
        # Test port blocking (this will require sudo on macOS/Linux)
        print("\n🔒 Testing port blocking...")
        print("Note: This may require sudo privileges")
        
        # Test blocking a non-critical port
        test_port = 8080
        print(f"Testing block/unblock for port {test_port}")
        
        # Check if port is already blocked
        is_blocked = blocker.is_port_blocked(test_port)
        print(f"Port {test_port} is currently blocked: {is_blocked}")
        
        # Try to block the port
        if not is_blocked:
            print(f"Attempting to block port {test_port}...")
            success = blocker.block_port(test_port, "Test block")
            print(f"Block result: {success}")
        
        # Check status again
        is_blocked_after = blocker.is_port_blocked(test_port)
        print(f"Port {test_port} is blocked after attempt: {is_blocked_after}")
        
        print("\n✅ Port blocker test completed successfully!")
        
    except Exception as e:
        print(f"❌ Port blocker test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_port_blocker()
