import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import './Settings.css';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'alerts' | 'users' | 'system'>('general');
  const [config, setConfig] = useState<any>(null);
  const [threatRules, setThreatRules] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    threat_detection: { enabled: true, sensitivity: 'medium', auto_block: true },
    alerting: { email_enabled: false, webhook_enabled: false, thresholds: { critical: 1, high: 5, medium: 10 } },
    monitoring: { scan_interval: 2, retention_days: 30, log_level: 'info' }
  });

  const [securitySettings, setSecuritySettings] = useState({
    firewall_enabled: true,
    auto_block_threats: true,
    threat_intelligence: true,
    geo_blocking: false,
    rate_limiting: true
  });

  const [alertSettings, setAlertSettings] = useState({
    email_notifications: false,
    webhook_url: '',
    sms_notifications: false,
    phone_number: '',
    alert_thresholds: {
      critical: 1,
      high: 5,
      medium: 10,
      low: 20
    }
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    email: ''
  });

  useEffect(() => {
    loadSettings();
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      switch (activeTab) {
        case 'general':
          const configResponse = await apiService.getConfig();
          if (configResponse.success && configResponse.data) {
            setConfig(configResponse.data);
            setGeneralSettings(configResponse.data);
          } else {
            setError(configResponse.error || 'Failed to load configuration');
          }
          break;

        case 'security':
          const threatRulesResponse = await apiService.getThreatRules();
          if (threatRulesResponse.success && threatRulesResponse.data) {
            setThreatRules(threatRulesResponse.data);
          } else {
            setError(threatRulesResponse.error || 'Failed to load threat rules');
          }
          break;

        case 'users':
          const usersResponse = await apiService.getUsers();
          if (usersResponse.success && usersResponse.data) {
            setUsers(usersResponse.data);
          } else {
            setError(usersResponse.error || 'Failed to load users');
          }
          break;
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveGeneralSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.updateConfig(generalSettings);
      if (response.success) {
        setSuccess('General settings saved successfully');
        setConfig(generalSettings);
      } else {
        setError(response.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveSecuritySettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.updateThreatRules(securitySettings);
      if (response.success) {
        setSuccess('Security settings saved successfully');
      } else {
        setError(response.error || 'Failed to save security settings');
      }
    } catch (err) {
      setError('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const saveAlertSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // This would be a custom endpoint for alert settings
      const response = await apiService.updateConfig({ alerting: alertSettings });
      if (response.success) {
        setSuccess('Alert settings saved successfully');
      } else {
        setError(response.error || 'Failed to save alert settings');
      }
    } catch (err) {
      setError('Failed to save alert settings');
    } finally {
      setSaving(false);
    }
  };

  const createUser = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.createUser(newUser);
      if (response.success) {
        setSuccess('User created successfully');
        setNewUser({ username: '', password: '', role: 'user', email: '' });
        loadSettings(); // Reload users
      } else {
        setError(response.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3 className="text-lg font-semibold mb-4">General Configuration</h3>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium mb-4">Threat Detection</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Enable Threat Detection</label>
              <input
                type="checkbox"
                checked={generalSettings.threat_detection.enabled}
                onChange={(e) => setGeneralSettings({
                  ...generalSettings,
                  threat_detection: { ...generalSettings.threat_detection, enabled: e.target.checked }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sensitivity Level</label>
              <select
                value={generalSettings.threat_detection.sensitivity}
                onChange={(e) => setGeneralSettings({
                  ...generalSettings,
                  threat_detection: { ...generalSettings.threat_detection, sensitivity: e.target.value }
                })}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Auto-block Threats</label>
              <input
                type="checkbox"
                checked={generalSettings.threat_detection.auto_block}
                onChange={(e) => setGeneralSettings({
                  ...generalSettings,
                  threat_detection: { ...generalSettings.threat_detection, auto_block: e.target.checked }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium mb-4">Monitoring</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scan Interval (seconds)</label>
              <input
                type="number"
                value={generalSettings.monitoring.scan_interval}
                onChange={(e) => setGeneralSettings({
                  ...generalSettings,
                  monitoring: { ...generalSettings.monitoring, scan_interval: parseInt(e.target.value) }
                })}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="300"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention (days)</label>
              <input
                type="number"
                value={generalSettings.monitoring.retention_days}
                onChange={(e) => setGeneralSettings({
                  ...generalSettings,
                  monitoring: { ...generalSettings.monitoring, retention_days: parseInt(e.target.value) }
                })}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="365"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Log Level</label>
              <select
                value={generalSettings.monitoring.log_level}
                onChange={(e) => setGeneralSettings({
                  ...generalSettings,
                  monitoring: { ...generalSettings.monitoring, log_level: e.target.value }
                })}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="settings-section">
      <h3 className="text-lg font-semibold mb-4">Security Configuration</h3>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium mb-4">Firewall Settings</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Enable Firewall</label>
              <input
                type="checkbox"
                checked={securitySettings.firewall_enabled}
                onChange={(e) => setSecuritySettings({
                  ...securitySettings,
                  firewall_enabled: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Auto-block Threats</label>
              <input
                type="checkbox"
                checked={securitySettings.auto_block_threats}
                onChange={(e) => setSecuritySettings({
                  ...securitySettings,
                  auto_block_threats: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Enable Threat Intelligence</label>
              <input
                type="checkbox"
                checked={securitySettings.threat_intelligence}
                onChange={(e) => setSecuritySettings({
                  ...securitySettings,
                  threat_intelligence: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Geographic Blocking</label>
              <input
                type="checkbox"
                checked={securitySettings.geo_blocking}
                onChange={(e) => setSecuritySettings({
                  ...securitySettings,
                  geo_blocking: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Rate Limiting</label>
              <input
                type="checkbox"
                checked={securitySettings.rate_limiting}
                onChange={(e) => setSecuritySettings({
                  ...securitySettings,
                  rate_limiting: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAlertSettings = () => (
    <div className="settings-section">
      <h3 className="text-lg font-semibold mb-4">Alert Configuration</h3>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium mb-4">Notification Settings</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Email Notifications</label>
              <input
                type="checkbox"
                checked={alertSettings.email_notifications}
                onChange={(e) => setAlertSettings({
                  ...alertSettings,
                  email_notifications: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
              <input
                type="checkbox"
                checked={alertSettings.sms_notifications}
                onChange={(e) => setAlertSettings({
                  ...alertSettings,
                  sms_notifications: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
              <input
                type="url"
                value={alertSettings.webhook_url}
                onChange={(e) => setAlertSettings({
                  ...alertSettings,
                  webhook_url: e.target.value
                })}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={alertSettings.phone_number}
                onChange={(e) => setAlertSettings({
                  ...alertSettings,
                  phone_number: e.target.value
                })}
                placeholder="+1234567890"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium mb-4">Alert Thresholds</h4>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(alertSettings.alert_thresholds).map(([severity, threshold]) => (
              <div key={severity}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{severity} Alerts</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setAlertSettings({
                    ...alertSettings,
                    alert_thresholds: {
                      ...alertSettings.alert_thresholds,
                      [severity]: parseInt(e.target.value)
                    }
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div className="settings-section">
      <h3 className="text-lg font-semibold mb-4">User Management</h3>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium mb-4">Create New User</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <button
              onClick={createUser}
              disabled={saving || !newUser.username || !newUser.password}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium mb-4">Existing Users</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Username</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{user.username}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2">
                      <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="settings-section">
      <h3 className="text-lg font-semibold mb-4">System Information</h3>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium mb-4">System Status</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Version</label>
              <p className="text-sm text-gray-600">1.0.0</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Uptime</label>
              <p className="text-sm text-gray-600">24 days, 12 hours</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Update</label>
              <p className="text-sm text-gray-600">2024-01-15 14:30:00</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Database Status</label>
              <p className="text-sm text-green-600">Connected</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium mb-4">Maintenance</h4>
          <div className="space-y-4">
            <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700">
              Clear Logs
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Export Configuration
            </button>
            <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
              Restart Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="settings-container">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure system settings and preferences</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex space-x-1">
          {(['general', 'security', 'alerts', 'users', 'system'] as const).map((tab) => (
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
      </div>

      {/* Content */}
      {activeTab === 'general' && renderGeneralSettings()}
      {activeTab === 'security' && renderSecuritySettings()}
      {activeTab === 'alerts' && renderAlertSettings()}
      {activeTab === 'users' && renderUserManagement()}
      {activeTab === 'system' && renderSystemSettings()}

      {/* Save Button */}
      {activeTab !== 'system' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              switch (activeTab) {
                case 'general': saveGeneralSettings(); break;
                case 'security': saveSecuritySettings(); break;
                case 'alerts': saveAlertSettings(); break;
              }
            }}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};
