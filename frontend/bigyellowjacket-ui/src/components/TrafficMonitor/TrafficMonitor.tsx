import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket, useWebSocketStore } from '../../hooks/useWebSocket';

interface Connection {
  id: string;
  ip: string;
  port: number;
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING' | 'DISCONNECTED';
  process?: string;
  type?: string;
  latency?: number;
  timestamp: string;
  country?: string;
  city?: string;
}

interface TrafficEvent {
  id: string;
  type: 'CONNECT' | 'DISCONNECT' | 'THREAT' | 'ALERT';
  ip: string;
  port?: number;
  message: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  fadeOut?: boolean;
}

export const TrafficMonitor: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  // Internal simulation state (currently unused in UI)
  const { connected, send } = useWebSocket();
  const blockedIPs = useWebSocketStore((state) => state.blockedIPs);
  const liveConnections = useWebSocketStore((state) => state.connections);
  const blockedListRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [patternThreshold, setPatternThreshold] = useState<number>(3);
  const [showAllPatterns, setShowAllPatterns] = useState<boolean>(false);
  const [showAllCountries, setShowAllCountries] = useState<boolean>(true);
  const [neutralLabels, setNeutralLabels] = useState<boolean>(true);
  const [hideCountryLabels, setHideCountryLabels] = useState<boolean>(false);

  // Pattern maps for quick highlighting
  const countryCount: Record<string, number> = {} as any;
  const orgCount: Record<string, number> = {} as any;
  liveConnections.forEach((c: any) => {
    const country = c?.country || 'Unknown';
    const org = c?.organization || c?.organization_name || 'Unknown';
    countryCount[country] = (countryCount[country] || 0) + 1;
    orgCount[org] = (orgCount[org] || 0) + 1;
  });

  // Auto-scroll the blocked IPs list vertically
  useEffect(() => {
    const el = blockedListRef.current;
    if (!el || blockedIPs.length === 0 || paused) return;

    let rafId: number | null = null;
    let stopped = false;
    const step = () => {
      if (stopped) return;
      if (el.scrollHeight <= el.clientHeight) {
        // Nothing to scroll
        return;
      }
      el.scrollTop += 1;
      // loop when reaching bottom
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        el.scrollTop = 0;
      }
      rafId = window.requestAnimationFrame(step);
    };
    // gentle start
    rafId = window.requestAnimationFrame(step);
    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [blockedIPs.length, paused]);

  const getMetaForIp = (ip: string) => {
    const match = liveConnections.find((c: any) => c.host === ip);
    return {
      country: match?.country || 'Unknown',
      org: match?.organization || match?.organization_name || 'Unknown',
    };
  };

  const handleCopy = async (ip: string) => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 1200);
    } catch (e) {
      // ignore
    }
  };

  const handleUnblockByIP = (host: string) => {
    if (!connected) return;
    send({ command: 'unblock_ip', params: { host } });
  };

  // Log event before removal
  const logEvent = (event: TrafficEvent) => {
    console.log(`[TRAFFIC EVENT] ${event.type} - ${event.message} (${event.severity}) - ${event.timestamp}`);
    // You could also send to a logging service here
  };

  // Fade out and remove events after 5 seconds
  useEffect(() => {
    if (events.length === 0) return;

    const fadeOutTimer = setTimeout(() => {
      setEvents(prev => {
        // Find the oldest event and log it before marking for fade-out
        const oldestEvent = prev[prev.length - 1];
        if (oldestEvent) {
          logEvent(oldestEvent);
        }

        // Mark the oldest event for fade-out
        const updatedEvents = prev.map((event, index) => {
          if (index === prev.length - 1) { // Oldest event (last in array)
            return { ...event, fadeOut: true };
          }
          return event;
        });
        return updatedEvents;
      });

      // Remove the faded event after animation completes
      setTimeout(() => {
        setEvents(prev => prev.filter(event => !event.fadeOut));
      }, 1000); // Wait 1 second for fade animation
    }, 5000);

    return () => clearTimeout(fadeOutTimer);
  }, [events.length]);

  // Simulate real-time connection monitoring
  useEffect(() => {
    if (!connected) return;

    const commonIPs = [
      '142.250.189.238', '172.217.12.98', '104.18.19.125', '52.87.106.55',
      '44.219.138.89', '13.217.237.122', '3.229.216.80', '17.57.155.39',
      '193.34.76.44', '162.159.140.229', '99.83.165.34', '142.250.189.194'
    ];

    const commonPorts = [443, 80, 22, 21, 25, 53, 993, 995, 5223, 7443];
    const processes = ['nginx', 'apache', 'ssh', 'mysql', 'redis', 'postgres', 'docker'];
    const types = ['HTTPS', 'HTTP', 'SSH', 'FTP', 'SMTP', 'DNS', 'IMAPS', 'POP3S', 'XMPP', 'HTTPS'];
    const countries = ['United States', 'Germany', 'United Kingdom', 'Canada', 'Netherlands', 'Ireland'];
    const cities = ['San Francisco', 'New York', 'London', 'Frankfurt', 'Amsterdam', 'Dublin'];

    let connectionId = 1;
    let eventId = 1;

    const generateConnection = (): Connection => {
      const ip = commonIPs[Math.floor(Math.random() * commonIPs.length)];
      const port = commonPorts[Math.floor(Math.random() * commonPorts.length)];
      const process = processes[Math.floor(Math.random() * processes.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const country = countries[Math.floor(Math.random() * countries.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];

      return {
        id: `conn_${connectionId++}`,
        ip,
        port,
        status: 'CONNECTED',
        process,
        type,
        latency: Math.floor(Math.random() * 500) + 50,
        timestamp: new Date().toISOString(),
        country,
        city
      };
    };

    const generateEvent = (type: TrafficEvent['type'], connection?: Connection): TrafficEvent => {
      const ip = connection?.ip || commonIPs[Math.floor(Math.random() * commonIPs.length)];
      const port = connection?.port || commonPorts[Math.floor(Math.random() * commonPorts.length)];
      
      const messages = {
        CONNECT: `New connection established from ${ip}:${port}`,
        DISCONNECT: `Connection terminated from ${ip}:${port}`,
        THREAT: `Threat detected from ${ip}: Suspicious activity`,
        ALERT: `Security alert: Unusual traffic pattern from ${ip}`
      };

      const severities: TrafficEvent['severity'][] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const severity = severities[Math.floor(Math.random() * severities.length)];

      return {
        id: `event_${eventId++}`,
        type,
        ip,
        port,
        message: messages[type],
        timestamp: new Date().toISOString(),
        severity
      };
    };

    const interval = setInterval(() => {
      const action = Math.random();
      
      if (action < 0.3 && connections.length < 15) {
        // New connection
        const newConnection = generateConnection();
        setConnections(prev => [...prev, newConnection]);
        setEvents(prev => [...prev.slice(-49), generateEvent('CONNECT', newConnection)]);
      } else if (action < 0.5 && connections.length > 5) {
        // Disconnect random connection
        const randomIndex = Math.floor(Math.random() * connections.length);
        const connection = connections[randomIndex];
        setConnections(prev => prev.filter((_, index) => index !== randomIndex));
        setEvents(prev => [...prev.slice(-49), generateEvent('DISCONNECT', connection)]);
      } else if (action < 0.7) {
        // Threat detection
        const connection = connections[Math.floor(Math.random() * connections.length)];
        if (connection) {
          setEvents(prev => [...prev.slice(-49), generateEvent('THREAT', connection)]);
        }
      } else {
        // Random alert
        const connection = connections[Math.floor(Math.random() * connections.length)];
        if (connection) {
          setEvents(prev => [...prev.slice(-49), generateEvent('ALERT', connection)]);
        }
      }
    }, 3000 + Math.random() * 2000); // 3-5 seconds

    return () => clearInterval(interval);
  }, [connected, connections]);

  const getStatusColor = (status: Connection['status']) => {
    switch (status) {
      case 'CONNECTED': return 'text-green-500 bg-green-50';
      case 'CONNECTING': return 'text-yellow-500 bg-yellow-50';
      case 'DISCONNECTING': return 'text-orange-500 bg-orange-50';
      case 'DISCONNECTED': return 'text-red-500 bg-red-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: TrafficEvent['severity']) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100 border-red-300';
      case 'HIGH': return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'LOW': return 'text-blue-600 bg-blue-100 border-blue-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getEventIcon = (type: TrafficEvent['type']) => {
    switch (type) {
      case 'CONNECT': return '🔗';
      case 'DISCONNECT': return '🔌';
      case 'THREAT': return '⚠️';
      case 'ALERT': return '🚨';
      default: return '📡';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            Live Traffic Monitor
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Active Connections: {connections.length}</span>
              <span className="text-sm">Events: {events.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">{connected ? 'Monitoring' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
        {neutralLabels && (
          <div className="mt-2 text-[11px] text-gray-400">
            Security monitoring is geopolitically neutral. Country information reflects IP geolocation only.
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{neutralLabels ? 'Sources (Blocked IPs)' : 'Threat Actors (Blocked IPs)'}</h3>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={highlightEnabled}
                onChange={(e) => setHighlightEnabled(e.target.checked)}
              />
              Highlight patterns
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={neutralLabels}
                onChange={(e) => setNeutralLabels(e.target.checked)}
              />
              Neutral labels
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={hideCountryLabels}
                onChange={(e) => setHideCountryLabels(e.target.checked)}
              />
              Hide country labels
            </label>
            <label className="flex items-center gap-1">
              Threshold
              <input
                type="number"
                min={1}
                value={patternThreshold}
                onChange={(e) => setPatternThreshold(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 bg-gray-900 border border-gray-700 rounded px-2 py-0.5"
              />
            </label>
            <button
              onClick={() => {
                const topCountries = Object.entries(countryCount)
                  .filter(([k,v]) => (showAllCountries ? (v as number) >= 1 : (v as number) >= patternThreshold) && k !== 'Unknown')
                  .sort((a,b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 200)
                  .map(([k,v]) => ({ country: k, count: v as number }));
                const topOrgs = Object.entries(orgCount)
                  .filter(([k,v]) => (v as number) >= patternThreshold && k !== 'Unknown')
                  .sort((a,b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 200)
                  .map(([k,v]) => ({ org: k, count: v as number }));
                const data = { generatedAt: new Date().toISOString(), threshold: patternThreshold, topCountries, topOrgs };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'byj_patterns.json'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-2 py-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/30"
            >
              Export patterns
            </button>
            <button
              onClick={() => setShowAllPatterns(v => !v)}
              className="px-2 py-1 rounded bg-gray-700/40 text-gray-300 hover:bg-gray-700/60"
              title={showAllPatterns ? 'Show top patterns only' : 'Show all patterns'}
            >
              {showAllPatterns ? 'Show top 5' : 'Show all'}
            </button>
            <button
              onClick={() => setShowAllCountries(v => !v)}
              className="px-2 py-1 rounded bg-gray-700/40 text-gray-300 hover:bg-gray-700/60"
              title={showAllCountries ? 'Apply threshold to countries' : 'Ignore threshold for countries'}
            >
              {showAllCountries ? 'Countries: threshold' : 'Countries: all'}
            </button>
          </div>
        </div>
        {/* Pattern summary */}
        <div className="text-xs text-gray-400 mb-2 flex flex-wrap gap-2">
          {!hideCountryLabels && Object.entries(countryCount)
            .filter(([k,v]) => (showAllCountries ? (v as number) >= 1 : (v as number) >= patternThreshold) && k !== 'Unknown')
            .sort((a,b) => (b[1] as number) - (a[1] as number))
            .slice(0, showAllPatterns ? 200 : 5)
            .map(([k,v]) => (
              <span key={`cty-${k}`} className="px-2 py-0.5 rounded bg-green-700/20 text-green-300" title={`${neutralLabels ? 'Country count' : 'Country pattern'}: ${v} occurrences`}>
                {k}: {v as number}
              </span>
            ))}
          {Object.entries(orgCount)
            .filter(([k,v]) => (v as number) >= patternThreshold && k !== 'Unknown')
            .sort((a,b) => (b[1] as number) - (a[1] as number))
            .slice(0, showAllPatterns ? 200 : 5)
            .map(([k,v]) => (
              <span key={`org-${k}`} className="px-2 py-0.5 rounded bg-green-700/20 text-green-300" title={`Org pattern: ${v} occurrences`}>
                {k}: {v as number}
              </span>
            ))}
        </div>
        {blockedIPs.length === 0 ? (
          <div className="text-gray-400 text-sm">No blocked IPs yet.</div>
        ) : (
          <div
            ref={blockedListRef}
            className="max-h-48 overflow-y-auto rounded border border-gray-700"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {blockedIPs.map((ip) => {
              const meta = getMetaForIp(ip);
              const isPattern = highlightEnabled && ((countryCount[meta.country] || 0) >= patternThreshold || (orgCount[meta.org] || 0) >= patternThreshold);
              return (
                <div key={ip} className={`flex items-center justify-between px-3 py-2 border-b border-gray-700 last:border-b-0 bg-gray-850 ${isPattern ? 'ring-1 ring-green-400/60 bg-green-900/10' : ''}`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCopy(ip)}
                      className="font-mono text-sm text-red-300 hover:text-red-200 underline-offset-2 hover:underline"
                      title="Click to copy"
                    >
                      {copiedIp === ip ? 'Copied' : ip}
                    </button>
                    <span className="text-xs text-gray-400">Status: BLOCKED</span>
                    {!hideCountryLabels && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-300">{meta.country}</span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 max-w-[12rem] truncate" title={meta.org}>{meta.org}</span>
                  </div>
                  <button
                    onClick={() => handleUnblockByIP(ip)}
                    disabled={!connected}
                    className="text-xs px-2 py-1 rounded bg-green-600/20 text-green-300 hover:bg-green-600/30 disabled:opacity-50"
                    title="Unblock IP"
                  >
                    Unblock
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 flex">
        {/* Connections Panel */}
        <div className="w-1/2 border-r border-gray-700 flex flex-col">
          <div className="bg-gray-800 p-3 border-b border-gray-700">
            <h3 className="font-semibold">Active Connections</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {connections.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No active connections
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className={`bg-gray-800 p-3 rounded border border-gray-700 hover:bg-gray-750 ${highlightEnabled && (countryCount[conn.country || 'Unknown'] || 0) >= patternThreshold ? 'ring-1 ring-green-400/60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm">{conn.ip}</span>
                        <span className="text-gray-400">:{conn.port}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(conn.status)}`}>
                        {conn.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                      <div>Process: {conn.process}</div>
                      <div>Type: {conn.type}</div>
                      <div>Latency: {conn.latency}ms</div>
                      <div>Location: {conn.city}, {conn.country}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Events Panel */}
        <div className="w-1/2 flex flex-col">
          <div className="bg-gray-800 p-3 border-b border-gray-700">
            <h3 className="font-semibold">Live Events</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No events yet
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {events.slice().reverse().map((event, index) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded border-l-4 transition-all duration-1000 ${getSeverityColor(event.severity)} ${
                      index === 0 ? 'animate-pulse' : ''
                    } ${highlightEnabled && (event.type === 'THREAT' || event.type === 'ALERT') ? 'ring-1 ring-green-400/60' : ''} ${event.fadeOut ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getEventIcon(event.type)}</span>
                        <span className="font-semibold text-sm">{neutralLabels && (event.type === 'THREAT') ? 'ALERT' : event.type}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {neutralLabels && event.type === 'THREAT' ? `Security event detected from ${event.ip}` : event.message}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      IP: {event.ip} {event.port && `Port: ${event.port}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



