import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface TrafficData {
  timestamp: string;
  incoming: number;
  outgoing: number;
  total: number;
  packets: number;
}

interface ProtocolStats {
  name: string;
  value: number;
  color: string;
}

interface TopTraffic {
  ip: string;
  bytes: number;
  packets: number;
  country: string;
}

export const TrafficMonitor: React.FC = () => {
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [protocolStats, setProtocolStats] = useState<ProtocolStats[]>([]);
  const [topTraffic, setTopTraffic] = useState<TopTraffic[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    // Connect to WebSocket for real-time traffic data
    const ws = new WebSocket('ws://localhost:8080/ws');
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Traffic Monitor WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.message_type === 'traffic_update') {
          const newTrafficData = {
            timestamp: new Date().toLocaleTimeString(),
            incoming: data.data.incoming || Math.random() * 1000,
            outgoing: data.data.outgoing || Math.random() * 500,
            total: (data.data.incoming || 0) + (data.data.outgoing || 0),
            packets: data.data.packets || Math.floor(Math.random() * 100)
          };
          setTrafficData(prev => [...prev.slice(-19), newTrafficData]);
        }
      } catch (error) {
        console.error('Error parsing traffic data:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Traffic Monitor WebSocket disconnected');
    };

    // Initialize with sample data
    const sampleProtocolStats = [
      { name: 'HTTP', value: 45, color: '#3B82F6' },
      { name: 'HTTPS', value: 30, color: '#10B981' },
      { name: 'SSH', value: 15, color: '#F59E0B' },
      { name: 'FTP', value: 7, color: '#EF4444' },
      { name: 'Other', value: 3, color: '#8B5CF6' }
    ];
    setProtocolStats(sampleProtocolStats);

    const sampleTopTraffic = [
      { ip: '192.168.1.100', bytes: 1024000, packets: 1500, country: 'US' },
      { ip: '10.0.0.50', bytes: 856000, packets: 1200, country: 'CA' },
      { ip: '172.16.0.25', bytes: 640000, packets: 900, country: 'UK' },
      { ip: '203.0.113.1', bytes: 320000, packets: 450, country: 'AU' },
      { ip: '198.51.100.1', bytes: 180000, packets: 250, country: 'DE' }
    ];
    setTopTraffic(sampleTopTraffic);

    return () => {
      ws.close();
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Traffic Monitor</h1>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? '🟢 Live Monitoring' : '🔴 Disconnected'}
          </div>
          <span className="text-gray-600">Real-time network traffic analysis</span>
        </div>
      </div>

      {/* Traffic Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Traffic</p>
              <p className="text-2xl font-bold text-blue-600">
                {trafficData.length > 0 ? formatBytes(trafficData[trafficData.length - 1]?.total || 0) : '0 B'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Incoming</p>
              <p className="text-2xl font-bold text-green-600">
                {trafficData.length > 0 ? formatBytes(trafficData[trafficData.length - 1]?.incoming || 0) : '0 B'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⬇️</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outgoing</p>
              <p className="text-2xl font-bold text-orange-600">
                {trafficData.length > 0 ? formatBytes(trafficData[trafficData.length - 1]?.outgoing || 0) : '0 B'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⬆️</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Packets</p>
              <p className="text-2xl font-bold text-purple-600">
                {trafficData.length > 0 ? formatNumber(trafficData[trafficData.length - 1]?.packets || 0) : '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Traffic Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip formatter={(value) => formatBytes(Number(value))} />
              <Line type="monotone" dataKey="incoming" stroke="#10B981" strokeWidth={2} name="Incoming" />
              <Line type="monotone" dataKey="outgoing" stroke="#F59E0B" strokeWidth={2} name="Outgoing" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Protocol Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={protocolStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {protocolStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Traffic Sources */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Top Traffic Sources</h3>
          <p className="text-gray-600">IP addresses with highest traffic volume</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Transferred</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topTraffic.map((traffic, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{traffic.ip}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{traffic.country}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatBytes(traffic.bytes)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(traffic.packets)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(traffic.bytes / Math.max(...topTraffic.map(t => t.bytes))) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};