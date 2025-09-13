import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const MobileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: '/app', label: 'Dashboard', icon: '📊' },
    { path: '/app/monitoring', label: 'Monitoring', icon: '📈' },
    { path: '/app/traffic', label: 'Traffic', icon: '🚦' },
    { path: '/app/connections', label: 'Intelligence', icon: '🧠' },
    { path: '/app/firewall', label: 'Firewall', icon: '🛡️' },
    { path: '/app/logs', label: 'Logs', icon: '📋' },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 bg-yellow-500 text-white p-3 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsOpen(false)}>
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">🐝</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Big Yellow Jacket</h2>
                    <p className="text-sm text-gray-600">Security Platform</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-yellow-100 text-yellow-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-xl">🏠</span>
                  <span>Homepage</span>
                </Link>
                <Link
                  to="/credits"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-xl">⭐</span>
                  <span>Credits</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
