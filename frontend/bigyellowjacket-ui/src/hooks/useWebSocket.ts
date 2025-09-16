// src/hooks/useWebSocket.ts

import { useEffect } from 'react';
import { create } from 'zustand';

interface SystemMetrics {
  cpu: {
    percent: number;
    cores: number;
    frequency: number;
  };
  memory: {
    total: number;
    used: number;
    percent: number;
  };
  disk: {
    total: number;
    used: number;
    percent: number;
  };
  network: {
    bytes_sent: number;
    bytes_recv: number;
  };
}

interface ConnectionMetrics {
  active: number;
  blocked: number;
  suspicious: number;
  safe: number;
}

interface TrafficMetrics {
  bytes_monitored: number;
}

interface Metrics {
  system: SystemMetrics;
  connections: ConnectionMetrics;
  traffic: TrafficMetrics;
  timestamp?: string;
}

interface Alert {
  type: string;
  endpoint: {
    host: string;
    port: number;
  };
  timestamp: string;
  details: any;
}

interface Connection {
  host: string;
  port: number;
  protocol: string;
  process?: string;
  status: string;
  bytes_sent: number;
  bytes_received: number;
  latency: number;
  last_seen?: string;
  process_info?: {
    name: string;
    path: string;
  };
}

interface LoginAttemptRecord {
  timestamp: string;
  username: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
}

interface WebSocketState {
  socket: WebSocket | null;
  connected: boolean;
  error: string | null;
  metrics: Metrics;
  connections: Connection[];
  alerts: Alert[];
  blockedIPs: string[];
  portStatus: any; // Add port status to global state
  autoReconnect: boolean;
  connectionAttempts: number;
  maxRetries: number;
  backoffDelay: number;
  reconnectTimeout: NodeJS.Timeout | null;
  isConnecting: boolean; // Flag to prevent multiple simultaneous connection attempts
  circuitBreakerOpen: boolean; // Circuit breaker to prevent connection storms
  lastConnectionTime: number; // Timestamp of last connection attempt
  
  // Authentication state
  isAuthenticated: boolean;
  userRole: string | null;
  loginAttempts: number;
  loginAttemptHistory: LoginAttemptRecord[];
}

interface WebSocketActions {
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => void;
  updateMetrics: (data: Partial<Metrics>) => void;
  updateConnections: (data: Connection[]) => void;
  updateAlerts: (data: Alert[]) => void;
  updateBlockedIPs: (data: string[]) => void;
  updatePortStatus: (data: any) => void;
  
  // Authentication actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUserRole: (role: string) => void;
  recordLoginAttempt: (record: LoginAttemptRecord) => void;
  setAutoReconnect: (enabled: boolean) => void;
  manualRefresh: () => void;
  resetConnection: () => void;
  forceReconnect: () => void;
}

// Helper function to get auto-reconnect setting from localStorage
const getStoredAutoReconnect = (): boolean => {
  if (typeof window === 'undefined') return true; // Default for SSR
  
  // DEVELOPMENT: Check for kill switch in URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const isTestPage = window.location.pathname === '/test';
  const killSwitch = urlParams.get('noWebSocket') === 'true' || 
                     localStorage.getItem('killWebSocket') === 'true' ||
                     isTestPage;
  
  if (killSwitch) {
    console.log('🚫 WebSocket disabled via kill switch (test page, URL param, or localStorage)');
    return false;
  }
  
  try {
    const stored = localStorage.getItem('autoReconnect');
    const result = stored !== null ? JSON.parse(stored) : true;
    console.log('🔍 Loading autoReconnect from localStorage:', result, 'raw:', stored);
    return result;
  } catch (error) {
    console.warn('Failed to read autoReconnect from localStorage:', error);
    return true;
  }
};

// Helper function to save auto-reconnect setting to localStorage
const saveAutoReconnect = (enabled: boolean): void => {
  if (typeof window === 'undefined') return; // Skip for SSR
  try {
    localStorage.setItem('autoReconnect', JSON.stringify(enabled));
    console.log('💾 Saved autoReconnect to localStorage:', enabled);
  } catch (error) {
    console.warn('Failed to save autoReconnect to localStorage:', error);
  }
};

// Helper function to reset auto-reconnect to enabled state
const resetAutoReconnectSetting = (): void => {
  saveAutoReconnect(true);
  console.log('🔄 Auto-reconnect setting has been reset to enabled');
};

// Global connection state to prevent duplicate connections (module level)
let isGlobalConnectionInitialized = false;
let globalConnectionAttemptInProgress = false;

