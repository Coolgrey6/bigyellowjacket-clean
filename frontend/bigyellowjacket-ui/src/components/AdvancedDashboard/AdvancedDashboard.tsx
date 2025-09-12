import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import './AdvancedDashboard.css';

interface DashboardData {
  systemMetrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  threatData: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  connectionData: Array<{
    time: string;
    connections: number;
    threats: number;
  }>;
  topThreats: Array<{
    ip: string;
    count: number;
    severity: string;
  }>;
  geoData: Array<{
    country: string;
    threats: number;
    connections: number;
  }>;
}

export const AdvancedDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    systemMetrics: { cpu: 0, memory: 0, disk: 0, network: 0 },
    threatData: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    connectionData: [],
    topThreats: [],
    geoData: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  // Generate sample data for demonstration
  useEffect(() => {
    const generateSampleData = () => {
      const now = new Date();
      const connectionData = [];
      
      // Generate last 24 hours of data
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        connectionData.push({
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          connections: Math.floor(Math.random() * 100) + 20,
          threats: Math.floor(Math.random() * 10),
          cpu: Math.floor(Math.random() * 40) + 20,
          memory: Math.floor(Math.random() * 30) + 40,
          network: Math.floor(Math.random() * 50) + 10
        });
      }

      setData({
        systemMetrics: {
          cpu: Math.floor(Math.random() * 20) + 30,
          memory: Math.floor(Math.random() * 20) + 50,
          disk: Math.floor(Math.random() * 15) + 25,
          network: Math.floor(Math.random() * 30) + 20
        },
        threatData: {
          total: Math.floor(Math.random() * 50) + 20,
          critical: Math.floor(Math.random() * 5) + 2,
          high: Math.floor(Math.random() * 8) + 5,
          medium: Math.floor(Math.random() * 15) + 10,
          low: Math.floor(Math.random() * 20) + 15
        },
        connectionData,
        topThreats: [
          { ip: '192.168.1.100', count: 45, severity: 'critical' },
          { ip: '10.0.0.50', count: 32, severity: 'high' },
          { ip: '172.16.0.25', count: 28, severity: 'medium' },
          { ip: '203.0.113.1', count: 22, severity: 'high' },
          { ip: '198.51.100.1', count: 18, severity: 'low' }
        ],
        geoData: [
          { country: 'United States', threats: 45, connections: 120 },
          { country: 'China', threats: 32, connections: 85 },
          { country: 'Russia', threats: 28, connections: 65 },
          { country: 'Germany', threats: 22, connections: 55 },
          { country: 'Brazil', threats: 18, connections: 45 }
        ]
      });
      setIsLoading(false);
    };

    generateSampleData();
    const interval = setInterval(generateSampleData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const threatColors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#28a745'
  };

  const pieColors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745'];

  if (isLoading) {
    return (
      <div className="advanced-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading advanced dashboard...</p>
      </div>
    );
  }

  return (
    <div className="advanced-dashboard">
      <div className="dashboard-header">
        <h1>Advanced Security Dashboard</h1>
        <div className="time-range-selector">
          <button 
            className={selectedTimeRange === '1h' ? 'active' : ''}
            onClick={() => setSelectedTimeRange('1h')}
          >
            1 Hour
          </button>
          <button 
            className={selectedTimeRange === '24h' ? 'active' : ''}
            onClick={() => setSelectedTimeRange('24h')}
          >
            24 Hours
          </button>
          <button 
            className={selectedTimeRange === '7d' ? 'active' : ''}
            onClick={() => setSelectedTimeRange('7d')}
          >
            7 Days
          </button>
        </div>
      </div>

      {/* System Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon cpu">💻</div>
          <div className="metric-content">
            <h3>CPU Usage</h3>
            <div className="metric-value">{data.systemMetrics.cpu}%</div>
            <div className="metric-trend positive">+2.5%</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon memory">🧠</div>
          <div className="metric-content">
            <h3>Memory Usage</h3>
            <div className="metric-value">{data.systemMetrics.memory}%</div>
            <div className="metric-trend negative">-1.2%</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon disk">💾</div>
          <div className="metric-content">
            <h3>Disk Usage</h3>
            <div className="metric-value">{data.systemMetrics.disk}%</div>
            <div className="metric-trend stable">0.0%</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon network">🌐</div>
          <div className="metric-content">
            <h3>Network I/O</h3>
            <div className="metric-value">{data.systemMetrics.network}%</div>
            <div className="metric-trend positive">+5.1%</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Real-time Connections Chart */}
        <div className="chart-container">
          <h3>Real-time Connections & Threats</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.connectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="connections" stackId="1" stroke="#8884d8" fill="#8884d8" />
              <Area type="monotone" dataKey="threats" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Threat Distribution Pie Chart */}
        <div className="chart-container">
          <h3>Threat Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Critical', value: data.threatData.critical, color: threatColors.critical },
                  { name: 'High', value: data.threatData.high, color: threatColors.high },
                  { name: 'Medium', value: data.threatData.medium, color: threatColors.medium },
                  { name: 'Low', value: data.threatData.low, color: threatColors.low }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[0, 1, 2, 3].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Threat IPs */}
        <div className="chart-container">
          <h3>Top Threat IPs</h3>
          <div className="threat-list">
            {data.topThreats.map((threat, index) => (
              <div key={threat.ip} className="threat-item">
                <div className="threat-rank">#{index + 1}</div>
                <div className="threat-ip">{threat.ip}</div>
                <div className="threat-count">{threat.count} attacks</div>
                <div className={`threat-severity ${threat.severity}`}>
                  {threat.severity.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="chart-container">
          <h3>Geographic Threat Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.geoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="country" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="threats" fill="#dc3545" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Real-time Alerts */}
      <div className="alerts-section">
        <h3>Real-time Security Alerts</h3>
        <div className="alerts-grid">
          <div className="alert-card critical">
            <div className="alert-icon">🚨</div>
            <div className="alert-content">
              <h4>Critical Threat Detected</h4>
              <p>SQL injection attempt from 192.168.1.100</p>
              <span className="alert-time">2 minutes ago</span>
            </div>
          </div>
          <div className="alert-card high">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <h4>Port Scanning Detected</h4>
              <p>Multiple port scans from 10.0.0.50</p>
              <span className="alert-time">5 minutes ago</span>
            </div>
          </div>
          <div className="alert-card medium">
            <div className="alert-icon">🔍</div>
            <div className="alert-content">
              <h4>Suspicious Activity</h4>
              <p>Unusual connection pattern from 172.16.0.25</p>
              <span className="alert-time">12 minutes ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="system-status">
        <h3>System Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">WebSocket Connection</span>
            <span className="status-indicator online">Online</span>
          </div>
          <div className="status-item">
            <span className="status-label">Threat Detection</span>
            <span className="status-indicator online">Active</span>
          </div>
          <div className="status-item">
            <span className="status-label">Database</span>
            <span className="status-indicator online">Connected</span>
          </div>
          <div className="status-item">
            <span className="status-label">Firewall</span>
            <span className="status-indicator online">Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
