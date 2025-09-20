/**
 * Enhanced WebSocket Service for Big Yellow Jacket Security Platform
 * Comprehensive WebSocket management with MAC address support and robust error handling
 */

import { create } from 'zustand';
import { 
  ConnectionData, 
  AlertData, 
  ThreatData, 
  SystemMetrics, 
  ConnectionMetrics, 
  TrafficMetrics,
  AttackEvent,
  MacAddress,
  MacAddressUtils,
  WebSocketMessage,
  Severity,
  Status,
  Protocol
} from '../models/datatypes';

interface LoginAttemptRecord {
  timestamp: string;
  username: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  mac?: MacAddress;
}

interface WebSocketStore {
  socket: WebSocket | null;
  connected: boolean;
  error: string | null;
  metrics: SystemMetrics;
  connections: ConnectionData[];
  alerts: AlertData[];
  threats: ThreatData[];
  attacks: AttackEvent[];
  blockedIPs: string[];
  portStatus: any;
  autoReconnect: boolean;
  connectionAttempts: number;
  maxRetries: number;
  backoffDelay: number;
  reconnectTimeout: NodeJS.Timeout | null;
  isConnecting: boolean;
  circuitBreakerOpen: boolean;
  lastConnectionTime: number;
  
  // Authentication state
  isAuthenticated: boolean;
  userRole: string | null;
  loginAttempts: number;
  loginAttemptHistory: LoginAttemptRecord[];
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => void;
  updateMetrics: (data: Partial<SystemMetrics>) => void;
  updateConnections: (data: ConnectionData[]) => void;
  updateAlerts: (data: AlertData[]) => void;
  updateThreats: (data: ThreatData[]) => void;
  updateAttacks: (data: AttackEvent[]) => void;
  updateBlockedIPs: (data: string[]) => void;
  updatePortStatus: (data: any) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUserRole: (role: string) => void;
  recordLoginAttempt: (record: LoginAttemptRecord) => void;
  setAutoReconnect: (enabled: boolean) => void;
  manualRefresh: () => void;
  resetConnection: () => void;
  forceReconnect: () => void;
}

// Initial state with proper types
const INITIAL_METRICS: SystemMetrics = {
  cpu: {
    percent: 0,
    cores: 0,
    frequency: 0,
    temperature: 0,
    load_average: [0, 0, 0]
  },
  memory: {
    total: 0,
    used: 0,
    available: 0,
    percent: 0,
    swap_total: 0,
    swap_used: 0,
    swap_percent: 0
  },
  disk: {
    total: 0,
    used: 0,
    available: 0,
    percent: 0,
    read_ops: 0,
    write_ops: 0,
    read_bytes: 0,
    write_bytes: 0
  },
  network: {
    interfaces: [],
    total_bytes_sent: 0,
    total_bytes_received: 0,
    total_packets_sent: 0,
    total_packets_received: 0,
    errors_in: 0,
    errors_out: 0,
    drops_in: 0,
    drops_out: 0
  },
  timestamp: new Date().toISOString()
};

// Helper function to get auto-reconnect setting from localStorage
const getStoredAutoReconnect = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  const urlParams = new URLSearchParams(window.location.search);
  const isTestPage = window.location.pathname === '/test';
  const killSwitch = urlParams.get('noWebSocket') === 'true' || 
                     localStorage.getItem('killWebSocket') === 'true' ||
                     isTestPage;
  
  if (killSwitch) {
    console.log('🚫 WebSocket disabled via kill switch');
    return false;
  }
  
  try {
    const stored = localStorage.getItem('autoReconnect');
    return stored !== null ? JSON.parse(stored) : true;
  } catch (error) {
    console.warn('Failed to read autoReconnect from localStorage:', error);
    return true;
  }
};

// Helper function to save auto-reconnect setting
const saveAutoReconnect = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('autoReconnect', JSON.stringify(enabled));
  } catch (error) {
    console.warn('Failed to save autoReconnect to localStorage:', error);
  }
};

// Global connection state to prevent duplicate connections
let isGlobalConnectionInitialized = false;
let globalConnectionAttemptInProgress = false;
let globalWebSocketInstance: WebSocket | null = null;

