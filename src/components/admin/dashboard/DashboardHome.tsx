import React, { useState } from 'react';
import { LayoutDashboard, Bell, HelpCircle, RefreshCw } from 'lucide-react';
import { FileManagementModule } from './FileManagementModule';
import { ProgressTrackingModule } from './ProgressTrackingModule';
import { IntegratedEmailModule } from './IntegratedEmailModule';
import { VehiclesModule } from './VehiclesModule';
import { cn } from '../../../lib/utils';

interface DashboardHomeProps {
  adminPassword?: string;
}

type ViewMode = 'tabs' | 'columns';
type ActiveModule = 'files' | 'progress' | 'email' | 'vehicles';

export const DashboardHome: React.FC<DashboardHomeProps> = ({ adminPassword = 'AdminPass2026!' }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('tabs');
  const [activeModule, setActiveModule] = useState<ActiveModule>('files');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [pendingCount] = useState(0);

  const handleRefresh = () => {
    setLastRefresh(new Date());
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    USAR Form Management Dashboard
                  </h1>
                  <p className="text-sm text-gray-600">Multi-Form System Administration</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-lg">
                <div className="text-right">
                  <p className="text-xs text-gray-600">Forms Today</p>
                  <p className="text-lg font-bold text-gray-900">0</p>
                </div>
                <div className="w-px h-8 bg-gray-300" />
                <div className="text-right">
                  <p className="text-xs text-gray-600">Pending</p>
                  <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
                </div>
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Help */}
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh dashboard"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* View Mode Toggle */}
              <div className="hidden lg:flex gap-2">
                <button
                  onClick={() => setViewMode('tabs')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    viewMode === 'tabs'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  Tabs
                </button>
                <button
                  onClick={() => setViewMode('columns')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    viewMode === 'columns'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  Columns
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {viewMode === 'tabs' ? (
          // Tab View
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="flex border-b overflow-x-auto">
                <button
                  onClick={() => setActiveModule('files')}
                  className={cn(
                    'px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap',
                    activeModule === 'files'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  📁 Files
                </button>
                <button
                  onClick={() => setActiveModule('progress')}
                  className={cn(
                    'px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap',
                    activeModule === 'progress'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  📈 Progress
                </button>
                <button
                  onClick={() => setActiveModule('email')}
                  className={cn(
                    'px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap',
                    activeModule === 'email'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  ✉️ Email
                </button>
                <button
                  onClick={() => setActiveModule('vehicles')}
                  className={cn(
                    'px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap',
                    activeModule === 'vehicles'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  🚗 Vehicles
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="h-[calc(100vh-200px)]">
              {activeModule === 'files' && (
                <FileManagementModule adminPassword={adminPassword} />
              )}
              {activeModule === 'progress' && (
                <ProgressTrackingModule adminPassword={adminPassword} />
              )}
              {activeModule === 'email' && (
                <IntegratedEmailModule adminPassword={adminPassword} />
              )}
              {activeModule === 'vehicles' && (
                <VehiclesModule adminPassword={adminPassword} />
              )}
            </div>
          </div>
        ) : (
          // Column View
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
            {/* Left Column - Files (40%) */}
            <div className="xl:col-span-1">
              <FileManagementModule adminPassword={adminPassword} />
            </div>

            {/* Center Column - Analytics (30%) */}
            <div className="xl:col-span-1">
              <ProgressTrackingModule adminPassword={adminPassword} />
            </div>

            {/* Right Column - Email (30%) */}
            <div className="xl:col-span-1">
              <IntegratedEmailModule adminPassword={adminPassword} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-6">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </div>
            <div className="flex gap-4">
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+F</kbd>
              <span>Search</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+N</kbd>
              <span>New Email</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};