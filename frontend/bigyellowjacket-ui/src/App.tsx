// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import { Homepage } from './components/Homepage/Homepage';
import { Credits } from './components/Credits/Credits';
import { LoginForm } from './components/Auth/LoginForm';
import { AdvancedDashboard } from './components/AdvancedDashboard/AdvancedDashboard';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Monitoring } from './components/Monitoring/Monitoring';
import { NetworkIntelligence } from './components/NetworkIntelligence/NetworkIntelligence';
import { LogsViewer } from './components/LogsViewer/LogsViewer';
import { TrafficMonitor } from './components/TrafficMonitor/TrafficMonitor';
import { FirewallDashboard } from './components/Firewall';
import { PortBlocker } from './components/PortBlocker/PortBlocker';
import { LiveAttackFeed } from './components/LiveAttackFeed/LiveAttackFeed';
import { Alerts } from './components/Alerts/Alerts';
import { Data } from './components/Data/Data';
import { Settings } from './components/Settings/Settings';
import { TestPage } from './TestPage';
import MapView from './components/Map/MapView';
import { useWebSocket } from './services/websocket';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useWebSocket();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component (redirects to monitoring if already authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useWebSocket();
  
  if (isAuthenticated) {
    return <Navigate to="/app/monitoring" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { login } = useWebSocket();

  const handleLogin = async (user: { username: string; role: string; password: string }) => {
    // Use the WebSocket store login method with the actual password
    await login(user.username, user.password);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/credits" element={<Credits />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginForm onLogin={handleLogin} />
            </PublicRoute>
          } 
        />
        <Route 
          path="/app" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdvancedDashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="advanced" element={<AdvancedDashboard />} />
          <Route path="firewall" element={<FirewallDashboard />} />
              <Route path="ports" element={<PortBlocker />} />
              <Route path="monitoring" element={<Monitoring />} />
              <Route path="connections" element={<NetworkIntelligence />} />
              <Route path="attacks" element={<LiveAttackFeed />} />
              <Route path="logs" element={<LogsViewer />} />
              <Route path="traffic" element={<TrafficMonitor />} />
              <Route path="test" element={<TestPage />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="data" element={<Data />} />
              <Route path="settings" element={<Settings />} />
              <Route path="map" element={<MapView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;