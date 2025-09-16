/**
 * API Service Layer for Big Yellow Jacket Security Platform
 * Comprehensive service for communicating with the backend REST API
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success?: boolean;
  message?: string;
}

export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: number;
  active_connections: number;
  threats_detected: number;
  alerts_active: number;
  timestamp: string;
}

export interface ThreatData {
  id: string;
  ip: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  description: string;
  source_ip?: string;
  target_ip?: string;
  metadata?: Record<string, any>;
}

export interface AlertData {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source_ip?: string;
  target_ip?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface ConnectionData {
  id: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  status: string;
  bytes_sent: number;
  bytes_received: number;
  timestamp: string;
}

export interface DashboardOverview {
  system_metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  threat_summary: any;
  alert_summary: any;
  connection_stats: {
    total: number;
    active: number;
    blocked: number;
  };
  timestamp: string;
}

export interface LoginAttempt {
  timestamp: string;
  username: string;
  success: boolean;
  ip: string;
  user_agent: string;
}

export interface LoginStats {
  buckets: Array<{
    time: string;
    success: number;
    failed: number;
  }>;
  totals: {
    total: number;
    success: number;
    failed: number;
  };
  risk: 'normal' | 'elevated' | 'critical';
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // Determine API base URL based on environment
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.baseUrl = isLocalhost 
      ? '/api' 
      : 'https://bigyellowjacket.com/api';
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          success: false,
        };
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      };
    }
  }

  // System endpoints
  async getHealth(): Promise<ApiResponse> {
    return this.request('/health');
  }

  async getSystemStatus(): Promise<ApiResponse> {
    return this.request('/status');
  }

  async getSystemMetrics(): Promise<ApiResponse<SystemMetrics>> {
    return this.request<SystemMetrics>('/metrics');
  }

  // Threat detection endpoints
  async getThreats(): Promise<ApiResponse<ThreatData[]>> {
    return this.request<ThreatData[]>('/threats');
  }

  async getThreatSummary(): Promise<ApiResponse> {
    return this.request('/threats/summary');
  }

  async analyzePacket(packetData: {
    packet_data: string;
    src_ip: string;
    dst_ip: string;
    src_port: number;
    dst_port: number;
  }): Promise<ApiResponse> {
    return this.request('/threats/analyze', {
      method: 'POST',
      body: JSON.stringify(packetData),
    });
  }

  async blockIp(ip: string, duration: number = 3600, reason: string = 'Manual block'): Promise<ApiResponse> {
    return this.request('/threats/block-ip', {
      method: 'POST',
      body: JSON.stringify({ ip, duration, reason }),
    });
  }

  async unblockIp(ip: string): Promise<ApiResponse> {
    return this.request(`/threats/unblock-ip/${ip}`, {
      method: 'DELETE',
    });
  }

  // Alert endpoints
  async getAlerts(): Promise<ApiResponse<AlertData[]>> {
    return this.request<AlertData[]>('/alerts');
  }

  async getActiveAlerts(): Promise<ApiResponse<AlertData[]>> {
    return this.request<AlertData[]>('/alerts/active');
  }

  async getAlertStats(): Promise<ApiResponse> {
    return this.request('/alerts/stats');
  }

  async acknowledgeAlert(alertId: string): Promise<ApiResponse> {
    return this.request(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  async resolveAlert(alertId: string): Promise<ApiResponse> {
    return this.request(`/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
  }

  async createAlert(alertData: {
    type: string;
    severity: string;
    title: string;
    description: string;
    source_ip?: string;
    target_ip?: string;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<AlertData>> {
    return this.request<AlertData>('/alerts/create', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  // Network monitoring endpoints
  async getConnections(): Promise<ApiResponse<ConnectionData[]>> {
    return this.request<ConnectionData[]>('/connections');
  }

  async getConnectionStats(): Promise<ApiResponse> {
    return this.request('/connections/stats');
  }

  async getNetworkTopology(): Promise<ApiResponse> {
    return this.request('/network/topology');
  }

  // Dashboard endpoints
  async getDashboardOverview(): Promise<ApiResponse<DashboardOverview>> {
    return this.request<DashboardOverview>('/dashboard/overview');
  }

  async getRealtimeData(): Promise<ApiResponse> {
    return this.request('/dashboard/real-time');
  }

  async getAnalyticsData(): Promise<ApiResponse> {
    return this.request('/dashboard/analytics');
  }

  // Security reports endpoints
  async getThreatReport(): Promise<ApiResponse> {
    return this.request('/reports/threat');
  }

  async getSecurityReport(): Promise<ApiResponse> {
    return this.request('/reports/security');
  }

  async exportReport(format: 'json' | 'csv'): Promise<ApiResponse> {
    return this.request(`/reports/export/${format}`);
  }

  // Configuration endpoints
  async getConfig(): Promise<ApiResponse> {
    return this.request('/config');
  }

  async updateConfig(config: Record<string, any>): Promise<ApiResponse> {
    return this.request('/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getThreatRules(): Promise<ApiResponse> {
    return this.request('/config/threat-rules');
  }

  async updateThreatRules(rules: Record<string, any>): Promise<ApiResponse> {
    return this.request('/config/threat-rules', {
      method: 'POST',
      body: JSON.stringify(rules),
    });
  }

  // User management endpoints
  async getUsers(): Promise<ApiResponse> {
    return this.request('/users');
  }

  async createUser(userData: {
    username: string;
    password: string;
    role: string;
  }): Promise<ApiResponse> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUser(userId: string): Promise<ApiResponse> {
    return this.request(`/users/${userId}`);
  }

  async updateUser(userId: string, userData: Record<string, any>): Promise<ApiResponse> {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<ApiResponse> {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Authentication telemetry endpoints
  async recordLoginAttempt(attempt: {
    username: string;
    success: boolean;
  }): Promise<ApiResponse<{ ok: boolean; risk: string }>> {
    return this.request<{ ok: boolean; risk: string }>('/auth/login-attempt', {
      method: 'POST',
      body: JSON.stringify(attempt),
    });
  }

  async getLoginStats(): Promise<ApiResponse<LoginStats>> {
    return this.request<LoginStats>('/auth/login-stats');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