// Add a global flag to ensure we only initialize once per page load
let hasAttemptedInitialConnection = false;

// Global WebSocket instance to enforce true singleton
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

const INITIAL_METRICS: Metrics = {
  system: {
    cpu: {
      percent: 0,
      cores: 0,
      frequency: 0
    },
    memory: {
      total: 0,
      used: 0,
      percent: 0
    },
    disk: {
      total: 0,
      used: 0,
      percent: 0
    },
    network: {
      bytes_sent: 0,
      bytes_recv: 0
    }
  },
  connections: {
    active: 0,
    blocked: 0,
    suspicious: 0,
    safe: 0
  },
  traffic: {
    bytes_monitored: 0
  }
};

const useWebSocketStore = create<WebSocketState & WebSocketActions>((set, get) => {
  const initialAutoReconnect = getStoredAutoReconnect();
  console.log('🚀 Initializing WebSocket store with autoReconnect:', initialAutoReconnect);
  
  return {
  socket: null,
  connected: false,
  error: null,
  metrics: INITIAL_METRICS,
  connections: [],
  alerts: [],
  blockedIPs: [],
  portStatus: null,
  autoReconnect: true,
  connectionAttempts: 0,
  maxRetries: 5,
  backoffDelay: 5000,
  reconnectTimeout: null,
  isConnecting: false,   // Initialize connection state flag
  circuitBreakerOpen: false,  // Initialize circuit breaker
  lastConnectionTime: 0,      // Initialize last connection time
  
  // Authentication state
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
          console.log('🚫 Circuit breaker OPEN: Preventing connection storm. Next attempt in', 
                      Math.ceil((30000 - timeSinceLastAttempt) / 1000), 'seconds');
          return;
        } else {
          console.log('🔄 Circuit breaker RESET: Cooldown period over, allowing connection attempt');
          set({ circuitBreakerOpen: false, connectionAttempts: 0 });
        }
      }
      
      // Prevent multiple simultaneous connection attempts
      if (state.isConnecting) {
        console.log('🔒 Connection already in progress, skipping duplicate attempt');
        return;
      }
      
      // Record connection attempt time
      set({ lastConnectionTime: now });
      
      // Check global WebSocket instance first (simplified check)
      if (globalWebSocketInstance) {
        console.log('🔍 Global WebSocket instance exists, checking state...');
        try {
          const readyState = globalWebSocketInstance.readyState;
          if (readyState === WebSocket.OPEN) {
            console.log('🔒 Global WebSocket already connected, reusing existing connection');
            set({ 
              socket: globalWebSocketInstance, 
              connected: true, 
              error: null,
              isConnecting: false 
            });
            return;
          } else if (readyState === WebSocket.CONNECTING) {
            console.log('🔒 Global WebSocket already connecting, waiting...');
            return;
          } else {
            console.log('🔍 Global WebSocket in state:', readyState, 'proceeding with new connection');
            globalWebSocketInstance = null; // Clear stale instance
          }
        } catch (error) {
          console.log('🔍 Error checking global WebSocket state, proceeding with new connection');
          globalWebSocketInstance = null; // Clear problematic instance
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
        console.log('🧹 Closing existing socket before creating new one');
        currentSocket.close();
      }
      
      // Set connecting flag to prevent duplicate attempts
      set({ isConnecting: true });
      
      console.log('🔌 Attempting to connect to WebSocket...');
      // Resolve WebSocket URL: env override -> localhost default -> fallback same-origin with /ws path
      const envWsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const wsUrl = envWsUrl && envWsUrl.trim().length > 0
        ? envWsUrl
        : (isLocalhost ? 'ws://localhost:5173/ws' : 'wss://bigyellowjacket.com:8443/ws');
      console.log('🔍 WebSocket connection details:', {
        url: wsUrl,
        currentTime: new Date().toISOString(),
        connectionAttempts: state.connectionAttempts,
        autoReconnect: state.autoReconnect
      });
      
      // Add debugging info about browser WebSocket support
      console.log('🔍 Browser WebSocket readyState constants:', {
        CONNECTING: WebSocket.CONNECTING,
        OPEN: WebSocket.OPEN,
        CLOSING: WebSocket.CLOSING,
        CLOSED: WebSocket.CLOSED
      });
      
      const socket = new WebSocket(wsUrl);
      
      // Store as global instance to prevent duplicates
      globalWebSocketInstance = socket;
      
      // Add connection timeout - increased for stability
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          console.log('⏰ Connection timeout - closing socket');
          socket.close();
          set({ 
            error: 'Connection timeout', 
            connected: false,
            isConnecting: false  // Clear connecting flag on timeout
          });
        }
      }, 15000); // Reduced to 15 seconds for faster feedback

      socket.onopen = () => {
        console.log('✅ Connected to server');
        clearTimeout(connectionTimeout); // Clear the timeout since we connected successfully
        set({ 
          connected: true, 
          error: null, 
          socket,
          connectionAttempts: 0,
          backoffDelay: 5000,  // Reset to base delay
          isConnecting: false  // Clear connecting flag
        });
        
        // Mark as globally connected to prevent duplicate connections
        isGlobalConnectionInitialized = true;
        globalConnectionAttemptInProgress = false;
        
        // Server automatically sends initial_state on connection
        console.log('📡 Connected - server will send initial data automatically');
      };

      socket.onmessage = (event) => {
        try {
          console.log('📨 Received WebSocket message:', event.data.length, 'bytes');
          const message = JSON.parse(event.data);
          console.log('📨 Parsed message type:', message.message_type);
          
          switch (message.message_type) {
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
                  ? message.data.active_connections
                  : Object.values(message.data.active_connections);
                
                get().updateConnections(connections);
              }
              // Update blocked IPs if included in the response
              if (message.data && message.data.blocked_ips) {
                get().updateBlockedIPs(message.data.blocked_ips);
              }
              if (message.data && message.data.alerts) {
                get().updateAlerts(message.data.alerts);
              }
              break;
            case 'initial_state':
              console.log('📦 Processing initial state with', message.data?.active_connections?.length || 0, 'connections');
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
                  ? message.data.active_connections
                  : Object.values(message.data.active_connections);
                
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
            case 'alert_update':
              if (message.data && message.data.alerts) {
                set(state => ({
                  alerts: [...message.data.alerts, ...state.alerts].slice(0, 10)
                }));
              }
              break;
            case 'welcome':
              console.log('Received welcome message:', message.data);
              break;
            case 'port_status':
              console.log('Received port status:', message.data);
              get().updatePortStatus(message.data);
              // Clear any loading states when we receive port status
              break;
            case 'port_block_result':
              console.log('Port block result:', message.data);
              // Handle port block results
              break;
            case 'port_unblock_result':
              console.log('Port unblock result:', message.data);
              // Handle port unblock results
              break;
            case 'emergency_block_result':
              console.log('Emergency block result:', message.data);
              // Handle emergency block results
              break;
            default:
              console.log('Unknown message type:', message.message_type);
          }
        } catch (error) {
          console.error('🔥 Error parsing WebSocket message:', error);
          console.error('🔥 Raw message data:', event.data);
          // Don't close connection on parse error, just log it
        }
      };

      socket.onerror = (error) => {
        console.error('🔥 WebSocket error:', error);
        console.error('🔥 WebSocket readyState:', socket.readyState);
        console.error('🔥 WebSocket URL:', socket.url);
        clearTimeout(connectionTimeout); // Clear timeout on error
        set({ 
          error: 'Connection error occurred',
          isConnecting: false  // Clear connecting flag on error
        });
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected from server');
        console.log('🔌 Close event code:', event.code, '(', getCloseCodeDescription(event.code), ')');
        console.log('🔌 Close event reason:', event.reason || 'No reason provided');
        console.log('🔌 Close event wasClean:', event.wasClean);
        console.log('🔌 Socket final state:', socket.readyState);
        
        // Clear global instance if this is the current one
        if (globalWebSocketInstance === socket) {
          globalWebSocketInstance = null;
        }
        
        set({ 
          connected: false, 
          socket: null,
          isConnecting: false  // Clear connecting flag on close
        });
        
        const state = get();
        
        console.log(`🔌 Connection closed. Auto-reconnect is: ${state.autoReconnect ? 'ENABLED' : 'DISABLED'}`);
        
        // Only auto-reconnect if enabled and not a clean close and within retry limits
        if (state.autoReconnect && event.code !== 1000 && state.connectionAttempts < state.maxRetries) {
          const attemptNumber = state.connectionAttempts + 1;
          const delay = Math.min(state.backoffDelay + (attemptNumber * 2000), 30000); // Exponential backoff, max 30 seconds
          
          console.log(`🔄 AUTO-RECONNECT TRIGGERED: Attempting to reconnect in ${delay/1000} seconds... (Attempt ${attemptNumber}/${state.maxRetries})`);
          
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
          console.log('🚫 AUTO-RECONNECT DISABLED: Will not attempt to reconnect automatically');
          // Add helpful message about using Force Reconnect
          set({ 
            error: 'Connection lost. Auto-reconnect is disabled. Use "Force Reconnect" to re-enable and connect.'
          });
        } else if (event.code === 1000) {
          console.log('🛑 Clean disconnect: No auto-reconnect needed');
        } else if (state.connectionAttempts >= state.maxRetries) {
          console.log('🚫 Max reconnection attempts reached. Opening circuit breaker.');
          set({ 
            circuitBreakerOpen: true,
            autoReconnect: false,
            error: 'Connection failed after multiple attempts. Circuit breaker engaged. Wait 30 seconds or use "Force Reconnect".'
          });
          saveAutoReconnect(false); // Save the disabled state to localStorage
        }
      };

      set({ socket });

    } catch (error) {
      console.error('Connection error:', error);
      set({ 
        error: 'Failed to connect to server', 
        connected: false,
        isConnecting: false  // Clear connecting flag on exception
      });
    }
  },

  disconnect: () => {
    const state = get();
    
    // Clear reconnect timeout
    if (state.reconnectTimeout) {
      clearTimeout(state.reconnectTimeout);
    }
    
    if (state.socket) {
      state.socket.close(1000, 'Manual disconnect'); // Clean close
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
    // Only update if data has actually changed
    if (JSON.stringify(currentConnections) !== JSON.stringify(data)) {
      console.log('📊 Updating connections in store:', data.length);
      set({ connections: data });
    } else {
      console.log('⏭️ Skipping duplicate connections update');
    }
  },

  updateAlerts: (data) => set({ alerts: data }),

  updateBlockedIPs: (data) => {
    const current = get().blockedIPs || [];
    // Merge without clearing; preserve order, cap at 1000 entries
    const merged: string[] = [];
    const seen = new Set<string>();
    // keep existing first
    for (const ip of current) {
      if (!seen.has(ip)) { seen.add(ip); merged.push(ip); }
      if (merged.length >= 1000) break;
    }
    // then add new ones
    for (const ip of Array.isArray(data) ? data : []) {
      if (!seen.has(ip)) {
        seen.add(ip);
        merged.push(ip);
        if (merged.length >= 1000) break;
      }
    }
    // Only set if changed
    if (JSON.stringify(current) !== JSON.stringify(merged)) {
      console.log('Updating blocked IPs in store (merged):', merged.length);
      set({ blockedIPs: merged });
    } else {
      console.log('🔄 Skipping duplicate blocked IPs update');
    }
  },

  updatePortStatus: (data) => {
    console.log('Updating port status in store:', data);
    set({ portStatus: data });
  },

  setAutoReconnect: (enabled: boolean) => {
    console.log('🔧 setAutoReconnect called with:', enabled);
    set({ autoReconnect: enabled });
    saveAutoReconnect(enabled); // Save to localStorage
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
    console.log('🔄 resetConnection called - preserving autoReconnect setting');
    const state = get();
    
    // Clear any existing timeouts
    if (state.reconnectTimeout) {
      clearTimeout(state.reconnectTimeout);
    }
    
    // Reset connection state but preserve autoReconnect setting
    const currentAutoReconnect = state.autoReconnect;
    set({ 
      connectionAttempts: 0,
      backoffDelay: 5000,  // Use stable base delay
      autoReconnect: currentAutoReconnect, // Preserve the user's setting
      error: null,
      reconnectTimeout: null
    });
    
    // Disconnect and reconnect with longer delay for stability
    state.disconnect();
    setTimeout(() => {
      get().connect();
    }, 2000); // Increased delay for stability
  },

  forceReconnect: () => {
    console.log('🔄 forceReconnect called - resetting all connection states and attempting to connect');
    const state = get();
    set({ autoReconnect: true }); // Force auto-reconnect to true
    saveAutoReconnect(true); // Save the forced state to localStorage

    // Clear any existing timeouts
    if (state.reconnectTimeout) {
      clearTimeout(state.reconnectTimeout);
      set({ reconnectTimeout: null });
    }

    // Reset connection state, circuit breaker, and global flags
    set({ 
      connectionAttempts: 0,
      backoffDelay: 5000,  // Use stable base delay
      error: null,
      circuitBreakerOpen: false,  // Reset circuit breaker
      lastConnectionTime: 0       // Reset connection time
    });
    
    // Reset global flags to allow reconnection
    if (typeof window !== 'undefined') {
      console.log('🔄 Resetting global connection flags for force reconnect');
      isGlobalConnectionInitialized = false;
      globalConnectionAttemptInProgress = false;
    }

    // Disconnect and reconnect with longer delay for stability
    state.disconnect();
    setTimeout(() => {
      get().connect();
    }, 2000); // Increased delay for stability
  },

  // Authentication methods
  login: async (username: string, password: string): Promise<boolean> => {
    console.log('🔐 Attempting login for user:', username);
    
    // Simple authentication logic (in production, this would be server-side)
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
      // Send to backend for IP capture and aggregation (fire-and-forget)
      try {
        fetch('/api/auth/login-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, success: true })
        }).catch(() => {});
      } catch {}
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
      // Send to backend for IP capture and aggregation (fire-and-forget)
      try {
        fetch('/api/auth/login-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, success: false })
        }).catch(() => {});
      } catch {}
      console.log('❌ Login failed for user:', username, 'attempts:', state.loginAttempts + 1);
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
    console.log('👤 Setting user role to:', role);
    set({ userRole: role });
  },

  recordLoginAttempt: (record: LoginAttemptRecord) => {
    try {
      // Persist in localStorage for simple durability
      const key = 'byj_login_attempts';
      const existing = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      const parsed: LoginAttemptRecord[] = existing ? JSON.parse(existing) : [];
      const updated = [record, ...parsed].slice(0, 200);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(updated));
      }
      // Update store
      set((state) => ({ loginAttemptHistory: [record, ...state.loginAttemptHistory].slice(0, 200) }));
    } catch (e) {
      console.warn('Failed to persist login attempt', e);
      set((state) => ({ loginAttemptHistory: [record, ...state.loginAttemptHistory].slice(0, 200) }));
    }
  }
}});

