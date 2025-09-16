/**
 * Real-time data management hook
 * Integrates with WebSocket and API service for comprehensive data handling
 */

import { useEffect, useState, useCallback } from 'react';
import { useWebSocketStore } from './useWebSocket';
import { apiService, AlertData, ThreatData, ConnectionData, SystemMetrics } from '../services/api';

export interface RealtimeDataState {
  // System data
  systemMetrics: SystemMetrics | null;
  connections: ConnectionData[];
  threats: ThreatData[];
  alerts: AlertData[];
  blockedIPs: string[];
  
  // Loading states
  loading: {
    system: boolean;
    connections: boolean;
    threats: boolean;
    alerts: boolean;
  };
  
  // Error states
  errors: {
    system: string | null;
    connections: string | null;
    threats: string | null;
    alerts: string | null;
  };
  
  // Last update timestamps
  lastUpdated: {
    system: string | null;
    connections: string | null;
    threats: string | null;
    alerts: string | null;
  };
}

export interface RealtimeDataActions {
  refreshData: (type?: 'all' | 'system' | 'connections' | 'threats' | 'alerts') => Promise<void>;
  clearErrors: () => void;
  acknowledgeAlert: (alertId: string) => Promise<boolean>;
  resolveAlert: (alertId: string) => Promise<boolean>;
  blockIP: (ip: string, duration?: number, reason?: string) => Promise<boolean>;
  unblockIP: (ip: string) => Promise<boolean>;
}

