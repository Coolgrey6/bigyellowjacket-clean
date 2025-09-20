/**
 * Enhanced API Service Layer for Big Yellow Jacket Security Platform
 * Comprehensive service with MAC address support and robust error handling
 */

import { 
  ApiResponse, 
  SystemMetrics, 
  ThreatData, 
  AlertData, 
  ConnectionData, 
  DashboardOverview,
  LoginAttempt,
  LoginStats,
  MacAddress,
  MacAddressUtils,
  Severity,
  Status,
  Protocol
} from '../models/datatypes';

// Enhanced API service with better error handling and retry logic

class ApiService {
  private baseUrl: string;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor() {
    // Determine API base URL based on environment
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.baseUrl = isLocalhost 
      ? '/api' 
      : 'https://bigyellowjacket.com:8443/api';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      // Handle different response types
      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Retry on certain error codes
        if (this.shouldRetry(response.status) && retryCount < this.retryAttempts) {
          console.log(`🔄 Retrying request (${retryCount + 1}/${this.retryAttempts}): ${endpoint}`);
          await this.sleep(this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
          return this.request<T>(endpoint, options, retryCount + 1);
        }

        return {
          error: errorMessage,
          success: false,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        data,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Retry on network errors
      if (this.isNetworkError(error) && retryCount < this.retryAttempts) {
        console.log(`🔄 Retrying request due to network error (${retryCount + 1}/${this.retryAttempts}): ${endpoint}`);
        await this.sleep(this.retryDelay * Math.pow(2, retryCount));
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`API request failed: ${endpoint}`, error);
      
      return {
        error: errorMessage,
        success: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private shouldRetry(statusCode: number): boolean {
    // Retry on server errors and rate limiting
    return statusCode >= 500 || statusCode === 429;
  }

  private isNetworkError(error: any): boolean {
    return error instanceof TypeError && error.message.includes('fetch') ||
           error.name === 'AbortError' ||
           error.message.includes('network') ||
           error.message.includes('timeout');
  }

  // Helper method to enhance data with MAC addresses
  private enhanceConnectionData(connection: any): ConnectionData {
    return {
      id: connection.id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      src_ip: connection.src_ip || connection.source_ip || '0.0.0.0',
      dst_ip: connection.dst_ip || connection.destination_ip || '0.0.0.0',
      src_port: connection.src_port || connection.source_port || 0,
      dst_port: connection.dst_port || connection.destination_port || 0,
      src_mac: connection.src_mac ? MacAddressUtils.create(connection.src_mac) : undefined,
      dst_mac: connection.dst_mac ? MacAddressUtils.create(connection.dst_mac) : undefined,
      protocol: (connection.protocol as Protocol) || 'TCP',
      status: (connection.status as Status) || 'active',
      bytes_sent: connection.bytes_sent || 0,
      bytes_received: connection.bytes_received || 0,
      packets_sent: connection.packets_sent || 0,
      packets_received: connection.packets_received || 0,
      latency: connection.latency || 0,
      timestamp: connection.timestamp || new Date().toISOString(),
      last_seen: connection.last_seen || new Date().toISOString(),
      process: connection.process,
      network_interface: connection.network_interface,
      vlan_id: connection.vlan_id,
      connection_duration: connection.connection_duration || 0,
      flags: connection.flags
    };
  }

  private enhanceThreatData(threat: any): ThreatData {
    return {
      id: threat.id || `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ip: threat.ip || '0.0.0.0',
      mac: threat.mac ? MacAddressUtils.create(threat.mac) : undefined,
      type: threat.type || 'Unknown',
      severity: (threat.severity as Severity) || 'medium',
      timestamp: threat.timestamp || new Date().toISOString(),
      description: threat.description || 'No description available',
      source_ip: threat.source_ip,
      source_mac: threat.source_mac ? MacAddressUtils.create(threat.source_mac) : undefined,
      target_ip: threat.target_ip,
      target_mac: threat.target_mac ? MacAddressUtils.create(threat.target_mac) : undefined,
      port: threat.port,
      protocol: threat.protocol as Protocol,
      attack_vector: threat.attack_vector || 'unknown',
      confidence_score: threat.confidence_score || 50,
      false_positive_probability: threat.false_positive_probability || 0,
      metadata: threat.metadata || {},
      geo_location: threat.geo_location,
      network_context: threat.network_context
    };
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
    const response = await this.request<any[]>('/threats');
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.map(threat => this.enhanceThreatData(threat))
      };
    }
    return response;
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
    const response = await this.request<any[]>('/connections');
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.map(conn => this.enhanceConnectionData(conn))
      };
    }
    return response;
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