export const useWebSocket = () => {
  const store = useWebSocketStore();
  
  // Aggressive anti-refresh protection
  useEffect(() => {
    // Prevent multiple initializations per session
    if (hasAttemptedInitialConnection) {
      console.log('🔒 Connection already initialized this session');
      return;
    }
    
    // Check if we're in a valid browser environment
    if (typeof window === 'undefined') {
      console.log('🚫 Not in browser environment, skipping WebSocket');
      return;
    }
    
    // Mark as attempted immediately
    hasAttemptedInitialConnection = true;
    console.log('🌟 WebSocket: Single initialization attempt');
    
    // More defensive state checking
    const initTimeout = setTimeout(() => {
      try {
        const currentState = useWebSocketStore.getState();
        const shouldConnect = (
          !currentState.connected && 
          !currentState.socket && 
          !currentState.isConnecting && 
          !currentState.circuitBreakerOpen
        );
        
        if (shouldConnect) {
          console.log('🔌 Starting WebSocket connection');
          store.connect();
        } else {
          console.log('🔒 WebSocket already active or blocked:', {
            connected: currentState.connected,
            hasSocket: !!currentState.socket,
            isConnecting: currentState.isConnecting,
            circuitBreakerOpen: currentState.circuitBreakerOpen
          });
        }
      } catch (error) {
        console.error('🚫 WebSocket init error:', error);
      }
    }, 2000); // Increased delay for stability
    
    // Cleanup timeout on unmount
    return () => {
      clearTimeout(initTimeout);
      console.log('🧹 WebSocket hook cleanup');
    };
  }, []); // Truly empty deps - no re-runs

  return store;
};

