// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import { Homepage } from './components/Homepage/Homepage';
import { Credits } from './components/Credits/Credits';
import { LoginForm } from './components/Auth/LoginForm';
import { AdvancedDashboard } from './components/AdvancedDashboard/AdvancedDashboard';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Monitoring } from './components/Monitoring/Monitoring';
import { NetworkIntelligence } from './components/NetworkIntelligence/NetworkIntelligence';
import { LogsViewer } from './components/LogsViewer';
import { TrafficMonitor } from './components/TrafficMonitor';
import { FirewallDashboard } from './components/Firewall';
import { TestPage } from './TestPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/login" element={<LoginForm onLogin={() => {}} />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<AdvancedDashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="advanced" element={<AdvancedDashboard />} />
          <Route path="firewall" element={<FirewallDashboard />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="connections" element={<NetworkIntelligence />} />
          <Route path="logs" element={<LogsViewer />} />
          <Route path="traffic" element={<TrafficMonitor />} />
          <Route path="test" element={<TestPage />} />
          <Route path="alerts" element={<div>Alerts Page</div>} />
          <Route path="data" element={<div>Data Page</div>} />
          <Route path="settings" element={<div>Settings Page</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;