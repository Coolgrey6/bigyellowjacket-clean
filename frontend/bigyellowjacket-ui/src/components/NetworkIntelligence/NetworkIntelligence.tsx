import React, { useState, useEffect } from 'react';
import { Lock, Unlock, RefreshCw, Power, PowerOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWebSocket, useWebSocketStore } from '../../hooks/useWebSocket';

interface Connection {
  host: string;
  port: number;
  protocol: string;
  processName?: string;
  status: string;
  bytes_sent?: number;
  bytes_received?: number;
  latency: number;
  process_info?: {
    name: string;
    path: string;
    pid?: number;
    username?: string;
    cpu_percent?: number;
    memory_percent?: number;
    status?: string;
  };
  last_seen?: string;
  country?: string;
  city?: string;
  organization?: string;
}

export const NetworkIntelligence: React.FC = () => {
  const { 
    connected, 
    error, 
    send, 
    autoReconnect, 
    setAutoReconnect, 
    manualRefresh, 
    forceReconnect,
    connectionAttempts,
    maxRetries 
  } = useWebSocket();
  const connections = useWebSocketStore((state) => state.connections);
  const blockedIPs = useWebSocketStore((state) => state.blockedIPs);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'host' | 'status' | 'latency'>('host');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Pattern maps for highlighting rows (>=3 in same country/org)
  const countryCount: Record<string, number> = {} as any;
  const orgCount: Record<string, number> = {} as any;
  connections.forEach((c: any) => {
    const country = c?.country || 'Unknown';
    const org = c?.organization || c?.organization_name || 'Unknown';
    countryCount[country] = (countryCount[country] || 0) + 1;
    orgCount[org] = (orgCount[org] || 0) + 1;
  });

  const copyHost = async (host: string) => {
    try {
      await navigator.clipboard.writeText(host);
      setCopied(host);
      setTimeout(() => setCopied(null), 1200);
    } catch (e) {
      // ignore
    }
  };

  // Server automatically sends initial_state on connection - no need to request additional data
  useEffect(() => {
    if (connected) {
      console.log('📊 NetworkIntelligence: Component ready, using singleton WebSocket connection');
      // Proactively request latest data to seed UI
      try {
        manualRefresh();
      } catch (e) {
        console.warn('Manual refresh failed:', e);
      }
    } else {
      console.log('⏳ NetworkIntelligence: Waiting for singleton WebSocket connection...');
    }
  }, [connected]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    manualRefresh();
    // Show refresh indicator for a moment
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Function to handle blocking an IP
  const handleBlock = (connection: Connection) => {
    console.log('Block button clicked for:', connection.host);
    console.log('WebSocket connected:', connected);
    
    if (!connected) {
      console.warn('Cannot block IP: WebSocket not connected');
      return;
    }

    const command = {
      command: 'block_ip',
      params: { host: connection.host }
    };
    
    console.log('Sending block command:', command);
    send(command);
    
    // Close the modal if the blocked connection is selected
    if (selectedConnection?.host === connection.host) {
      setSelectedConnection(null);
    }
  };

  // Function to handle unblocking an IP
  const handleUnblock = (connection: Connection) => {
    console.log('Unblock button clicked for:', connection.host);
    console.log('WebSocket connected:', connected);
    
    if (!connected) {
      console.warn('Cannot unblock IP: WebSocket not connected');
      return;
    }

    const command = {
      command: 'unblock_ip',
      params: { host: connection.host }
    };
    
    console.log('Sending unblock command:', command);
    send(command);
  };

  // Function to check if an IP is blocked
  const isIPBlocked = (host: string) => {
    return blockedIPs.includes(host);
  };

  // Function to handle unblocking a blocked IP that's not in current connections
  const handleUnblockByIP = (host: string) => {
    console.log('Unblock IP clicked for:', host);
    
    if (!connected) {
      console.warn('Cannot unblock IP: WebSocket not connected');
      return;
    }

    const command = {
      command: 'unblock_ip',
      params: { host: host }
    };
    
    console.log('Sending unblock command:', command);
    send(command);
  };

  // Format process info for display
  const getProcessDisplay = (connection: Connection): string => {
    if (connection.process_info?.name) {
      const pid = connection.process_info.pid ? ` (PID: ${connection.process_info.pid})` : '';
      const user = connection.process_info.username ? ` - User: ${connection.process_info.username}` : '';
      return `${connection.process_info.name}${pid}${user}`;
    }
    return connection.processName || 'Unknown';
  };

  const formatBytes = (bytes: number | undefined): string => {
    if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Filter and sort connections
  const filteredConnections = connections.filter(connection => {
    const matchesSearch = !searchTerm || 
      connection.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
      connection.process_info?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      connection.port.toString().includes(searchTerm);
    
    return matchesSearch;
  });

  const sortedConnections = [...filteredConnections].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'host':
        aValue = a.host;
        bValue = b.host;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'latency':
        aValue = a.latency;
        bValue = b.latency;
        break;
      default:
        aValue = a.host;
        bValue = b.host;
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const totalItems = sortedConnections.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedConnections = sortedConnections.slice(startIndex, startIndex + itemsPerPage);

  // Get connection status info
  const getConnectionStatusInfo = () => {
    if (connected) {
      return { status: 'Connected', className: 'text-green-600', icon: '●' };
    } else if (connectionAttempts > 0 && connectionAttempts < maxRetries) {
      return { 
        status: `Reconnecting (${connectionAttempts}/${maxRetries})`, 
        className: 'text-yellow-600', 
        icon: '◌' 
      };
    } else if (connectionAttempts >= maxRetries) {
      return { status: 'Connection Failed', className: 'text-red-600', icon: '●' };
    } else {
      return { status: 'Disconnected', className: 'text-gray-600', icon: '○' };
    }
  };

  const statusInfo = getConnectionStatusInfo();

  return (
    <div className="space-y-6">
      {/* Blocked IPs ticker */}
      {blockedIPs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 overflow-hidden">
          <div className="text-xs font-medium text-red-700 mb-1">Blocked IPs</div>
          <div className="relative w-full overflow-hidden whitespace-nowrap">
            <div className="inline-block" style={{
              animation: 'byj-scroll-left 20s linear infinite',
              paddingRight: '2rem'
            }}>
              {blockedIPs.map((ip, i) => (
                <span key={`ticker-a-${ip}-${i}`} className="mx-3 px-2 py-0.5 rounded bg-red-100 text-red-800 text-sm">
                  {ip}
                </span>
              ))}
            </div>
            {/* duplicate for seamless loop */}
            <div className="inline-block" style={{
              animation: 'byj-scroll-left 20s linear infinite',
              animationDelay: '10s',
              paddingRight: '2rem'
            }}>
              {blockedIPs.map((ip, i) => (
                <span key={`ticker-b-${ip}-${i}`} className="mx-3 px-2 py-0.5 rounded bg-red-100 text-red-800 text-sm">
                  {ip}
                </span>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes byj-scroll-left {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </div>
      )}

      {/* Connection Status and Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800">Network Intelligence</h2>
            <div className="flex items-center space-x-2">
              <span className={`${statusInfo.className} text-sm font-medium`}>
                {statusInfo.icon} {statusInfo.status}
              </span>
              {error && (
                <span className="text-red-600 text-sm bg-red-50 px-2 py-1 rounded">
                  {error}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Auto-reconnect toggle */}
            <button
              onClick={() => setAutoReconnect(!autoReconnect)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                autoReconnect 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
              title={autoReconnect ? 'Disable auto-reconnect' : 'Enable auto-reconnect'}
            >
              {autoReconnect ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
              <span>{autoReconnect ? 'Auto-Reconnect On' : 'Auto-Reconnect Off'}</span>
            </button>
            
            {/* Manual refresh button */}
            <button
              onClick={handleManualRefresh}
              disabled={!connected || isRefreshing}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 rounded-md text-sm font-medium transition-colors"
              title="Manual refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            
            {/* Force Reconnect button - when auto-reconnect is disabled */}
            {(!connected && !autoReconnect) && (
              <button
                onClick={forceReconnect}
                className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
                title="Force reconnect and re-enable auto-reconnect"
              >
                <Power className="w-4 h-4" />
                <span>Force Reconnect</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Show blocked IPs section */}
      {blockedIPs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-red-800 mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Blocked IP Addresses
          </h3>
          <div className="space-y-2">
            {blockedIPs.map(ip => (
              <div key={ip} className="flex items-center justify-between bg-white p-2 rounded border">
                <span className="font-mono text-sm text-red-700">{ip}</span>
                <button
                  onClick={() => handleUnblockByIP(ip)}
                  className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                  disabled={!connected}
                >
                  <Unlock className="w-3 h-3" />
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search connections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'host' | 'status' | 'latency')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="host">Sort by Host</option>
              <option value="status">Sort by Status</option>
              <option value="latency">Sort by Latency</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Connections list */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="mt-4">
          {paginatedConnections.map((connection) => (
            <div
              key={`${connection.host}:${connection.port}`}
              className={`border-b py-3 flex justify-between items-center hover:bg-gray-50 ${((countryCount[connection.country || 'Unknown'] || 0) >= 3 || (orgCount[connection.organization || 'Unknown'] || 0) >= 3) ? 'ring-1 ring-green-400/60 bg-green-50' : ''}`}
            >
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <button
                    onClick={() => copyHost(connection.host)}
                    className="font-mono text-sm text-blue-600 hover:underline"
                    title="Click to copy IP"
                  >
                    {copied === connection.host ? 'Copied' : `${connection.host}`}
                  </button>
                  :{connection.port}
                  {connection.country && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/10 text-blue-700">
                      {connection.country}
                    </span>
                  )}
                  {connection.organization && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-600/10 text-purple-700 max-w-[12rem] truncate" title={connection.organization}>
                      {connection.organization}
                    </span>
                  )}
                  {isIPBlocked(connection.host) && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Blocked
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {connection.protocol} | {getProcessDisplay(connection)}
                </div>
                <div className="text-sm text-gray-500">
                  Sent: {formatBytes(connection.bytes_sent || 0)} | 
                  Received: {formatBytes(connection.bytes_received || 0)} | 
                  Latency: {connection.latency}ms
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  connection.status === 'SAFE' ? 'bg-green-100 text-green-800' :
                  connection.status === 'SUSPICIOUS' ? 'bg-yellow-100 text-yellow-800' :
                  connection.status === 'MALICIOUS' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {connection.status}
                </span>

                {isIPBlocked(connection.host) ? (
                  <button
                    onClick={() => handleUnblock(connection)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                    disabled={!connected}
                    title="Unblock this IP"
                  >
                    <Unlock className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleBlock(connection)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    disabled={!connected}
                    title="Block this IP"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedConnection(connection)}
                  className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm transition-colors"
                >
                  Details
                </button>
              </div>
            </div>
          ))}

          {paginatedConnections.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {connected ? 'No connections found' : 'Connect to view network connections'}
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} connections
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connection details modal */}
      {selectedConnection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Connection Details</h3>
              <button
                onClick={() => setSelectedConnection(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <DetailItem label="Host" value={selectedConnection.host} />
              <DetailItem label="Port" value={selectedConnection.port.toString()} />
              <DetailItem label="Protocol" value={selectedConnection.protocol} />
              <DetailItem label="Status" value={selectedConnection.status} />
              <DetailItem label="Process" value={getProcessDisplay(selectedConnection)} />
              <DetailItem label="Latency" value={`${selectedConnection.latency}ms`} />
              <DetailItem label="Bytes Sent" value={formatBytes(selectedConnection.bytes_sent || 0)} />
              <DetailItem label="Bytes Received" value={formatBytes(selectedConnection.bytes_received || 0)} />
              
              {selectedConnection.country && (
                <DetailItem label="Country" value={selectedConnection.country} />
              )}
              
              {selectedConnection.city && (
                <DetailItem label="City" value={selectedConnection.city} />
              )}
              
              {selectedConnection.organization && (
                <DetailItem label="Organization" value={selectedConnection.organization} />
              )}
              
              {selectedConnection.last_seen && (
                <DetailItem 
                  label="Last Seen" 
                  value={new Date(selectedConnection.last_seen).toLocaleString()} 
                />
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {isIPBlocked(selectedConnection.host) ? (
                <button
                  onClick={() => handleUnblock(selectedConnection)}
                  className="px-4 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-2 flex-1"
                  disabled={!connected}
                >
                  <Unlock className="w-4 h-4" />
                  Unblock Connection
                </button>
              ) : (
                <button
                  onClick={() => handleBlock(selectedConnection)}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors flex items-center justify-center gap-2 flex-1"
                  disabled={!connected}
                >
                  <Lock className="w-4 h-4" />
                  Block Connection
                </button>
              )}
              <button
                onClick={() => setSelectedConnection(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for detail items
const DetailItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="font-medium text-gray-700">{label}:</span>
    <span className="text-gray-900">{value}</span>
  </div>
);


