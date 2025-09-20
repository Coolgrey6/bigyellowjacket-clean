import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut, User } from 'lucide-react';
import { useWebSocket } from '../../services/websocket';

export const Header: React.FC = () => {
  const { isAuthenticated, userRole, logout } = useWebSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Shield className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Big Yellow Jacket
              </h1>
              <p className="text-sm text-gray-600">
                Network Security & Firewall Management
              </p>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Logged in as: <span className="font-medium text-gray-900">{userRole}</span></span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1 px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <User className="w-4 h-4" />
                Login
              </Link>
            )}
            <div className="text-right">
              <div className="text-sm text-gray-600">Status</div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
