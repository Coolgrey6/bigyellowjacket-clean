import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useWebSocket } from '../../services/websocket';

interface PortInfo {
  port: number;
  description: string;
  blocked: boolean;
  allowed: boolean;
  dangerous: boolean;
  encrypted: boolean;
}

interface PortStatus {
  enabled: boolean;
  total_blocked: number;
  blocked_ports: number[];
  always_blocked: number[];
  always_allowed: number[];
  system: string;
  last_updated: string;
}

export const PortBlocker: React.FC = () => {
  const { send, connected, portStatus } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Common ports to display
  const commonPorts = [
    { port: 80, name: 'HTTP', description: 'Unencrypted web traffic' },
    { port: 443, name: 'HTTPS', description: 'Encrypted web traffic' },
    { port: 22, name: 'SSH', description: 'Secure shell' },
    { port: 21, name: 'FTP', description: 'File transfer (unencrypted)' },
    { port: 23, name: 'Telnet', description: 'Remote access (unencrypted)' },
    { port: 25, name: 'SMTP', description: 'Email (unencrypted)' },
    { port: 53, name: 'DNS', description: 'Domain name system' },
    { port: 110, name: 'POP3', description: 'Email retrieval (unencrypted)' },
    { port: 143, name: 'IMAP', description: 'Email access (unencrypted)' },
    { port: 389, name: 'LDAP', description: 'Directory service (unencrypted)' },
    { port: 445, name: 'SMB', description: 'File sharing (unencrypted)' },
    { port: 8080, name: 'HTTP Alt', description: 'Alternative HTTP port (dev allowed)' },
    { port: 3000, name: 'Dev Server', description: 'Development server (allowed)' },
    { port: 5000, name: 'Dev Server', description: 'Development server (allowed)' },
    { port: 5173, name: 'Vite Dev', description: 'Vite development server (allowed)' },
    { port: 8766, name: 'WebSocket', description: 'Big Yellow Jacket WebSocket (allowed)' }
  ];

  // Load port status when component mounts or connection is established
  useEffect(() => {
    if (connected) {
      loadPortStatus();
    }
  }, [connected]);

  // Auto-refresh port status every 10 seconds
  useEffect(() => {
    if (connected) {
      const interval = setInterval(() => {
        loadPortStatus();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [connected]);

  const loadPortStatus = () => {
    if (connected) {
      setLoading(true);
      send({ command: 'get_port_status' });
    }
  };

  const handlePortToggle = (port: number, currentlyBlocked: boolean) => {
    setLoading(true);
    setMessage(null);
    
    if (currentlyBlocked) {
      send({ command: 'unblock_port', port });
      setMessage({ type: 'info', text: `Unblocking port ${port}...` });
    } else {
      send({ command: 'block_port', port, reason: 'Manual block via UI' });
      setMessage({ type: 'info', text: `Blocking port ${port}...` });
    }
    
    // Clear loading after a short delay
    setTimeout(() => setLoading(false), 2000);
  };

  const handleEmergencyBlock = () => {
    if (window.confirm('Are you sure you want to block ALL unencrypted ports? This is an emergency action.')) {
      setLoading(true);
      setMessage({ type: 'info', text: 'Emergency blocking all unencrypted ports...' });
      send({ command: 'emergency_block' });
      
      // Clear loading after a short delay
      setTimeout(() => setLoading(false), 3000);
    }
  };

  const getPortStatus = (port: number) => {
    if (!portStatus) return { blocked: false, allowed: false, dangerous: false };
    
    return {
      blocked: portStatus.blocked_ports.includes(port),
      allowed: portStatus.always_allowed.includes(port),
      dangerous: portStatus.always_blocked.includes(port)
    };
  };

  const getPortIcon = (port: number) => {
    const status = getPortStatus(port);
    
    if (status.allowed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (status.blocked) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (status.dangerous) {
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    } else {
      return <Shield className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPortColor = (port: number) => {
    const status = getPortStatus(port);
    
    if (status.allowed) {
      return 'bg-green-50 border-green-200 text-green-800';
    } else if (status.blocked) {
      return 'bg-red-50 border-red-200 text-red-800';
    } else if (status.dangerous) {
      return 'bg-orange-50 border-orange-200 text-orange-800';
    } else {
      return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const canTogglePort = (port: number) => {
    const status = getPortStatus(port);
    return !status.allowed && !status.dangerous;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-500" />
            Port Blocker
          </h2>
          <p className="text-gray-600 mt-1">Block non-encrypted and dangerous ports for enhanced security</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Status Overview */}
      {portStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-600">Blocked Ports</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {portStatus.total_blocked}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Always Allowed</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {portStatus.always_allowed.length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">Always Blocked</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {portStatus.always_blocked.length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">System</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {portStatus.system}
            </div>
          </div>
        </div>
      )}

      {/* Emergency Actions */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-red-800 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Emergency Actions
            </h3>
            <p className="text-sm text-red-600 mt-1">
              Block all unencrypted ports immediately
            </p>
          </div>
          <button
            onClick={handleEmergencyBlock}
            disabled={loading || !connected}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Blocking...' : 'Emergency Block All'}
          </button>
        </div>
      </div>

      {/* Port Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Port Management</h3>
            <button
              onClick={loadPortStatus}
              disabled={loading || !connected}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commonPorts.map((portInfo) => {
              const status = getPortStatus(portInfo.port);
              const canToggle = canTogglePort(portInfo.port);
              
              return (
                <div
                  key={portInfo.port}
                  className={`p-4 rounded-lg border-2 ${getPortColor(portInfo.port)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPortIcon(portInfo.port)}
                      <span className="font-medium">
                        {portInfo.port} - {portInfo.name}
                      </span>
                    </div>
                    {canToggle && (
                      <button
                        onClick={() => handlePortToggle(portInfo.port, status.blocked)}
                        disabled={loading || !connected}
                        className={`px-2 py-1 text-xs rounded font-medium ${
                          status.blocked
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        } disabled:opacity-50`}
                      >
                        {status.blocked ? 'Unblock' : 'Block'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm opacity-75">{portInfo.description}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {status.allowed && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                        Always Allowed
                      </span>
                    )}
                    {status.dangerous && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                        Always Blocked
                      </span>
                    )}
                    {status.blocked && !status.dangerous && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                        Blocked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default PortBlocker;

