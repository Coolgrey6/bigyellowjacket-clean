/**
 * Enhanced Data Types for Big Yellow Jacket Security Platform
 * Comprehensive TypeScript interfaces with MAC address support
 */

// Base types
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'active' | 'inactive' | 'blocked' | 'monitoring' | 'suspicious' | 'safe';
export type Protocol = 'TCP' | 'UDP' | 'ICMP' | 'HTTP' | 'HTTPS' | 'SSH' | 'FTP' | 'SMTP' | 'DNS' | 'DHCP' | 'ARP' | 'OTHER';
export type UserRole = 'admin' | 'user' | 'viewer' | 'analyst';

// MAC Address utilities
export interface MacAddress {
  address: string;
  vendor?: string;
  isLocal: boolean;
  isMulticast: boolean;
  isBroadcast: boolean;
}

// Network interface information
export interface NetworkInterface {
  name: string;
  mac: MacAddress;
  ipv4?: string;
  ipv6?: string;
  status: 'up' | 'down' | 'unknown';
  speed?: number; // Mbps
  mtu?: number;
  type: 'ethernet' | 'wifi' | 'bluetooth' | 'virtual' | 'other';
}

// Enhanced connection data with MAC addresses
export interface ConnectionData {
  id: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  src_mac?: MacAddress;
  dst_mac?: MacAddress;
  protocol: Protocol;
  status: Status;
  bytes_sent: number;
  bytes_received: number;
  packets_sent: number;
  packets_received: number;
  latency: number;
  timestamp: string;
  last_seen: string;
  process?: ProcessInfo;
  network_interface?: string;
  vlan_id?: number;
  connection_duration: number; // seconds
  flags?: ConnectionFlags;
}

// Process information
export interface ProcessInfo {
  pid: number;
  name: string;
  path: string;
  user: string;
  command_line: string;
  parent_pid?: number;
  cpu_usage: number;
  memory_usage: number;
  network_connections: number;
}

// Connection flags (TCP flags, etc.)
export interface ConnectionFlags {
  syn?: boolean;
  ack?: boolean;
  fin?: boolean;
  rst?: boolean;
  psh?: boolean;
  urg?: boolean;
  ece?: boolean;
  cwr?: boolean;
}

// Enhanced threat data with MAC addresses
export interface ThreatData {
  id: string;
  ip: string;
  mac?: MacAddress;
  type: string;
  severity: Severity;
  timestamp: string;
  description: string;
  source_ip?: string;
  source_mac?: MacAddress;
  target_ip?: string;
  target_mac?: MacAddress;
  port?: number;
  protocol?: Protocol;
  attack_vector: string;
  confidence_score: number; // 0-100
  false_positive_probability: number; // 0-100
  metadata: ThreatMetadata;
  geo_location?: GeoLocation;
  network_context?: NetworkContext;
}

// Threat metadata
export interface ThreatMetadata {
  cve_ids?: string[];
  mitre_attack_techniques?: string[];
  ioc_indicators?: string[];
  threat_actor?: string;
  campaign_id?: string;
  tags: string[];
  source: 'signature' | 'behavioral' | 'ml' | 'manual' | 'external';
  detection_engine: string;
  rule_id?: string;
  rule_version?: string;
}

// Geographic location
export interface GeoLocation {
  country: string;
  country_code: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp?: string;
  organization?: string;
  asn?: number;
  accuracy_radius?: number; // km
}

// Network context
export interface NetworkContext {
  subnet: string;
  vlan_id?: number;
  network_segment: string;
  is_internal: boolean;
  is_dmz: boolean;
  is_guest: boolean;
  network_trust_level: 'high' | 'medium' | 'low' | 'untrusted';
}

// Enhanced alert data
export interface AlertData {
  id: string;
  type: string;
  severity: Severity;
  title: string;
  description: string;
  source_ip?: string;
  source_mac?: MacAddress;
  target_ip?: string;
  target_mac?: MacAddress;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  acknowledged_by?: string;
  resolved_by?: string;
  metadata: AlertMetadata;
  related_threats: string[]; // Threat IDs
  related_connections: string[]; // Connection IDs
  escalation_level: number; // 1-5
  auto_resolve_at?: string;
}

// Alert metadata
export interface AlertMetadata {
  rule_id?: string;
  rule_name?: string;
  rule_version?: string;
  detection_method: 'signature' | 'behavioral' | 'ml' | 'correlation' | 'manual';
  false_positive_risk: 'low' | 'medium' | 'high';
  impact_assessment: 'low' | 'medium' | 'high' | 'critical';
  business_context?: string;
  remediation_steps: string[];
  references: string[];
  tags: string[];
}