// Global helper functions for debugging - can be called from browser console
if (typeof window !== 'undefined') {
  (window as any).resetAutoReconnect = () => {
    resetAutoReconnectSetting();
    console.log('✅ Auto-reconnect has been reset to enabled. Refresh the page to apply changes.');
  };
  
  (window as any).debugWebSocket = () => {
    const store = useWebSocketStore.getState();
    console.log('🔍 WebSocket Debug Info:');
    console.log('  - Connected:', store.connected);
    console.log('  - Socket:', store.socket);
    console.log('  - Error:', store.error);
    console.log('  - Auto-reconnect:', store.autoReconnect);
    console.log('  - Connection attempts:', store.connectionAttempts);
    console.log('  - Global initialized:', isGlobalConnectionInitialized);
    console.log('  - Global in progress:', globalConnectionAttemptInProgress);
    console.log('  - Socket readyState:', store.socket?.readyState);
    return store;
  };
  
  (window as any).forceConnect = () => {
    const store = useWebSocketStore.getState();
    console.log('🔄 Forcing connection...');
    store.forceReconnect();
  };
}

export { useWebSocketStore };

// Note: WebSocket initialization is now handled only by useWebSocket hook to prevent race conditions
// This ensures stable connection management and prevents multiple simultaneous connection attempts