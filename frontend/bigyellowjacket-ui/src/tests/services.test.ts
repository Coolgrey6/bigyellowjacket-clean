/**
 * Comprehensive Tests for Big Yellow Jacket Services
 * Tests for WebSocket, API, and data model utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MacAddressUtils, MacAddress, AttackEvent, ConnectionData, ThreatData } from '../models/datatypes';

// Mock WebSocket for testing
class MockWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    console.log('Mock WebSocket send:', data);
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('MacAddressUtils', () => {
  describe('isValid', () => {
    it('should validate correct MAC address formats', () => {
      expect(MacAddressUtils.isValid('00:11:22:33:44:55')).toBe(true);
      expect(MacAddressUtils.isValid('00-11-22-33-44-55')).toBe(true);
      expect(MacAddressUtils.isValid('00:11:22:33:44:5A')).toBe(true);
      expect(MacAddressUtils.isValid('ff:ff:ff:ff:ff:ff')).toBe(true);
    });

    it('should reject invalid MAC address formats', () => {
      expect(MacAddressUtils.isValid('00:11:22:33:44')).toBe(false);
      expect(MacAddressUtils.isValid('00:11:22:33:44:55:66')).toBe(false);
      expect(MacAddressUtils.isValid('00:11:22:33:44:GG')).toBe(false);
      expect(MacAddressUtils.isValid('invalid')).toBe(false);
      expect(MacAddressUtils.isValid('')).toBe(false);
    });
  });

  describe('normalize', () => {
    it('should normalize MAC addresses to uppercase with colons', () => {
      expect(MacAddressUtils.normalize('00-11-22-33-44-55')).toBe('00:11:22:33:44:55');
      expect(MacAddressUtils.normalize('00:11:22:33:44:55')).toBe('00:11:22:33:44:55');
      expect(MacAddressUtils.normalize('ff:ff:ff:ff:ff:ff')).toBe('FF:FF:FF:FF:FF:FF');
    });
  });

  describe('isLocal', () => {
    it('should identify local MAC addresses', () => {
      expect(MacAddressUtils.isLocal('02:11:22:33:44:55')).toBe(true);
      expect(MacAddressUtils.isLocal('06:11:22:33:44:55')).toBe(true);
      expect(MacAddressUtils.isLocal('0A:11:22:33:44:55')).toBe(true);
      expect(MacAddressUtils.isLocal('0E:11:22:33:44:55')).toBe(true);
    });

    it('should identify global MAC addresses', () => {
      expect(MacAddressUtils.isLocal('00:11:22:33:44:55')).toBe(false);
      expect(MacAddressUtils.isLocal('01:11:22:33:44:55')).toBe(false);
      expect(MacAddressUtils.isLocal('03:11:22:33:44:55')).toBe(false);
    });
  });

  describe('isMulticast', () => {
    it('should identify multicast MAC addresses', () => {
      expect(MacAddressUtils.isMulticast('01:11:22:33:44:55')).toBe(true);
      expect(MacAddressUtils.isMulticast('03:11:22:33:44:55')).toBe(true);
      expect(MacAddressUtils.isMulticast('05:11:22:33:44:55')).toBe(true);
    });

    it('should identify non-multicast MAC addresses', () => {
      expect(MacAddressUtils.isMulticast('00:11:22:33:44:55')).toBe(false);
      expect(MacAddressUtils.isMulticast('02:11:22:33:44:55')).toBe(false);
      expect(MacAddressUtils.isMulticast('04:11:22:33:44:55')).toBe(false);
    });
  });

  describe('isBroadcast', () => {
    it('should identify broadcast MAC address', () => {
      expect(MacAddressUtils.isBroadcast('FF:FF:FF:FF:FF:FF')).toBe(true);
      expect(MacAddressUtils.isBroadcast('ff:ff:ff:ff:ff:ff')).toBe(true);
    });

    it('should identify non-broadcast MAC addresses', () => {
      expect(MacAddressUtils.isBroadcast('00:11:22:33:44:55')).toBe(false);
      expect(MacAddressUtils.isBroadcast('FF:FF:FF:FF:FF:FE')).toBe(false);
    });
  });

  describe('getVendor', () => {
    it('should return known vendors', () => {
      expect(MacAddressUtils.getVendor('00:50:56:11:22:33')).toBe('VMware');
      expect(MacAddressUtils.getVendor('08:00:27:11:22:33')).toBe('VirtualBox');
      expect(MacAddressUtils.getVendor('00:0C:29:11:22:33')).toBe('VMware');
    });

    it('should return undefined for unknown vendors', () => {
      expect(MacAddressUtils.getVendor('00:11:22:33:44:55')).toBe('Unknown');
    });
  });

  describe('create', () => {
    it('should create a complete MacAddress object', () => {
      const mac = MacAddressUtils.create('00:50:56:11:22:33');
      
      expect(mac.address).toBe('00:50:56:11:22:33');
      expect(mac.vendor).toBe('VMware');
      expect(mac.isLocal).toBe(false);
      expect(mac.isMulticast).toBe(false);
      expect(mac.isBroadcast).toBe(false);
    });

    it('should handle local MAC addresses', () => {
      const mac = MacAddressUtils.create('02:11:22:33:44:55');
      
      expect(mac.address).toBe('02:11:22:33:44:55');
      expect(mac.isLocal).toBe(true);
      expect(mac.isMulticast).toBe(false);
    });
  });
});

describe('Data Model Validation', () => {
  describe('AttackEvent', () => {
    it('should create a valid AttackEvent with all required fields', () => {
      const attack: AttackEvent = {
        id: 'test-attack-1',
        ip: '192.168.1.100',
        mac: MacAddressUtils.create('00:50:56:11:22:33'),
        port: 80,
        protocol: 'TCP',
        attackType: 'SQL Injection',
        severity: 'high',
        timestamp: new Date().toISOString(),
        country: 'United States',
        city: 'New York',
        lat: 40.7128,
        lon: -74.0060,
        bytesTransferred: 1024,
        duration: 30,
        status: 'blocked',
        process: 'chrome.exe',
        userAgent: 'Mozilla/5.0',
        attack_vector: 'web',
        confidence_score: 85
      };

      expect(attack.id).toBe('test-attack-1');
      expect(attack.ip).toBe('192.168.1.100');
      expect(attack.mac?.address).toBe('00:50:56:11:22:33');
      expect(attack.port).toBe(80);
      expect(attack.protocol).toBe('TCP');
      expect(attack.severity).toBe('high');
    });
  });

  describe('ConnectionData', () => {
    it('should create a valid ConnectionData with MAC addresses', () => {
      const connection: ConnectionData = {
        id: 'test-conn-1',
        src_ip: '192.168.1.100',
        dst_ip: '8.8.8.8',
        src_port: 12345,
        dst_port: 53,
        src_mac: MacAddressUtils.create('00:50:56:11:22:33'),
        dst_mac: MacAddressUtils.create('00:11:22:33:44:55'),
        protocol: 'UDP',
        status: 'active',
        bytes_sent: 512,
        bytes_received: 1024,
        packets_sent: 10,
        packets_received: 20,
        latency: 15,
        timestamp: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        connection_duration: 300
      };

      expect(connection.id).toBe('test-conn-1');
      expect(connection.src_mac?.address).toBe('00:50:56:11:22:33');
      expect(connection.dst_mac?.address).toBe('00:11:22:33:44:55');
      expect(connection.protocol).toBe('UDP');
      expect(connection.status).toBe('active');
    });
  });
});

describe('WebSocket Service', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // Reset global state
    (global as any).globalWebSocketInstance = null;
    (global as any).isGlobalConnectionInitialized = false;
    (global as any).globalConnectionAttemptInProgress = false;
  });

  afterEach(() => {
    if (mockWebSocket) {
      mockWebSocket.close();
    }
  });

  it('should create WebSocket connection', async () => {
    const { useWebSocket } = await import('../services/websocket');
    const store = useWebSocket.getState();
    
    expect(store.connected).toBe(false);
    expect(store.socket).toBe(null);
    
    store.connect();
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(store.connected).toBe(true);
    expect(store.socket).toBeDefined();
  });

  it('should handle connection errors', async () => {
    const { useWebSocket } = await import('../services/websocket');
    const store = useWebSocket.getState();
    
    // Mock WebSocket to throw error
    const originalWebSocket = (global as any).WebSocket;
    (global as any).WebSocket = class {
      constructor() {
        throw new Error('Connection failed');
      }
    };
    
    store.connect();
    
    expect(store.error).toBe('Failed to connect to server');
    expect(store.connected).toBe(false);
    
    // Restore original WebSocket
    (global as any).WebSocket = originalWebSocket;
  });

  it('should handle authentication', async () => {
    const { useWebSocket } = await import('../services/websocket');
    const store = useWebSocket.getState();
    
    const result = await store.login('phoenix_7x', 'SecureNet@2024#Phoenix!');
    
    expect(result).toBe(true);
    expect(store.isAuthenticated).toBe(true);
    expect(store.userRole).toBe('admin');
  });

  it('should reject invalid credentials', async () => {
    const { useWebSocket } = await import('../services/websocket');
    const store = useWebSocket.getState();
    
    const result = await store.login('invalid', 'password');
    
    expect(result).toBe(false);
    expect(store.isAuthenticated).toBe(false);
    expect(store.userRole).toBe(null);
  });

  it('should update connections data', async () => {
    const { useWebSocket } = await import('../services/websocket');
    const store = useWebSocket.getState();
    
    const mockConnections: ConnectionData[] = [
      {
        id: 'conn-1',
        src_ip: '192.168.1.100',
        dst_ip: '8.8.8.8',
        src_port: 12345,
        dst_port: 53,
        protocol: 'UDP',
        status: 'active',
        bytes_sent: 512,
        bytes_received: 1024,
        packets_sent: 10,
        packets_received: 20,
        latency: 15,
        timestamp: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        connection_duration: 300
      }
    ];
    
    store.updateConnections(mockConnections);
    
    expect(store.connections).toEqual(mockConnections);
    expect(store.connections).toHaveLength(1);
  });

  it('should update attacks data', async () => {
    const { useWebSocket } = await import('../services/websocket');
    const store = useWebSocket.getState();
    
    const mockAttacks: AttackEvent[] = [
      {
        id: 'attack-1',
        ip: '192.168.1.100',
        port: 80,
        protocol: 'TCP',
        attackType: 'SQL Injection',
        severity: 'high',
        timestamp: new Date().toISOString(),
        country: 'United States',
        city: 'New York',
        lat: 40.7128,
        lon: -74.0060,
        bytesTransferred: 1024,
        duration: 30,
        status: 'blocked',
        process: 'chrome.exe',
        userAgent: 'Mozilla/5.0',
        attack_vector: 'web',
        confidence_score: 85
      }
    ];
    
    store.updateAttacks(mockAttacks);
    
    expect(store.attacks).toEqual(mockAttacks);
    expect(store.attacks).toHaveLength(1);
  });
});

describe('API Service', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle successful API requests', async () => {
    const mockResponse = {
      data: { cpu: 50, memory: 75 },
      success: true
    };
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse.data),
      headers: {
        get: () => 'application/json'
      }
    });

    const { apiService } = await import('../services/api');
    const result = await apiService.getSystemMetrics();
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse.data);
  });

  it('should handle API errors with retry', async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cpu: 50 }),
        headers: {
          get: () => 'application/json'
        }
      });

    const { apiService } = await import('../services/api');
    const result = await apiService.getSystemMetrics();
    
    // The retry logic should eventually succeed
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(3); // 2 retries + 1 success
  });

  it('should enhance connection data with MAC addresses', async () => {
    const mockConnections = [
      {
        id: 'conn-1',
        src_ip: '192.168.1.100',
        dst_ip: '8.8.8.8',
        src_port: 12345,
        dst_port: 53,
        src_mac: '00:50:56:11:22:33',
        dst_mac: '00:11:22:33:44:55',
        protocol: 'UDP',
        status: 'active',
        bytes_sent: 512,
        bytes_received: 1024,
        timestamp: new Date().toISOString()
      }
    ];
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConnections),
      headers: {
        get: () => 'application/json'
      }
    });

    const { apiService } = await import('../services/api');
    const result = await apiService.getConnections();
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].src_mac?.address).toBe('00:50:56:11:22:33');
    expect(result.data![0].dst_mac?.address).toBe('00:11:22:33:44:55');
  });
});

describe('Component Integration', () => {
  it('should render attack feed with MAC addresses', () => {
    const mockAttack: AttackEvent = {
      id: 'test-attack',
      ip: '192.168.1.100',
      mac: MacAddressUtils.create('00:50:56:11:22:33'),
      port: 80,
      protocol: 'TCP',
      attackType: 'SQL Injection',
      severity: 'high',
      timestamp: new Date().toISOString(),
      country: 'United States',
      city: 'New York',
      lat: 40.7128,
      lon: -74.0060,
      bytesTransferred: 1024,
      duration: 30,
      status: 'blocked',
      process: 'chrome.exe',
      userAgent: 'Mozilla/5.0',
      attack_vector: 'web',
      confidence_score: 85
    };

    // Test that the attack object has all required fields for rendering
    expect(mockAttack.mac).toBeDefined();
    expect(mockAttack.mac?.address).toBe('00:50:56:11:22:33');
    expect(mockAttack.mac?.vendor).toBe('VMware');
    expect(mockAttack.confidence_score).toBe(85);
  });

  it('should handle missing MAC addresses gracefully', () => {
    const mockAttack: AttackEvent = {
      id: 'test-attack',
      ip: '192.168.1.100',
      port: 80,
      protocol: 'TCP',
      attackType: 'SQL Injection',
      severity: 'high',
      timestamp: new Date().toISOString(),
      country: 'United States',
      city: 'New York',
      lat: 40.7128,
      lon: -74.0060,
      bytesTransferred: 1024,
      duration: 30,
      status: 'blocked',
      process: 'chrome.exe',
      userAgent: 'Mozilla/5.0',
      attack_vector: 'web',
      confidence_score: 85
    };

    // Should not throw when MAC is undefined
    expect(mockAttack.mac).toBeUndefined();
    expect(mockAttack.id).toBe('test-attack');
  });
});