// System metrics with network interface details
export interface SystemMetrics {
  cpu: {
    percent: number;
    cores: number;
    frequency: number;
    temperature?: number;
    load_average: number[];
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
    swap_total: number;
    swap_used: number;
    swap_percent: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    percent: number;
    read_ops: number;
    write_ops: number;
    read_bytes: number;
    write_bytes: number;
  };
  network: {
    interfaces: NetworkInterface[];
    total_bytes_sent: number;
    total_bytes_received: number;
    total_packets_sent: number;
    total_packets_received: number;
    errors_in: number;
    errors_out: number;
    drops_in: number;
    drops_out: number;
  };
  timestamp: string;
}

// Connection metrics
export interface ConnectionMetrics {
  active: number;
  blocked: number;
  suspicious: number;
  safe: number;
  total_connections: number;
  new_connections_per_minute: number;
  connections_by_protocol: Record<Protocol, number>;
  connections_by_status: Record<Status, number>;
  top_source_ips: Array<{ ip: string; count: number; mac?: MacAddress }>;
  top_destination_ips: Array<{ ip: string; count: number; mac?: MacAddress }>;
  top_ports: Array<{ port: number; count: number; protocol: Protocol }>;
}

// Traffic metrics
export interface TrafficMetrics {
  bytes_monitored: number;
  packets_monitored: number;
  bytes_per_second: number;
  packets_per_second: number;
  bandwidth_utilization: number; // percentage
  peak_bandwidth: number;
  average_bandwidth: number;
  traffic_by_protocol: Record<Protocol, number>;
  traffic_by_interface: Record<string, number>;
}

// Dashboard overview
export interface DashboardOverview {
  system_metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  threat_summary: {
    total: number;
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    new_today: number;
    resolved_today: number;
  };
  alert_summary: {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  connection_stats: {
    total: number;
    active: number;
    blocked: number;
    suspicious: number;
    safe: number;
  };
  network_health: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
  timestamp: string;
}

// Login attempt with enhanced tracking
export interface LoginAttempt {
  id: string;
  timestamp: string;
  username: string;
  success: boolean;
  ip: string;
  mac?: MacAddress;
  user_agent: string;
  location?: GeoLocation;
  session_id?: string;
  failure_reason?: string;
  risk_score: number; // 0-100
  is_suspicious: boolean;
  device_fingerprint?: string;
}

// Login statistics
export interface LoginStats {
  buckets: Array<{
    time: string;
    success: number;
    failed: number;
    suspicious: number;
  }>;
  totals: {
    total: number;
    success: number;
    failed: number;
    suspicious: number;
  };
  risk: 'normal' | 'elevated' | 'critical';
  top_failed_ips: Array<{ ip: string; count: number; mac?: MacAddress }>;
  top_failed_users: Array<{ username: string; count: number }>;
  recent_attempts: LoginAttempt[];
}

// WiFi Access Point information
export interface WiFiAccessPoint {
  ssid: string;
  bssid: string;
  signalStrength: number; // dBm
  frequency: number; // MHz
  channel: number;
  security: string; // WPA2, WPA3, Open, etc.
  vendor: string;
  isHidden: boolean;
  firstSeen: string;
  lastSeen: string;
}

// WiFi location tracking data
export interface WiFiLocationData {
  accessPoints: WiFiAccessPoint[];
  estimatedAccuracy: number; // meters
  locationMethod: 'wifi' | 'gps' | 'cell' | 'ip' | 'bluetooth';
  wifiFingerprint: string; // Unique identifier for location
  signalMap: {
    strongest: WiFiAccessPoint;
    weakest: WiFiAccessPoint;
    average: number;
  };
  triangulation: {
    method: 'trilateration' | 'fingerprinting' | 'hybrid';
    confidence: number; // 0-100
    sources: number; // Number of APs used
  };
}

// Enhanced location details for ground tracking
export interface LocationDetails {
  address: string;
  building: string;
  floor: number | null;
  room: string | null;
  coordinates: {
    lat: number;
    lon: number;
    altitude: number | null;
  };
  accuracy: {
    horizontal: number; // meters
    vertical: number | null; // meters
  };
  context: {
    venue: string; // Airport, Mall, Office, etc.
    environment: 'indoor' | 'outdoor' | 'underground' | 'elevated';
    density: 'sparse' | 'moderate' | 'dense'; // WiFi AP density
  };
  tracking: {
    lastUpdate: string;
    updateFrequency: number; // seconds
    isActive: boolean;
    confidence: number; // 0-100
  };
}

// Attack event for live feed with WiFi location tracking
export interface AttackEvent {
  id: string;
  ip: string;
  mac?: MacAddress;
  port: number;
  protocol: Protocol;
  attackType: string;
  severity: Severity;
  timestamp: string;
  country: string;
  city: string;
  lat: number;
  lon: number;
  bytesTransferred: number;
  duration: number;
  status: Status;
  process: string;
  userAgent: string;
  referer?: string;
  attack_vector: string;
  confidence_score: number;
  geo_location?: GeoLocation;
  network_context?: NetworkContext;
  // WiFi location tracking
  wifiLocation?: WiFiLocationData;
  locationDetails?: LocationDetails;
}

// WebSocket message types
export interface WebSocketMessage {
  message_type: 'welcome' | 'initial_state' | 'metrics_update' | 'connections_update' | 'alerts_update' | 'threats_update' | 'error';
  data: any;
  timestamp: string;
  sequence_id?: number;
}

// API response wrapper
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
  timestamp: string;
  request_id?: string;
}

