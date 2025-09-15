import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, XAxis as ScatterXAxis, YAxis as ScatterYAxis } from 'recharts';

interface ThreatData {
  timestamp: string;
  threats: number;
  blocked: number;
  allowed: number;
  risk_score: number;
}

interface GeoThreat {
  country: string;
  threats: number;
  blocked: number;
  coordinates: [number, number];
}

interface ThreatPattern {
  type: string;
  count: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  trend: 'up' | 'down' | 'stable';
}

interface NetworkInsight {
  type: 'anomaly' | 'threat' | 'performance' | 'security';
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  timestamp: string;
}

export const NetworkIntelligence: React.FC = () => {
  const [threatData, setThreatData] = useState<ThreatData[]>([]);
  const [geoThreats, setGeoThreats] = useState<GeoThreat[]>([]);
  const [threatPatterns, setThreatPatterns] = useState<ThreatPattern[]>([]);
  const [insights, setInsights] = useState<NetworkInsight[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket for real-time intelligence data
    const ws = new WebSocket('ws://localhost:8766');
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Network Intelligence WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.message_type === 'intelligence_update') {
          const newThreatData = {
            timestamp: new Date().toLocaleTimeString(),
            threats: data.data.threats || Math.floor(Math.random() * 10),
            blocked: data.data.blocked || Math.floor(Math.random() * 8),
            allowed: data.data.allowed || Math.floor(Math.random() * 2),
            risk_score: data.data.risk_score || Math.floor(Math.random() * 100)
          };
          setThreatData(prev => [...prev.slice(-19), newThreatData]);
        }
      } catch (error) {
        console.error('Error parsing intelligence data:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Network Intelligence WebSocket disconnected');
    };

    // Initialize with sample data
    const sampleGeoThreats = [
      { country: 'United States', threats: 45, blocked: 40, coordinates: [-95.7129, 37.0902] },
      { country: 'China', threats: 32, blocked: 28, coordinates: [104.1954, 35.8617] },
      { country: 'Russia', threats: 28, blocked: 25, coordinates: [105.3188, 61.5240] },
      { country: 'Germany', threats: 15, blocked: 12, coordinates: [10.4515, 51.1657] },
      { country: 'Brazil', threats: 12, blocked: 10, coordinates: [-51.9253, -14.2350] },
      { country: 'India', threats: 18, blocked: 15, coordinates: [78.9629, 20.5937] }
    ];
    setGeoThreats(sampleGeoThreats);

    const sampleThreatPatterns = [
      { type: 'SQL Injection', count: 25, severity: 'High', trend: 'up' },
      { type: 'XSS Attack', count: 18, severity: 'Medium', trend: 'down' },
      { type: 'DDoS', count: 12, severity: 'Critical', trend: 'up' },
      { type: 'Port Scan', count: 35, severity: 'Low', trend: 'stable' },
      { type: 'Brute Force', count: 8, severity: 'Medium', trend: 'down' },
      { type: 'Malware', count: 15, severity: 'High', trend: 'up' }
    ];
    setThreatPatterns(sampleThreatPatterns);

    const sampleInsights = [
      {
        type: 'threat',
        title: 'Suspicious Activity Detected',
        description: 'Multiple failed login attempts from IP 192.168.1.100',
        severity: 'High',
        timestamp: new Date().toLocaleTimeString()
      },
      {
        type: 'anomaly',
        title: 'Unusual Traffic Pattern',
        description: 'Traffic spike detected from European region',
        severity: 'Medium',
        timestamp: new Date(Date.now() - 300000).toLocaleTimeString()
      },
      {
        type: 'security',
        title: 'Firewall Rule Updated',
        description: 'New blocking rule applied for malicious IP range',
        severity: 'Low',
        timestamp: new Date(Date.now() - 600000).toLocaleTimeString()
      }
    ];
    setInsights(sampleInsights);

    return () => {
      ws.close();
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-100';
      case 'High': return 'text-orange-600 bg-orange-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Network Intelligence</h1>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? '🟢 AI Analysis Active' : '🔴 Disconnected'}
          </div>
          <span className="text-gray-600">Advanced threat intelligence and behavioral analysis</span>
        </div>
      </div>

      {/* Intelligence Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Threats</p>
              <p className="text-2xl font-bold text-red-600">
                {threatData.length > 0 ? threatData[threatData.length - 1]?.threats || 0 : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Blocked</p>
              <p className="text-2xl font-bold text-green-600">
                {threatData.length > 0 ? threatData[threatData.length - 1]?.blocked || 0 : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🛡️</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Risk Score</p>
              <p className="text-2xl font-bold text-yellow-600">
                {threatData.length > 0 ? threatData[threatData.length - 1]?.risk_score || 0 : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Countries</p>
              <p className="text-2xl font-bold text-blue-600">{geoThreats.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🌍</span>
            </div>
          </div>
        </div>
      </div>

      {/* Threat Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Threat Activity Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={threatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="threats" stroke="#EF4444" strokeWidth={2} name="Threats" />
              <Line type="monotone" dataKey="blocked" stroke="#10B981" strokeWidth={2} name="Blocked" />
              <Line type="monotone" dataKey="risk_score" stroke="#F59E0B" strokeWidth={2} name="Risk Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Threat Patterns by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={threatPatterns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Geographic Threat Map */}
      <div className="bg-white rounded-lg shadow-sm border mb-8">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Geographic Threat Distribution</h3>
          <p className="text-gray-600">Threats detected by country and region</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {geoThreats.map((geo, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{geo.country}</h4>
                  <span className="text-sm text-gray-500">{geo.coordinates[0]}, {geo.coordinates[1]}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Threats:</span>
                    <span className="font-medium text-red-600">{geo.threats}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Blocked:</span>
                    <span className="font-medium text-green-600">{geo.blocked}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(geo.threats / Math.max(...geoThreats.map(g => g.threats))) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Threat Patterns and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Threat Patterns</h3>
            <p className="text-gray-600">Current attack patterns and trends</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {threatPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getTrendIcon(pattern.trend)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{pattern.type}</p>
                      <p className="text-sm text-gray-500">{pattern.count} occurrences</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(pattern.severity)}`}>
                    {pattern.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">AI Insights</h3>
            <p className="text-gray-600">Real-time intelligence and recommendations</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(insight.severity)}`}>
                      {insight.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                  <p className="text-xs text-gray-400">{insight.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};