/**
 * Data persistence hook for managing local storage and state persistence
 */

import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

interface PersistedData {
  // User preferences
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshInterval: number;
  
  // Dashboard preferences
  dashboardLayout: string;
  widgetSettings: Record<string, any>;
  
  // Filter preferences
  alertFilters: {
    severity: string[];
    status: string[];
    dateRange: string;
  };
  connectionFilters: {
    protocol: string[];
    status: string[];
  };
  
  // View preferences
  tablePageSize: number;
  sortBy: Record<string, 'asc' | 'desc'>;
  
  // Last viewed data
  lastViewed: {
    alerts: string;
    connections: string;
    threats: string;
  };
}

const DEFAULT_DATA: PersistedData = {
  theme: 'light',
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  dashboardLayout: 'default',
  widgetSettings: {},
  alertFilters: {
    severity: [],
    status: [],
    dateRange: '24h'
  },
  connectionFilters: {
    protocol: [],
    status: []
  },
  tablePageSize: 25,
  sortBy: {},
  lastViewed: {
    alerts: '',
    connections: '',
    threats: ''
  }
};

const STORAGE_KEY = 'byj_user_preferences';

export const useDataPersistence = () => {
  const { isAuthenticated } = useWebSocket();

  // Load data from localStorage
  const loadPersistedData = useCallback((): PersistedData => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_DATA, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load persisted data:', error);
    }
    return DEFAULT_DATA;
  }, []);

  // Save data to localStorage
  const savePersistedData = useCallback((data: Partial<PersistedData>) => {
    try {
      const current = loadPersistedData();
      const updated = { ...current, ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save persisted data:', error);
    }
  }, [loadPersistedData]);

  // Clear all persisted data
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear persisted data:', error);
    }
  }, []);

  // Auto-save when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear sensitive data on logout
      const current = loadPersistedData();
      savePersistedData({
        ...current,
        lastViewed: {
          alerts: '',
          connections: '',
          threats: ''
        }
      });
    }
  }, [isAuthenticated, loadPersistedData, savePersistedData]);

  return {
    loadPersistedData,
    savePersistedData,
    clearPersistedData
  };
};

// Hook for managing specific data types
export const usePersistedState = <T>(
  key: keyof PersistedData,
  defaultValue: T
): [T, (value: T) => void] => {
  const { loadPersistedData, savePersistedData } = useDataPersistence();

  const getValue = useCallback((): T => {
    const data = loadPersistedData();
    return (data[key] as T) ?? defaultValue;
  }, [loadPersistedData, key, defaultValue]);

  const setValue = useCallback((value: T) => {
    savePersistedData({ [key]: value });
  }, [savePersistedData, key]);

  return [getValue(), setValue];
};

// Hook for managing table preferences
export const useTablePreferences = (tableId: string) => {
  const { loadPersistedData, savePersistedData } = useDataPersistence();

  const getTablePreferences = useCallback(() => {
    const data = loadPersistedData();
    return {
      pageSize: data.tablePageSize,
      sortBy: data.sortBy[tableId] || 'asc',
      filters: data.alertFilters // Default to alert filters, can be customized per table
    };
  }, [loadPersistedData, tableId]);

  const updateTablePreferences = useCallback((updates: {
    pageSize?: number;
    sortBy?: 'asc' | 'desc';
    filters?: any;
  }) => {
    const data = loadPersistedData();
    const newData: Partial<PersistedData> = {};
    
    if (updates.pageSize !== undefined) {
      newData.tablePageSize = updates.pageSize;
    }
    
    if (updates.sortBy !== undefined) {
      newData.sortBy = { ...data.sortBy, [tableId]: updates.sortBy };
    }
    
    if (updates.filters !== undefined) {
      newData.alertFilters = { ...data.alertFilters, ...updates.filters };
    }
    
    savePersistedData(newData);
  }, [loadPersistedData, savePersistedData, tableId]);

  return {
    getTablePreferences,
    updateTablePreferences
  };
};

// Hook for managing dashboard layout
export const useDashboardLayout = () => {
  const { loadPersistedData, savePersistedData } = useDataPersistence();

  const getLayout = useCallback(() => {
    const data = loadPersistedData();
    return {
      layout: data.dashboardLayout,
      widgetSettings: data.widgetSettings
    };
  }, [loadPersistedData]);

  const updateLayout = useCallback((layout: string) => {
    savePersistedData({ dashboardLayout: layout });
  }, [savePersistedData]);

  const updateWidgetSettings = useCallback((widgetId: string, settings: any) => {
    const data = loadPersistedData();
    savePersistedData({
      widgetSettings: {
        ...data.widgetSettings,
        [widgetId]: settings
      }
    });
  }, [loadPersistedData, savePersistedData]);

  return {
    getLayout,
    updateLayout,
    updateWidgetSettings
  };
};

// Hook for managing theme
export const useTheme = () => {
  const [theme, setTheme] = usePersistedState('theme', 'light');

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme
  };
};

// Hook for managing auto-refresh settings
export const useAutoRefresh = () => {
  const [autoRefresh, setAutoRefresh] = usePersistedState('autoRefresh', true);
  const [refreshInterval, setRefreshInterval] = usePersistedState('refreshInterval', 30000);

  return {
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval
  };
};