// Configuration types
export interface SecurityConfig {
  threat_detection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    auto_block: boolean;
    block_duration: number; // seconds
  };
  network_monitoring: {
    enabled: boolean;
    capture_packets: boolean;
    analyze_traffic: boolean;
    monitor_interfaces: string[];
  };
  alerting: {
    enabled: boolean;
    email_notifications: boolean;
    webhook_url?: string;
    severity_threshold: Severity;
  };
  firewall: {
    enabled: boolean;
    default_policy: 'allow' | 'deny';
    rules: FirewallRule[];
  };
}

// Firewall rule
export interface FirewallRule {
  id: string;
  name: string;
  action: 'allow' | 'deny' | 'reject';
  protocol: Protocol;
  source_ip?: string;
  source_mac?: MacAddress;
  destination_ip?: string;
  destination_mac?: MacAddress;
  source_port?: number;
  destination_port?: number;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

// MAC address utility functions
export const MacAddressUtils = {
  // Validate MAC address format
  isValid: (mac: string): boolean => {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  },

  // Normalize MAC address to uppercase with colons
  normalize: (mac: string): string => {
    return mac.replace(/[-:]/g, ':').toUpperCase();
  },

  // Check if MAC is local (not globally unique)
  isLocal: (mac: string): boolean => {
    const normalized = MacAddressUtils.normalize(mac);
    const secondChar = normalized.charAt(1);
    return secondChar === '2' || secondChar === '6' || secondChar === 'A' || secondChar === 'E';
  },

  // Check if MAC is multicast
  isMulticast: (mac: string): boolean => {
    const normalized = MacAddressUtils.normalize(mac);
    return normalized.charAt(1) === '1' || normalized.charAt(1) === '3' || 
           normalized.charAt(1) === '5' || normalized.charAt(1) === '7' ||
           normalized.charAt(1) === '9' || normalized.charAt(1) === 'B' ||
           normalized.charAt(1) === 'D' || normalized.charAt(1) === 'F';
  },

  // Check if MAC is broadcast
  isBroadcast: (mac: string): boolean => {
    return mac.toUpperCase() === 'FF:FF:FF:FF:FF:FF';
  },

  // Get MAC vendor (simplified - would need full OUI database in production)
  getVendor: (mac: string): string | undefined => {
    const normalized = MacAddressUtils.normalize(mac);
    const oui = normalized.substring(0, 8);
    
    // Simplified vendor lookup (in production, use full OUI database)
    const vendors: Record<string, string> = {
      '00:50:56': 'VMware',
      '08:00:27': 'VirtualBox',
      '00:0C:29': 'VMware',
      '00:1C:42': 'Parallels',
      '52:54:00': 'QEMU',
      '00:15:5D': 'Microsoft Hyper-V',
      '00:16:3E': 'Xen',
      'AC:DE:48': 'Private',
    };
    
    return vendors[oui] || 'Unknown';
  },

  // Create MacAddress object
  create: (address: string): MacAddress => {
    const normalized = MacAddressUtils.normalize(address);
    return {
      address: normalized,
      vendor: MacAddressUtils.getVendor(normalized),
      isLocal: MacAddressUtils.isLocal(normalized),
      isMulticast: MacAddressUtils.isMulticast(normalized),
      isBroadcast: MacAddressUtils.isBroadcast(normalized),
    };
  }
};

// Export all types
export type {
  Severity,
  Status,
  Protocol,
  UserRole,
  MacAddress,
  NetworkInterface,
  ConnectionData,
  ProcessInfo,
  ConnectionFlags,
  ThreatData,
  ThreatMetadata,
  GeoLocation,
  NetworkContext,
  AlertData,
  AlertMetadata,
  SystemMetrics,
  ConnectionMetrics,
  TrafficMetrics,
  DashboardOverview,
  LoginAttempt,
  LoginStats,
  AttackEvent,
  WebSocketMessage,
  ApiResponse,
  SecurityConfig,
  FirewallRule,
};
