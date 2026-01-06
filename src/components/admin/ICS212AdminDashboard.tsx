/**
 * ICS-212 Admin Dashboard
 * 
 * Main dashboard component for managing ICS-212 Vehicle Safety Inspection forms
 * Features:
 * - Mobile-first responsive design (320px+)
 * - Tab navigation (Forms, Analytics, Vehicles)
 * - Real-time search and filtering
 * - PDF preview and download
 * - Email distribution
 * - Dark mode support
 */

import { useState } from 'react';
import { FormsList } from './FormsList';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { VehicleManagement } from './VehicleManagement';
import { TouchFeedback } from '../mobile/TouchFeedback';

type TabView = 'list' | 'analytics' | 'vehicles';

export function ICS212AdminDashboard() {
  const [currentView, setCurrentView] = useState<TabView>('list');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                ICS-212 Admin
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vehicle Safety Inspections
              </p>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <nav className="flex border-t border-gray-200 dark:border-gray-700">
          <TouchFeedback>
            <button
              onClick={() => setCurrentView('list')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                currentView === 'list'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>📋</span>
                <span className="hidden sm:inline">Forms</span>
              </div>
            </button>
          </TouchFeedback>
          
          <TouchFeedback>
            <button
              onClick={() => setCurrentView('analytics')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                currentView === 'analytics'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>📊</span>
                <span className="hidden sm:inline">Analytics</span>
              </div>
            </button>
          </TouchFeedback>
          
          <TouchFeedback>
            <button
              onClick={() => setCurrentView('vehicles')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                currentView === 'vehicles'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>🚗</span>
                <span className="hidden sm:inline">Vehicles</span>
              </div>
            </button>
          </TouchFeedback>
        </nav>
      </header>
      
      {/* Content Area with padding for mobile */}
      <main className="p-4 pb-20 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {currentView === 'list' && <FormsList />}
          {currentView === 'analytics' && <AnalyticsDashboard />}
          {currentView === 'vehicles' && <VehicleManagement />}
        </div>
      </main>
    </div>
  );
}
