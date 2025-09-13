// src/components/Layout/AppLayout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { Header } from '../Header';
import { MobileMenu } from '../Mobile/MobileMenu';
import { InstallPrompt } from '../PWA/InstallPrompt';

export const AppLayout: React.FC = () => {
  const demoMode = (import.meta as any).env?.VITE_DEMO_MODE === 'true';
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <MobileMenu />
      <InstallPrompt />
      {demoMode && (
        <div className="w-full bg-yellow-100 text-yellow-900 text-sm py-1 px-3 border-b border-yellow-200">
          Demo mode: no login required.
        </div>
      )}
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 overflow-auto p-2 md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};