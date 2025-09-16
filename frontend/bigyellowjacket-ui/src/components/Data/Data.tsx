import React, { useState, useEffect } from 'react';
import { apiService, ConnectionData, ThreatData, AlertData } from '../../services/api';
import './Data.css';

export const Data: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'connections' | 'threats' | 'alerts' | 'reports'>('connections');
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [threats, setThreats] = useState<ThreatData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [activeTab, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      switch (activeTab) {
        case 'connections':
          const connectionsResponse = await apiService.getConnections();
          if (connectionsResponse.success && connectionsResponse.data) {
            setConnections(connectionsResponse.data);
          } else {
            setError(connectionsResponse.error || 'Failed to load connections');
          }
          break;

        case 'threats':
          const threatsResponse = await apiService.getThreats();
          if (threatsResponse.success && threatsResponse.data) {
            setThreats(threatsResponse.data);
          } else {
            setError(threatsResponse.error || 'Failed to load threats');
          }
          break;

        case 'alerts':
          const alertsResponse = await apiService.getAlerts();
          if (alertsResponse.success && alertsResponse.data) {
            setAlerts(alertsResponse.data);
          } else {
            setError(alertsResponse.error || 'Failed to load alerts');
          }
          break;

        case 'reports':
          // Reports are loaded on demand
          break;
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const response = await apiService.exportReport(format);
      if (response.success) {
        // In a real implementation, this would trigger a download
        alert(`Export to ${format.toUpperCase()} initiated`);
      } else {
        setError(response.error || 'Failed to export data');
      }
    } catch (err) {
      setError('Failed to export data');
    }
  };

  const filteredConnections = connections.filter(conn =>
    conn.src_ip.includes(searchTerm) ||
    conn.dst_ip.includes(searchTerm) ||
    conn.protocol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredThreats = threats.filter(threat =>
    threat.ip.includes(searchTerm) ||
    threat.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    threat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAlerts = alerts.filter(alert =>
    alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (alert.source_ip && alert.source_ip.includes(searchTerm)) ||
    (alert.target_ip && alert.target_ip.includes(searchTerm))
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ESTABLISHED': return 'text-green-600 bg-green-100';
      case 'TIME_WAIT': return 'text-yellow-600 bg-yellow-100';
      case 'CLOSED': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const renderConnections = () => (
    <div className="data-table-container">
      <div className="data-table-header">
        <h3 className="text-lg font-semibold">Network Connections</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => exportData('json')}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportData('csv')}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Source IP</th>
              <th>Destination IP</th>
              <th>Source Port</th>
              <th>Destination Port</th>
              <th>Protocol</th>
              <th>Status</th>
              <th>Bytes Sent</th>
              <th>Bytes Received</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredConnections.map((conn, index) => (
              <tr key={index}>
                <td className="font-mono text-sm">{conn.src_ip}</td>
                <td className="font-mono text-sm">{conn.dst_ip}</td>
                <td>{conn.src_port}</td>
                <td>{conn.dst_port}</td>
                <td className="font-mono text-sm">{conn.protocol}</td>
                <td>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(conn.status)}`}>
                    {conn.status}
                  </span>
                </td>
                <td className="font-mono text-sm">{conn.bytes_sent.toLocaleString()}</td>
                <td className="font-mono text-sm">{conn.bytes_received.toLocaleString()}</td>
                <td className="text-sm text-gray-500">
                  {new Date(conn.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderThreats = () => (
    <div className="data-table-container">
      <div className="data-table-header">
        <h3 className="text-lg font-semibold">Threat Intelligence</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => exportData('json')}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportData('csv')}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>IP Address</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Description</th>
              <th>Source IP</th>
              <th>Target IP</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredThreats.map((threat, index) => (
              <tr key={index}>
                <td className="font-mono text-sm">{threat.ip}</td>
                <td className="font-mono text-sm">{threat.type}</td>
                <td>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(threat.severity)}`}>
                    {threat.severity.toUpperCase()}
                  </span>
                </td>
                <td className="max-w-xs truncate">{threat.description}</td>
                <td className="font-mono text-sm">{threat.source_ip || '-'}</td>
                <td className="font-mono text-sm">{threat.target_ip || '-'}</td>
                <td className="text-sm text-gray-500">
                  {new Date(threat.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="data-table-container">
      <div className="data-table-header">
        <h3 className="text-lg font-semibold">Security Alerts</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => exportData('json')}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportData('csv')}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Title</th>
              <th>Status</th>
              <th>Source IP</th>
              <th>Target IP</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((alert, index) => (
              <tr key={index}>
                <td className="font-mono text-sm">{alert.id}</td>
                <td className="font-mono text-sm">{alert.type}</td>
                <td>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </td>
                <td className="max-w-xs truncate">{alert.title}</td>
                <td>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}>
                    {alert.status.toUpperCase()}
                  </span>
                </td>
                <td className="font-mono text-sm">{alert.source_ip || '-'}</td>
                <td className="font-mono text-sm">{alert.target_ip || '-'}</td>
                <td className="text-sm text-gray-500">
                  {new Date(alert.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="data-table-container">
      <div className="data-table-header">
        <h3 className="text-lg font-semibold">Security Reports</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="text-lg font-semibold mb-2">Threat Report</h4>
          <p className="text-gray-600 mb-4">Comprehensive analysis of detected threats and attack patterns</p>
          <button
            onClick={() => exportData('json')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Generate Report
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="text-lg font-semibold mb-2">Security Summary</h4>
          <p className="text-gray-600 mb-4">High-level security overview and recommendations</p>
          <button
            onClick={() => exportData('json')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Generate Report
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="text-lg font-semibold mb-2">Custom Export</h4>
          <p className="text-gray-600 mb-4">Export data in your preferred format and timeframe</p>
          <div className="flex space-x-2">
            <button
              onClick={() => exportData('json')}
              className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700"
            >
              JSON
            </button>
            <button
              onClick={() => exportData('csv')}
              className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700"
            >
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="data-container">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="data-container">
      <div className="data-header">
        <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
        <p className="text-gray-600 mt-2">View, search, and export security data</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex space-x-1">
            {(['connections', 'threats', 'alerts', 'reports'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'connections' && renderConnections()}
      {activeTab === 'threats' && renderThreats()}
      {activeTab === 'alerts' && renderAlerts()}
      {activeTab === 'reports' && renderReports()}
    </div>
  );
};
