// src/components/Dashboard/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { Shield, Activity, Globe, Cpu, Lock, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { useWebSocket } from '../../hooks/useWebSocket';
import { formatBytes } from '../../utils/formatBytes';
import AlertCard from './AlertCard';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
}

export const Dashboard: React.FC = () => {
  const { connected, metrics, connections, alerts, loginAttemptHistory } = useWebSocket();
  const [chartData, setChartData] = useState<Array<{
    time: string;
    cpu: number;
    memory: number;
    network: number;
    connections: number;
  }>>([]);

  // Update chart data with real-time metrics
  useEffect(() => {
    if (metrics?.system) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      setChartData(prev => {
        const newData = {
          time: timeStr,
          cpu: metrics.system.cpu?.percent || 0,
          memory: metrics.system.memory?.percent || 0,
          network: ((metrics.system.network?.bytes_recv || 0) + (metrics.system.network?.bytes_sent || 0)) / 1024 / 1024, // MB
          connections: connections?.length || 0
        };
        
        // Keep only last 20 data points for performance
        const updated = [...prev, newData].slice(-20);
        return updated;
      });
    }
  }, [metrics, connections]);

  // Calculate trends (mock for now, could be calculated from historical data)
  const getTrend = (current: number, baseline: number = 0) => {
    const diff = current - baseline;
    const percentage = baseline ? (diff / baseline) * 100 : 0;
    return {
      value: `${percentage >= 0 ? '+' : ''}${(percentage || 0).toFixed(1)}%`,
      up: percentage >= 0
    };
  };

  // Safely access metrics with default values
  const cpuPercent = metrics?.system?.cpu?.percent ?? 0;
  const networkBytesRecv = metrics?.system?.network?.bytes_recv ?? 0;
  const networkBytesSent = metrics?.system?.network?.bytes_sent ?? 0;
  const bytesMonitored = metrics?.traffic?.bytes_monitored ?? 0;
  
  // Calculate network load
  const networkLoad = (networkBytesRecv + networkBytesSent) / 1024 / 1024; // MB
  const totalTraffic = formatBytes(bytesMonitored);
  const activeConnections = connections?.length ?? 0;
  const [loginTrend, setLoginTrend] = useState<Array<{ time: string; success: number; failed: number }>>([]);

  // Fetch login stats periodically
  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/auth/login-stats');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data?.buckets)) {
          setLoginTrend(data.buckets);
        }
      } catch {}
    };
    fetchStats();
    const id = setInterval(fetchStats, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">System Overview</h2>
        <div className="flex items-center space-x-2 text-sm">
          <span className={connected ? "text-green-500" : "text-red-500"}>●</span>
          <span>{connected ? "Monitoring Active" : "Disconnected"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Shield className="w-8 h-8 text-green-500" />}
          title="Active Connections"
          value={activeConnections.toString()}
          trend={getTrend(activeConnections).value}
          trendUp={getTrend(activeConnections).up}
        />
        <MetricCard
          icon={<Activity className="w-8 h-8 text-blue-500" />}
          title="Network Load"
          value={`${networkLoad.toFixed(2)} MB`}
          trend={getTrend(networkLoad).value}
          trendUp={getTrend(networkLoad).up}
        />
        <MetricCard
          icon={<Globe className="w-8 h-8 text-purple-500" />}
          title="Total Traffic"
          value={totalTraffic}
          trend={getTrend(bytesMonitored).value}
          trendUp={getTrend(bytesMonitored).up}
        />
        <MetricCard
          icon={<Cpu className="w-8 h-8 text-orange-500" />}
          title="System Load"
          value={`${cpuPercent.toFixed(1)}%`}
          trend={getTrend(cpuPercent).value}
          trendUp={getTrend(cpuPercent).up}
        />
      </div>

      {/* Login Attempts and Threat Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-700" />
            Login Activity
          </h3>
          <span className="text-xs text-gray-500">Last {Math.min(loginAttemptHistory?.length || 0, 10)} attempts</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-gray-50 rounded">
            <div className="text-xs text-gray-500">Total Attempts</div>
            <div className="text-lg font-semibold">{loginAttemptHistory?.length || 0}</div>
          </div>
          <div className="p-3 bg-green-50 rounded">
            <div className="text-xs text-gray-600">Successful</div>
            <div className="text-lg font-semibold text-green-700">{(loginAttemptHistory || []).filter(a => a.success).length}</div>
          </div>
          <div className="p-3 bg-red-50 rounded">
            <div className="text-xs text-gray-600">Failed</div>
            <div className="text-lg font-semibold text-red-700">{(loginAttemptHistory || []).filter(a => !a.success).length}</div>
          </div>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(loginAttemptHistory || []).slice(0, 10).map((a, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="text-sm text-gray-800">{a.username || 'unknown'}</div>
              <div className={`text-xs font-medium ${a.success ? 'text-green-700' : 'text-red-700'}`}>{a.success ? 'SUCCESS' : 'FAILED'}</div>
              <div className="text-xs text-gray-500">{new Date(a.timestamp).toLocaleString()}</div>
            </div>
          ))}
          {(!loginAttemptHistory || loginAttemptHistory.length === 0) && (
            <div className="text-center py-6 text-sm text-gray-500">No login activity recorded</div>
          )}
        </div>
        <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          {(loginAttemptHistory || []).filter(a => !a.success).length > 5 ? 'Elevated failed-login activity detected' : 'Login activity within normal range'}
        </div>
      </div>

      {/* Firewall Status Section */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Firewall Protection</h3>
              <p className="text-sm text-red-600">Advanced threat blocking and network security</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              🔥 Active
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">0</div>
            <div className="text-sm text-red-600">Blocked IPs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">Active</div>
            <div className="text-sm text-green-600">Real-time Monitoring</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">Auto</div>
            <div className="text-sm text-orange-600">Threat Detection</div>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <a 
            href="/firewall" 
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            🔥 Open Firewall Dashboard
          </a>
        </div>
      </div>

      {/* Real-time Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU and Memory Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            System Performance
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cpu" stroke="#3B82F6" strokeWidth={2} name="CPU %" />
              <Line type="monotone" dataKey="memory" stroke="#10B981" strokeWidth={2} name="Memory %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Network Activity Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            Network Activity
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="network" stroke="#8B5CF6" fill="#8B5CF6" name="Network (MB)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Login Attempt Trend */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-700" />
          Failed Login Attempts (Last 60m)
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={loginTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(t) => new Date(t as string).toLocaleTimeString()} />
            <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} name="Failed" />
            <Line type="monotone" dataKey="success" stroke="#10B981" strokeWidth={2} name="Success" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Connections and Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AlertCard alerts={alerts || []} />
        <ConnectionsCard connections={connections || []} />
        <SystemStatusCard metrics={metrics} />
      </div>
    </div>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, trend, trendUp }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
        <div className={`mt-2 text-sm flex items-center gap-1 ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
          {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{trend} from last hour</span>
        </div>
      </div>
      <div className="p-2 bg-gray-50 rounded-lg">
        {icon}
      </div>
    </div>
  </div>
);

const ConnectionsCard = ({ connections }: { connections: any[] }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <h3 className="font-medium mb-4 flex items-center gap-2">
      <Globe className="w-5 h-5 text-blue-500" />
      Active Connections ({connections?.length || 0})
    </h3>
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {connections?.slice(0, 5).map((conn, index) => (
        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">{conn.host}:{conn.port}</div>
            <div className="text-xs text-gray-500">{conn.protocol} • {conn.process || 'Unknown'}</div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            conn.status === 'ESTABLISHED' ? 'bg-green-100 text-green-800' :
            conn.status === 'SUSPICIOUS' ? 'bg-yellow-100 text-yellow-800' :
            conn.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {conn.status}
          </span>
        </div>
      ))}
      {(!connections || connections.length === 0) && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">🔌</div>
          <div className="text-gray-500 text-sm">No active connections</div>
        </div>
      )}
    </div>
  </div>
);

const SystemStatusCard = ({ metrics }: { metrics: any }) => {
  const cpuPercent = metrics?.system?.cpu?.percent ?? 0;
  const memoryPercent = metrics?.system?.memory?.percent ?? 0;
  const diskPercent = metrics?.system?.disk?.percent ?? 0;
  
  const getStatusColor = (percent: number) => {
    if (percent > 80) return 'text-red-500';
    if (percent > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <h3 className="font-medium mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-green-500" />
        System Status
      </h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">CPU Usage</span>
            <span className={`font-medium ${getStatusColor(cpuPercent)}`}>
              {cpuPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                cpuPercent > 80 ? 'bg-red-500' : 
                cpuPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(cpuPercent, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Memory Usage</span>
            <span className={`font-medium ${getStatusColor(memoryPercent)}`}>
              {memoryPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                memoryPercent > 80 ? 'bg-red-500' : 
                memoryPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(memoryPercent, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Disk Usage</span>
            <span className={`font-medium ${getStatusColor(diskPercent)}`}>
              {diskPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                diskPercent > 80 ? 'bg-red-500' : 
                diskPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(diskPercent, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Network In</span>
            <span>{formatBytes(metrics?.system?.network?.bytes_recv ?? 0)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Network Out</span>
            <span>{formatBytes(metrics?.system?.network?.bytes_sent ?? 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};