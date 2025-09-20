import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Clock, MapPin, Activity, Eye, Filter, Search, RefreshCw, Network } from 'lucide-react';
import { useWebSocket } from '../../services/websocket';
import { AttackEvent, MacAddress, MacAddressUtils } from '../../models/datatypes';
import './LiveAttackFeed.css';

export const LiveAttackFeed: React.FC = () => {
  const { connected, connections, alerts } = useWebSocket();
  const [attacks, setAttacks] = useState<AttackEvent[]>([]);
  const [filteredAttacks, setFilteredAttacks] = useState<AttackEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [attackCount, setAttackCount] = useState(0);
  const [blockedIPs, setBlockedIPs] = useState<string[]>([]);

  // Auto-block IPs showing country spoofing
  const autoBlockSpoofedIP = async (ip: string, reason: string) => {
    try {
      console.log(`🚫 Auto-blocking spoofed IP: ${ip} - Reason: ${reason}`);
      
      // Send block request to API
      const response = await fetch('/api/threats/block-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ip: ip,
          duration: 3600, // 1 hour
          reason: `Auto-blocked: ${reason}`,
          auto_blocked: true,
          spoofing_detected: true
        })
      });

      if (response.ok) {
        console.log(`✅ Successfully auto-blocked IP: ${ip}`);
        setBlockedIPs(prev => [...prev, ip]);
        
        // Auto-block silently - no alert needed
        console.log(`🚫 Auto-blocked IP ${ip} for country spoofing!`);
      } else {
        console.error(`❌ Failed to auto-block IP: ${ip}`, response.statusText);
      }
    } catch (error) {
      console.error(`❌ Error auto-blocking IP ${ip}:`, error);
    }
  };

  // Check for country spoofing
  const checkCountrySpoofing = (attack: AttackEvent) => {
    if (!attack.country || !attack.geo_location) return;
    
    const claimedCountry = attack.country;
    const actualCountry = attack.geo_location.country;
    
    // If claimed country doesn't match actual country, it's spoofing
    if (claimedCountry !== actualCountry) {
      const reason = `Country spoofing detected: Claimed ${claimedCountry} but actual location is ${actualCountry}`;
      autoBlockSpoofedIP(attack.ip, reason);
    }
  };

  // Block ALL attacks with high risk factors
  const blockAllAttacks = (attack: AttackEvent) => {
    // Block all attacks regardless of type - security first approach
    const reason = `High risk attack detected: ${attack.attackType} from ${attack.country}`;
    autoBlockSpoofedIP(attack.ip, reason);
  };

  // Generate realistic attack data
  const generateAttackEvent = (): AttackEvent => {
    const attackTypes = [
      'SQL Injection', 'XSS Attack', 'DDoS', 'Brute Force', 'Port Scan',
      'Malware Download', 'Phishing Attempt', 'Ransomware', 'Botnet Activity',
      'Credential Stuffing', 'Zero-day Exploit', 'Man-in-the-Middle'
    ];
    
    const countries = [
      'United States', 'China', 'Russia', 'Germany', 'United Kingdom',
      'Japan', 'Brazil', 'India', 'France', 'Canada', 'Australia', 'Netherlands'
    ];
    
    const cities = [
      'New York', 'Beijing', 'Moscow', 'Berlin', 'London', 'Tokyo',
      'São Paulo', 'Mumbai', 'Paris', 'Toronto', 'Sydney', 'Amsterdam'
    ];
    
    const cityToLatLon: Record<string, { lat: number; lon: number }> = {
      'New York': { lat: 40.7128, lon: -74.0060 },
      'Beijing': { lat: 39.9042, lon: 116.4074 },
      'Moscow': { lat: 55.7558, lon: 37.6173 },
      'Berlin': { lat: 52.5200, lon: 13.4050 },
      'London': { lat: 51.5074, lon: -0.1278 },
      'Tokyo': { lat: 35.6762, lon: 139.6503 },
      'São Paulo': { lat: -23.5505, lon: -46.6333 },
      'Mumbai': { lat: 19.0760, lon: 72.8777 },
      'Paris': { lat: 48.8566, lon: 2.3522 },
      'Toronto': { lat: 43.6532, lon: -79.3832 },
      'Sydney': { lat: -33.8688, lon: 151.2093 },
      'Amsterdam': { lat: 52.3676, lon: 4.9041 },
    };
    
    const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'SMTP'];
    const severities: ('low' | 'medium' | 'high' | 'critical')[] = ['high', 'critical']; // Only high and critical severity attacks
    const statuses: ('blocked' | 'allowed' | 'monitoring')[] = ['blocked', 'allowed', 'monitoring'];
    
    // Generate realistic MAC addresses
    const generateMacAddress = (): MacAddress => {
      const oui = ['00:50:56', '08:00:27', '00:0C:29', '00:1C:42', '52:54:00', '00:15:5D', '00:16:3E', 'AC:DE:48'];
      const randomOui = oui[Math.floor(Math.random() * oui.length)];
      const randomBytes = Array.from({length: 3}, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(':');
      return MacAddressUtils.create(`${randomOui}:${randomBytes}`);
    };
    
    const now = new Date();
    const randomIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const city = cities[Math.floor(Math.random() * cities.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const base = cityToLatLon[city] || { lat: 37.7749, lon: -122.4194 };
    // Add a tiny jitter so markers in same city don't overlap
    const jitter = () => (Math.random() - 0.5) * 0.2; // ~0.2 degrees
    
    // 20% chance of creating a spoofed attack for demo purposes
    const isSpoofed = Math.random() < 0.2;
    const actualCountry = isSpoofed ? countries[Math.floor(Math.random() * countries.length)] : country;

    const macAddress = generateMacAddress();
    console.log('Generated MAC address:', macAddress);
    
    const attack: AttackEvent = {
      id: `attack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ip: randomIP,
      mac: macAddress,
      port: Math.floor(Math.random() * 65535) + 1,
      protocol: protocols[Math.floor(Math.random() * protocols.length)] as any,
      attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      timestamp: now.toISOString(),
      country,
      city,
      lat: base.lat + jitter(),
      lon: base.lon + jitter(),
      bytesTransferred: Math.floor(Math.random() * 1000000) + 1000,
      duration: Math.floor(Math.random() * 300) + 1,
      status: statuses[Math.floor(Math.random() * statuses.length)] as any,
      process: Math.random() > 0.5 ? 'chrome.exe' : 'firefox.exe',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referer: Math.random() > 0.5 ? 'https://google.com' : undefined,
      attack_vector: attackTypes[Math.floor(Math.random() * attackTypes.length)],
      confidence_score: Math.floor(Math.random() * 100),
      geo_location: {
        country: actualCountry, // Use actual country for geo_location
        country_code: 'US',
        region: 'Unknown',
        city,
        latitude: base.lat + jitter(),
        longitude: base.lon + jitter(),
        timezone: 'UTC',
        isp: 'Unknown ISP',
        organization: 'Unknown Org',
        asn: Math.floor(Math.random() * 65535),
        accuracy_radius: Math.floor(Math.random() * 100)
      },
      network_context: {
        subnet: '192.168.1.0/24',
        vlan_id: Math.floor(Math.random() * 100),
        network_segment: 'internal',
        is_internal: Math.random() > 0.5,
        is_dmz: Math.random() > 0.8,
        is_guest: Math.random() > 0.9,
        network_trust_level: 'low'
      }
    };

    // Update global demo points for the map FIRST (so they appear on map)
    const anyWindow = window as any;
    if (!anyWindow.BYJ_DEMO_POINTS) {
      anyWindow.BYJ_DEMO_POINTS = [];
    }
    anyWindow.BYJ_DEMO_POINTS = [attack, ...anyWindow.BYJ_DEMO_POINTS]; // No limit - keep all attacks

    // Block ALL attacks after a short delay (so they appear on map first)
    setTimeout(() => {
      blockAllAttacks(attack);
      checkCountrySpoofing(attack);
    }, 2000); // 2 second delay to show on map first

    return attack;
  };

  // Generate initial attack data
  useEffect(() => {
    // Start with empty attacks - begin at 0
    setAttacks([]);
    setAttackCount(0);
  }, []);

  // Auto-generate new attacks
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      const newAttack = generateAttackEvent();
      setAttacks(prev => [newAttack, ...prev]); // Keep all attacks
      setAttackCount(prev => prev + 1);
    }, Math.random() * 3000 + 1000); // Random interval between 1-4 seconds

    return () => clearInterval(interval);
  }, [isAutoRefresh]);

  // Filter attacks based on search and filters
  useEffect(() => {
    let filtered = attacks;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(attack =>
        attack.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attack.attackType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attack.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attack.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(attack => attack.severity === severityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(attack => attack.status === statusFilter);
    }

    setFilteredAttacks(filtered);
  }, [attacks, searchTerm, severityFilter, statusFilter]);

  // Push markers to the global for the map to consume
  useEffect(() => {
    const points = filteredAttacks
      .filter(a => typeof a.lat === 'number' && typeof a.lon === 'number')
      .map(a => ({
        lat: a.lat as number,
        lon: a.lon as number,
        label: `${a.city || ''} ${a.country || ''}`.trim(),
        ip: a.ip,
        attackType: a.attackType,
        severity: a.severity,
        city: a.city,
        country: a.country,
        timestamp: a.timestamp,
        status: a.status,
        port: a.port,
        protocol: a.protocol,
      }));
    (window as any).BYJ_DEMO_POINTS = points;
  }, [filteredAttacks]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'blocked': return '#dc3545';
      case 'allowed': return '#28a745';
      case 'monitoring': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="live-attack-feed">
      {/* Header */}
      <div className="feed-header">
        <div className="header-left">
          <div className="header-icon">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="feed-title">Live Attack Feed</h1>
            <p className="feed-subtitle">Real-time monitoring of all incoming connections and threats</p>
          </div>
        </div>
        <div className="header-right">
          <div className="attack-stats">
            <div className="stat-item">
              <span className="stat-label">Total Attacks:</span>
              <span className="stat-value">{attackCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Live:</span>
              <span className={`stat-value ${connected ? 'text-green-600' : 'text-red-600'}`}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="feed-controls">
        <div className="search-section">
          <div className="search-input-container">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by IP, attack type, country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="filter-section">
          <div className="filter-group">
            <Filter className="w-4 h-4" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="blocked">Blocked</option>
              <option value="allowed">Allowed</option>
              <option value="monitoring">Monitoring</option>
            </select>
          </div>
          
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`refresh-button ${isAutoRefresh ? 'active' : ''}`}
          >
            <RefreshCw className="w-4 h-4" />
            {isAutoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
          </button>
        </div>
      </div>

      {/* Attack Feed */}
      <div className="attack-feed-container">
        <div className="feed-info">
          <span className="feed-count">Showing {filteredAttacks.length} attacks</span>
          <span className="feed-time">Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
        
        <div className="attack-list">
          {filteredAttacks.length === 0 ? (
            <div className="no-attacks">
              <Shield className="w-12 h-12 text-gray-400" />
              <p>No attacks found matching your criteria</p>
            </div>
          ) : (
            filteredAttacks.map((attack) => (
              <div key={attack.id} className={`attack-item ${attack.severity}`}>
                <div className="attack-header">
                  <div className="attack-ip">
                    <MapPin className="w-4 h-4" />
                    <span className="ip-address">{attack.ip}</span>
                    <span className="port">:{attack.port}</span>
                  </div>
                  <div className="attack-meta">
                    <span className={`severity-badge ${attack.severity}`}>
                      {attack.severity.toUpperCase()}
                    </span>
                    <span className={`status-badge ${attack.status}`}>
                      {attack.status.toUpperCase()}
                    </span>
                    {blockedIPs.includes(attack.ip) && (
                      <span className="blocked-badge">
                        🚫 BLOCKED
                      </span>
                    )}
                    <span className="timestamp">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(attack.timestamp)}
                    </span>
                  </div>
                </div>
                
                <div className="attack-details">
                  <div className="detail-row">
                    <div className="detail-item">
                      <span className="detail-label">Attack Type:</span>
                      <span className="detail-value">{attack.attackType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Protocol:</span>
                      <span className="detail-value">{attack.protocol}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{attack.city}, {attack.country}</span>
                    </div>
                  </div>
                  
                  {attack.mac && (
                    <div className="detail-row">
                      <div className="detail-item">
                        <span className="detail-label">
                          <Network className="w-3 h-3 inline mr-1" />
                          MAC Address:
                        </span>
                        <span className="detail-value font-mono text-sm">
                          {attack.mac.address}
                          {attack.mac.vendor && (
                            <span className="text-gray-500 ml-2">({attack.mac.vendor})</span>
                          )}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">MAC Type:</span>
                        <span className="detail-value">
                          {attack.mac.isLocal ? 'Local' : 'Global'}
                          {attack.mac.isMulticast && ' | Multicast'}
                          {attack.mac.isBroadcast && ' | Broadcast'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Confidence:</span>
                        <span className="detail-value">{attack.confidence_score}%</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="detail-row">
                    <div className="detail-item">
                      <span className="detail-label">Data Transferred:</span>
                      <span className="detail-value">{formatBytes(attack.bytesTransferred)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">{formatDuration(attack.duration)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Process:</span>
                      <span className="detail-value">{attack.process || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  {attack.userAgent && (
                    <div className="detail-row">
                      <div className="detail-item full-width">
                        <span className="detail-label">User Agent:</span>
                        <span className="detail-value small">{attack.userAgent}</span>
                      </div>
                    </div>
                  )}
                  
                  {attack.referer && (
                    <div className="detail-row">
                      <div className="detail-item full-width">
                        <span className="detail-label">Referer:</span>
                        <span className="detail-value small">{attack.referer}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="attack-actions">
                  <button className="action-button view">
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  <button className="action-button block">
                    <Shield className="w-4 h-4" />
                    Block IP
                  </button>
                  <button className="action-button monitor">
                    <Activity className="w-4 h-4" />
                    Monitor
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
console.log('Testing MAC address generation...');