// Helper function to describe WebSocket close codes
const getCloseCodeDescription = (code: number): string => {
  const codes: { [key: number]: string } = {
    1000: 'Normal Closure',
    1001: 'Going Away',
    1002: 'Protocol Error',
    1003: 'Unsupported Data',
    1005: 'No Status Received',
    1006: 'Abnormal Closure',
    1007: 'Invalid frame payload data',
    1008: 'Policy Violation',
    1009: 'Message Too Big',
    1010: 'Mandatory Extension',
    1011: 'Internal Server Error',
    1015: 'TLS Handshake'
  };
  return codes[code] || `Unknown code ${code}`;
};

// Helper function to enhance connection data with MAC addresses
const enhanceConnectionData = (connection: any): ConnectionData => {
  return {
    id: connection.id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    src_ip: connection.src_ip || connection.source_ip || '0.0.0.0',
    dst_ip: connection.dst_ip || connection.destination_ip || '0.0.0.0',
    src_port: connection.src_port || connection.source_port || 0,
    dst_port: connection.dst_port || connection.destination_port || 0,
    src_mac: connection.src_mac ? MacAddressUtils.create(connection.src_mac) : undefined,
    dst_mac: connection.dst_mac ? MacAddressUtils.create(connection.dst_mac) : undefined,
    protocol: (connection.protocol as Protocol) || 'TCP',
    status: (connection.status as Status) || 'active',
    bytes_sent: connection.bytes_sent || 0,
    bytes_received: connection.bytes_received || 0,
    packets_sent: connection.packets_sent || 0,
    packets_received: connection.packets_received || 0,
    latency: connection.latency || 0,
    timestamp: connection.timestamp || new Date().toISOString(),
    last_seen: connection.last_seen || new Date().toISOString(),
    process: connection.process ? {
      pid: connection.process.pid || 0,
      name: connection.process.name || 'unknown',
      path: connection.process.path || '',
      user: connection.process.user || 'unknown',
      command_line: connection.process.command_line || '',
      parent_pid: connection.process.parent_pid,
      cpu_usage: connection.process.cpu_usage || 0,
      memory_usage: connection.process.memory_usage || 0,
      network_connections: connection.process.network_connections || 0
    } : undefined,
    network_interface: connection.network_interface,
    vlan_id: connection.vlan_id,
    connection_duration: connection.connection_duration || 0,
    flags: connection.flags
  };
};

