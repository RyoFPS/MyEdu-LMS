import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Sidebar />
      <main className="lg:pl-64 min-h-screen transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};
