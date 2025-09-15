import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const items = [
    { path: '/app', label: 'Dashboard' },
    { path: '/app/monitoring', label: 'Monitoring' },
    { path: '/app/traffic', label: 'Traffic Monitor' },
    { path: '/app/connections', label: 'Network Intelligence' },
    { path: '/app/attacks', label: 'Live Attacks' },
    { path: '/app/firewall', label: 'Firewall' },
    { path: '/app/ports', label: 'Port Blocker' },
    { path: '/app/logs', label: 'Logs' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
      <div className="p-4 border-b border-gray-200">
        <div className="text-sm text-gray-600">Navigation</div>
      </div>
      <nav className="p-3 space-y-1">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-md text-sm ${
                active
                  ? 'bg-yellow-100 text-yellow-900 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};