// Helper function to enhance attack data with MAC addresses
const enhanceAttackData = (attack: any): AttackEvent => {
  return {
    id: attack.id || `attack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ip: attack.ip || '0.0.0.0',
    mac: attack.mac ? MacAddressUtils.create(attack.mac) : undefined,
    port: attack.port || 0,
    protocol: (attack.protocol as Protocol) || 'TCP',
    attackType: attack.attackType || attack.attack_type || 'Unknown',
    severity: (attack.severity as Severity) || 'medium',
    timestamp: attack.timestamp || new Date().toISOString(),
    country: attack.country || 'Unknown',
    city: attack.city || 'Unknown',
    lat: attack.lat || 0,
    lon: attack.lon || 0,
    bytesTransferred: attack.bytesTransferred || attack.bytes_transferred || 0,
    duration: attack.duration || 0,
    status: (attack.status as Status) || 'active',
    process: attack.process || 'unknown',
    userAgent: attack.userAgent || attack.user_agent || 'unknown',
    referer: attack.referer,
    attack_vector: attack.attack_vector || 'unknown',
    confidence_score: attack.confidence_score || 50,
    geo_location: attack.geo_location,
    network_context: attack.network_context
  };
};

export const useWebSocket = create<WebSocketStore>((set, get) => ({
  socket: null,
  connected: false,
  error: null,
  metrics: INITIAL_METRICS,
  connections: [],
  alerts: [],
  threats: [],
  attacks: [],
  blockedIPs: [],
  portStatus: null,
  autoReconnect: getStoredAutoReconnect(),
  connectionAttempts: 0,
  maxRetries: 5,
  backoffDelay: 5000,
  reconnectTimeout: null,
  isConnecting: false,
  circuitBreakerOpen: false,
  lastConnectionTime: 0,
  isAuthenticated: false,
  userRole: null,
  loginAttempts: 0,
  loginAttemptHistory: [],

  connect: () => {
    try {
      const state = get();
      
      // Circuit breaker: prevent connection storms
      const now = Date.now();
      if (state.circuitBreakerOpen) {
        const timeSinceLastAttempt = now - state.lastConnectionTime;
        if (timeSinceLastAttempt < 30000) { // 30 second cooldown
          console.log('🚫 Circuit breaker OPEN: Preventing connection storm');
          return;
        } else {
          console.log('🔄 Circuit breaker RESET: Cooldown period over');
          set({ circuitBreakerOpen: false, connectionAttempts: 0 });
        }
      }
      
      // Prevent multiple simultaneous connection attempts
      if (state.isConnecting) {
        console.log('🔒 Connection already in progress');
        return;
      }
      
      // Record connection attempt time
      set({ lastConnectionTime: now });
      
      // Check global WebSocket instance
      if (globalWebSocketInstance) {
        try {
          const readyState = globalWebSocketInstance.readyState;
          if (readyState === WebSocket.OPEN) {
            console.log('🔒 Global WebSocket already connected');
            set({ 
              socket: globalWebSocketInstance, 
              connected: true, 
              error: null,
              isConnecting: false 
            });
            return;
          } else if (readyState === WebSocket.CONNECTING) {
            console.log('🔒 Global WebSocket already connecting');
            return;
          } else {
            globalWebSocketInstance = null;
          }
        } catch (error) {
          globalWebSocketInstance = null;
        }
      }
      
      // Clear any existing reconnect timeout
      if (state.reconnectTimeout) {
        clearTimeout(state.reconnectTimeout);
        set({ reconnectTimeout: null });
      }

      // Close existing socket if it exists
      const currentSocket = state.socket;
      if (currentSocket && currentSocket !== globalWebSocketInstance) {
        currentSocket.close();
      }
      
      // Set connecting flag
      set({ isConnecting: true });
      
      console.log('🔌 Attempting to connect to WebSocket...');
      const envWsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const wsUrl = envWsUrl && envWsUrl.trim().length > 0
        ? envWsUrl
        : (isLocalhost ? 'ws://localhost:8766' : 'wss://bigyellowjacket.com:9443/ws');
      
      const socket = new WebSocket(wsUrl);
      globalWebSocketInstance = socket;
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          console.log('⏰ Connection timeout');
          socket.close();
          set({ 
            error: 'Connection timeout', 
            connected: false,
            isConnecting: false
          });
        }
      }, 15000);

      socket.onopen = () => {
        console.log('✅ Connected to server');
        clearTimeout(connectionTimeout);
        set({ 
          connected: true, 
          error: null, 
          socket,
          connectionAttempts: 0,
          backoffDelay: 5000,
          isConnecting: false
        });
        
        isGlobalConnectionInitialized = true;
        globalConnectionAttemptInProgress = false;
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 Received message type:', message.message_type);
          
          switch (message.message_type) {
            case 'welcome':
              console.log('Received welcome message:', message.data);
              break;
              
            case 'error':
              console.error('Server error:', message.data);
              set({ error: message.data });
              break;
              
            case 'metrics_update':
              if (message.data) {
                const updatedMetrics = {
                  ...get().metrics,
                  ...message.data,
                  timestamp: new Date().toISOString()
                };
                set({ metrics: updatedMetrics });
              }
              break;
              
            case 'connections_update':
              if (message.data && message.data.active_connections) {
                const connections = Array.isArray(message.data.active_connections)
                  ? message.data.active_connections.map(enhanceConnectionData)
                  : Object.values(message.data.active_connections).map(enhanceConnectionData);
                get().updateConnections(connections);
              }
              if (message.data && message.data.blocked_ips) {
                get().updateBlockedIPs(message.data.blocked_ips);
              }
              if (message.data && message.data.alerts) {
                get().updateAlerts(message.data.alerts);
              }
              break;
              
            case 'initial_state':
              console.log('📦 Processing initial state');
              if (message.data.metrics) {
                const initialMetrics = {
                  ...INITIAL_METRICS,
                  ...message.data.metrics,
                  timestamp: new Date().toISOString()
                };
                set({ metrics: initialMetrics });
              }
              if (message.data.active_connections) {
                const connections = Array.isArray(message.data.active_connections)
                  ? message.data.active_connections.map(enhanceConnectionData)
                  : Object.values(message.data.active_connections).map(enhanceConnectionData);
                get().updateConnections(connections);
              }
              if (message.data.blocked_ips) {
                get().updateBlockedIPs(message.data.blocked_ips);
              }
              if (message.data.alerts) {
                get().updateAlerts(message.data.alerts);
              }
              break;
              
            case 'alerts_update':
              if (message.data && message.data.alerts) {
                get().updateAlerts(message.data.alerts);
              }
              break;
              
            case 'threats_update':
              if (message.data && message.data.threats) {
                get().updateThreats(message.data.threats);
              }
              break;
              
            case 'attacks_update':
              if (message.data && message.data.attacks) {
                const attacks = message.data.attacks.map(enhanceAttackData);
                get().updateAttacks(attacks);
              }
              break;
              
            case 'port_status':
              console.log('Received port status:', message.data);
              get().updatePortStatus(message.data);
              break;
              
            default:
              console.log('Unknown message type:', message.message_type);
          }
        } catch (error) {
          console.error('🔥 Error parsing WebSocket message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('🔥 WebSocket error:', error);
        clearTimeout(connectionTimeout);
        set({ 
          error: 'Connection error occurred',
          isConnecting: false
        });
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected');
        console.log('Close code:', event.code, '(', getCloseCodeDescription(event.code), ')');
        
        if (globalWebSocketInstance === socket) {
          globalWebSocketInstance = null;
        }
        
        set({ 
          connected: false, 
          socket: null,
          isConnecting: false
        });
        
        const state = get();
        
        // Auto-reconnect logic
        if (state.autoReconnect && event.code !== 1000 && state.connectionAttempts < state.maxRetries) {
          const attemptNumber = state.connectionAttempts + 1;
          const delay = Math.min(state.backoffDelay + (attemptNumber * 2000), 30000);
          
          console.log(`🔄 Auto-reconnect in ${delay/1000} seconds... (Attempt ${attemptNumber}/${state.maxRetries})`);
          
          const timeout = setTimeout(() => {
            const currentState = get();
            if (!currentState.connected && !currentState.socket && currentState.autoReconnect) {
              set({ 
                connectionAttempts: attemptNumber,
                backoffDelay: delay 
              });
              currentState.connect();
            }
          }, delay);
          
          set({ reconnectTimeout: timeout });
        } else if (!state.autoReconnect) {
          set({ 
            error: 'Connection lost. Auto-reconnect is disabled.'
          });
        } else if (state.connectionAttempts >= state.maxRetries) {
          set({ 
            circuitBreakerOpen: true,
            autoReconnect: false,
            error: 'Connection failed after multiple attempts. Circuit breaker engaged.'
          });
          saveAutoReconnect(false);
        }
      };

      set({ socket });

    } catch (error) {
      console.error('Connection error:', error);
      set({ 
        error: 'Failed to connect to server', 
        connected: false,
        isConnecting: false
      });
    }
  },

  disconnect: () => {
    const state = get();
    
    if (state.reconnectTimeout) {
      clearTimeout(state.reconnectTimeout);
    }
    
    if (state.socket) {
      state.socket.close(1000, 'Manual disconnect');
      set({ 
        socket: null, 
        connected: false, 
        error: null,
        reconnectTimeout: null,
        connectionAttempts: 0
      });
    }
  },

  send: (message: any) => {
    const { socket } = get();
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
        set({ error: 'Failed to send message' });
      }
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  },

  updateMetrics: (data) => set((state) => ({
    metrics: {
      ...state.metrics,
      ...data,
      timestamp: new Date().toISOString()
    }
  })),

  updateConnections: (data) => {
    const currentConnections = get().connections;
    if (JSON.stringify(currentConnections) !== JSON.stringify(data)) {
      console.log('📊 Updating connections:', data.length);
      set({ connections: data });
    }
  },

  updateAlerts: (data) => set({ alerts: data }),

  updateThreats: (data) => set({ threats: data }),

  updateAttacks: (data) => {
    // Update global demo points for map
    const anyWindow = window as any;
    if (typeof window !== 'undefined') {
      anyWindow.BYJ_DEMO_POINTS = data.slice(0, 50);
    }
    set({ attacks: data });
  },

  updateBlockedIPs: (data) => {
    const current = get().blockedIPs || [];
    const merged: string[] = [];
    const seen = new Set<string>();
    
    for (const ip of current) {
      if (!seen.has(ip)) { seen.add(ip); merged.push(ip); }
      if (merged.length >= 1000) break;
    }
    
    for (const ip of Array.isArray(data) ? data : []) {
      if (!seen.has(ip)) {
        seen.add(ip);
        merged.push(ip);
        if (merged.length >= 1000) break;
      }
    }
    
    if (JSON.stringify(current) !== JSON.stringify(merged)) {
      set({ blockedIPs: merged });
    }
  },

  updatePortStatus: (data) => set({ portStatus: data }),

  setAutoReconnect: (enabled: boolean) => {
    set({ autoReconnect: enabled });
    saveAutoReconnect(enabled);
    if (!enabled) {
      const state = get();
      if (state.reconnectTimeout) {
        clearTimeout(state.reconnectTimeout);
        set({ reconnectTimeout: null });
      }
    }
  },

  manualRefresh: () => {
    const { socket, connected } = get();
    if (connected && socket?.readyState === WebSocket.OPEN) {
      console.log('🔄 Manual refresh: Requesting updated data...');
      socket.send(JSON.stringify({ command: 'get_connections' }));
      socket.send(JSON.stringify({ command: 'get_alerts' }));
      socket.send(JSON.stringify({ command: 'get_metrics' }));
    }
  },

  resetConnection: () => {
    const state = get();
    
    if (state.reconnectTimeout) {
      clearTimeout(state.reconnectTimeout);
    }
    
    set({ 
      connectionAttempts: 0,
      backoffDelay: 5000,
      error: null,
      reconnectTimeout: null
    });
    
    state.disconnect();
    setTimeout(() => {
      get().connect();
    }, 2000);
  },

  forceReconnect: () => {
    set({ autoReconnect: true });
    saveAutoReconnect(true);

    if (get().reconnectTimeout) {
      clearTimeout(get().reconnectTimeout);
      set({ reconnectTimeout: null });
    }

    set({ 
      connectionAttempts: 0,
      backoffDelay: 5000,
      error: null,
      circuitBreakerOpen: false,
      lastConnectionTime: 0
    });
    
    isGlobalConnectionInitialized = false;
    globalConnectionAttemptInProgress = false;

    get().disconnect();
    setTimeout(() => {
      get().connect();
    }, 2000);
  },

  // Authentication methods
  login: async (username: string, password: string): Promise<boolean> => {
    console.log('🔐 Attempting login for user:', username);
    
    const validCredentials = {
      'phoenix_7x': 'SecureNet@2024#Phoenix!',
      'storm_delta': 'CyberGuard$2024*Storm&',
      'cyber_wolf': 'FireWall!2024@Wolf#Secure',
      'shadow_ops': 'NetShield%2024^Shadow*Ops'
    };
    
    const isValid = validCredentials[username as keyof typeof validCredentials] === password;
    
    if (isValid) {
      const role = username === 'phoenix_7x' ? 'admin' : 'user';
      set({ 
        isAuthenticated: true, 
        userRole: role,
        loginAttempts: 0 
      });
      
      // Record successful attempt
      get().recordLoginAttempt({
        timestamp: new Date().toISOString(),
        username,
        success: true,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      });
      
      console.log('✅ Login successful for user:', username, 'with role:', role);
      return true;
    } else {
      const state = get();
      set({ 
        loginAttempts: state.loginAttempts + 1,
        isAuthenticated: false,
        userRole: null
      });
      
      // Record failed attempt
      get().recordLoginAttempt({
        timestamp: new Date().toISOString(),
        username,
        success: false,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      });
      
      console.log('❌ Login failed for user:', username);
      return false;
    }
  },

  logout: () => {
    console.log('🚪 Logging out user');
    set({ 
      isAuthenticated: false, 
      userRole: null,
      loginAttempts: 0 
    });
  },

  setUserRole: (role: string) => {
    set({ userRole: role });
  },

  recordLoginAttempt: (record: LoginAttemptRecord) => {
    try {
      const key = 'byj_login_attempts';
      const existing = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      const parsed: LoginAttemptRecord[] = existing ? JSON.parse(existing) : [];
      const updated = [record, ...parsed].slice(0, 200);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(updated));
      }
      set((state) => ({ loginAttemptHistory: [record, ...state.loginAttemptHistory].slice(0, 200) }));
    } catch (e) {
      console.warn('Failed to persist login attempt', e);
      set((state) => ({ loginAttemptHistory: [record, ...state.loginAttemptHistory].slice(0, 200) }));
    }
  }
}));

// Global helper functions for debugging
if (typeof window !== 'undefined') {
  (window as any).debugWebSocket = () => {
    const store = useWebSocket.getState();
    console.log('🔍 WebSocket Debug Info:', store);
    return store;
  };
  
  (window as any).forceConnect = () => {
    const store = useWebSocket.getState();
    console.log('🔄 Forcing connection...');
    store.forceReconnect();
  };
}

// Export the store and hook
export { useWebSocketStore };