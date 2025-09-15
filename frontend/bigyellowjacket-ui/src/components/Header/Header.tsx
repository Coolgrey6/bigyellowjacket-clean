import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export const Header: React.FC = () => {
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