export const useRealtimeData = (): RealtimeDataState & RealtimeDataActions => {
  const {
    connected,
    metrics: wsMetrics,
    connections: wsConnections,
    alerts: wsAlerts,
    blockedIPs: wsBlockedIPs,
    send
  } = useWebSocketStore();

  const [state, setState] = useState<RealtimeDataState>({
    systemMetrics: null,
    connections: [],
    threats: [],
    alerts: [],
    blockedIPs: [],
    loading: {
      system: false,
      connections: false,
      threats: false,
      alerts: false
    },
    errors: {
      system: null,
      connections: null,
      threats: null,
      alerts: null
    },
    lastUpdated: {
      system: null,
      connections: null,
      threats: null,
      alerts: null
    }
  });

  // Update state from WebSocket data
  useEffect(() => {
    if (wsMetrics) {
      setState(prev => ({
        ...prev,
        systemMetrics: {
          cpu_usage: wsMetrics.system.cpu.percent,
          memory_usage: wsMetrics.system.memory.percent,
          disk_usage: wsMetrics.system.disk.percent,
          network_io: wsMetrics.system.network.bytes_sent + wsMetrics.system.network.bytes_recv,
          active_connections: wsMetrics.connections.active,
          threats_detected: wsMetrics.connections.suspicious,
          alerts_active: wsAlerts.length,
          timestamp: wsMetrics.timestamp || new Date().toISOString()
        },
        lastUpdated: {
          ...prev.lastUpdated,
          system: new Date().toISOString()
        }
      }));
    }
  }, [wsMetrics, wsAlerts.length]);

  useEffect(() => {
    if (wsConnections) {
      setState(prev => ({
        ...prev,
        connections: wsConnections.map(conn => ({
          id: `${conn.host}:${conn.port}`,
          src_ip: conn.host,
          dst_ip: '0.0.0.0', // WebSocket doesn't provide this
          src_port: conn.port,
          dst_port: 0, // WebSocket doesn't provide this
          protocol: conn.protocol,
          status: conn.status,
          bytes_sent: conn.bytes_sent,
          bytes_received: conn.bytes_received,
          timestamp: conn.last_seen || new Date().toISOString()
        })),
        lastUpdated: {
          ...prev.lastUpdated,
          connections: new Date().toISOString()
        }
      }));
    }
  }, [wsConnections]);

  useEffect(() => {
    if (wsAlerts) {
      setState(prev => ({
        ...prev,
        alerts: wsAlerts.map(alert => ({
          id: `${alert.type}_${alert.timestamp}`,
          type: alert.type,
          severity: 'medium' as const, // WebSocket doesn't provide severity
          title: `${alert.type} detected`,
          description: alert.details?.description || 'Security alert detected',
          source_ip: alert.endpoint.host,
          target_ip: undefined,
          status: 'active' as const,
          created_at: alert.timestamp,
          updated_at: alert.timestamp,
          metadata: alert.details
        })),
        lastUpdated: {
          ...prev.lastUpdated,
          alerts: new Date().toISOString()
        }
      }));
    }
  }, [wsAlerts]);

  useEffect(() => {
    if (wsBlockedIPs) {
      setState(prev => ({
        ...prev,
        blockedIPs: wsBlockedIPs,
        lastUpdated: {
          ...prev.lastUpdated,
          alerts: new Date().toISOString()
        }
      }));
    }
  }, [wsBlockedIPs]);

  // Refresh data from API
  const refreshData = useCallback(async (type: 'all' | 'system' | 'connections' | 'threats' | 'alerts' = 'all') => {
    const updateLoading = (key: keyof typeof state.loading, value: boolean) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, [key]: value }
      }));
    };

    const updateError = (key: keyof typeof state.errors, value: string | null) => {
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, [key]: value }
      }));
    };

    const updateLastUpdated = (key: keyof typeof state.lastUpdated) => {
      setState(prev => ({
        ...prev,
        lastUpdated: { ...prev.lastUpdated, [key]: new Date().toISOString() }
      }));
    };

    try {
      if (type === 'all' || type === 'system') {
        updateLoading('system', true);
        updateError('system', null);
        
        const response = await apiService.getSystemMetrics();
        if (response.success && response.data) {
          setState(prev => ({ ...prev, systemMetrics: response.data }));
          updateLastUpdated('system');
        } else {
          updateError('system', response.error || 'Failed to load system metrics');
        }
        updateLoading('system', false);
      }

      if (type === 'all' || type === 'connections') {
        updateLoading('connections', true);
        updateError('connections', null);
        
        const response = await apiService.getConnections();
        if (response.success && response.data) {
          setState(prev => ({ ...prev, connections: response.data }));
          updateLastUpdated('connections');
        } else {
          updateError('connections', response.error || 'Failed to load connections');
        }
        updateLoading('connections', false);
      }

      if (type === 'all' || type === 'threats') {
        updateLoading('threats', true);
        updateError('threats', null);
        
        const response = await apiService.getThreats();
        if (response.success && response.data) {
          setState(prev => ({ ...prev, threats: response.data }));
          updateLastUpdated('threats');
        } else {
          updateError('threats', response.error || 'Failed to load threats');
        }
        updateLoading('threats', false);
      }

      if (type === 'all' || type === 'alerts') {
        updateLoading('alerts', true);
        updateError('alerts', null);
        
        const response = await apiService.getAlerts();
        if (response.success && response.data) {
          setState(prev => ({ ...prev, alerts: response.data }));
          updateLastUpdated('alerts');
        } else {
          updateError('alerts', response.error || 'Failed to load alerts');
        }
        updateLoading('alerts', false);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (type === 'all' || type === 'system') {
        updateError('system', 'Failed to refresh system data');
        updateLoading('system', false);
      }
      if (type === 'all' || type === 'connections') {
        updateError('connections', 'Failed to refresh connections data');
        updateLoading('connections', false);
      }
      if (type === 'all' || type === 'threats') {
        updateError('threats', 'Failed to refresh threats data');
        updateLoading('threats', false);
      }
      if (type === 'all' || type === 'alerts') {
        updateError('alerts', 'Failed to refresh alerts data');
        updateLoading('alerts', false);
      }
    }
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {
        system: null,
        connections: null,
        threats: null,
        alerts: null
      }
    }));
  }, []);

  // Alert management actions
  const acknowledgeAlert = useCallback(async (alertId: string): Promise<boolean> => {
    try {
      const response = await apiService.acknowledgeAlert(alertId);
      if (response.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          alerts: prev.alerts.map(alert =>
            alert.id === alertId ? { ...alert, status: 'acknowledged' as const } : alert
          )
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string): Promise<boolean> => {
    try {
      const response = await apiService.resolveAlert(alertId);
      if (response.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          alerts: prev.alerts.map(alert =>
            alert.id === alertId ? { ...alert, status: 'resolved' as const } : alert
          )
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return false;
    }
  }, []);

  // IP management actions
  const blockIP = useCallback(async (ip: string, duration: number = 3600, reason: string = 'Manual block'): Promise<boolean> => {
    try {
      const response = await apiService.blockIp(ip, duration, reason);
      if (response.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          blockedIPs: [...prev.blockedIPs, ip]
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error blocking IP:', error);
      return false;
    }
  }, []);

  const unblockIP = useCallback(async (ip: string): Promise<boolean> => {
    try {
      const response = await apiService.unblockIp(ip);
      if (response.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          blockedIPs: prev.blockedIPs.filter(blockedIP => blockedIP !== ip)
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unblocking IP:', error);
      return false;
    }
  }, []);

  // Auto-refresh when WebSocket connects
  useEffect(() => {
    if (connected) {
      refreshData('all');
    }
  }, [connected, refreshData]);

  // Periodic refresh for data that might not come through WebSocket
  useEffect(() => {
    const interval = setInterval(() => {
      if (connected) {
        refreshData('threats'); // Refresh threats every 30 seconds
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [connected, refreshData]);

  // Request data via WebSocket when connected
  useEffect(() => {
    if (connected && send) {
      send({ command: 'get_metrics' });
      send({ command: 'get_connections' });
      send({ command: 'get_alerts' });
    }
  }, [connected, send]);

  return {
    ...state,
    refreshData,
    clearErrors,
    acknowledgeAlert,
    resolveAlert,
    blockIP,
    unblockIP
  };
};
