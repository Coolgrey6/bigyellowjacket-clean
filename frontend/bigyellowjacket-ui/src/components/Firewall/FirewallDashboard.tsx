import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, AlertTriangle, Activity, Eye, EyeOff, Zap, Globe, Users, Clock, LogOut } from 'lucide-react';
import { useWebSocketStore } from '../../hooks/useWebSocket';
import { FirewallLogin } from './FirewallLogin';

interface FirewallStats {
  totalBlocked: number;
  activeConnections: number;
  threatsBlocked: number;
  lastBlocked: string | null;
  blockedToday: number;
}

export const FirewallDashboard: React.FC = () => {
  const { connected, send, blockedIPs, connections, isAuthenticated, userRole, login, logout } = useWebSocketStore();
  const [firewallEnabled, setFirewallEnabled] = useState(true);
  const [autoBlock, setAutoBlock] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLogin, setShowLogin] = useState(!isAuthenticated);
  const [stats, setStats] = useState<FirewallStats>({
    totalBlocked: 0,
    activeConnections: 0,
    threatsBlocked: 0,
    lastBlocked: null,
    blockedToday: 0
  });

  // Update stats when data changes
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalBlocked: blockedIPs.length,
      activeConnections: connections.length,
      threatsBlocked: blockedIPs.length, // In a real system, this would be different
      lastBlocked: blockedIPs.length > 0 ? blockedIPs[0] : null,
      blockedToday: blockedIPs.length // Simplified for demo
    }));
  }, [blockedIPs, connections]);

  const handleBlockAllSuspicious = () => {
    // Block all connections marked as suspicious
    connections.forEach(conn => {
      if (conn.status === 'SUSPICIOUS' || conn.status === 'DANGEROUS') {
        send({
          command: 'block_ip',
          params: { host: conn.host }
        });
      }
    });
  };

  const handleUnblockAll = () => {
    // Unblock all IPs
    blockedIPs.forEach(ip => {
      send({
        command: 'unblock_ip',
        params: { host: ip }
      });
    });
  };

  const handleToggleFirewall = () => {
    setFirewallEnabled(!firewallEnabled);
    // In a real implementation, this would send a command to enable/disable firewall
  };

  const handleToggleAutoBlock = () => {
    setAutoBlock(!autoBlock);
    // In a real implementation, this would configure auto-blocking
  };

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    const success = await login(username, password);
    if (success) {
      setShowLogin(false);
    }
    return success;
  };

  const handleLogout = () => {
    logout();
    setShowLogin(true);
    setFirewallEnabled(false);
    setAutoBlock(false);
    setShowAdvanced(false);
  };

  const handleCancelLogin = () => {
    setShowLogin(false);
  };

  // Show login modal if not authenticated
  if (showLogin) {
    return <FirewallLogin onLogin={handleLogin} onCancel={handleCancelLogin} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Firewall Protection</h2>
            <p className="text-gray-600">Advanced network security and threat blocking</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Logged in as: <span className="font-medium text-gray-900">{userRole}</span>
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Lock className="w-4 h-4" />
              Login Required
            </button>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {connected ? '🟢 Active' : '🔴 Disconnected'}
          </span>
        </div>
      </div>

      {/* Main Firewall Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Firewall Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Firewall Status</h3>
            <button
              onClick={handleToggleFirewall}
              disabled={!isAuthenticated}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                firewallEnabled ? 'bg-red-600' : 'bg-gray-300'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  firewallEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${firewallEnabled ? 'text-red-600' : 'text-gray-400'}`} />
            <span className={`font-medium ${firewallEnabled ? 'text-red-600' : 'text-gray-500'}`}>
              {firewallEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Auto Block */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Auto Block</h3>
            <button
              onClick={handleToggleAutoBlock}
              disabled={!isAuthenticated}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoBlock ? 'bg-orange-600' : 'bg-gray-300'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoBlock ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Zap className={`w-5 h-5 ${autoBlock ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className={`font-medium ${autoBlock ? 'text-orange-600' : 'text-gray-500'}`}>
              {autoBlock ? 'Active' : 'Manual'}
            </span>
          </div>
        </div>

        {/* Total Blocked */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Total Blocked</h3>
            <Lock className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">{stats.totalBlocked}</div>
          <p className="text-sm text-gray-600">IP addresses</p>
        </div>

        {/* Active Connections */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Active Connections</h3>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-600">{stats.activeConnections}</div>
          <p className="text-sm text-gray-600">Currently monitored</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleBlockAllSuspicious}
            disabled={!connected || !firewallEnabled || !isAuthenticated}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="w-5 h-5" />
            Block Suspicious
          </button>
          <button
            onClick={handleUnblockAll}
            disabled={!connected || blockedIPs.length === 0 || !isAuthenticated}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Unlock className="w-5 h-5" />
            Unblock All
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={!isAuthenticated}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showAdvanced ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
      </div>

      {/* Blocked IPs List */}
      {blockedIPs.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              Blocked IP Addresses ({blockedIPs.length})
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {blockedIPs.map((ip, index) => (
              <div key={ip} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="font-mono text-sm text-red-800">{ip}</span>
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">BLOCKED</span>
                </div>
                <button
                  onClick={() => {
                    send({
                      command: 'unblock_ip',
                      params: { host: ip }
                    });
                  }}
                  disabled={!connected || !isAuthenticated}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  <Unlock className="w-3 h-3" />
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">Advanced Firewall Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Block Inbound Traffic</label>
                <button
                  onClick={() => send({ command: 'block_inbound', params: {} })}
                  disabled={!connected || !isAuthenticated}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  Block Inbound
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Block Outbound Traffic</label>
                <button
                  onClick={() => send({ command: 'block_outbound', params: {} })}
                  disabled={!connected || !isAuthenticated}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  Block Outbound
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Unblock Inbound Traffic</label>
                <button
                  onClick={() => send({ command: 'unblock_inbound', params: {} })}
                  disabled={!connected || !isAuthenticated}
                  className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  Unblock Inbound
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Unblock Outbound Traffic</label>
                <button
                  onClick={() => send({ command: 'unblock_outbound', params: {} })}
                  disabled={!connected || !isAuthenticated}
                  className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  Unblock Outbound
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Status */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-red-600" />
          <h3 className="font-semibold text-red-800">Security Status</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">Real-time monitoring: <strong>Active</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-700">Threat detection: <strong>Enabled</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-700">Auto-blocking: <strong>{autoBlock ? 'On' : 'Off'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};


